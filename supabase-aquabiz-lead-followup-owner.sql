-- AquaBiz CRM lead follow-up owner support
-- Run once in Supabase SQL Editor before using sales-executive lead follow-up assignment.

alter table leads
add column if not exists follow_up_owner_type text,
add column if not exists follow_up_owner_id uuid,
add column if not exists follow_up_owner_name text,
add column if not exists assigned_sales_person_id uuid,
add column if not exists assigned_sales_person_name text;

update leads
set follow_up_owner_type = 'telecaller',
    follow_up_owner_id = case
      when coalesce(assigned_telecaller_id::text, telecaller_id::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then coalesce(assigned_telecaller_id::text, telecaller_id::text)::uuid
      else null
    end,
    follow_up_owner_name = coalesce(assigned_telecaller_name, '')
where follow_up_owner_id is null
  and coalesce(assigned_telecaller_id::text, telecaller_id::text) is not null;
