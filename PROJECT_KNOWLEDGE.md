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

### 2026-05-19 - Technician Close Requires Service Invoice
- Summary: Fixed Technician App close flow so billing happens at job close time. Booking/service amount is now only a reference, and the service invoice has an editable `Actual Service Charge` entered during close. AMC/New RO/other booking-linked invoices no longer cause `Close Job` to complete the job without opening the service invoice builder. The invoice builder duplicate check was also narrowed by invoice type so service job invoices are not blocked by unrelated invoice types.
- Files changed: `src/components/TechnicianPanel.jsx`, `src/components/InvoiceBuilder.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: In Technician App, start a job with an existing AMC/New RO invoice on the booking and verify `Close Job` opens invoice creation instead of directly completing.

### 2026-05-19 - Covered Part Charge Override
- Summary: Added a per-part billing override in the invoice builder. Parts covered by AMC/Warranty still default to `₹0`, but each covered used part now has a `Charge Part` action to add its selling price to the invoice total, and `Waive Charge` to remove it again. Saved invoice items and inventory usage mark manually charged covered parts with a `charged manually` note.
- Files changed: `src/components/InvoiceBuilder.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Create an AMC invoice with two covered parts, charge only one, then waive it and confirm the total changes correctly.

### 2026-05-19 - Booking and Technician Assignment Notifications
- Summary: Added browser/in-app notifications using Supabase realtime. Admin users get a notification when a new booking is inserted. Technician mode gets a notification when a new job assignment is inserted for the logged-in technician. TopBar menu now has `Enable Notifications` to request browser notification permission, and realtime events also refresh app data automatically.
- Files changed: `src/App.jsx`, `src/components/TopBar.jsx`, `src/utils/notificationUtils.js`, `supabase-aquabiz-realtime-notifications.sql`
- Supabase changes: Run `supabase-aquabiz-realtime-notifications.sql` if realtime events are not already enabled for `bookings` and `job_assignments`.
- Testing done: `npm.cmd run build` passed.
- Issues found: Browser notifications work while the app is open/running in the browser. Closed-app push notifications would need a service worker and push provider.
- Next steps: Open admin and technician sessions, enable notifications from Menu, create a booking, then assign it to the logged-in technician and verify both notifications.

### 2026-05-19 - Hindi Text Cleanup
- Summary: Cleaned the Hindi translation strings used by Dashboard/common labels. Removed mixed Roman text like `dikhenge`, improved Hindi wording for AMC, pending, reminders, low stock, and added more Dashboard labels to the translation map so Hindi mode shows fewer English labels on the main screen.
- Files changed: `src/constants/text.js`, `src/pages/Dashboard.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: Many deeper pages still have hardcoded English labels; those need incremental translation passes.
- Next steps: Review the Dashboard in Hindi mode, then translate Jobs Pipeline, Technician App, and Invoice Builder screens next.

### 2026-05-19 - Core Workflow Hindi Pass
- Summary: Extended Hindi-aware labels into the daily workflow screens: Technician App login/job/duty controls, Invoice Builder headings/buttons/parts table labels, and Jobs Pipeline main filters/table/action controls. Language is now passed from App into TechnicianPanel, JobsPipelinePage, and InvoiceBuilder so these screens can use the shared translation map.
- Files changed: `src/constants/text.js`, `src/App.jsx`, `src/components/TechnicianPanel.jsx`, `src/components/InvoiceBuilder.jsx`, `src/pages/JobsPipelinePage.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: Some secondary modal helper text and deeper pages still have English strings.
- Next steps: Review Hindi mode in Jobs Pipeline, Technician App, and Invoice Builder on mobile; then translate Settings/Plans/Reports in the next pass.

