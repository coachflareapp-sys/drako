begin;
do $$
declare driver_uuid uuid; quote_uuid uuid:=gen_random_uuid(); request_uuid uuid:=gen_random_uuid(); token_value text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 tariff_uuid uuid; response jsonb; guest jsonb; booked_uuid uuid; price integer; review_rejected boolean:=false; pickup timestamptz;
begin
 select d.id into driver_uuid from drivers d join auth.users u on u.id=d.id where lower(u.email)='cegarve@hotmail.com';
 select id,per_km_cop*10 into tariff_uuid,price from tariff_versions order by effective_from desc limit 1;
 if driver_uuid is null or tariff_uuid is null then raise exception 'Configured driver/tariff required'; end if;
 begin
 insert into route_quotes(id,places,distance_m,duration_s,price_cop,tariff_id,expires_at) values(quote_uuid,'[{"label":"Origen de verificación","lon":-76.53,"lat":3.45},{"label":"Llegada de verificación","lon":-76.52,"lat":3.45}]',10000,1800,price,tariff_uuid,now()+interval '15 minutes');
 pickup:=(((now() at time zone 'America/Bogota')::date+1)+time '10:00') at time zone 'America/Bogota';
 response:=submit_quoted_booking(request_uuid,token_value,quote_uuid,jsonb_build_object('first_name','Verificación transaccional','phone','+12025550100','passengers',2,'pets',true,'luggage',true,'consent',true,'payment_method','nequi','pickup_at',pickup));
 if not (response->>'ok')::boolean then
 pickup:=(response->'alternatives'->>0)::timestamptz;
 if pickup is null then raise exception 'No available verification interval'; end if;
 response:=submit_quoted_booking(request_uuid,token_value,quote_uuid,jsonb_build_object('first_name','Verificación transaccional','phone','+12025550100','passengers',2,'pets',true,'luggage',true,'consent',true,'payment_method','nequi','pickup_at',pickup));
 end if;
 guest:=get_booking(response->>'reference',token_value);booked_uuid:=(guest->>'id')::uuid;
 if (guest->>'is_test')::boolean or (guest->>'price_cop')::int<>price or guest->'assigned_vehicle' is not null then raise exception 'Quoted booking privacy or price mismatch'; end if;
 begin perform rate_booking(response->>'reference',token_value,5,'Antes de terminar');exception when others then if sqlerrm='Puedes calificar cuando termine el servicio.' then review_rejected:=true; else raise; end if;end;
 if not review_rejected then raise exception 'Premature review accepted'; end if;
 perform set_config('request.jwt.claim.sub',driver_uuid::text,true);
 perform change_booking(booked_uuid,'confirmed');
 perform meter_position(booked_uuid,3.45,-76.53,5,true);
 update trip_meters set last_at=clock_timestamp()-interval '10 seconds' where booking_id=booked_uuid;
 perform meter_position(booked_uuid,3.451,-76.53,5,false);
 perform finish_booking(booked_uuid);
 perform rate_booking(response->>'reference',token_value,5,'Comentario de verificación');
 guest:=get_booking(response->>'reference',token_value);
 if guest->>'status'<>'completed' or (guest->'meter'->>'distance_m')::numeric<=10 or (guest->'review'->>'rating')::int<>5 then raise exception 'Meter or review verification failed'; end if;
 if exists(select 1 from calendar_slots where booking_id=booked_uuid and active) then raise exception 'Completed service did not free slot'; end if;
 raise exception using errcode='PT001',message='Verification complete';
 exception when sqlstate 'PT001' then raise notice 'PASS: signed server quote, international phone, driver start, GPS measurement, finish, private review and cleanup; all fixture rows rolled back';
 end;
end $$;
commit;
