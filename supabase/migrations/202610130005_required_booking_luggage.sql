begin;
-- Normalize customer input before the existing trusted quote/availability flow.
create function public.validate_booking_details(data jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare counts jsonb; size text; total integer:=0; descriptions text[]:='{}'; amount integer;
begin
 if coalesce(trim(data->>'first_name'),'')='' then raise exception 'El nombre es obligatorio.'; end if;
 if coalesce(data->>'phone','') !~ '^\+[1-9][0-9]{6,14}$' or
    (data->>'phone' like '+57%' and length(data->>'phone')<>13) then
 raise exception 'El móvil de contacto es obligatorio y debe estar completo, con su indicativo.'; end if;
 if coalesce(data->>'passengers','') !~ '^[1-4]$' then raise exception 'Indica la cantidad de pasajeros.'; end if;
 if coalesce(data->>'pickup_at','')='' then raise exception 'La fecha y hora de recogida son obligatorias.'; end if;
 counts:=coalesce(data->'luggage_counts','{}'::jsonb);
 if jsonb_typeof(counts)<>'object' then raise exception 'Indica la cantidad de maletas por tamaño.'; end if;
 foreach size in array array['small','medium','large'] loop
 if coalesce(data->>'luggage','false')='true' then
 if jsonb_typeof(counts->size) is distinct from 'number' or coalesce(counts->>size,'') !~ '^[0-9]{1,2}$' then raise exception 'Las cantidades de maletas deben ser números enteros entre 0 y 20.'; end if;
 amount:=(counts->>size)::integer;
 if amount>20 then raise exception 'Las cantidades de maletas deben estar entre 0 y 20.'; end if;
 else amount:=0; end if;
 total:=total+amount;
 if amount>0 then descriptions:=array_append(descriptions,amount::text||' '||case size when 'small' then 'pequeñas' when 'medium' then 'medianas' else 'grandes' end); end if;
 end loop;
 if coalesce(data->>'luggage','false')='true' and total=0 then raise exception 'Indica al menos una maleta.'; end if;
 return data||jsonb_build_object('first_name',trim(data->>'first_name'),'luggage_details',array_to_string(descriptions,', '));
end $$;
revoke all on function public.validate_booking_details(jsonb) from public,anon,authenticated;
do $$
declare valid jsonb:='{"first_name":"Cliente","phone":"+573157873677","passengers":1,"pickup_at":"2026-12-01T10:00:00-05:00","luggage":true,"luggage_counts":{"small":2,"medium":0,"large":3}}'; invalid jsonb; rejected boolean;
begin
 if public.validate_booking_details(valid)->>'luggage_details'<>'2 pequeñas, 3 grandes' then raise exception 'Luggage formatting failed'; end if;
 foreach invalid in array array[valid||'{"first_name":" "}'::jsonb,valid||'{"phone":""}'::jsonb,valid||'{"phone":"+57315"}'::jsonb,valid-'passengers',valid-'pickup_at',valid||'{"luggage_counts":{"small":0,"medium":0,"large":0}}'::jsonb] loop
 rejected:=false;
 begin perform public.validate_booking_details(invalid); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Incomplete request passed validation'; end if;
 end loop;
end $$;
do $$
declare definition text;
begin
 select pg_get_functiondef('public.submit_quoted_booking(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if strpos(definition,' details:=p_data||')=0 then raise exception 'Unexpected submit_quoted_booking definition'; end if;
 definition:=replace(definition,' details:=p_data||',E' p_data:=public.validate_booking_details(p_data);\n details:=p_data||');
 execute definition;
end $$;
commit;
