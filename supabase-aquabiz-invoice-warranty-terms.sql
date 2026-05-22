-- Add warranty_terms and customer_address columns to invoices table to store terms and address at invoice generation time
alter table invoices
add column if not exists warranty_terms text,
add column if not exists customer_address text;

-- Add signature_url column to business_settings table
alter table business_settings
add column if not exists signature_url text;
