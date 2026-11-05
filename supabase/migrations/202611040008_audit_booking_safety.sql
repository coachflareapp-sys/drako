begin;
savepoint audit_fixtures;
do $$
declare dr record; q uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); token text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''); tariff uuid; price integer; pickup timestamptz; candidate timestamptz; result jsonb; b bookings; rejected boolean; n integer;
begin
 if has_table_privilege('anon','bookings','INSERT') or has_table_privilege('authenticated','bookings','UPDATE') or has_table_privilege('anon','guest_access','SELECT') or has_table_privilege('anon','notification_outbox','SELECT') or has_function_privilege('anon','change_booking(uuid,text)','EXECUTE') then raise exception 'Direct unauthorised booking access';end if;
 select d.id,d.vehicle_id into dr from drivers d join vehicles v on v.id=d.vehicle_id where d.active and v.active order by d.id limit 1;
 for n in 1..5760 loop candidate:=date_trunc('hour',now())+make_interval(mins=>n*15);if test_slot_available(dr.id,dr.vehicle_id,candidate,30) then pickup:=candidate;exit;end if;end loop;
 if pickup is null then raise exception 'No fixture time';end if;
 select id,per_km_cop*6 into tariff,price from tariff_versions order by effective_from desc limit 1;
 insert into route_quotes values(q,'[{"label":"QA Recogida","original":"QA Recogida","lon":-76.55,"lat":3.45},{"label":"QA Llegada","original":"QA Llegada","lon":-76.54,"lat":3.43}]',6000,1800,price,tariff,now()+interval '15 minutes');
 result:=submit_quoted_booking(request,token,q,jsonb_build_object('first_name','Auditoría transaccional','phone','+573001234567','passengers',1,'pets',false,'luggage',false,'pickup_at',pickup,'consent',true,'payment_method','efectivo'));
 if result->>'ok'<>'true' then raise exception 'Fixture submission failed';end if;
 select * into b from bookings where request_id=request;
 rejected:=false;begin perform get_booking(b.reference,repeat('f',64));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Invalid private token accepted';end if;
 rejected:=false;begin perform cancel_test_booking(b.reference,repeat('f',64));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Invalid cancellation accepted';end if;
 if (select status from bookings where id=b.id)<>'pending_driver' then raise exception 'Invalid token modified state';end if;
 perform cancel_test_booking(b.reference,token);
 if (select status from bookings where id=b.id)<>'cancelled' or exists(select 1 from calendar_slots where booking_id=b.id and active) then raise exception 'Cancellation did not release agenda';end if;
 rejected:=false;begin perform reschedule_booking(b.reference,token,pickup+interval '1 hour');exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Cancelled booking rescheduled';end if;
 -- Isolate the Friday schedule so holiday treatment is tested independently of
 -- the driver's ordinary Friday rest day. All changes below are rolled back.
 if exists(select 1 from vehicles where id=dr.vehicle_id and right(plate,1)='7') and now()<'2026-12-18'::timestamptz then
 delete from working_hours where driver_id=dr.id and weekday=5;
 insert into working_hours(driver_id,weekday,start_time,end_time,valid_from) values(dr.id,5,'07:00','20:00','2026-11-04');
 delete from calendar_slots where (driver_id=dr.id or vehicle_id=dr.vehicle_id) and occupied_range&&tstzrange('2026-12-18T00:00:00-05:00','2026-12-26T00:00:00-05:00','[)');
 if test_slot_available(dr.id,dr.vehicle_id,'2026-12-18T09:00:00-05:00',30) then raise exception 'Friday restriction ignored';end if;
 if not test_slot_available(dr.id,dr.vehicle_id,'2026-12-25T09:00:00-05:00',30) then raise exception 'Christmas exemption ignored';end if;
 end if;
end $$;
rollback to savepoint audit_fixtures;
release savepoint audit_fixtures;
commit;
