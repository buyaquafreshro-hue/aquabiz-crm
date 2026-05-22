alter table invoices
add column if not exists is_gst_invoice boolean default false;

alter table business_settings
add column if not exists gst_upi_id text,
add column if not exists gst_upi_name text;
