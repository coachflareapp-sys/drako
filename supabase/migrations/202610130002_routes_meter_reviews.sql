begin;
create table route_quotes(id uuid primary key,places jsonb not null,distance_m integer not null check(distance_m>0),duration_s integer not null check(duration_s>0),price_cop integer not null check(price_cop>=0),tariff_id uuid not null references tariff_versions(id),expires_at timestamptz not null);
alter table route_quotes enable row level security;
revoke all on route_quotes from anon,authenticated;
alter table bookings add column started_at timestamptz;
alter table bookings add column completed_at timestamptz;
create table trip_meters(booking_id uuid primary key references bookings(id),distance_m double precision not null default 0,last_lat double precision,last_lon double precision,last_at timestamptz,last_accuracy double precision,samples integer not null default 0);
alter table trip_meters enable row level security;
create policy meter_read on trip_meters for select to authenticated using(public.is_admin() or exists(select 1 from bookings b where b.id=booking_id and b.driver_id=auth.uid()));
revoke all on trip_meters from anon,authenticated;grant select on trip_meters to authenticated;
create table trip_reviews(booking_id uuid primary key references bookings(id),rating integer not null check(rating between 1 and 5),comment text not null default '' check(length(comment)<=1500),created_at timestamptz not null default now());
alter table trip_reviews enable row level security;
create policy review_read on trip_reviews for select to authenticated using(public.is_admin() or exists(select 1 from bookings b where b.id=booking_id and b.driver_id=auth.uid()));
revoke all on trip_reviews from anon,authenticated;grant select on trip_reviews to authenticated;

