begin;
-- Keep the trusted quoted points, including the original wording. Older bookings
-- retain their text-only representation and never receive guessed coordinates.
do $$
declare definition text; before_text text; after_text text;
begin
 select pg_get_functiondef('public.submit_quoted_booking(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 before_text:='update bookings set is_test=false,price_cop=q.price_cop,';
 after_text:='update bookings set origin=(q.places->0)||jsonb_build_object(''address'',coalesce(q.places->0->>''original'',q.places->0->>''label'')), destination=(q.places->(jsonb_array_length(q.places)-1))||jsonb_build_object(''address'',coalesce(q.places->(jsonb_array_length(q.places)-1)->>''original'',q.places->(jsonb_array_length(q.places)-1)->>''label'')), stops=(select coalesce(jsonb_agg(value||jsonb_build_object(''address'',coalesce(value->>''original'',value->>''label''))),''[]''::jsonb) from jsonb_array_elements(q.places) with ordinality s(value,n) where n>1 and n<jsonb_array_length(q.places)), is_test=false,price_cop=q.price_cop,';
 if strpos(definition,before_text)=0 then raise exception 'Unexpected quote function definition'; end if;
 definition:=replace(definition,before_text,after_text);
 execute definition;
end $$;
commit;
