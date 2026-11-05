begin;
-- Use PostgreSQL's built-in random UUID generator so pairing does not depend on
-- the pgcrypto extension schema being in the function's restricted search path.
create or replace function create_telegram_link(p_driver uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare code text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
begin
 if auth.uid() is null or not(public.is_admin() or auth.uid()=p_driver) or not exists(select 1 from drivers where id=p_driver and active) then raise exception 'Acceso restringido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_driver::text,0));
 delete from telegram_link_codes where driver_id=p_driver or expires_at<now();
 insert into telegram_link_codes values(encode(sha256(convert_to(code,'UTF8')),'hex'),p_driver,now()+interval '10 minutes',null);
 return code;
end $$;
commit;
