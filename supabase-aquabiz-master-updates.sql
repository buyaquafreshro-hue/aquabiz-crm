-- AquaBiz CRM master update SQL
-- Run this in Supabase SQL Editor.

alter table ro_products
add column if not exists min_down_payment numeric default 0;

alter table ro_products
add column if not exists stock_qty numeric default 0;

alter table business_settings
add column if not exists upi_id text,
add column if not exists upi_name text,
add column if not exists bank_name text,
add column if not exists account_holder_name text,
add column if not exists account_number text,
add column if not exists ifsc_code text,
add column if not exists branch_name text,
add column if not exists logo_url text,
add column if not exists business_logo_url text;

alter table invoices
add column if not exists payment_confirmed boolean default false,
add column if not exists payment_confirmed_at timestamptz,
add column if not exists payment_confirmed_by text,
add column if not exists upi_qr_amount numeric default 0,
add column if not exists upi_id text,
add column if not exists sales_person_id uuid,
add column if not exists sales_incentive_amount numeric default 0;

alter table invoices
add column if not exists is_emi boolean default false,
add column if not exists product_price numeric default 0,
add column if not exists down_payment_total numeric default 0,
add column if not exists down_payment_cash numeric default 0,
add column if not exists down_payment_upi numeric default 0,
add column if not exists emi_amount numeric default 0,
add column if not exists emi_months integer default 0,
add column if not exists upfront_upi_qr_amount numeric default 0,
add column if not exists invoice_print_qr_amount numeric default 0,
add column if not exists emi_total_amount numeric default 0,
add column if not exists emi_advance_amount numeric default 0,
add column if not exists emi_monthly_amount numeric default 0,
add column if not exists emi_start_date date,
add column if not exists emi_next_due_date date,
add column if not exists emi_notes text,
add column if not exists emi_closed_at timestamptz;

create table if not exists sales_persons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text unique not null,
  pin text not null,
  is_active boolean default true,
  incentive_type text default 'percentage',
  incentive_value numeric default 0,
  created_at timestamptz default now()
);

create table if not exists technician_locations (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null,
  job_assignment_id uuid,
  latitude numeric not null,
  longitude numeric not null,
  accuracy numeric,
  battery_level numeric,
  is_online boolean default true,
  tracking_type text default 'duty',
  created_at timestamptz default now()
);

create table if not exists bom_templates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  product_name text,
  name text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists bom_template_items (
  id uuid primary key default gen_random_uuid(),
  bom_template_id uuid references bom_templates(id) on delete cascade,
  part_id uuid,
  part_name text,
  quantity numeric default 0,
  unit_cost numeric default 0,
  created_at timestamptz default now()
);

create table if not exists assembly_orders (
  id uuid primary key default gen_random_uuid(),
  bom_template_id uuid,
  product_id uuid,
  product_name text,
  quantity numeric default 0,
  unit_cost numeric default 0,
  total_cost numeric default 0,
  selling_price numeric default 0,
  profit numeric default 0,
  assembled_at date default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists assembly_order_items (
  id uuid primary key default gen_random_uuid(),
  assembly_order_id uuid references assembly_orders(id) on delete cascade,
  part_id uuid,
  part_name text,
  quantity numeric default 0,
  unit_cost numeric default 0,
  total_cost numeric default 0,
  created_at timestamptz default now()
);

create or replace view latest_technician_locations as
select distinct on (technician_id)
  *
from technician_locations
order by technician_id, created_at desc;

alter table sales_persons enable row level security;
alter table technician_locations enable row level security;
alter table bom_templates enable row level security;
alter table bom_template_items enable row level security;
alter table assembly_orders enable row level security;
alter table assembly_order_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sales_persons' and policyname = 'Allow app access sales_persons'
  ) then
    create policy "Allow app access sales_persons"
    on sales_persons for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'technician_locations' and policyname = 'Allow app access technician_locations'
  ) then
    create policy "Allow app access technician_locations"
    on technician_locations for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bom_templates' and policyname = 'Allow app access bom_templates'
  ) then
    create policy "Allow app access bom_templates"
    on bom_templates for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bom_template_items' and policyname = 'Allow app access bom_template_items'
  ) then
    create policy "Allow app access bom_template_items"
    on bom_template_items for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'assembly_orders' and policyname = 'Allow app access assembly_orders'
  ) then
    create policy "Allow app access assembly_orders"
    on assembly_orders for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'assembly_order_items' and policyname = 'Allow app access assembly_order_items'
  ) then
    create policy "Allow app access assembly_order_items"
    on assembly_order_items for all
    using (true)
    with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('business-assets', 'business-assets', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read business assets'
  ) then
    create policy "Public read business assets"
    on storage.objects for select
    using (bucket_id = 'business-assets');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow upload business assets'
  ) then
    create policy "Allow upload business assets"
    on storage.objects for insert
    with check (bucket_id = 'business-assets');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow update business assets'
  ) then
    create policy "Allow update business assets"
    on storage.objects for update
    using (bucket_id = 'business-assets')
    with check (bucket_id = 'business-assets');
  end if;
end $$;
