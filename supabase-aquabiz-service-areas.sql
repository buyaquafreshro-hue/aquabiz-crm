-- AquaBiz CRM area / territory / zone master
-- Run once in Supabase SQL Editor before using admin-managed areas.

create table if not exists service_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  technician_ids uuid[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table bookings
add column if not exists area text;

alter table service_areas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'service_areas'
      and policyname = 'Allow app access service_areas'
  ) then
    create policy "Allow app access service_areas"
    on service_areas for all
    using (true)
    with check (true);
  end if;
end $$;
 