### 2026-05-19 - App-wide Hindi Fallback Layer
- Summary: Added an app-wide Hindi DOM translation fallback for common hardcoded labels, buttons, placeholders, and menu text across remaining pages such as New Booking, Invoices, Collections, Inventory, Settings, Plans, Reports, Expenses, Cashbook, EMI, and Payroll. This supplements the structured translation map and reduces English leakage while deeper pages are migrated over time.
- Files changed: `src/utils/hindiDomTranslations.js`, `src/App.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: This is a fallback layer for exact visible phrases; dynamic/user-entered data and phrases not in the dictionary remain unchanged.
- Next steps: Test Hindi mode across all main navigation pages, then add any missed phrase to `hindiDomTranslations.js`.

### 2026-05-19 - Language Persistence Fix
- Summary: Fixed language resetting to English after browser refresh. The selected language is now saved in localStorage under `aquabiz_app_language`, restored on app startup for every panel, and data refresh only overrides it when `business_settings.app_language` is actually present.
- Files changed: `src/App.jsx`, `src/hooks/useAppData.js`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Select Hindi from the menu, refresh admin/technician/telecaller screens, and confirm Hindi stays selected.

### 2026-05-16 - Jobs Pipeline Bulk Assign
- Summary: Added bulk technician assignment to the Jobs Pipeline. Admin can select multiple open/unclosed rows with checkboxes, choose one technician, and click `Bulk Assign`. Unassigned bookings are assigned and already assigned open jobs are reassigned to the selected technician. Completed/cancelled jobs cannot be selected.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Select a mix of unassigned and assigned open jobs, bulk assign to a technician, and confirm rows update correctly.

### 2026-05-16 - Jobs Pipeline Mobile Filter Polish
- Summary: Restyled the Jobs Pipeline status filters for mobile. Filter chips now sit in a horizontal scroll rail with compact pill styling, while the search field is full-width below it on mobile and aligned to the right on desktop.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Review the job list filter bar on a narrow mobile viewport.

### 2026-05-16 - Jobs Pipeline Mobile Actions Accordion
- Summary: Converted the Jobs Pipeline row action buttons into a compact `Actions` accordion. This reduces mobile clutter by hiding Invoice, Send OTP, Close, Cancel, Edit, and Delete controls until the user expands the row actions.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Verify mobile job rows show one `Actions` control and expand cleanly.

### 2026-05-16 - Jobs Pipeline Complaint Type Cards
- Summary: Added top summary cards to the Jobs Pipeline for booking/complaint types based on `booking.service_type`. Cards show counts for `All Types` and each service/complaint type, and clicking a card filters the job list by that type while preserving the existing status filters. Added two additional scheduled visit cards for tomorrow and day-after-tomorrow using actual date labels like `17 May Visits`, with click-to-filter by `booking_date`. Cards were compacted for mobile and placed inside a `Job Type / Visit Filters` accordion to reduce visual clutter.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Verify service type cards match the service names used when creating bookings.

### 2026-05-16 - Jobs Pipeline Pending Jobs Filter
- Summary: Added a `Pending Jobs` filter tab to the Jobs Pipeline. It includes every booking/job that is not yet closed, completed, or cancelled, including unassigned bookings and assigned/in-progress jobs. Filter tabs now show counts for All, Pending Jobs, Assigned, Unassigned, Completed, Cancelled, and Repeat.
- Files changed: `src/pages/JobsPipelinePage.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Verify open assigned jobs and unassigned bookings appear under `Pending Jobs`, while completed/cancelled jobs do not.

### 2026-05-16 - Customer Count Uses Real Customers Only
- Summary: Fixed the inflated Dashboard customer count issue caused by `NewBooking` inserting every new booking into the `customers` master table. New bookings now remain bookings only unless the mobile already exists in customer master. Customer master rows are created/updated after invoice generation or qualifying direct job close, so open/unclosed jobs no longer become customers automatically.
- Files changed: `src/pages/NewBooking.jsx`, `src/components/InvoiceBuilder.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/services/customerService.js`, `supabase-aquabiz-clean-booking-only-customers.sql`
- Supabase changes: No required schema change. Optional cleanup file `supabase-aquabiz-clean-booking-only-customers.sql` previews and can delete customer rows that have no invoice, coverage, or payment history.
- Testing done: `npm.cmd run build` passed.
- Issues found: Existing booking-only rows already inserted into `customers` will still count until cleaned up.
- Next steps: Run the preview SELECT in the cleanup SQL, verify rows, then run the commented DELETE only if the preview is correct.

### 2026-05-16 - Admin Telecaller Send Closing OTP
- Summary: Added customer job-closing OTP send actions. Admin can send the closing OTP from the Jobs Pipeline row actions. Telecaller app now has a `Jobs / OTP` tab showing bookings created by that telecaller, with a `Send OTP` WhatsApp action for each booking. The OTP is still generated at booking creation and uses the existing `closeOtpMessage` WhatsApp template.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/components/TelecallerPanel.jsx`, `src/App.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Create/open a booking and click `Send OTP` from admin Jobs Pipeline and telecaller `Jobs / OTP` tab.