create function submit_quoted_booking(p_request_id uuid,p_token text,p_quote_id uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare q route_quotes; response jsonb; details jsonb; reference_value text; t tariff_versions; existing bookings;
begin
 select * into existing from bookings where request_id=p_request_id;
 if found then
 if not exists(select 1 from guest_access where booking_id=existing.id and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')) then raise exception 'Solicitud inválida.'; end if;
 return jsonb_build_object('ok',true,'reference',existing.reference,'status',existing.status);
 end if;
 if (select count(*) from bookings where created_at>now()-interval '1 day')>=100 or (select count(*) from bookings where phone=p_data->>'phone' and created_at>now()-interval '1 hour')>=10 then raise exception 'Se alcanzó el límite de solicitudes. Intenta más tarde.'; end if;
 select * into q from route_quotes where id=p_quote_id and expires_at>now();
 if not found then raise exception 'La cotización venció. Calcula nuevamente el recorrido.'; end if;
 select * into t from tariff_versions where id=q.tariff_id;
 if not exists(select 1 from tariff_versions where id=t.id and id=(select id from tariff_versions order by effective_from desc limit 1)) then raise exception 'La tarifa cambió. Actualiza la cotización.'; end if;
 details:=p_data||jsonb_build_object('origin',q.places->0->>'label','destination',q.places->(jsonb_array_length(q.places)-1)->>'label','stops',(select coalesce(jsonb_agg(value->>'label'),'[]'::jsonb) from jsonb_array_elements(q.places) with ordinality s(value,n) where n>1 and n<jsonb_array_length(q.places)),'km',q.distance_m::numeric/1000,'minutes',ceil(q.duration_s::numeric/60)::int);
 response:=submit_test_booking(p_request_id,p_token,details);
 if (response->>'ok')::boolean then
 reference_value:=response->>'reference';
 update bookings set is_test=false,price_cop=q.price_cop,price_breakdown=jsonb_build_object('distance_source','openrouteservice','per_km',t.per_km_cop,'minimum',t.minimum_cop,'passenger_extra',0,'pet_extra',0) where reference=reference_value;
 end if;
 return response;
end $$;
revoke all on function submit_quoted_booking(uuid,text,uuid,jsonb) from public;grant execute on function submit_quoted_booking(uuid,text,uuid,jsonb) to anon,authenticated;

create or replace function get_test_booking(p_reference text,p_token text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare b bookings; result jsonb;
begin
 select bk.* into b from bookings bk join guest_access g on g.booking_id=bk.id where bk.reference=p_reference and g.expires_at>now() and g.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'Enlace inválido o vencido.'; end if;
 result:=to_jsonb(b)-'driver_id'-'vehicle_id'-'customer_id'-'request_id'-'tariff_id';
 if b.status in('confirmed','en_route','in_progress','completed') then
 result:=result||jsonb_build_object('assigned_vehicle',(select jsonb_build_object('plate',v.plate,'brand',v.brand,'model_line',v.model_line,'model_year',v.model_year,'color',v.color,'driver_name',p.full_name) from vehicles v join profiles p on p.id=b.driver_id where v.id=b.vehicle_id));
 end if;
 result:=result||jsonb_build_object('meter',(select jsonb_build_object('distance_m',m.distance_m,'samples',m.samples,'last_at',m.last_at,'price_cop',greatest(coalesce(t.minimum_cop,0),ceil(m.distance_m/1000*t.per_km_cop))) from trip_meters m join tariff_versions t on t.id=b.tariff_id where m.booking_id=b.id),'review',(select jsonb_build_object('rating',rating,'comment',comment) from trip_reviews where booking_id=b.id));
 return result;
end $$;
create function get_booking(p_reference text,p_token text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select get_test_booking(p_reference,p_token)$$;
revoke all on function get_booking(text,text) from public;grant execute on function get_booking(text,text) to anon,authenticated;

create function change_booking(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings;
begin
 select * into b from bookings where id=p_id;
 if not found or auth.uid() is null or not(auth.uid()=b.driver_id or public.is_admin()) then raise exception 'No tienes permiso para este servicio.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(b.driver_id::text,0));
 select * into b from bookings where id=p_id for update;
 if not ((b.status='pending_driver' and p_status in('confirmed','rejected','cancelled')) or (b.status='confirmed' and p_status='cancelled')) then raise exception 'El cambio de estado no es válido.'; end if;
 update bookings set status=p_status where id=b.id;
 if p_status in('rejected','cancelled') then update calendar_slots set active=false where booking_id=b.id; end if;
 insert into audit_events(actor_id,action,record_id,details) values(auth.uid(),'booking_status',b.id,jsonb_build_object('status',p_status));
end $$;
revoke all on function change_booking(uuid,text) from public,anon;grant execute on function change_booking(uuid,text) to authenticated;

create function meter_position(p_id uuid,p_lat double precision,p_lon double precision,p_accuracy double precision,p_start boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings; m trip_meters; segment double precision; seconds double precision; tariff tariff_versions;
begin
 select * into b from bookings where id=p_id;
 if not found or auth.uid() is null or auth.uid()<>b.driver_id then raise exception 'Solo el conductor asignado puede medir el recorrido.'; end if;
 if p_lat is null or p_lon is null or p_accuracy is null or not(p_lat between -90 and 90 and p_lon between -180 and 180 and p_accuracy between 0 and 50) then raise exception 'Se necesita una ubicación GPS precisa para medir el recorrido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(b.driver_id::text,0));select * into b from bookings where id=p_id for update;
 if p_start then
 if b.status<>'confirmed' then raise exception 'El servicio debe estar confirmado para iniciarlo.'; end if;
 if exists(select 1 from bookings where driver_id=b.driver_id and status='in_progress' and id<>p_id) then raise exception 'Finaliza primero el servicio que está en curso.'; end if;
 update bookings set status='in_progress',started_at=now() where id=p_id;
 insert into trip_meters(booking_id,last_lat,last_lon,last_at,last_accuracy,samples) values(p_id,p_lat,p_lon,clock_timestamp(),p_accuracy,1);
 else
 if b.status<>'in_progress' then raise exception 'El servicio no está en curso.'; end if;
 select * into m from trip_meters where booking_id=p_id for update;
 if not found then raise exception 'No existe una medición inicial.'; end if;
 seconds:=extract(epoch from clock_timestamp()-m.last_at);
 if seconds<3 then return jsonb_build_object('distance_m',m.distance_m,'accepted',false); end if;
 segment:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(p_lat-m.last_lat)/2),2)+cos(radians(m.last_lat))*cos(radians(p_lat))*power(sin(radians(p_lon-m.last_lon)/2),2))));
 if seconds>120 then update trip_meters set last_lat=p_lat,last_lon=p_lon,last_at=clock_timestamp(),last_accuracy=p_accuracy where booking_id=p_id;
 return jsonb_build_object('distance_m',m.distance_m,'gap',true); end if;
 if segment/seconds>55 then return jsonb_build_object('distance_m',m.distance_m,'accepted',false); end if;
 if segment>=greatest(10,p_accuracy,m.last_accuracy) then update trip_meters set distance_m=distance_m+segment,last_lat=p_lat,last_lon=p_lon,last_at=clock_timestamp(),last_accuracy=p_accuracy,samples=samples+1 where booking_id=p_id; end if;
 end if;
 select * into m from trip_meters where booking_id=p_id;select * into tariff from tariff_versions where id=b.tariff_id;
 return jsonb_build_object('distance_m',m.distance_m,'price_cop',greatest(coalesce(tariff.minimum_cop,0),ceil(m.distance_m/1000*tariff.per_km_cop)),'accepted',true);
end $$;
revoke all on function meter_position(uuid,double precision,double precision,double precision,boolean) from public,anon;grant execute on function meter_position(uuid,double precision,double precision,double precision,boolean) to authenticated;
create function finish_booking(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare b bookings; m trip_meters; t tariff_versions;
begin
 select * into b from bookings where id=p_id;
 if not found or auth.uid() is null or auth.uid()<>b.driver_id then raise exception 'Solo el conductor puede finalizar el servicio.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(b.driver_id::text,0));select * into b from bookings where id=p_id for update;
 if b.status<>'in_progress' then raise exception 'El servicio no está en curso.'; end if;
 select * into m from trip_meters where booking_id=p_id;
 if not found or m.samples<2 or m.distance_m<10 then raise exception 'No hay distancia GPS suficiente para finalizar el cobro. Mantén abierta la página y verifica la ubicación.'; end if;
 select * into t from tariff_versions where id=b.tariff_id;
 update bookings set status='completed',completed_at=now(),price_breakdown=price_breakdown||jsonb_build_object('estimated_price_cop',price_cop,'gps_distance_m',m.distance_m,'final_source','gps'),price_cop=greatest(coalesce(t.minimum_cop,0),ceil(m.distance_m/1000*t.per_km_cop)) where id=p_id;
 update calendar_slots set active=false where booking_id=p_id;
end $$;
revoke all on function finish_booking(uuid) from public,anon;grant execute on function finish_booking(uuid) to authenticated;
create function rate_booking(p_reference text,p_token text,p_rating integer,p_comment text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare details jsonb;
begin
 details:=get_booking(p_reference,p_token);if details->>'status'<>'completed' then raise exception 'Puedes calificar cuando termine el servicio.'; end if;
 if p_rating is null or p_rating not between 1 and 5 or length(coalesce(p_comment,''))>1500 then raise exception 'Selecciona de 1 a 5 estrellas y un comentario de hasta 1500 caracteres.'; end if;
 insert into trip_reviews(booking_id,rating,comment) values((details->>'id')::uuid,p_rating,coalesce(p_comment,'')) on conflict(booking_id) do update set rating=excluded.rating,comment=excluded.comment;
end $$;
revoke all on function rate_booking(text,text,integer,text) from public;grant execute on function rate_booking(text,text,integer,text) to anon,authenticated;
commit;
