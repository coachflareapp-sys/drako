begin;
-- Only explicitly approved emails receive privileged roles.
create function public.provision_drako_user() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare selected_role text; selected_name text;
begin
 if new.email_confirmed_at is null then return new; end if;
 case lower(new.email)
 when 'cegarve@hotmail.com' then selected_role:='driver'; selected_name:='Carlos Eduardo García';
 when 'drakotransportapp@gmail.com' then selected_role:='business_admin'; selected_name:='Administración DRAKO';
 when 'aitrezsg@gmail.com' then selected_role:='technical_admin'; selected_name:='AITREZ Solutions Group';
 else selected_role:='customer'; selected_name:=coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Cliente');
 end case;
 insert into profiles(id,full_name,role,notify_trips) values(new.id,selected_name,selected_role,selected_role='driver')
 on conflict(id) do nothing;
 if selected_role='driver' then
 insert into drivers(id,vehicle_id,phone) select new.id,id,'+573154717642' from vehicles where plate='IZN897'
 on conflict(id) do nothing;
 if exists(select 1 from drivers where id=new.id) and not exists(select 1 from working_hours where driver_id=new.id) then
 insert into working_hours(driver_id,weekday,start_time,end_time,valid_from)
 select new.id,d,'07:00'::time,case when d=6 then '12:00'::time else '20:00'::time end,(now() at time zone 'America/Bogota')::date
 from unnest(array[1,2,3,4,6]) d;
 end if;
 end if;
 return new;
end $$;
revoke all on function public.provision_drako_user() from public,anon,authenticated;
create trigger drako_user_created after insert or update of email_confirmed_at on auth.users
for each row execute function public.provision_drako_user();
-- Backfill existing, confirmed, approved accounts without changing auth credentials.
insert into profiles(id,full_name,role,notify_trips)
select id,
 case lower(email) when 'cegarve@hotmail.com' then 'Carlos Eduardo García' when 'aitrezsg@gmail.com' then 'AITREZ Solutions Group' else 'Administración DRAKO' end,
 case lower(email) when 'cegarve@hotmail.com' then 'driver' when 'aitrezsg@gmail.com' then 'technical_admin' else 'business_admin' end,
 lower(email)='cegarve@hotmail.com'
from auth.users where email_confirmed_at is not null and lower(email) in('cegarve@hotmail.com','aitrezsg@gmail.com','drakotransportapp@gmail.com')
on conflict(id) do nothing;
insert into drivers(id,vehicle_id,phone)
select p.id,v.id,'+573154717642' from profiles p join auth.users u on u.id=p.id cross join vehicles v
where lower(u.email)='cegarve@hotmail.com' and p.role='driver' and v.plate='IZN897'
on conflict(id) do nothing;
insert into working_hours(driver_id,weekday,start_time,end_time,valid_from)
select dr.id,d,'07:00'::time,case when d=6 then '12:00'::time else '20:00'::time end,(now() at time zone 'America/Bogota')::date
from drivers dr cross join unnest(array[1,2,3,4,6]) d
where not exists(select 1 from working_hours wh where wh.driver_id=dr.id);

create function public.replace_working_hours(p_driver_id uuid,p_hours jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare entry jsonb; slot record; candidate_date date; fits boolean; start_at timestamptz; end_at timestamptz; dow integer;
begin
 if auth.uid() is null or not (public.is_admin() or (auth.uid()=p_driver_id and exists(select 1 from drivers where id=auth.uid()))) then
 raise exception 'No tienes permiso para modificar este horario.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_driver_id::text,0));
 if not exists(select 1 from drivers where id=p_driver_id) then raise exception 'Conductor inexistente.'; end if;
 if jsonb_typeof(p_hours)<>'array' or jsonb_array_length(p_hours)>28 then raise exception 'Horario inválido.'; end if;
 for entry in select value from jsonb_array_elements(p_hours) loop
 if not (entry ?& array['weekday','start_time','end_time','end_day_offset']) then raise exception 'Horario incompleto.'; end if;
 if (entry->>'weekday')::int not between 0 and 6 or (entry->>'end_day_offset')::int not in(0,1)
 or ((entry->>'end_day_offset')::int=0 and (entry->>'end_time')::time <= (entry->>'start_time')::time) then raise exception 'Intervalo inválido.'; end if;
 end loop;
 -- Active future reservations must fit the new recurring hours, or their dated exception.
 for slot in select occupied_range from calendar_slots where driver_id=p_driver_id and active and kind='booking' and upper(occupied_range)>now() loop
 fits:=false;
 for dow in 0..1 loop
 candidate_date:=(lower(slot.occupied_range) at time zone 'America/Bogota')::date-dow;
 if exists(select 1 from schedule_exceptions where driver_id=p_driver_id and service_date=candidate_date) then
 fits:=fits or exists(select 1 from schedule_exceptions ex where ex.driver_id=p_driver_id and ex.service_date=candidate_date and not ex.closed
 and tstzrange((candidate_date+ex.start_time) at time zone 'America/Bogota',((candidate_date+ex.end_day_offset)+ex.end_time) at time zone 'America/Bogota','[)') @> slot.occupied_range);
 else
 for entry in select value from jsonb_array_elements(p_hours) loop
 if (entry->>'weekday')::int=extract(dow from candidate_date)::int then
 start_at:=(candidate_date+(entry->>'start_time')::time) at time zone 'America/Bogota';
 end_at:=((candidate_date+(entry->>'end_day_offset')::int)+(entry->>'end_time')::time) at time zone 'America/Bogota';
 fits:=fits or tstzrange(start_at,end_at,'[)') @> slot.occupied_range;
 end if;
 end loop;
 end if;
 end loop;
 if not fits then raise exception 'El cambio afecta una reserva activa. Reprograma el servicio antes de modificar el horario.'; end if;
 end loop;
 delete from working_hours where driver_id=p_driver_id;
 insert into working_hours(driver_id,weekday,start_time,end_time,end_day_offset,valid_from)
 select p_driver_id,(value->>'weekday')::int,(value->>'start_time')::time,(value->>'end_time')::time,(value->>'end_day_offset')::int,(now() at time zone 'America/Bogota')::date
 from jsonb_array_elements(p_hours);
 insert into audit_events(actor_id,action,record_id,details) values(auth.uid(),'working_hours_replaced',p_driver_id,p_hours);
end $$;
revoke all on function public.replace_working_hours(uuid,jsonb) from public,anon;
grant execute on function public.replace_working_hours(uuid,jsonb) to authenticated;
commit;