### 2026-05-16 - Jobs Pipeline Closed By Column
- Summary: Added a `Closed By` column to the Jobs Pipeline beside `Created By`. Admin direct close now saves `Admin` as the closer, technician invoice/close flows save the logged-in technician, and admin invoice close flows save `Admin`. The column shows closer name and role for completed jobs.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/components/InvoiceBuilder.jsx`, `src/components/TechnicianPanel.jsx`, `src/pages/Dashboard.jsx`, `src/pages/ReportsPage.jsx`, `src/services/jobAssignments.js`, `supabase-aquabiz-job-closed-by.sql`
- Supabase changes: Run `supabase-aquabiz-job-closed-by.sql` to add `closed_by_id`, `closed_by_name`, `closed_by_role`, and `closed_at` to `job_assignments` and `bookings`.
- Testing done: `npm.cmd run build` passed.
- Issues found: Existing completed jobs will show fallback technician/admin data only when available; exact closer is recorded for new closes after the SQL migration.
- Next steps: Run SQL, then close one job from admin and one from technician app to verify the column values.

### 2026-05-16 - Jobs Pipeline Customer History Link
- Summary: Made customer names in the Jobs Pipeline clickable. Clicking a customer name now opens that customer's detail/history page directly using the booking mobile number, so admin can inspect full bookings, invoices, payments, coverages, parts usage, and timeline from the job list.
- Files changed: `src/pages/JobsPipelinePage.jsx`, `src/App.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Click a customer name from Jobs Pipeline and verify the correct customer history opens.

### 2026-05-16 - No Invoice Direct Close Reason
- Summary: Fixed direct admin job close so completed jobs closed without an invoice can be marked as `No Invoice Required` using the selected business reason (`No Charge`, `Cancelled after visit`, `Already paid`, or `Follow-up job`). Dashboard, Jobs Pipeline, and Reports now only show `Invoice Pending` and `Create Invoice` when a completed job has neither an invoice nor a no-invoice reason.
- Files changed: `src/utils/appUtils.js`, `src/pages/Dashboard.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/pages/ReportsPage.jsx`, `supabase-aquabiz-no-invoice-close-reason.sql`
- Supabase changes: Run `supabase-aquabiz-no-invoice-close-reason.sql` to add `no_invoice_reason`, `invoice_required`, and `direct_closed_without_invoice` columns to `job_assignments` and `bookings`.
- Testing done: `npm.cmd run build` passed.
- Issues found: Existing jobs closed before this fix did not save the selected reason, so they may need a one-time manual reason update.
- Next steps: Run the SQL migration, then close a test job with `Already paid` or `No Charge` and confirm the badge no longer says `Invoice Pending`.

### 2026-05-16 - Plans Products Card Cleanup
- Summary: Redesigned the Plans / Products page to match the Admin Settings card pattern. Saved AMC plans and RO products now appear as collapsed clickable cards, and opening a card shows editable fields in a clean spreadsheet-style grid. Add New AMC Plan and Add New RO Product sections also use the same cleaner field layout, while covered parts/categories remain in spreadsheet-style selector tables. The top Plans/Product summary cards now use the same white Dashboard `StatCard` style with icon, `View`, count, and uppercase label instead of the older lavender amount blocks.
- Files changed: `src/pages/PlansPage.jsx`, `src/pages/SettingsPage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Review add/edit/delete flow for AMC plans and RO products in the browser.

### 2026-05-16 - Admin Settings Card Cleanup
- Summary: Redesigned Admin Settings people/service/area/sales lists into clickable expandable cards. Add forms remain grouped in expandable setting cards, and already-added technician, telecaller, sales executive, service, and area records now open only when clicked. Editable row data is shown in a cleaner spreadsheet-style grid for easier scanning. Settings tabs and saved-item cards now follow the Dashboard card style with white cards, icon blocks, `View`, large count/plus value, and uppercase labels.
- Files changed: `src/pages/SettingsPage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Review Settings page on mobile and desktop while adding/editing staff, services, and areas.

### 2026-05-16 - Area Territory Master
- Summary: Added an admin-managed Area/Territory/Zone master list. Admin can create areas like North Delhi, South Delhi, Loni, Gurugram and link active technicians to each area. New Booking and Edit Booking now use the area list as a dropdown when areas exist. Jobs Pipeline shows the booking area and prioritizes matching area technicians in Assign/Reassign dropdowns under an area-specific group.
- Files changed: `src/services/appDataService.js`, `src/hooks/useAppData.js`, `src/pages/SettingsPage.jsx`, `src/pages/NewBooking.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/components/TelecallerPanel.jsx`, `src/App.jsx`, `src/index.css`, `supabase-aquabiz-service-areas.sql`
- Supabase changes: Run `supabase-aquabiz-service-areas.sql` to create `service_areas`, add RLS app access policy for it, and ensure `bookings.area` exists.
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Add territories in Admin Settings and link technicians to each area before assigning jobs.

