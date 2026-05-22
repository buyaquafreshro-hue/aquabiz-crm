-- Create communication_logs table for tracking call/whatsapp click events
create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  actor_role text not null,
  actor_id uuid,
  actor_name text,
  action_type text not null check (action_type in ('call', 'whatsapp')),
  customer_id uuid,
  lead_id uuid,
  booking_id uuid,
  job_assignment_id uuid,
  customer_name text,
  customer_mobile text,
  source_screen text,
  notes text
);

-- Enable RLS
alter table communication_logs enable row level security;

-- Create policies to allow all operations for simplicity in this application environment
create policy "Allow all operations for authenticated users" on communication_logs
  for all using (true) with check (true);
