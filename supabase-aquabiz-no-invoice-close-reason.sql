alter table job_assignments
add column if not exists no_invoice_reason text,
add column if not exists invoice_required boolean default true,
add column if not exists direct_closed_without_invoice boolean default false;

alter table bookings
add column if not exists no_invoice_reason text,
add column if not exists invoice_required boolean default true,
add column if not exists direct_closed_without_invoice boolean default false;