### 2026-05-16 - Booking Area Field
- Summary: Added a separate Area/Locality field to booking creation and editing. Area is copied from existing customer/lead data when available, saved to bookings, and shown in Jobs Pipeline, shared booking detail cards, Technician App job cards, Lead detail cards, and Sales Executive assigned follow-ups to make job assignment and visit planning easier.
- Files changed: `src/constants/defaults.js`, `src/pages/NewBooking.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/components/shared.jsx`, `src/components/TechnicianPanel.jsx`, `src/pages/LeadsPage.jsx`, `src/pages/SalesLogin.jsx`, `src/App.jsx`, `supabase-aquabiz-booking-area.sql`
- Supabase changes: Run `supabase-aquabiz-booking-area.sql` to add `area text` to `bookings` and backfill from customer area where possible. No RLS policy changes.
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Run SQL migration before creating/editing bookings with area.

### 2026-05-16 - Customer CSV Invoice History Import
- Summary: Expanded the existing customer CSV/XLS upload template and importer to support `Customer name`, `Phone No.`, `Alternet phone`, `Address`, `Invoice type`, `Invoice date`, and `Invoice amount`. Upload now upserts customer profiles including alternate phone and creates non-duplicate invoice history records with default paid status and matching customer coverage/reminder records for Service, AMC, and New Machine/New RO rows.
- Files changed: `src/pages/CustomerHistoryPage.jsx`, `src/utils/csvUtils.js`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Test import with CSV and XLSX files containing old Service, AMC, and New Machine invoices.

### 2026-05-16 - App Icon and Favicon Logo
- Summary: Added the shop logo as the browser favicon and installable app icon. Generated 16x16, 32x32, 180x180, 192x192, and 512x512 PNG icon assets from `Shop logo Watermark.png`, updated `index.html` icon links, added a web manifest, and changed the document title to `Aquafresh RO Service`.
- Files changed: `index.html`, `public/site.webmanifest`, `public/shop-logo-watermark.png`, `public/favicon-16x16.png`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`, `public/app-icon-192.png`, `public/app-icon-512.png`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Hard-refresh browser or clear favicon cache after deployment.

### 2026-05-16 - Lead Follow-up Owner Assignment
- Summary: Added admin lead follow-up assignment controls so a lead follow-up can be assigned to either a telecaller or a sales executive. Telecallers continue to see their assigned lead follow-ups, and Sales Login now shows assigned lead follow-ups with call, WhatsApp, next-date, and conversation summary actions.
- Files changed: `src/pages/LeadsPage.jsx`, `src/components/TelecallerPanel.jsx`, `src/pages/SalesLogin.jsx`, `src/App.jsx`, `supabase-aquabiz-lead-followup-owner.sql`
- Supabase changes: Run `supabase-aquabiz-lead-followup-owner.sql` to add `follow_up_owner_type`, `follow_up_owner_id`, `follow_up_owner_name`, `assigned_sales_person_id`, and `assigned_sales_person_name` to `leads`. No RLS policy changes.
- Testing done: `npm.cmd run build` passed.
- Issues found: Initial SQL backfill used `coalesce(assigned_telecaller_id, telecaller_id)` and failed when one column was uuid and the other text. Fixed by casting to text before coalescing and only casting back to uuid for UUID-shaped values.
- Next steps: Run the SQL migration before assigning lead follow-ups to sales executives.

### 2026-05-16 - Technician App Parts With Me Card
- Summary: Changed the Technician App so `Parts With Me` is hidden behind a clickable summary card. Technicians now click the card to expand their assigned parts, which display in a compact spreadsheet-style list with sticky headers and cleaner rows.
- Files changed: `src/components/TechnicianPanel.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Review technician app on mobile with assigned parts.

### 2026-05-16 - Technician Parts Sheet UI
- Summary: Cleaned up the Technician Parts assignment page with an XLSX-style parts list. The bulk assignment panel now has a compact command bar, selected count badge, spreadsheet-style table borders, sticky headers, tighter row spacing, a dedicated checkbox column, and compact quantity inputs.
- Files changed: `src/pages/TechnicianPartsPage.jsx`, `src/index.css`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Review on mobile and desktop with a long parts list.

