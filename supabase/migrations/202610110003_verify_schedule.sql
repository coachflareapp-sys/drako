-- Transactional integration checks: all test rows and schedule changes roll back.
begin;
do $$
declare driver_uuid uuid; vehicle_uuid uuid; admin_uuid uuid; tariff_uuid uuid; booking_uuid uuid;
 original_hours jsonb; conflict_rejected boolean:=false; overlap_rejected boolean:=false;
begin
 select d.id,d.vehicle_id into driver_uuid,vehicle_uuid from public.drivers d join auth.users u on u.id=d.id where lower(u.email)='cegarve@hotmail.com';
 select p.id into admin_uuid from public.profiles p join auth.users u on u.id=p.id where lower(u.email)='aitrezsg@gmail.com';
 select id into tariff_uuid from public.tariff_versions order by effective_from desc limit 1;
 if driver_uuid is null or admin_uuid is null or tariff_uuid is null then raise exception 'Missing configured accounts or tariff'; end if;
 perform pg_advisory_xact_lock(hashtextextended(driver_uuid::text,0));
 select jsonb_agg(jsonb_build_object('weekday',weekday,'start_time',start_time,'end_time',end_time,'end_day_offset',end_day_offset)) into original_hours from public.working_hours where driver_id=driver_uuid;
 begin
 perform set_config('request.jwt.claim.sub',admin_uuid::text,true);
 insert into public.bookings(driver_id,vehicle_id,first_name,phone,origin,destination,passengers,pickup_at,estimated_finish_at,distance_m,duration_s,tariff_id,price_cop,price_breakdown,payment_method)
 values(driver_uuid,vehicle_uuid,'Transactional verification','TEST','{}','{}',1,'2030-01-07 10:00:00-05','2030-01-07 11:00:00-05',1000,3600,tariff_uuid,2000,'{}','nequi') returning id into booking_uuid;
 insert into public.calendar_slots(driver_id,vehicle_id,booking_id,occupied_range,kind)
 values(driver_uuid,vehicle_uuid,booking_uuid,tstzrange('2030-01-07 10:00:00-05','2030-01-07 11:15:00-05','[)'),'booking');
 begin
 perform public.replace_working_hours(driver_uuid,'[]');
 exception when others then
 if sqlerrm like 'El cambio afecta una reserva activa.%' then conflict_rejected:=true; else raise; end if;
 end;
 if not conflict_rejected then raise exception 'Schedule conflict was not rejected'; end if;
 begin
 insert into public.calendar_slots(driver_id,vehicle_id,occupied_range,kind)
 values(driver_uuid,vehicle_uuid,tstzrange('2030-01-07 10:30:00-05','2030-01-07 11:30:00-05','[)'),'personal_block');
 exception when exclusion_violation then overlap_rejected:=true;
 end;
 if not overlap_rejected then raise exception 'Overlapping calendar slot was not rejected'; end if;
 perform public.replace_working_hours(driver_uuid,original_hours);
 -- Force rollback of all test inserts, audit entries, settings and changes.
 raise exception using errcode='PT001',message='Verification complete';
 exception when sqlstate 'PT001' then
 raise notice 'PASS: schedule conflict, calendar overlap and valid schedule update; test data rolled back';
 end;
end $$;
commit;
