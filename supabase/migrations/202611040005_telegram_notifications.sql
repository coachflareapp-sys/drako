begin;
alter table notification_outbox add column created_at timestamptz not null default now();
create unique index drivers_telegram_chat_unique on drivers(telegram_chat_id) where telegram_chat_id is not null;
grant select(created_at) on notification_outbox to authenticated;
create table telegram_link_codes(code_hash text primary key,driver_id uuid not null references drivers(id),expires_at timestamptz not null,used_at timestamptz);
alter table telegram_link_codes enable row level security;
revoke all on telegram_link_codes from anon,authenticated;

create function create_telegram_link(p_driver uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare code text:=encode(gen_random_bytes(32),'hex');
begin
 if auth.uid() is null or not(public.is_admin() or auth.uid()=p_driver) or not exists(select 1 from drivers where id=p_driver and active) then raise exception 'Acceso restringido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_driver::text,0));
 delete from telegram_link_codes where driver_id=p_driver or expires_at<now();
 insert into telegram_link_codes values(encode(sha256(convert_to(code,'UTF8')),'hex'),p_driver,now()+interval '10 minutes',null);
 return code;
end $$;
create function link_telegram_chat(p_code text,p_chat bigint) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare link telegram_link_codes;
begin
 if p_code is null or p_code!~'^[a-f0-9]{64}$' or p_chat is null or p_chat<=0 then return false;end if;
 select * into link from telegram_link_codes where code_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex') and expires_at>now();
 if not found then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(link.driver_id::text,0));
 select * into link from telegram_link_codes where code_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex') and expires_at>now() for update;
 if not found then return false;end if;
 if link.used_at is not null then return exists(select 1 from drivers where id=link.driver_id and telegram_chat_id=p_chat);end if;
 if exists(select 1 from drivers where telegram_chat_id=p_chat and id<>link.driver_id) then return false;end if;
 update drivers set telegram_chat_id=p_chat where id=link.driver_id and active;
 if not found then return false;end if;
 update telegram_link_codes set used_at=now() where code_hash=link.code_hash;
 insert into audit_events(actor_id,action,record_id) values(link.driver_id,'telegram_connected',link.driver_id);
 return true;
 exception when unique_violation then return false;
end $$;
create function disconnect_telegram(p_driver uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not(public.is_admin() or auth.uid()=p_driver) then raise exception 'Acceso restringido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_driver::text,0));
 update drivers set telegram_chat_id=null where id=p_driver;
 delete from telegram_link_codes where driver_id=p_driver;
 insert into audit_events(actor_id,action,record_id) values(auth.uid(),'telegram_disconnected',p_driver);
end $$;
create function telegram_connection_status() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',p.full_name,'linked',d.telegram_chat_id is not null)),'[]'::jsonb)
 from drivers d join profiles p on p.id=d.id where d.active and (public.is_admin() or d.id=auth.uid())
$$;
revoke all on function create_telegram_link(uuid),disconnect_telegram(uuid),telegram_connection_status() from public,anon;
grant execute on function create_telegram_link(uuid),disconnect_telegram(uuid),telegram_connection_status() to authenticated;
revoke all on function link_telegram_chat(text,bigint) from public,anon,authenticated;
grant execute on function link_telegram_chat(text,bigint) to service_role;

-- Switch new events to the free driver channel. No automatic WhatsApp delivery.
create or replace function queue_booking_whatsapp() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare event text;
begin
 if new.is_test then return new;end if;
 if tg_op='INSERT' then event:='recibida';elsif old.is_test then event:='recibida';
 elsif new.pickup_at is distinct from old.pickup_at then event:='reprogramada';
 elsif new.status is distinct from old.status then event:=case new.status when 'confirmed' then 'confirmada' when 'cancelled' then 'cancelada' when 'rejected' then 'rechazada' when 'completed' then 'finalizada' else null end;
 else return new;end if;
 if event is null or not exists(select 1 from profiles where id=new.driver_id and notify_trips) then return new;end if;
 insert into notification_outbox(booking_id,event_type,channel,payload)
 values(new.id,event||':conductor:'||extract(epoch from clock_timestamp())::text,'telegram',jsonb_build_object('driver_id',new.driver_id,'event',event,'reference',new.reference,'first_name',new.first_name,'last_name',new.last_name,'phone',new.phone,'origin',new.origin,'destination',new.destination,'stops',new.stops,'passengers',new.passengers,'pets',new.pets,'luggage',new.luggage,'luggage_details',new.luggage_details,'pickup_at',new.pickup_at,'created_at',new.created_at,'price_cop',new.price_cop,'payment_method',new.payment_method)) on conflict do nothing;
 return new;
end $$;
update notification_outbox n set channel='telegram',payload=(n.payload-'to')||jsonb_build_object('driver_id',b.driver_id),last_error=null,next_attempt_at=now()
from bookings b where b.id=n.booking_id and n.channel='whatsapp' and n.payload->>'audience'='driver' and n.provider_message_id is null and n.delivered_at is null and b.pickup_at>now();
update notification_outbox set next_attempt_at='infinity',last_error='WhatsApp automático desactivado: se utilizará confirmación web y Telegram para el conductor.' where channel='whatsapp' and provider_message_id is null and delivered_at is null;

create function claim_telegram_notifications() returns setof notification_outbox
language sql security definer set search_path=public,pg_temp as $$
 update notification_outbox n set attempts=n.attempts+1,next_attempt_at=now()+interval '5 minutes',payload=n.payload||jsonb_build_object('chat_id',(select d.telegram_chat_id from drivers d where d.id=(n.payload->>'driver_id')::uuid))
 where n.id in(select q.id from notification_outbox q join drivers d on d.id=(q.payload->>'driver_id')::uuid join profiles p on p.id=d.id where q.channel='telegram' and q.delivered_at is null and q.provider_message_id is null and q.attempts<8 and q.next_attempt_at<=now() and q.created_at>now()-interval '48 hours' and d.active and d.telegram_chat_id is not null and p.notify_trips order by q.next_attempt_at for update of q skip locked limit 10)
 returning n.*
$$;
revoke all on function claim_telegram_notifications() from public,anon,authenticated;
grant execute on function claim_telegram_notifications() to service_role;
create function telegram_chat_unreachable(p_driver uuid,p_chat bigint) returns void
language sql security definer set search_path=public,pg_temp as $$
 update drivers set telegram_chat_id=null where id=p_driver and telegram_chat_id=p_chat
$$;
revoke all on function telegram_chat_unreachable(uuid,bigint) from public,anon,authenticated;
grant execute on function telegram_chat_unreachable(uuid,bigint) to service_role;
commit;
