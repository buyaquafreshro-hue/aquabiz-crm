-- AquaBiz CRM job reassignment, completion invoice, and 48-hour completed jobs support
-- Run this once in Supabase SQL Editor before deploying the updated frontend.

alter table job_assignments
add column if not exists reassigned_from uuid,
add column if not exists reassigned_at timestamptz,
add column if not exists is_active boolean default true,
add column if not exists assignment_status text default 'assigned',
add column if not exists job_status text default 'assigned',
add column if not exists completed_at timestamptz;

update job_assignments
set is_active = true
where is_active is null;

update job_assignments
set assignment_status = case
  when lower(coalesce(status, '')) in ('completed', 'complete', 'done', 'closed') then 'completed'
  when lower(coalesce(status, '')) in ('cancelled', 'canceled') then 'cancelled'
  else 'assigned'
end
where assignment_status is null;

alter table bookings
add column if not exists assigned_technician_id uuid,
add column if not exists booking_status text,
add column if not exists completed_at timestamptz;

alter table invoices
add column if not exists booking_id uuid,
add column if not exists job_assignment_id uuid,
add column if not exists technician_id uuid,
add column if not exists invoice_reason text,
add column if not exists coverage_type text,
add column if not exists is_zero_invoice boolean default false;

create or replace function reassign_technician(
  p_booking_id uuid,
  p_old_technician_id uuid,
  p_new_technician_id uuid
)
returns void
language plpgsql
as $$
declare
  v_old_assignment_id uuid;
begin
  select id
  into v_old_assignment_id
  from job_assignments
  where booking_id = p_booking_id
    and technician_id = p_old_technician_id
    and coalesce(is_active, true) = true
    and lower(coalesce(status, assignment_status, 'assigned')) not in ('completed', 'complete', 'done', 'closed', 'cancelled', 'canceled')
  order by created_at desc
  limit 1;

  if v_old_assignment_id is null then
    raise exception 'Completed or cancelled jobs cannot be reassigned.';
  end if;

  update job_assignments
  set is_active = false,
      assignment_status = 'reassigned',
      reassigned_at = now()
  where id = v_old_assignment_id;

  insert into job_assignments (
    booking_id,
    technician_id,
    reassigned_from,
    is_active,
    assignment_status,
    status,
    job_status
  )
  values (
    p_booking_id,
    p_new_technician_id,
    v_old_assignment_id,
    true,
    'assigned',
    'Assigned',
    'assigned'
  );

  update bookings
  set assigned_technician_id = p_new_technician_id,
      booking_status = 'assigned'
  where id = p_booking_id;
end;
$$;

create or replace function complete_job_with_invoice(
  p_booking_id uuid,
  p_job_assignment_id uuid,
  p_invoice_id uuid
)
returns void
language plpgsql
as $$
begin
  if p_invoice_id is null then
    raise exception 'Invoice is required before closing the job.';
  end if;

  update job_assignments
  set status = 'Completed',
      job_status = 'completed',
      assignment_status = 'completed',
      completed_at = now()
  where id = p_job_assignment_id;

  update bookings
  set booking_status = 'completed',
      completed_at = now()
  where id = p_booking_id;
end;
$$;
