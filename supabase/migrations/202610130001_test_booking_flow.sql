begin;
alter table bookings add column is_test boolean not null default false;
alter table bookings add column request_id uuid unique;
alter table bookings add column consent_at timestamptz;
alter table bookings drop constraint bookings_status_check;
alter table bookings add constraint bookings_status_check check(status in('pending_driver','confirmed','en_route','in_progress','completed','cancelled','rejected'));

create function public.test_slot_available(p_driver uuid,p_vehicle uuid,p_start timestamptz,p_minutes integer) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare requested tstzrange; day_date date; shift_range tstzrange; offset_day integer; covered boolean:=false; row record;
begin
 requested:=tstzrange(p_start,p_start+make_interval(mins=>p_minutes+15),'[)');
 if p_start<now() or p_minutes not between 1 and 480 then return false; end if;
 for offset_day in 0..1 loop
 day_date:=(p_start at time zone 'America/Bogota')::date-offset_day;
 if exists(select 1 from schedule_exceptions where driver_id=p_driver and service_date=day_date) then
 for row in select * from schedule_exceptions where driver_id=p_driver and service_date=day_date and not closed loop
 shift_range:=tstzrange((day_date+row.start_time) at time zone 'America/Bogota',((day_date+row.end_day_offset)+row.end_time) at time zone 'America/Bogota','[)');
 covered:=covered or shift_range @> requested;
 end loop;
 else
 for row in select * from working_hours where driver_id=p_driver and weekday=extract(dow from day_date) and day_date>=valid_from and (valid_until is null or day_date<=valid_until) loop
 shift_range:=tstzrange((day_date+row.start_time) at time zone 'America/Bogota',((day_date+row.end_day_offset)+row.end_time) at time zone 'America/Bogota','[)');
 covered:=covered or shift_range @> requested;
 end loop;
 end if;
 end loop;
 if not covered then return false; end if;
 if exists(select 1 from calendar_slots where active and (driver_id=p_driver or vehicle_id=p_vehicle) and occupied_range && requested) then return false; end if;
 if exists(select 1 from restriction_rules r join vehicles v on v.id=p_vehicle where r.city='Cali' and r.plate_digit=right(v.plate,1)::int
 and exists(select 1 from generate_series((lower(requested) at time zone 'America/Bogota')::date::timestamp,(upper(requested) at time zone 'America/Bogota')::date::timestamp,interval '1 day') d
 where d::date between r.valid_from and r.valid_until and extract(dow from d)=r.weekday and requested && tstzrange((d::date+r.start_time) at time zone 'America/Bogota',(d::date+r.end_time) at time zone 'America/Bogota','[)'))) then return false; end if;
 return true;
end $$;
revoke all on function public.test_slot_available(uuid,uuid,timestamptz,integer) from public,anon,authenticated;

