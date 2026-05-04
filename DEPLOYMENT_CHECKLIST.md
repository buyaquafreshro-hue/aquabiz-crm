# AquaBiz Deployment Checklist

## Supabase

1. Run `supabase-aquabiz-master-updates.sql` in Supabase SQL Editor.
2. Confirm Storage buckets exist:
   - `business-assets`
   - `expense-bills`
3. Confirm Business Settings has:
   - UPI ID
   - UPI Name
   - Bank details
   - Logo uploaded

## Netlify Environment Variables

Add these in Netlify:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

## Netlify Build Settings

```text
Build command: npm run build
Publish directory: dist
```

## Local Final Checks

```bash
npm run build
npm audit --omit=dev
```

## Production Smoke Test

- Admin login works
- Dashboard loads without red data error
- Customer CSV/Excel upload works
- Customer download works
- Booking creates job
- Technician login works
- Start Duty / End Duty works
- Invoice print works
- EMI QR amount is correct
- Collections save correctly
- Expenses and Cashbook save correctly
- Payroll calculation opens
- Reports print/download works
