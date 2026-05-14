# AquaBiz CRM – Project Knowledge

## 1. Project Overview
- Project Name: AquaBiz
- Type: RO Service Business CRM
- Frontend: React + Vite + TailwindCSS
- Backend: Supabase
- Hosting: Netlify
- User type: Shop owner/admin, technician, telecaller, sales person
- Current stage: Live testing / MVP stabilization

## 2. Core Purpose
AquaBiz is a CRM for RO service businesses to manage:
- Customers and Leads
- Bookings and Jobs
- Technician tracking and assignments
- Telecaller and Sales management
- AMC (Annual Maintenance Contract) and Warranty (Customer Coverages)
- Invoices and Split payments (Cash/UPI/EMI)
- Inventory, Parts, and Restocking (BOM Assembly)
- Payroll, Cashbook, and Expenses
- Reports, Reminders, and Collections
- Backup/restore
- Business settings

## 3. Current Main Features

### Admin / Shop Owner
- Email/password login using Supabase Auth
- Dashboard with live stats
- Leads and Customer management
- New booking creation
- Technician assignment and live tracking
- Invoice generation (Service, AMC Sale, New RO Sale)
- Payment management including EMI
- Inventory, Restocking, and BOM (Bill of Materials) Assembly
- Payroll, Expense, and Cashbook management
- Business settings and Reminders
- Comprehensive Reports
- Backup and restore data

### Technician
- Technician mode login (currently mock session via PIN/mobile or ID)
- Technician should only see assigned jobs
- Update job status
- Manage technician parts and inventory usage
- Generate invoices
- Cannot see admin dashboard or navigation

### Telecaller
- Telecaller mode login
- View and manage leads
- Create bookings directly from leads
- Cannot see admin dashboard

### Sales Person
- Sales mode login
- Track sales and generated invoices
- Cannot see admin dashboard

## 4. Current Tech Stack
- React 19
- Vite
- TailwindCSS (via index.css and @tailwindcss/cli)
- Supabase JS client v2
- Supabase Database (PostgreSQL)
- Supabase Auth
- Netlify hosting
- CSS in `src/index.css`
- Main app logic mostly in `src/App.jsx`
- PDF generation (jspdf)
- Maps and tracking (leaflet, react-leaflet)
- Excel parsing (read-excel-file)

## 5. Important Files
- `src/App.jsx` – main CRM logic, routing, and lazy loaded pages
- `src/index.css` – core styling and Tailwind setup
- `src/main.jsx` – React entry file
- `src/supabaseClient.js` – Supabase connection setup
- `src/services/appDataService.js` – Central data fetching from Supabase
- `src/hooks/useAuthSession.js` – Authentication hook (Supabase Auth + Role sessions)
- `supabase-aquabiz-master-updates.sql` - Recent database migrations and RLS policies

## 6. Supabase Tables Used
- `services`
- `technicians`
- `technician_locations`
- `telecallers`
- `sales_persons`
- `customers`
- `leads`
- `bookings`
- `job_assignments`
- `invoices`
- `invoice_items`
- `invoice_payments`
- `part_categories`
- `inventory_items`
- `inventory_purchases`
- `inventory_usage`
- `technician_parts`
- `amc_plans`
- `ro_products`
- `customer_coverages`
- `business_settings`
- `employee_salary_settings`
- `salary_advances`
- `payroll_runs`
- `expense_categories`
- `expenses`
- `cashbook_openings`
- `bom_templates`
- `bom_template_items`
- `assembly_orders`
- `assembly_order_items`

## 7. Current Business Logic

### Booking & Leads
- Leads can be created by telecallers.
- Bookings convert leads or are created directly with Customer name, mobile, address, service type, complaint notes.
- Service price comes from `services.price`.
- Booking amount should auto-fill based on selected service.

### Technician Assignment
- `job_assignments` stores booking_id, technician_id, status.
- Status examples: Assigned, In Progress, Completed.
- Technician locations are tracked in `technician_locations`.

### Technician Login
- Uses mobile + PIN for specific users, currently handles simple role separation.
- Technicians only see jobs assigned to their ID.

### Invoice
Invoice types: Service Invoice, AMC Sale, New RO Sale.
Payment features:
- Cash received, UPI received, or EMI
- Status: Pending, Partial, Paid

### AMC / Warranty
- Activation Date = Invoice Date
- Expiry Date = Activation Date + validity_days - 1
- Reminder interval comes from plan/product settings.

### Inventory & BOM
- Shop owner adds parts/categories.
- Inventory is tracked through purchases (`inventory_purchases`), usage (`inventory_usage`), and assembly.
- BOM (Bill of Materials) templates allow assembling raw parts into products.

### Dashboard
Dashboard shows: Current month collection, Pending amount, Customers count, Current month bookings, AMC/RO sales, Low stock, Completed jobs. Clicking cards opens filtered reports.

### Backup / Restore
- Downloads JSON backup of all tables.
- Restores data using Supabase upsert.

## 8. RLS / Supabase Policy Notes
For live testing, main tables have Row Level Security policies (like `Allow app access ...` for inserts/updates/selects using `true` condition in `supabase-aquabiz-master-updates.sql`).
Important:
- Do not break existing live testing flow.
- If changing RLS, document exact SQL in this file.

## 9. Known Current/Past Issues
- Dashboard cards showing 0 despite existing bookings/invoices.
- Technician assignment sometimes not saving live.
- Services price may not fetch if RLS or service data missing.
- Header buttons took too much space and were moved into dropdown menu.
- CSS has broken before; preserve premium UI styling.