create function public.submit_test_booking(p_request_id uuid,p_token text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare dr record; previous bookings; booking_uuid uuid; booking_reference text; pickup timestamptz; minutes integer; meters integer;
 price integer; tariff uuid; amount_per_km integer; candidate timestamptz; alternatives jsonb:='[]'; n integer;
begin
 if p_request_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Solicitud inválida.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('test-booking-submit',0));
 select * into previous from bookings where request_id=p_request_id;
 if found then
 if not exists(select 1 from guest_access where booking_id=previous.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')) then raise exception 'Solicitud inválida.'; end if;
 return jsonb_build_object('ok',true,'reference',previous.reference,'status',previous.status);
 end if;
 if nullif(trim(p_data->>'first_name'),'') is null or length(p_data->>'first_name')>100
 or coalesce(p_data->>'phone','') !~ '^\+?[0-9 ()-]{7,25}$'
 or coalesce(length(trim(p_data->>'origin')),0) not between 3 and 500 or coalesce(length(trim(p_data->>'destination')),0) not between 3 and 500
 or coalesce((p_data->>'consent')::boolean,false)=false then raise exception 'Revisa nombre, teléfono, direcciones y autorización.'; end if;
 if length(coalesce(p_data->>'last_name',''))>100 or length(coalesce(p_data->>'luggage_details',''))>500
 or jsonb_typeof(p_data->'stops') is distinct from 'array' or jsonb_array_length(p_data->'stops')>8 then raise exception 'Datos de viaje inválidos.'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'stops') s where jsonb_typeof(s)<>'string' or length(s#>>'{}')>500) then raise exception 'Paradas inválidas.'; end if;
 if coalesce((p_data->>'passengers')::int,0) not between 1 and 4 then raise exception 'Indica entre 1 y 4 pasajeros para esta prueba.'; end if;
 pickup:=(p_data->>'pickup_at')::timestamptz; minutes:=(p_data->>'minutes')::int; meters:=round((p_data->>'km')::numeric*1000)::int;
 if pickup is null or pickup<=now() or pickup>now()+interval '60 days' or minutes is null or minutes not between 1 and 480 or meters is null or meters not between 100 and 500000 then raise exception 'Revisa fecha, kilómetros y duración.'; end if;
 if (select count(*) from bookings where is_test and created_at>now()-interval '1 day')>=100 or
 (select count(*) from bookings where is_test and phone=p_data->>'phone' and created_at>now()-interval '1 hour')>=10 then raise exception 'Se alcanzó el límite de solicitudes de prueba. Intenta más tarde.'; end if;
 select d.id,d.vehicle_id into dr from drivers d join vehicles v on v.id=d.vehicle_id where d.active and v.active order by d.id limit 1;
 if dr.id is null then raise exception 'No hay un conductor configurado para pruebas.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(dr.id::text,0));
 if not test_slot_available(dr.id,dr.vehicle_id,pickup,minutes) then
 for n in 1..1344 loop
 candidate:=pickup+make_interval(mins=>n*15);
 if candidate>now()+interval '60 days' then exit; end if;
 if test_slot_available(dr.id,dr.vehicle_id,candidate,minutes) then alternatives:=alternatives||jsonb_build_array(candidate); end if;
 exit when jsonb_array_length(alternatives)=3;
 end loop;
 return jsonb_build_object('ok',false,'alternatives',alternatives,'message','El horario solicitado no permite completar este viaje. Elige una alternativa.');
 end if;
 select id,per_km_cop into tariff,amount_per_km from tariff_versions order by effective_from desc limit 1;
 if tariff is null then raise exception 'Tarifa no configurada.'; end if;
 price:=ceil(meters::numeric/1000*amount_per_km)::int;
 insert into bookings(driver_id,vehicle_id,first_name,last_name,phone,origin,destination,stops,passengers,pets,luggage,luggage_details,pickup_at,estimated_finish_at,distance_m,duration_s,tariff_id,price_cop,price_breakdown,status,payment_method,is_test,request_id,consent_at)
 values(dr.id,dr.vehicle_id,trim(p_data->>'first_name'),nullif(trim(p_data->>'last_name'),''),p_data->>'phone',jsonb_build_object('address',p_data->>'origin'),jsonb_build_object('address',p_data->>'destination'),p_data->'stops',(p_data->>'passengers')::int,coalesce((p_data->>'pets')::boolean,false),coalesce((p_data->>'luggage')::boolean,false),p_data->>'luggage_details',pickup,pickup+make_interval(mins=>minutes),meters,minutes*60,tariff,price,jsonb_build_object('distance_source','manual_test','per_km',amount_per_km,'minimum_applied',false,'passenger_extra',0,'pet_extra',0), 'pending_driver',lower(p_data->>'payment_method'),true,p_request_id,now())
 returning id,reference into booking_uuid,booking_reference;
 insert into calendar_slots(driver_id,vehicle_id,booking_id,occupied_range,kind) values(dr.id,dr.vehicle_id,booking_uuid,tstzrange(pickup,pickup+make_interval(mins=>minutes+15),'[)'),'booking');
 insert into guest_access(booking_id,token_hash,expires_at) values(booking_uuid,encode(sha256(convert_to(p_token,'UTF8')),'hex'),pickup+interval '7 days');
 return jsonb_build_object('ok',true,'reference',booking_reference,'status','pending_driver');
end $$;
revoke all on function public.submit_test_booking(uuid,text,jsonb) from public;
grant execute on function public.submit_test_booking(uuid,text,jsonb) to anon,authenticated;

create function public.get_test_booking(p_reference text,p_token text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare b bookings; result jsonb;
begin
 select bk.* into b from bookings bk join guest_access g on g.booking_id=bk.id where bk.reference=p_reference and bk.is_test
 and g.expires_at>now() and g.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'Enlace inválido o vencido.'; end if;
 result:=to_jsonb(b)-'driver_id'-'vehicle_id'-'customer_id'-'request_id'-'tariff_id';
 if b.status in('confirmed','en_route','in_progress','completed') then
 result:=result||jsonb_build_object('assigned_vehicle',(select jsonb_build_object('plate',v.plate,'brand',v.brand,'model_line',v.model_line,'model_year',v.model_year,'color',v.color,'driver_name',p.full_name) from vehicles v join profiles p on p.id=b.driver_id where v.id=b.vehicle_id));
 end if;
 return result;
end $$;
revoke all on function public.get_test_booking(text,text) from public;
grant execute on function public.get_test_booking(text,text) to anon,authenticated;

create function public.change_test_booking(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings;
begin
 select * into b from bookings where id=p_id and is_test;
 if not found or auth.uid() is null or not (auth.uid()=b.driver_id or public.is_admin()) then raise exception 'No tienes permiso para este servicio.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(b.driver_id::text,0));
 select * into b from bookings where id=p_id for update;
 if not ((b.status='pending_driver' and p_status in('confirmed','rejected','cancelled')) or (b.status='confirmed' and p_status in('in_progress','cancelled')) or (b.status='in_progress' and p_status='completed')) then raise exception 'El cambio de estado no es válido.'; end if;
 update bookings set status=p_status where id=b.id;
 if p_status in('rejected','cancelled') then update calendar_slots set active=false where booking_id=b.id; end if;
 insert into audit_events(actor_id,action,record_id,details) values(auth.uid(),'test_booking_status',b.id,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.change_test_booking(uuid,text) from public,anon;
grant execute on function public.change_test_booking(uuid,text) to authenticated;

create function public.cancel_test_booking(p_reference text,p_token text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings;
begin
 perform get_test_booking(p_reference,p_token);
 select * into b from bookings where reference=p_reference;
 perform pg_advisory_xact_lock(hashtextextended(b.driver_id::text,0));
 select * into b from bookings where reference=p_reference for update;
 if b.status not in('pending_driver','confirmed') or b.pickup_at<=now() then raise exception 'No se puede cancelar este servicio desde el enlace.'; end if;
 update bookings set status='cancelled' where id=b.id;
 update calendar_slots set active=false where booking_id=b.id;
end $$;
revoke all on function public.cancel_test_booking(text,text) from public;
grant execute on function public.cancel_test_booking(text,text) to anon,authenticated;
commit;