### 2026-05-16 - AMC Covered Parts Billing Fix
- Summary: Updated the invoice builder so parts covered by the selected AMC plan or selected RO product warranty are shown on AMC/New RO sale invoices with billing price `0`, and their selling price is not added to the invoice total. The billing calculation is recomputed from the currently selected plan/product so covered parts remain excluded even if the plan/product is selected or changed after adding parts.
- Files changed: `src/components/InvoiceBuilder.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Test AMC and New RO sale invoices with covered and non-covered parts.

### 2026-05-16 – Added Alternate Mobile Field
- Summary: Added an optional "Alternate Number" field across the CRM to allow capturing secondary contact numbers for customers and bookings. Updated the New Booking form, Customer Manual Add form, Edit Customer Profile modal, and Edit Booking modal to support this new `alternate_mobile` field. The secondary number is displayed alongside the primary mobile number in the Jobs Pipeline and Technician details.
- Files changed: `src/pages/NewBooking.jsx`, `src/pages/CustomerHistoryPage.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/components/shared.jsx`
- Supabase changes: Requires `alternate_mobile` text column in `customers` and `bookings` tables.

### 2026-05-16 – Redesigned Covered Items Selection UI
- Summary: Replaced the cluttered check-grid layout for selecting Covered Categories and Covered Parts in the AMC/Product forms with a clean, spreadsheet-style `CoveredItemsSelector`. This new component features a sticky header, perfectly aligned columns (checkbox and name), an integrated search/filter bar, and clean alternating row backgrounds for high readability and premium aesthetics.
- Files changed: `src/pages/PlansPage.jsx`, `src/index.css`
- Supabase changes: None

### 2026-05-16 – Added Comprehensive Edit & Delete Capabilities
- Summary: Added optional Visit Date and Time Slot fields to the New Booking form. In the Jobs Pipeline, replaced the simple Reschedule button with a full "Edit Booking" modal (to edit service, address, notes, date, time) and added a "Delete" booking option. Added "Edit Profile" to Customer History and an "Edit" button to Invoices to allow manual adjustment of billing values, status, and payment methods.
- Files changed: `src/pages/NewBooking.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/pages/CustomerHistoryPage.jsx`, `src/pages/InvoicesPage.jsx`
- Supabase changes: None

### 2026-05-16 – Added Admin Direct "Close Job" Option with Parts Deduction
- Summary: Added a "Close" button directly in the Jobs Pipeline list for admins. This allows admins to bypass the Invoice builder and OTP requirements entirely to close a job instantly. It also opens a modal that allows admins to optionally select and deduct parts directly from the assigned technician's stock without creating an invoice. It automatically updates both the `job_assignments` and `bookings` tables to a completed state, and creates `inventory_usage` records for any deducted parts.
- Files changed: `src/pages/JobsPipelinePage.jsx`
- Supabase changes: None

### 2026-05-16 - Completed Jobs Invoice Pending Handling
- Summary: Fixed the Dashboard warning that incorrectly treated completed jobs without invoices as a Supabase/RLS policy issue. Completed jobs now distinguish between `Completed + Invoiced` and `Completed / Invoice Pending`. Dashboard, Jobs Pipeline, and Reports show invoice-pending badges and provide a `Create Invoice` action for completed jobs without a linked service invoice. Invoice stats still calculate only from actual invoice records. Admin direct close now requires a no-invoice reason, and zero-amount invoice reasons include No Charge, Cancelled after visit, Already paid, and Follow-up job.
- Files changed: `src/utils/appUtils.js`, `src/pages/Dashboard.jsx`, `src/pages/JobsPipelinePage.jsx`, `src/pages/ReportsPage.jsx`, `src/components/InvoiceBuilder.jsx`, `src/App.jsx`
- Supabase changes: None
- Testing done: `npm.cmd run build` passed.
- Issues found: None
- Next steps: Test completing a job without invoice and then creating invoice from Dashboard/Jobs Pipeline/Reports.

### 2026-05-16 – Fixed Datetime Displays to IST
- Summary: Implemented a reusable `formatISTDate` helper function using `toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })` to ensure timestamps from Supabase are displayed in Indian Standard Time (IST) instead of browser local or UTC. Replaced raw `new Date(...).toLocaleString()` and `.toLocaleDateString()` calls across Bookings, Jobs, Invoices, Reports, Technician app, and Customer History. Database storage remains safely in UTC.
- Files changed: `src/utils/appUtils.js`, `src/pages/JobsPipelinePage.jsx`, `src/pages/InvoicesPage.jsx`, `src/pages/ReportsPage.jsx`, `src/pages/CustomerHistoryPage.jsx`, `src/pages/TechnicianTracking.jsx`
- Supabase changes: None

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
