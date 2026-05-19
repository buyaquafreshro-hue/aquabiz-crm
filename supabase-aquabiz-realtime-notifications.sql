-- AquaBiz realtime notifications
-- Run this in Supabase SQL Editor if bookings/job assignment notifications do not fire.
-- It enables realtime INSERT events for new bookings and new technician job assignments.

do $$
begin
  begin
    alter publication supabase_realtime add table bookings;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table job_assignments;
  exception
    when duplicate_object then null;
  end;
end $$;
