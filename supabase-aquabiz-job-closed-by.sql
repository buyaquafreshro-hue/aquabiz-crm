alter table job_assignments
add column if not exists closed_by_id uuid,
add column if not exists closed_by_name text,
add column if not exists closed_by_role text,
add column if not exists closed_at timestamptz;

alter table bookings
add column if not exists closed_by_id uuid,
add column if not exists closed_by_name text,
add column if not exists closed_by_role text,
add column if not exists closed_at timestamptz;

