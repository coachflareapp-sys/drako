begin;
-- Serialize before the early idempotency check, not just inside the insert helper.
create function lock_quoted_request() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin return new; end $$;
-- The live submit implementation is patched below using its catalog definition.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.submit_quoted_booking(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,E'begin\n select * into existing',E'begin\n perform pg_advisory_xact_lock(hashtextextended(''test-booking-submit'',0));\n select * into existing');
 execute definition;
end $$;
drop function lock_quoted_request();
commit;
