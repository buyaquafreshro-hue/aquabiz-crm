-- Preview booking-only customer master rows that have no invoice, coverage, or payment history.
-- Run this SELECT first and verify the rows before running the DELETE below.
select c.id, c.name, c.mobile, c.created_at
from customers c
where not exists (
  select 1 from invoices i
  where regexp_replace(coalesce(i.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')
)
and not exists (
  select 1 from customer_coverages cc
  where regexp_replace(coalesce(cc.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')
)
and not exists (
  select 1 from invoice_payments p
  where regexp_replace(coalesce(p.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')
);

-- After verifying the preview rows, uncomment and run this cleanup:
-- delete from customers c
-- where not exists (
--   select 1 from invoices i
--   where regexp_replace(coalesce(i.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')
-- )
-- and not exists (
--   select 1 from customer_coverages cc
--   where regexp_replace(coalesce(cc.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')
-- )
-- and not exists (
--   select 1 from invoice_payments p
--   where regexp_replace(coalesce(p.mobile, ''), '\D', '', 'g') = regexp_replace(coalesce(c.mobile, ''), '\D', '', 'g')
-- );