## 10. UI Rules
- Mobile-first
- Premium clean layout
- Compact header
- Header actions should be inside dropdown menu
- Avoid large topbar buttons on mobile
- Keep AquaBiz branding clean
- Avoid mixed Hindi text unless language mode requires it

## 11. Language Support
App supports: English, Hindi, Hinglish.
- Keep Hinglish Roman-only
- Do not mix Devanagari inside Hinglish
- Dashboard and main labels respect selected language

## 12. Deployment
- Build command: `npm run build`
- Output folder: `dist`
- Deploy to Netlify by uploading `dist`
- Supabase URL/key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are fetched via `import.meta.env` but fallback might be used. Should be configured in `.env` / Netlify Environment variables.

## 13. Change Log

### 2026-05-15 – Premium UI Upgrades (Glassmorphism & Icons)
- Summary: Replaced plain text letters in Admin Dashboard StatCards with intuitive emojis/icons. Appended global premium styling rules to `index.css`, introducing smooth hover animations for buttons/cards, backdrop-blur for modals/topbars (Glassmorphism), fade-in modal animations, and softer pill-shaped status badges.
- Files changed: `src/pages/Dashboard.jsx`, `src/index.css`
- Supabase changes: None

### 2026-05-15 – Dashboard Jobs Pipeline & Removed 48h Restriction
- Summary: Replaced the "Recent Bookings" card view on the Admin Dashboard with a full-width filterable "Jobs Pipeline" table. It now supports filtering by All, Assigned, Unassigned, Completed, Cancelled, and Repeat (7 Days). The table displays the assigned technician and the telecaller who created the job. Additionally, removed the 48-hour auto-hide restriction for completed jobs across the system so all completed jobs are always visible under the Completed tab.
- Files changed: `src/pages/Dashboard.jsx`, `src/App.jsx`, `src/pages/JobsPage.jsx`, `src/utils/roleDashboard.js`
- Supabase changes: None
- Testing done: Validated repeat logic and inline invoice modal.
- Issues found: None
- Next steps: Check UI alignment for long job lists.

### 2026-05-15 – Added Manual Customer Addition with Past Service Calculation
- Summary: Introduced an "Add Manual Customer" form in the Customer History page. Admin can add a customer with an old invoice date and amount. The system automatically calculates 90-day intervals from that old date. Any intervals falling in the past are automatically recorded as "assumed service done" (₹0 invoices) to create a proper timeline, and the first future interval is set as the active service reminder.
- Files changed: `src/pages/CustomerHistoryPage.jsx`
- Supabase changes: None
- Testing done: N/A
- Issues found: None
- Next steps: Review with user.

### 2026-05-15 – Optimized Technician Job Workflow & OTP Logic
- Summary: Refined the job action buttons on the technician panel. Only "Start Job" is visible initially. Once started, "Close Job" becomes available. The standalone OTP prompt was removed from the panel. Now, when closing a job via the invoice builder, an OTP is ONLY requested if the invoice total is ₹0 (free/warranty service). Chargeable invoices bypass the OTP requirement.
- Files changed: `src/components/TechnicianPanel.jsx`, `src/components/InvoiceBuilder.jsx`
- Supabase changes: None
- Testing done: N/A
- Issues found: None
- Next steps: Review with user.

### 2026-05-15 – Added Regular Service Reminders (90 days)
- Summary: Implemented logic to automatically schedule a service reminder 90 days after any service is completed, regardless of whether the customer has an active AMC/Warranty or not. This creates a "general_service" coverage record that tracks their service history and triggers a reminder in the Reminder Center.
- Files changed: `src/components/InvoiceBuilder.jsx`, `src/pages/ReminderCenter.jsx`, `src/pages/CustomerHistoryPage.jsx`
- Supabase changes: None
- Testing done: N/A
- Issues found: None
- Next steps: Review with user.

### 2026-05-15 – Improved Technician Panel Job Cards UI
- Summary: Updated the technician panel so that open jobs appear as compact, clickable summary cards. Clicking a card expands it to reveal full job details, customer info, and job action buttons (Start, Complete, Generate Invoice, WhatsApp, etc.).
- Files changed: `src/components/TechnicianPanel.jsx`
- Supabase changes: None
- Testing done: N/A
- Issues found: None
- Next steps: Review with user.

### 2026-05-15 – Fixed Technician Reassignment Duplicate Job Bug
- Summary: Fixed a bug where reassigned jobs appeared duplicated. The old job assignment was correctly marked as inactive in the database, but the frontend was not filtering out inactive jobs (`is_active === false`) in the technician panel, dashboard, and reports.
- Files changed: `src/components/TechnicianPanel.jsx`, `src/utils/roleDashboard.js`, `src/utils/dashboardStats.js`, `src/pages/ReportsPage.jsx`, `src/pages/JobsPage.jsx`, `src/pages/CustomerHistoryPage.jsx`
- Supabase changes: None
- Testing done: N/A
- Issues found: None
- Next steps: Developer to test reassignment flow.

### 2026-05-15 – Created Project Knowledge Base
- Summary: Created initial `PROJECT_KNOWLEDGE.md` to document the current state of the AquaBiz CRM project.
- Files changed: `PROJECT_KNOWLEDGE.md`
- Supabase changes: None
- Testing done: N/A
- Issues found: None
- Next steps: Developer to refer to this document for future tasks.

## 14. Agent Working Rules
Before every task:
1. Read this file.
2. Inspect relevant code files.
3. Understand current flow before changing code.
4. Do not rewrite the full app unless necessary.
5. Preserve working features.
6. Make the smallest safe change.
7. After task completion, update this file.
8. If SQL is needed, provide exact SQL separately and also document it here.
9. If deployment is needed, mention whether `npm run build` is required.
10. Always explain what changed in simple words.
