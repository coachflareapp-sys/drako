begin;
savepoint location_fixture;
do $$
declare driver record; tariff uuid; quote uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); token text:=encode(gen_random_bytes(32),'hex'); pickup timestamptz; candidate timestamptz; response jsonb; saved bookings; n integer;
begin
 select d.id,d.vehicle_id into driver from drivers d join vehicles v on v.id=d.vehicle_id where d.active and v.active order by d.id limit 1;
 if driver.id is null then raise exception 'Location verification requires a configured driver'; end if;
 for n in 1..1344 loop
 candidate:=date_trunc('hour',now())+make_interval(mins=>n*15);
 if test_slot_available(driver.id,driver.vehicle_id,candidate,30) then pickup:=candidate;exit;end if;
 end loop;
 if pickup is null then raise exception 'No available fixture time'; end if;
 select id into tariff from tariff_versions order by effective_from desc limit 1;
 insert into route_quotes(id,places,distance_m,duration_s,price_cop,tariff_id,expires_at)
 values(quote,'[{"label":"AV 14 OESTE # 8 OESTE - 18 · Aguacatal, Cali","original":"avenida 14 oeste #8-18","lon":-76.5510361,"lat":3.45827658,"source":"Alcaldía de Cali","quality":"cadastral"},{"label":"Parada elegida","original":"Mi referencia de parada","lon":-76.54,"lat":3.44,"source":"Punto seleccionado por el pasajero","quality":"manual"},{"label":"CL 5 con KR 39 · Cali","original":"calle 5 con carrera 39 esquina","lon":-76.5462561,"lat":3.42465042,"source":"Alcaldía de Cali · ejes viales","quality":"intersection"}]',6000,1800,12000,tariff,now()+interval '15 minutes');
 response:=submit_quoted_booking(request,token,quote,jsonb_build_object('first_name','Verificación transaccional','phone','+573001234567','passengers',1,'pets',false,'luggage',false,'pickup_at',pickup,'consent',true,'payment_method','nequi'));
 if response->>'ok'<>'true' then raise exception 'Fixture booking was not accepted';end if;
 select * into saved from bookings where request_id=request;
 if saved.origin->>'address'<>'avenida 14 oeste #8-18' or saved.origin->>'source'<>'Alcaldía de Cali' or (saved.origin->>'lon')::numeric<>-76.5510361 or saved.destination->>'quality'<>'intersection' or saved.stops->0->>'address'<>'Mi referencia de parada' then raise exception 'Trusted location data was lost';end if;
 if get_booking(saved.reference,token)->'origin'->>'lat' is null then raise exception 'Guest booking lost navigation coordinates';end if;
end $$;
rollback to savepoint location_fixture;
release savepoint location_fixture;
commit;
