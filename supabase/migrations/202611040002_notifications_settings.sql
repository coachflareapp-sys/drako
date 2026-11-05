begin;
alter table bookings add column whatsapp_consent boolean not null default false;
alter table notification_outbox drop constraint notification_outbox_channel_check;
alter table notification_outbox add constraint notification_outbox_channel_check check(channel in('telegram','push','whatsapp'));
alter table notification_outbox add column last_error text;
alter table notification_outbox add column provider_message_id text;
alter table notification_outbox add column provider_accepted_at timestamptz;
create policy outbox_status_read on notification_outbox for select to authenticated using(public.is_admin() or exists(select 1 from bookings b where b.id=booking_id and b.driver_id=auth.uid()));
grant select(id,booking_id,event_type,channel,attempts,next_attempt_at,delivered_at,last_error,provider_message_id,provider_accepted_at) on notification_outbox to authenticated;

create table site_settings(id boolean primary key default true check(id),welcome_title text not null,welcome_message text not null,booking_notice text not null);
insert into site_settings values(true,'Tu destino. Tu horario. Un viaje tranquilo.','Bienvenido a DRAKO. Programa tu recorrido en Cali y sus alrededores con atención directa y un valor aproximado antes de solicitarlo.','Una vez planificado el viaje se generará un costo. No se tendrán en cuenta paradas adicionales no registradas.');
alter table site_settings enable row level security;
revoke all on site_settings from anon,authenticated;
create function get_public_settings() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select to_jsonb(s)-'id' from site_settings s where id$$;
create function update_site_settings(p_title text,p_message text,p_notice text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception 'Acceso restringido.';end if;
 if length(trim(coalesce(p_title,''))) not between 3 and 120 or length(trim(coalesce(p_message,''))) not between 10 and 600 or length(trim(coalesce(p_notice,''))) not between 10 and 600 then raise exception 'Revisa la longitud de los mensajes.';end if;
 update site_settings set welcome_title=trim(p_title),welcome_message=trim(p_message),booking_notice=trim(p_notice) where id;
 insert into audit_events(actor_id,action) values(auth.uid(),'site_messages_updated');
end $$;
revoke all on function get_public_settings() from public;grant execute on function get_public_settings() to anon,authenticated;
revoke all on function update_site_settings(text,text,text) from public,anon;grant execute on function update_site_settings(text,text,text) to authenticated;

-- Copy the explicit opt-in before the trusted submit changes is_test to false.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.submit_quoted_booking(uuid,text,uuid,jsonb)'::regprocedure) into definition;
 if strpos(definition,'is_test=false,price_cop=q.price_cop')=0 then raise exception 'Unexpected booking update';end if;
 definition:=replace(definition,'is_test=false,price_cop=q.price_cop','whatsapp_consent=coalesce((p_data->>''whatsapp_consent'')::boolean,false),is_test=false,price_cop=q.price_cop');execute definition;
end $$;
create function queue_booking_whatsapp() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare event text; driver_phone text; content text;
begin
 if new.is_test then return new;end if;
 if tg_op='INSERT' then event:='recibida';
 elsif old.is_test then event:='recibida';
 elsif new.pickup_at is distinct from old.pickup_at then event:='reprogramada';
 elsif new.status is distinct from old.status then event:=case new.status when 'confirmed' then 'confirmada' when 'cancelled' then 'cancelada' when 'rejected' then 'rechazada' when 'completed' then 'finalizada' else null end;
 else return new;end if;
 if event is null then return new;end if;
 select d.phone into driver_phone from drivers d join profiles p on p.id=d.id where d.id=new.driver_id and p.notify_trips;
 content:=new.reference||' · '||new.first_name||coalesce(' '||new.last_name,'')||' · Móvil: '||new.phone||' · Recogida: '||coalesce(new.origin->>'address','')||' · Llegada: '||coalesce(new.destination->>'address','')||' · Fecha Colombia: '||to_char(new.pickup_at at time zone 'America/Bogota','YYYY-MM-DD HH24:MI')||' · Pasajeros: '||new.passengers||' · Mascotas: '||case when new.pets then 'Sí' else 'No' end||' · Equipaje: '||coalesce(nullif(new.luggage_details,''),case when new.luggage then 'Sí' else 'No' end)||' · Valor COP: '||new.price_cop;
 if driver_phone is not null then insert into notification_outbox(booking_id,event_type,channel,payload) values(new.id,event||':conductor:'||extract(epoch from clock_timestamp())::text,'whatsapp',jsonb_build_object('audience','driver','to',driver_phone,'event',event,'reference',new.reference,'details',left(content,1000))) on conflict do nothing;end if;
 if new.whatsapp_consent then insert into notification_outbox(booking_id,event_type,channel,payload) values(new.id,event||':pasajero:'||extract(epoch from clock_timestamp())::text,'whatsapp',jsonb_build_object('audience','customer','to',new.phone,'event',event,'reference',new.reference,'details',left(content,1000))) on conflict do nothing;end if;
 return new;
end $$;
create trigger booking_whatsapp_event after insert or update of status,pickup_at,is_test on bookings for each row execute function queue_booking_whatsapp();
revoke all on function queue_booking_whatsapp() from public,anon,authenticated;
create function claim_whatsapp_notifications() returns setof notification_outbox
language sql security definer set search_path=public,pg_temp as $$
 update notification_outbox set attempts=attempts+1,next_attempt_at=now()+interval '5 minutes'
 where id in(select id from notification_outbox where channel='whatsapp' and delivered_at is null and provider_message_id is null and attempts<8 and next_attempt_at<=now() order by next_attempt_at for update skip locked limit 10) returning *
$$;
revoke all on function claim_whatsapp_notifications() from public,anon,authenticated;grant execute on function claim_whatsapp_notifications() to service_role;
commit;
