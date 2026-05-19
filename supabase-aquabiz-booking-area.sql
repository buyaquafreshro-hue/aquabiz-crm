-- AquaBiz CRM booking area/locality support
-- Run once in Supabase SQL Editor before using the separate Area field on bookings.

alter table bookings
add column if not exists area text;

update bookings
set area = customers.area
from customers
where bookings.area is null
  and customers.area is not null
  and regexp_replace(coalesce(bookings.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(customers.mobile, ''), '\D', '', 'g');
