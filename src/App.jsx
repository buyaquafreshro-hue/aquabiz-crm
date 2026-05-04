
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import "./index.css";
import { LoginScreen } from "./components/auth";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/shared";
import { BRAND } from "./constants/defaults";
import { useAppData } from "./hooks/useAppData";
import { useAuthSession } from "./hooks/useAuthSession";
import { createBackup, downloadBackupFile, restoreBackupData } from "./services/backupService";
import { calculateDashboardStats } from "./utils/dashboardStats";
import { isSuccessToast, useAutoHideMessage } from "./utils/toastUtils";

const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const JobsPage = lazy(() => import("./pages/JobsPage").then((module) => ({ default: module.JobsPage })));
const JobListPage = lazy(() => import("./pages/JobsPage").then((module) => ({ default: module.JobListPage })));
const TechnicianPanel = lazy(() => import("./components/TechnicianPanel").then((module) => ({ default: module.TechnicianPanel })));
const TelecallerPanel = lazy(() => import("./components/TelecallerPanel").then((module) => ({ default: module.TelecallerPanel })));
const TechnicianPartsPage = lazy(() => import("./pages/TechnicianPartsPage").then((module) => ({ default: module.TechnicianPartsPage })));
const AmcSalePage = lazy(() => import("./pages/AmcSalePage").then((module) => ({ default: module.AmcSalePage })));
const LeadsPage = lazy(() => import("./pages/LeadsPage").then((module) => ({ default: module.LeadsPage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const PlansPage = lazy(() => import("./pages/PlansPage").then((module) => ({ default: module.PlansPage })));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage").then((module) => ({ default: module.InvoicesPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const CustomerHistoryPage = lazy(() => import("./pages/CustomerHistoryPage").then((module) => ({ default: module.CustomerHistoryPage })));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage").then((module) => ({ default: module.CollectionsPage })));
const BusinessSettingsPage = lazy(() => import("./pages/BusinessSettingsPage").then((module) => ({ default: module.BusinessSettingsPage })));
const ReminderCenter = lazy(() => import("./pages/ReminderCenter").then((module) => ({ default: module.ReminderCenter })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const NewBooking = lazy(() => import("./pages/NewBooking").then((module) => ({ default: module.NewBooking })));
const SalesLogin = lazy(() => import("./pages/SalesLogin").then((module) => ({ default: module.SalesLogin })));
const TechnicianTracking = lazy(() => import("./pages/TechnicianTracking").then((module) => ({ default: module.TechnicianTracking })));
const PayrollPage = lazy(() => import("./pages/PayrollPage").then((module) => ({ default: module.PayrollPage })));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage").then((module) => ({ default: module.ExpensesPage })));
const CashbookPage = lazy(() => import("./pages/CashbookPage").then((module) => ({ default: module.CashbookPage })));
const EmiManagementPage = lazy(() => import("./pages/EmiManagementPage").then((module) => ({ default: module.EmiManagementPage })));
const BomAssemblyPage = lazy(() => import("./pages/BomAssemblyPage").then((module) => ({ default: module.BomAssemblyPage })));

function PageLoader() {
  return (
    <section className="panel">
      <p className="muted">Loading...</p>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState("login");
  const [reportFilter, setReportFilter] = useState("all");
  const [bookingDraft, setBookingDraft] = useState(null);
  const [selectedCustomerMobile, setSelectedCustomerMobile] = useState("");
  const [language, setLanguage] = useState("en");
  const [globalMessage, setGlobalMessage] = useState("");
  useAutoHideMessage(globalMessage, setGlobalMessage);
  const handleSignedIn = useCallback(() => {
    setPage("dashboard");
  }, []);
  const handleSignedOut = useCallback(() => {
    setPage("login");
  }, []);
  const { authUser, authLoading, setAuthUser } = useAuthSession({
    onSignedIn: handleSignedIn,
    onSignedOut: handleSignedOut,
  });
  const {
    services,
    technicians,
    telecallers,
    bookings,
    jobs,
    customersCount,
    customers,
    categories,
    inventory,
    amcPlans,
    products,
    coverages,
    invoices,
    invoicePayments,
    invoiceItems,
    usage,
    inventoryPurchases,
    technicianParts,
    businessSettings,
    leads,
    salesPersons,
    payrollSettings,
    salaryAdvances,
    payrollRuns,
    expenseCategories,
    expenses,
    cashbookOpenings,
    bomTemplates,
    bomItems,
    assemblyOrders,
    dataErrors,
    loading,
    loadAll,
  } = useAppData({ onLanguageChange: setLanguage });


  async function downloadBackup() {
    try {
      const backup = await createBackup();
      downloadBackupFile(backup);
      setGlobalMessage("Backup downloaded successfully.");
    } catch (err) {
      console.error("Backup failed", err);
      setGlobalMessage("Backup failed. Please check console.");
    }
  }

  async function restoreBackup(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const confirmRestore = window.confirm(
        "Restore backup? This will add/update records from the selected JSON file."
      );

      if (!confirmRestore) {
        event.target.value = "";
        return;
      }

      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup?.tables) {
        setGlobalMessage("Invalid AquaBiz backup file.");
        event.target.value = "";
        return;
      }

      const { restored, errors } = await restoreBackupData(backup);
      event.target.value = "";
      await loadAll();

      if (errors.length) {
        setGlobalMessage(`Restore completed with some errors. Restored records: ${restored}. ${errors.slice(0, 3).join(" | ")}`);
      } else {
        setGlobalMessage(`Restore completed successfully. Restored records: ${restored}.`);
      }
    } catch (err) {
      console.error("Restore failed", err);
      setGlobalMessage("Restore failed. Please check backup file and console.");
      event.target.value = "";
    }
  }



  const stats = useMemo(
    () => calculateDashboardStats({ bookings, jobs, customersCount, inventory, coverages, invoices, leads }),
    [bookings, jobs, customersCount, inventory, coverages, invoices, leads]
  );

  
  if (authLoading) {
    return (
      <div className="login-page">
        <section className="login-card">
          <h2>Loading AquaBiz...</h2>
          <p className="muted">Checking login session.</p>
        </section>
      </div>
    );
  }

  if (page === "login" || !authUser) {
    return (
      <LoginScreen
        onAdminLogin={(user) => {
          setAuthUser(user);
          setPage("dashboard");
        }}
        onTechnicianOpen={() => {
          setAuthUser({ id: "technician-mode", email: "technician@aquabiz.local" });
          setPage("technician");
        }}
        onTelecallerOpen={() => {
          setAuthUser({ id: "telecaller-mode", email: "telecaller@aquabiz.local" });
          setPage("telecaller");
        }}
        onSalesOpen={() => {
          setAuthUser({ id: "sales-mode", email: "sales@aquabiz.local" });
          setPage("sales");
        }}
      />
    );
  }

  const isTechnicianMode = authUser?.id === "technician-mode";
  const isTelecallerMode = authUser?.id === "telecaller-mode";
  const isSalesMode = authUser?.id === "sales-mode";

  if (isTechnicianMode) {
    return (
      <div className="app-shell technician-only-shell">
        <TopBar
          title={BRAND}
          onRefresh={loadAll}
          loading={loading}
          language={language}
          setLanguage={setLanguage}
          authUser={authUser}
          businessSettings={businessSettings}
          onLocalLogout={() => {
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
        />

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
          <TechnicianPanel
            jobs={jobs}
            bookings={bookings}
            technicians={technicians}
            technicianParts={technicianParts}
            inventory={inventory}
            coverages={coverages}
            invoices={invoices}
            amcPlans={amcPlans}
            products={products}
            businessSettings={businessSettings}
            onUpdated={loadAll}
          />
          </Suspense>
        </main>
      </div>
    );
  }

  if (isTelecallerMode) {
    return (
      <div className="app-shell technician-only-shell">
        <TopBar
          title={BRAND}
          onRefresh={loadAll}
          loading={loading}
          language={language}
          setLanguage={setLanguage}
          authUser={authUser}
          businessSettings={businessSettings}
          onLocalLogout={() => {
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
        />

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
          <TelecallerPanel
            telecallers={telecallers}
            leads={leads}
            services={services}
            technicians={technicians}
            customers={customers}
            bookings={bookings}
            jobs={jobs}
            invoices={invoices}
            onUpdated={loadAll}
          />
          </Suspense>
        </main>
      </div>
    );
  }

  if (isSalesMode) {
    return (
      <div className="app-shell technician-only-shell">
        <TopBar
          title={BRAND}
          onRefresh={loadAll}
          loading={loading}
          language={language}
          setLanguage={setLanguage}
          authUser={authUser}
          businessSettings={businessSettings}
          onLocalLogout={() => {
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
        />

        <main className="main-content">
          <Suspense fallback={<PageLoader />}>
            <SalesLogin salesPersons={salesPersons} invoices={invoices} onLogout={() => { setAuthUser(null); setPage("login"); }} />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        title={BRAND}
        onRefresh={loadAll}
        loading={loading}
        language={language}
        setLanguage={setLanguage}
        authUser={authUser}
        businessSettings={businessSettings}
        onLocalLogout={() => {
          setAuthUser(null);
          setPage("login");
        }}
        onBackup={downloadBackup}
          onRestore={restoreBackup}
        />
      {globalMessage && <div className={isSuccessToast(globalMessage) ? "settings-toast success" : "settings-toast error"}>{globalMessage}</div>}
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
        {page === "dashboard" && (
          <Dashboard
            stats={stats}
            bookings={bookings}
            jobs={jobs}
            technicians={technicians}
            inventory={inventory}
            coverages={coverages}
            invoices={invoices}
            amcPlans={amcPlans}
            products={products}
            salesPersons={salesPersons}
            businessSettings={businessSettings}
            leads={leads}
            dataErrors={dataErrors}
            setPage={setPage}
            setReportFilter={setReportFilter}
            language={language}
            onUpdated={loadAll}
          />
        )}

        {page === "booking" && <NewBooking services={services} technicians={technicians} customers={customers} initialLead={bookingDraft} onDone={async () => { setBookingDraft(null); await loadAll(); setPage("jobs"); }} />}
        {page === "jobs" && <JobsPage bookings={bookings} jobs={jobs} technicians={technicians} technicianParts={technicianParts} inventory={inventory} coverages={coverages} invoices={invoices}
            amcPlans={amcPlans}
            products={products} salesPersons={salesPersons} businessSettings={businessSettings} onUpdated={loadAll} setPage={setPage} />}
        {page === "openJobs" && <JobListPage title="Open Jobs" type="open" bookings={bookings} jobs={jobs} technicians={technicians} coverages={coverages} setPage={setPage} />}
        {page === "completedJobs" && <JobListPage title="Completed Jobs" type="completed" bookings={bookings} jobs={jobs} technicians={technicians} coverages={coverages} setPage={setPage} />}
        {page === "technicianParts" && <TechnicianPartsPage technicians={technicians} technicianParts={technicianParts} inventory={inventory} onUpdated={loadAll} />}
        {page === "technician" && <TechnicianPanel jobs={jobs} bookings={bookings} technicians={technicians} technicianParts={technicianParts} inventory={inventory} coverages={coverages} invoices={invoices}
            amcPlans={amcPlans}
            products={products} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "inventory" && <InventoryPage categories={categories} inventory={inventory} inventoryPurchases={inventoryPurchases} onUpdated={loadAll} />}
        {page === "plans" && <PlansPage categories={categories} inventory={inventory} amcPlans={amcPlans} products={products} onUpdated={loadAll} />}
        {page === "sale" && <AmcSalePage amcPlans={amcPlans} products={products} coverages={coverages} invoices={invoices} salesPersons={salesPersons} onUpdated={loadAll} />}
        {page === "leads" && <LeadsPage leads={leads} customers={customers} telecallers={telecallers} onUpdated={loadAll} setPage={setPage} onCreateBooking={(lead) => { setBookingDraft(lead); setPage("booking"); }} />}
        {page === "collections" && <CollectionsPage invoices={invoices} invoicePayments={invoicePayments} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "reminders" && <ReminderCenter coverages={coverages} invoices={invoices} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "reports" && <ReportsPage invoices={invoices} invoiceItems={invoiceItems} usage={usage} jobs={jobs} technicians={technicians} bookings={bookings} customers={customers} inventory={inventory} coverages={coverages} leads={leads} initialFilter={reportFilter} />}
        {page === "customers" && <CustomerHistoryPage mode="list" customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} usage={usage} coverages={coverages} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} onCustomerOpen={(mobile) => { setSelectedCustomerMobile(mobile); setPage("customerDetail"); }} onCreateBooking={(customer) => { setBookingDraft({ customer_name: customer.name, mobile: customer.mobile, address: customer.address || "" }); setPage("booking"); }} />}
        {page === "customerHistory" && <CustomerHistoryPage mode="search" customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} usage={usage} coverages={coverages} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} onCustomerOpen={(mobile) => { setSelectedCustomerMobile(mobile); setPage("customerDetail"); }} onCreateBooking={(customer) => { setBookingDraft({ customer_name: customer.name, mobile: customer.mobile, address: customer.address || "" }); setPage("booking"); }} />}
        {page === "customerDetail" && <CustomerHistoryPage mode="detail" initialMobile={selectedCustomerMobile} customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} usage={usage} coverages={coverages} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} onBack={() => setPage("customers")} onCreateBooking={(customer) => { setBookingDraft({ customer_name: customer.name, mobile: customer.mobile, address: customer.address || "" }); setPage("booking"); }} />}
        {page === "business" && <BusinessSettingsPage settings={businessSettings} language={language} setLanguage={setLanguage} onUpdated={loadAll} />}
        {page === "invoices" && <InvoicesPage invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "settings" && <SettingsPage services={services} setPage={setPage} onUpdated={loadAll} />}
        {page === "technicianTracking" && <TechnicianTracking technicians={technicians} />}
        {page === "expenses" && <ExpensesPage expenseCategories={expenseCategories} expenses={expenses} onUpdated={loadAll} />}
        {page === "cashbook" && <CashbookPage invoices={invoices} invoicePayments={invoicePayments} expenses={expenses} payrollRuns={payrollRuns} cashbookOpenings={cashbookOpenings} onUpdated={loadAll} />}
        {page === "emi" && <EmiManagementPage invoices={invoices} invoicePayments={invoicePayments} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "bom" && <BomAssemblyPage products={products} inventory={inventory} bomTemplates={bomTemplates} bomItems={bomItems} assemblyOrders={assemblyOrders} onUpdated={loadAll} />}
        {page === "payroll" && (
          <PayrollPage
            telecallers={telecallers}
            technicians={technicians}
            salesPersons={salesPersons}
            payrollSettings={payrollSettings}
            salaryAdvances={salaryAdvances}
            payrollRuns={payrollRuns}
            bookings={bookings}
            jobs={jobs}
            invoices={invoices}
            businessSettings={businessSettings}
            onUpdated={loadAll}
          />
        )}
        </Suspense>
      </main>

      <button className="fab" onClick={() => setPage("booking")}>+</button>
      <BottomNav page={page} setPage={setPage} />
    </div>
  );
}
