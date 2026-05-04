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

create table if not exists employee_salary_settings (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  employee_id text not null,
  employee_name text,
  fixed_salary numeric default 0,
  salary_type text default 'fixed_incentive',
  per_booking_incentive numeric default 0,
  per_completed_job_incentive numeric default 0,
  sales_percentage_incentive numeric default 0,
  amc_sale_incentive numeric default 0,
  installation_incentive numeric default 0,
  repeat_job_penalty numeric default 0,
  target_amount numeric default 0,
  target_bonus numeric default 0,
  advance_deduction numeric default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (role, employee_id)
);

create table if not exists salary_advances (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  employee_id text not null,
  employee_name text,
  amount numeric default 0,
  advance_date date default current_date,
  notes text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  employee_salary_setting_id uuid,
  employee_id text not null,
  employee_name text,
  role text not null,
  salary_type text default 'fixed_incentive',
  fixed_salary numeric default 0,
  revenue_generated numeric default 0,
  bookings_count integer default 0,
  completed_jobs_count integer default 0,
  sales_count integer default 0,
  incentive_amount numeric default 0,
  penalty_amount numeric default 0,
  advance_amount numeric default 0,
  final_payable numeric default 0,
  status text default 'Draft',
  calculated_at timestamptz default now(),
  paid_at timestamptz,
  payment_mode text default 'Cash',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (month, employee_id, role)
);

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date default current_date,
  category_id uuid,
  category_name text,
  amount numeric default 0,
  payment_mode text default 'Cash',
  paid_to text,
  notes text,
  bill_url text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cashbook_openings (
  id uuid primary key default gen_random_uuid(),
  cashbook_date date not null unique,
  opening_cash numeric default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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
alter table employee_salary_settings enable row level security;
alter table salary_advances enable row level security;
alter table payroll_runs enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table cashbook_openings enable row level security;
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
    select 1 from pg_policies where schemaname = 'public' and tablename = 'employee_salary_settings' and policyname = 'Allow app access employee_salary_settings'
  ) then
    create policy "Allow app access employee_salary_settings"
    on employee_salary_settings for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'salary_advances' and policyname = 'Allow app access salary_advances'
  ) then
    create policy "Allow app access salary_advances"
    on salary_advances for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'payroll_runs' and policyname = 'Allow app access payroll_runs'
  ) then
    create policy "Allow app access payroll_runs"
    on payroll_runs for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'expense_categories' and policyname = 'Allow app access expense_categories'
  ) then
    create policy "Allow app access expense_categories"
    on expense_categories for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'expenses' and policyname = 'Allow app access expenses'
  ) then
    create policy "Allow app access expenses"
    on expenses for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cashbook_openings' and policyname = 'Allow app access cashbook_openings'
  ) then
    create policy "Allow app access cashbook_openings"
    on cashbook_openings for all
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

insert into storage.buckets (id, name, public)
values ('expense-bills', 'expense-bills', true)
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

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read expense bills'
  ) then
    create policy "Public read expense bills"
    on storage.objects for select
    using (bucket_id = 'expense-bills');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow upload expense bills'
  ) then
    create policy "Allow upload expense bills"
    on storage.objects for insert
    with check (bucket_id = 'expense-bills');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Allow update expense bills'
  ) then
    create policy "Allow update expense bills"
    on storage.objects for update
    using (bucket_id = 'expense-bills')
    with check (bucket_id = 'expense-bills');
  end if;
end $$;
