-- Apply only after review. No production data or auth users are created here.
begin;
create extension if not exists btree_gist;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 role text not null check (role in ('customer','driver','business_admin','technical_admin')),
 notify_trips boolean not null default false
);
create function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from profiles where id=auth.uid() and role in ('business_admin','technical_admin')); $$;
create table public.vehicles (
 id uuid primary key default gen_random_uuid(),
 plate text not null unique check (plate ~ '^[A-Z]{3}[0-9]{3}$'),
 brand text not null, model_line text not null, model_year integer not null,
 color text not null, passenger_capacity integer check(passenger_capacity between 1 and 20),
 luggage_policy text, photo_url text, active boolean not null default true
);
create table public.drivers (
 id uuid primary key references profiles(id), vehicle_id uuid references vehicles(id),
 phone text not null, telegram_chat_id bigint, active boolean not null default true
);
create table public.working_hours (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references drivers(id),
 weekday integer not null check(weekday between 0 and 6),
 start_time time not null, end_time time not null,
 end_day_offset integer not null default 0 check(end_day_offset in (0,1)),
 valid_from date not null, valid_until date,
 check(valid_until is null or valid_until >= valid_from),
 check(end_day_offset=1 or end_time>start_time)
);
-- Dated exceptions replace recurring hours for their starting date.
create table public.schedule_exceptions (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references drivers(id),
 service_date date not null, closed boolean not null default false,
 start_time time, end_time time, end_day_offset integer not null default 0 check(end_day_offset in(0,1)),
 check(closed or (start_time is not null and end_time is not null and (end_day_offset=1 or end_time>start_time)))
);
create table public.restriction_rules (
 id uuid primary key default gen_random_uuid(), city text not null,
 plate_digit integer not null check(plate_digit between 0 and 9), weekday integer not null check(weekday between 0 and 6),
 valid_from date not null, valid_until date not null,
 start_time time not null, end_time time not null,
 source_url text, verified_at timestamptz,
 check(valid_until>=valid_from), check(end_time>start_time)
);
create table public.tariff_versions (
 id uuid primary key default gen_random_uuid(), effective_from timestamptz not null,
 per_km_cop integer not null check(per_km_cop>=0),
 minimum_cop integer check(minimum_cop>=0),
 pet_extra_cop integer check(pet_extra_cop>=0), luggage_extra_cop integer check(luggage_extra_cop>=0),
 enabled boolean not null default false
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique default ('DRK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 customer_id uuid references profiles(id), driver_id uuid not null references drivers(id), vehicle_id uuid not null references vehicles(id),
 first_name text not null, last_name text, phone text not null,
 origin jsonb not null, destination jsonb not null, stops jsonb not null default '[]',
 passengers integer not null check(passengers>0), pets boolean not null default false,
 luggage boolean not null default false, luggage_details text,
 pickup_at timestamptz not null, estimated_finish_at timestamptz not null,
 distance_m integer not null check(distance_m>0), duration_s integer not null check(duration_s>0),
 tariff_id uuid not null references tariff_versions(id), price_cop integer not null check(price_cop>=0),
 price_breakdown jsonb not null,
 status text not null default 'confirmed' check(status in('confirmed','en_route','in_progress','completed','cancelled')),
 payment_method text not null check(payment_method in('nequi','daviplata')),
 payment_status text not null default 'pending' check(payment_status in('pending','verified','paid')),
 created_at timestamptz not null default now(), check(estimated_finish_at>pickup_at)
);
-- Reservations and manual blocks share one exclusion constraint.
create table public.calendar_slots (
 id uuid primary key default gen_random_uuid(), driver_id uuid not null references drivers(id),
 vehicle_id uuid references vehicles(id), booking_id uuid unique references bookings(id),
 occupied_range tstzrange not null, kind text not null check(kind in('booking','personal_block')),
 active boolean not null default true, reason text,
 check(not isempty(occupied_range) and not lower_inf(occupied_range) and not upper_inf(occupied_range)),
 check(lower_inc(occupied_range) and not upper_inc(occupied_range)),
 exclude using gist(driver_id with =, occupied_range with &&) where(active),
 exclude using gist(vehicle_id with =, occupied_range with &&) where(active and vehicle_id is not null)
);
create table public.guest_access (
 booking_id uuid primary key references bookings(id) on delete cascade,
 token_hash text not null unique, expires_at timestamptz not null
);
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references bookings(id),
 event_type text not null, channel text not null check(channel in('telegram','push')),
 payload jsonb not null, attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(), delivered_at timestamptz,
 unique(booking_id,event_type,channel)
);
create table public.audit_events (
 id bigint generated always as identity primary key, actor_id uuid references profiles(id),
 action text not null, record_id uuid, details jsonb, created_at timestamptz not null default now()
);
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table drivers enable row level security;
alter table working_hours enable row level security;
alter table schedule_exceptions enable row level security;
alter table restriction_rules enable row level security;
alter table tariff_versions enable row level security;
alter table bookings enable row level security;
alter table calendar_slots enable row level security;
alter table guest_access enable row level security;
alter table notification_outbox enable row level security;
alter table audit_events enable row level security;
create policy profile_read on profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy vehicle_read on vehicles for select to authenticated using(public.is_admin() or exists(select 1 from drivers where id=auth.uid() and vehicle_id=vehicles.id));
create policy driver_read on drivers for select to authenticated using(id=auth.uid() or public.is_admin());
create policy hours_read on working_hours for select to authenticated using(driver_id=auth.uid() or public.is_admin());
create policy exceptions_read on schedule_exceptions for select to authenticated using(driver_id=auth.uid() or public.is_admin());
create policy restrictions_read on restriction_rules for select to authenticated using(public.is_admin() or exists(select 1 from drivers where id=auth.uid()));
create policy tariffs_read on tariff_versions for select to authenticated using(public.is_admin() or exists(select 1 from drivers where id=auth.uid()));
create policy bookings_read on bookings for select to authenticated using(customer_id=auth.uid() or driver_id=auth.uid() or public.is_admin());
create policy slots_read on calendar_slots for select to authenticated using(driver_id=auth.uid() or public.is_admin());
create policy audit_read on audit_events for select to authenticated using(public.is_admin());
-- All writes go through server operations. No public access to tokens/outbox.
revoke all on profiles,vehicles,drivers,working_hours,schedule_exceptions,restriction_rules,tariff_versions,bookings,calendar_slots,guest_access,notification_outbox,audit_events from anon;
revoke all on guest_access,notification_outbox from authenticated;
revoke insert,update,delete on profiles,vehicles,drivers,working_hours,schedule_exceptions,restriction_rules,tariff_versions,bookings,calendar_slots,audit_events from authenticated;
grant select on profiles,vehicles,drivers,working_hours,schedule_exceptions,restriction_rules,tariff_versions,bookings,calendar_slots,audit_events to authenticated;
insert into vehicles(plate,brand,model_line,model_year,color,luggage_policy)
values('IZN897','Kia','Rio Stylus',2016,'Plata','Cantidad y tamaño de maletas sujetos a capacidad física verificada');
insert into tariff_versions(effective_from,per_km_cop,enabled) values(now(),2000,false);
commit;
