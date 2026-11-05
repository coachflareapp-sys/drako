begin;
alter table bookings drop constraint bookings_payment_method_check;
alter table bookings add constraint bookings_payment_method_check check(payment_method in('efectivo','nequi','daviplata'));

create function set_tariff(p_per_km integer,p_minimum integer default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Acceso restringido.';end if;
 if p_per_km is null or p_per_km not between 1 and 100000 or (p_minimum is not null and p_minimum not between 0 and 1000000) then raise exception 'Revisa la tarifa.';end if;
 perform pg_advisory_xact_lock(hashtextextended('drako-tariffs',0));
 insert into tariff_versions(effective_from,per_km_cop,minimum_cop,pet_extra_cop,luggage_extra_cop,enabled) values(clock_timestamp(),p_per_km,p_minimum,0,0,true);
 insert into audit_events(actor_id,action,details) values(auth.uid(),'tariff_changed',jsonb_build_object('per_km',p_per_km,'minimum',p_minimum));
end $$;

create function set_personal_block(p_driver uuid,p_start timestamptz,p_end timestamptz,p_reason text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare vehicle uuid; block uuid;
begin
 if auth.uid() is null or not(public.is_admin() or auth.uid()=p_driver) then raise exception 'Acceso restringido.';end if;
 if p_start is null or p_end is null or p_end<=p_start or p_end<=now() or p_end-p_start>interval '90 days' or length(trim(coalesce(p_reason,''))) not between 3 and 200 then raise exception 'Indica fechas y motivo del bloqueo.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_driver::text,0));
 select vehicle_id into vehicle from drivers where id=p_driver;
 if not found then raise exception 'Conductor inexistente.';end if;
 insert into calendar_slots(driver_id,vehicle_id,occupied_range,kind,reason) values(p_driver,vehicle,tstzrange(p_start,p_end,'[)'),'personal_block',trim(p_reason)) returning id into block;
 insert into audit_events(actor_id,action,record_id) values(auth.uid(),'personal_block_created',block);return block;
 exception when exclusion_violation then raise exception 'Ese intervalo afecta una reserva o bloqueo existente. Elige otro horario.';
end $$;
create function remove_personal_block(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare slot calendar_slots;
begin
 select * into slot from calendar_slots where id=p_id and kind='personal_block';
 if not found or auth.uid() is null or not(public.is_admin() or auth.uid()=slot.driver_id) then raise exception 'Acceso restringido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(slot.driver_id::text,0));
 update calendar_slots set active=false where id=p_id;
 insert into audit_events(actor_id,action,record_id) values(auth.uid(),'personal_block_removed',p_id);
end $$;
create function mark_booking_paid(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings;
begin
 select * into b from bookings where id=p_id for update;
 if not found or auth.uid() is null or not(public.is_admin() or auth.uid()=b.driver_id) then raise exception 'Acceso restringido.';end if;
 if b.status<>'completed' then raise exception 'Finaliza el servicio antes de registrar el pago.';end if;
 update bookings set payment_status='paid' where id=p_id;
 insert into audit_events(actor_id,action,record_id) values(auth.uid(),'payment_marked_paid',p_id);
end $$;
create function reschedule_booking(p_reference text,p_token text,p_pickup timestamptz) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings; result jsonb; candidate timestamptz; alternatives jsonb:='[]'; n integer; minutes integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('test-booking-submit',0));
 perform get_booking(p_reference,p_token);
 select * into b from bookings where reference=p_reference for update;
 if b.status not in('pending_driver','confirmed') or b.pickup_at<=now() or p_pickup is null or p_pickup<=now() or p_pickup>now()+interval '60 days' then raise exception 'Solo puedes reprogramar un servicio futuro pendiente o confirmado.';end if;
 perform pg_advisory_xact_lock(hashtextextended(b.driver_id::text,0));minutes:=ceil(b.duration_s::numeric/60)::int;
 update calendar_slots set active=false where booking_id=b.id;
 if not test_slot_available(b.driver_id,b.vehicle_id,p_pickup,minutes) then
 update calendar_slots set active=true where booking_id=b.id;
 for n in 1..5760 loop
 candidate:=p_pickup+make_interval(mins=>n*15);exit when candidate>now()+interval '60 days';
 if test_slot_available(b.driver_id,b.vehicle_id,candidate,minutes) then alternatives:=alternatives||jsonb_build_array(candidate);end if;exit when jsonb_array_length(alternatives)=3;
 end loop;
 return jsonb_build_object('ok',false,'alternatives',alternatives);
 end if;
 update calendar_slots set active=true,occupied_range=tstzrange(p_pickup,p_pickup+make_interval(mins=>minutes+15),'[)') where booking_id=b.id;
 update bookings set pickup_at=p_pickup,estimated_finish_at=p_pickup+make_interval(mins=>minutes),status='pending_driver' where id=b.id;
 update guest_access set expires_at=p_pickup+interval '7 days' where booking_id=b.id;
 insert into audit_events(action,record_id,details) values('guest_rescheduled',b.id,jsonb_build_object('previous',b.pickup_at,'pickup',p_pickup));
 return jsonb_build_object('ok',true);
end $$;
create function public_booking_availability(p_pickup timestamptz,p_minutes integer) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare d record; candidate timestamptz; choices jsonb:='[]'; n integer; reason text:='El horario solicitado está ocupado o fuera del horario de trabajo.';
begin
 if p_pickup is null or p_pickup<=now() or p_pickup>now()+interval '60 days' or p_minutes is null or p_minutes not between 1 and 480 then raise exception 'Elige una fecha futura dentro de los próximos 60 días.';end if;
 for d in select dr.id,dr.vehicle_id from drivers dr join vehicles v on v.id=dr.vehicle_id where dr.active and v.active loop
 if test_slot_available(d.id,d.vehicle_id,p_pickup,p_minutes) then return jsonb_build_object('available',true,'alternatives','[]'::jsonb);end if;
 end loop;
 for n in 1..5760 loop
 candidate:=p_pickup+make_interval(mins=>n*15);exit when candidate>now()+interval '60 days';
 if exists(select 1 from drivers dr join vehicles v on v.id=dr.vehicle_id where dr.active and v.active and test_slot_available(dr.id,dr.vehicle_id,candidate,p_minutes)) then choices:=choices||jsonb_build_array(candidate);end if;
 exit when jsonb_array_length(choices)=3;
 end loop;
 return jsonb_build_object('available',false,'reason',reason,'alternatives',choices);
end $$;

-- Pick a free configured driver before falling back to alternatives; preserve all
-- validation, trusted quotes and transaction locks from the existing workflow.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.submit_test_booking(uuid,text,jsonb)'::regprocedure) into definition;
 if strpos(definition,'order by d.id limit 1')=0 then raise exception 'Unexpected driver selection';end if;
 definition:=replace(definition,'order by d.id limit 1','order by test_slot_available(d.id,d.vehicle_id,pickup,minutes) desc,d.id limit 1');
 definition:=replace(definition,'1..1344','1..5760');
 definition:=replace(definition,'para esta prueba','para este vehículo');definition:=replace(definition,'de prueba','');definition:=replace(definition,'para pruebas','');
 execute definition;
end $$;
revoke all on function submit_test_booking(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function set_tariff(integer,integer),set_personal_block(uuid,timestamptz,timestamptz,text),remove_personal_block(uuid),mark_booking_paid(uuid) from public,anon;
grant execute on function set_tariff(integer,integer),set_personal_block(uuid,timestamptz,timestamptz,text),remove_personal_block(uuid),mark_booking_paid(uuid) to authenticated;
revoke all on function reschedule_booking(text,text,timestamptz),public_booking_availability(timestamptz,integer) from public;
grant execute on function reschedule_booking(text,text,timestamptz),public_booking_availability(timestamptz,integer) to anon,authenticated;
commit;
