begin;
create table restriction_exempt_dates(service_date date primary key,reason text not null,source_url text not null);
alter table restriction_exempt_dates enable row level security;
revoke all on restriction_exempt_dates from anon,authenticated;
-- National holidays remaining in this published restriction period. Source:
-- https://www.banrep.gov.co/es/feriados and official public 2026 calendars.
insert into restriction_exempt_dates values
 ('2026-11-02','Todos los Santos','https://www.banrep.gov.co/es/feriado-bancario/todos-los-santos-2026'),
 ('2026-11-16','Independencia de Cartagena','https://dirliquidacionesbq.gov.co/wp-content/uploads/2026/03/CALENDARIO-DE-ACTIVIDADES-2026.pdf'),
 ('2026-12-08','Inmaculada Concepción','https://www.banrep.gov.co/es/feriados'),
 ('2026-12-25','Navidad','https://www.banrep.gov.co/es/feriados');
insert into restriction_rules(city,plate_digit,weekday,valid_from,valid_until,start_time,end_time,source_url,verified_at)
select 'Cali',digit,weekday,'2026-11-04'::date,'2026-12-31'::date,'06:00'::time,'19:00'::time,'https://www.enruta.gov.co/publicaciones/130764/pico-y-placa-en-cali-para-el-segundo-semestre-de-2026-asi-funcionara-la-nueva-rotacion/',now()
from (values(9,1),(0,1),(1,2),(2,2),(3,3),(4,3),(5,4),(6,4),(7,5),(8,5)) r(digit,weekday)
where not exists(select 1 from restriction_rules x where x.city='Cali' and x.plate_digit=digit and x.weekday=r.weekday and x.valid_from<='2026-11-04' and x.valid_until>='2026-12-31');
do $$
declare definition text;
begin
 select pg_get_functiondef('public.test_slot_available(uuid,uuid,timestamptz,integer)'::regprocedure) into definition;
 if strpos(definition,'where d::date between r.valid_from')=0 then raise exception 'Unexpected restriction predicate';end if;
 definition:=replace(definition,'where d::date between r.valid_from','where not exists(select 1 from restriction_exempt_dates h where h.service_date=d::date) and d::date between r.valid_from');execute definition;
end $$;
create function save_restriction(p_digit integer,p_weekday integer,p_from date,p_until date,p_start time,p_end time,p_source text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Acceso restringido.';end if;
 if p_digit is null or p_digit not between 0 and 9 or p_weekday is null or p_weekday not between 1 and 5 or p_from is null or p_until is null or p_until<p_from or p_start is null or p_end is null or p_end<=p_start or coalesce(p_source,'')!~ '^https://' then raise exception 'Revisa la regla y su fuente oficial.';end if;
 insert into restriction_rules(city,plate_digit,weekday,valid_from,valid_until,start_time,end_time,source_url,verified_at) values('Cali',p_digit,p_weekday,p_from,p_until,p_start,p_end,p_source,now());
 insert into audit_events(actor_id,action,details) values(auth.uid(),'restriction_added',jsonb_build_object('digit',p_digit,'until',p_until,'source',p_source));
end $$;
revoke all on function save_restriction(integer,integer,date,date,time,time,text) from public,anon;grant execute on function save_restriction(integer,integer,date,date,time,time,text) to authenticated;
create or replace function public_booking_availability(p_pickup timestamptz,p_minutes integer) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare d record; candidate timestamptz; choices jsonb:='[]'; n integer; reason text:='El horario solicitado está ocupado o fuera del horario de trabajo.';
begin
 if p_pickup is null or p_pickup<=now() or p_pickup>now()+interval '60 days' or p_minutes is null or p_minutes not between 1 and 480 then raise exception 'Elige una fecha futura dentro de los próximos 60 días.';end if;
 for d in select dr.id,dr.vehicle_id from drivers dr join vehicles v on v.id=dr.vehicle_id where dr.active and v.active loop
 if test_slot_available(d.id,d.vehicle_id,p_pickup,p_minutes) then return jsonb_build_object('available',true,'alternatives','[]'::jsonb);end if;
 end loop;
 if exists(select 1 from drivers dr join vehicles v on v.id=dr.vehicle_id join restriction_rules r on r.plate_digit=right(v.plate,1)::int where dr.active and v.active and r.city='Cali' and (p_pickup at time zone 'America/Bogota')::date between r.valid_from and r.valid_until and extract(dow from p_pickup at time zone 'America/Bogota')=r.weekday and (p_pickup at time zone 'America/Bogota')::time>=r.start_time and (p_pickup at time zone 'America/Bogota')::time<r.end_time and not exists(select 1 from restriction_exempt_dates h where h.service_date=(p_pickup at time zone 'America/Bogota')::date)) then reason:='Ese horario tiene restricción de pico y placa. Estos son los horarios siguientes que permiten completar el viaje.';end if;
 for n in 1..5760 loop
 candidate:=p_pickup+make_interval(mins=>n*15);exit when candidate>now()+interval '60 days';
 if exists(select 1 from drivers dr join vehicles v on v.id=dr.vehicle_id where dr.active and v.active and test_slot_available(dr.id,dr.vehicle_id,candidate,p_minutes)) then choices:=choices||jsonb_build_array(candidate);end if;
 exit when jsonb_array_length(choices)=3;
 end loop;
 return jsonb_build_object('available',false,'reason',reason,'alternatives',choices);
end $$;
commit;
