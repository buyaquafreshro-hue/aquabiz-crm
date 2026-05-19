
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";
import { LoginScreen } from "./components/auth";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/shared";
import { BRAND } from "./constants/defaults";
import { useAppData } from "./hooks/useAppData";
import { useAuthSession } from "./hooks/useAuthSession";
import { createBackup, downloadBackupFile, restoreBackupData } from "./services/backupService";
import { supabase } from "./supabaseClient";
import { calculateDashboardStats } from "./utils/dashboardStats";
import { useHindiDomTranslations } from "./utils/hindiDomTranslations";
import { getNotificationPermission, requestNotificationPermission, showBrowserNotification } from "./utils/notificationUtils";
import { clearRoleSession, getRoleSession, roleToAuthUser } from "./utils/roleSession";
import { isSuccessToast, useAutoHideMessage } from "./utils/toastUtils";

const Dashboard = lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const JobsPipelinePage = lazy(() => import("./pages/JobsPipelinePage").then((module) => ({ default: module.JobsPipelinePage })));
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

const ADMIN_PAGE_KEY = "aquabiz_admin_last_page";
const APP_LANGUAGE_KEY = "aquabiz_app_language";
const ADMIN_RESTORABLE_PAGES = new Set([
  "dashboard",
  "booking",
  "jobsPipeline",
  "technicianParts",
  "inventory",
  "plans",
  "sale",
  "leads",
  "collections",
  "reminders",
  "reports",
  "customers",
  "customerHistory",
  "business",
  "invoices",
  "settings",
  "technicianTracking",
  "expenses",
  "cashbook",
  "emi",
  "bom",
  "payroll",
]);

function getSavedAdminPage() {
  const savedPage = localStorage.getItem(ADMIN_PAGE_KEY);
  return ADMIN_RESTORABLE_PAGES.has(savedPage) ? savedPage : "dashboard";
}

function getSavedLanguage() {
  const savedLanguage = localStorage.getItem(APP_LANGUAGE_KEY);
  return ["en", "hi", "hinglish"].includes(savedLanguage) ? savedLanguage : "en";
}

export default function App() {
  const [page, setPage] = useState("login");
  const [reportFilter, setReportFilter] = useState("all");
  const [bookingDraft, setBookingDraft] = useState(null);
  const [selectedCustomerMobile, setSelectedCustomerMobile] = useState("");
  const [language, setLanguageState] = useState(getSavedLanguage);
  const [globalMessage, setGlobalMessage] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  useHindiDomTranslations(language);
  useAutoHideMessage(globalMessage, setGlobalMessage);
  const setLanguage = useCallback((nextLanguage) => {
    const safeLanguage = ["en", "hi", "hinglish"].includes(nextLanguage) ? nextLanguage : "en";
    localStorage.setItem(APP_LANGUAGE_KEY, safeLanguage);
    setLanguageState(safeLanguage);
  }, []);
  const handleSignedIn = useCallback(() => {
    setPage(getSavedAdminPage());
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
    serviceAreas,
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

  useEffect(() => {
    if (authLoading) return;
    const roleSession = getRoleSession();
    const roleUser = roleToAuthUser(roleSession?.role);
    if (!roleUser) return;
    if (authUser && authUser.id !== roleUser.id) return;

    const timer = window.setTimeout(() => {
      if (!authUser) setAuthUser(roleUser);
      if (roleSession.role === "technician") setPage("technician");
      if (roleSession.role === "telecaller") setPage("telecaller");
      if (roleSession.role === "sales") setPage("sales");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, authUser, setAuthUser]);


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

  const isTechnicianMode = authUser?.id === "technician-mode";
  const isTelecallerMode = authUser?.id === "telecaller-mode";
  const isSalesMode = authUser?.id === "sales-mode";

  const enableNotifications = useCallback(async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      setGlobalMessage("Notifications enabled.");
      showBrowserNotification("AquaBiz notifications enabled", { body: "New bookings and assigned jobs will alert you here." });
    } else if (permission === "unsupported") {
      setGlobalMessage("Browser notifications are not supported on this device.");
    } else {
      setGlobalMessage("Notifications were not enabled. You can allow them from browser settings.");
    }
  }, []);

  useEffect(() => {
    if (!authUser) return undefined;

    const channel = supabase
      .channel("aquabiz-app-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, (payload) => {
        const booking = payload.new || {};
        const customer = booking.customer_name || "New customer";
        const service = booking.service_type || "service";

        if (!isTechnicianMode && !isTelecallerMode && !isSalesMode) {
          const message = `New booking: ${customer} - ${service}`;
          setGlobalMessage(message);
          showBrowserNotification("New Booking", {
            body: `${customer} | ${booking.mobile || ""} | ${service}`,
            tag: `booking-${booking.id}`,
          });
        }

        loadAll();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_assignments" }, (payload) => {
        const job = payload.new || {};
        const roleSession = getRoleSession();
        const isAssignedToCurrentTechnician =
          isTechnicianMode &&
          roleSession?.role === "technician" &&
          String(roleSession.userId || "") === String(job.technician_id || "");

        if (isAssignedToCurrentTechnician) {
          const message = "New job assigned to you.";
          setGlobalMessage(message);
          showBrowserNotification("New Job Assigned", {
            body: "A new service job has been assigned to you.",
            tag: `job-${job.id}`,
          });
        }

        loadAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser, isTechnicianMode, isTelecallerMode, isSalesMode, loadAll]);

  useEffect(() => {
    if (!authUser || isTechnicianMode || isTelecallerMode || isSalesMode) return;
    if (!ADMIN_RESTORABLE_PAGES.has(page)) return;
    localStorage.setItem(ADMIN_PAGE_KEY, page);
  }, [authUser, isTechnicianMode, isTelecallerMode, isSalesMode, page]);

  
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
          setPage(getSavedAdminPage());
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
            clearRoleSession();
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
        />

        <main className="main-content">
          {globalMessage && <div className={isSuccessToast(globalMessage) ? "settings-toast success" : "settings-toast error"}>{globalMessage}</div>}
          <Suspense fallback={<PageLoader />}>
          <TechnicianPanel
            jobs={jobs}
            bookings={bookings}
            services={services}
            technicians={technicians}
            technicianParts={technicianParts}
            inventory={inventory}
            coverages={coverages}
            invoices={invoices}
            amcPlans={amcPlans}
            products={products}
            salesPersons={salesPersons}
            businessSettings={businessSettings}
            language={language}
            onUpdated={loadAll}
            onLogout={() => { clearRoleSession(); setAuthUser(null); setPage("login"); }}
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
            clearRoleSession();
            setAuthUser(null);
            setPage("login");
          }}
          onBackup={downloadBackup}
          onRestore={restoreBackup}
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
        />

        <main className="main-content">
          {globalMessage && <div className={isSuccessToast(globalMessage) ? "settings-toast success" : "settings-toast error"}>{globalMessage}</div>}
          <Suspense fallback={<PageLoader />}>
          <TelecallerPanel
            telecallers={telecallers}
            salesPersons={salesPersons}
            serviceAreas={serviceAreas}
            leads={leads}
            services={services}
            technicians={technicians}
            customers={customers}
            bookings={bookings}
            jobs={jobs}
            invoices={invoices}
            businessSettings={businessSettings}
            onUpdated={loadAll}
            onLogout={() => { clearRoleSession(); setAuthUser(null); setPage("login"); }}
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
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
        />

        <main className="main-content">
          {globalMessage && <div className={isSuccessToast(globalMessage) ? "settings-toast success" : "settings-toast error"}>{globalMessage}</div>}
          <Suspense fallback={<PageLoader />}>
            <SalesLogin salesPersons={salesPersons} leads={leads} invoices={invoices} onUpdated={loadAll} onLogout={() => { clearRoleSession(); setAuthUser(null); setPage("login"); }} />
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
          clearRoleSession();
          setAuthUser(null);
          setPage("login");
        }}
        onBackup={downloadBackup}
          onRestore={restoreBackup}
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
        />
      {globalMessage && <div className={isSuccessToast(globalMessage) ? "settings-toast success" : "settings-toast error"}>{globalMessage}</div>}
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
        {page === "dashboard" && (
          <Dashboard
            stats={stats}
            services={services}
            bookings={bookings}
            jobs={jobs}
            technicians={technicians}
            telecallers={telecallers}
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

        {page === "booking" && <NewBooking services={services} serviceAreas={serviceAreas} technicians={technicians} customers={customers} initialLead={bookingDraft} onDone={async () => { setBookingDraft(null); await loadAll(); setPage("jobsPipeline"); }} />}
        {page === "jobsPipeline" && <JobsPipelinePage bookings={bookings} jobs={jobs} technicians={technicians} telecallers={telecallers} serviceAreas={serviceAreas} invoices={invoices} services={services} inventory={inventory} technicianParts={technicianParts} coverages={coverages} amcPlans={amcPlans} products={products} salesPersons={salesPersons} businessSettings={businessSettings} language={language} onUpdated={loadAll} setPage={setPage} onCustomerOpen={(mobile) => { setSelectedCustomerMobile(mobile); setPage("customerDetail"); }} />}
        {page === "technicianParts" && <TechnicianPartsPage technicians={technicians} technicianParts={technicianParts} inventory={inventory} onUpdated={loadAll} />}
        {page === "technician" && <TechnicianPanel jobs={jobs} bookings={bookings} technicians={technicians} technicianParts={technicianParts} inventory={inventory} coverages={coverages} invoices={invoices}
            amcPlans={amcPlans}
            products={products} services={services} salesPersons={salesPersons} businessSettings={businessSettings} language={language} onUpdated={loadAll} onLogout={() => { clearRoleSession(); setAuthUser(null); setPage("login"); }} />}
        {page === "inventory" && <InventoryPage categories={categories} inventory={inventory} inventoryPurchases={inventoryPurchases} onUpdated={loadAll} />}
        {page === "plans" && <PlansPage categories={categories} inventory={inventory} amcPlans={amcPlans} products={products} onUpdated={loadAll} />}
        {page === "sale" && <AmcSalePage amcPlans={amcPlans} products={products} coverages={coverages} invoices={invoices} salesPersons={salesPersons} onUpdated={loadAll} />}
        {page === "leads" && <LeadsPage leads={leads} customers={customers} telecallers={telecallers} salesPersons={salesPersons} onUpdated={loadAll} setPage={setPage} onCreateBooking={(lead) => { setBookingDraft(lead); setPage("booking"); }} />}
        {page === "collections" && <CollectionsPage invoices={invoices} invoicePayments={invoicePayments} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "reminders" && <ReminderCenter coverages={coverages} invoices={invoices} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "reports" && <ReportsPage invoices={invoices} invoiceItems={invoiceItems} usage={usage} jobs={jobs} technicians={technicians} bookings={bookings} customers={customers} inventory={inventory} coverages={coverages} leads={leads} services={services} technicianParts={technicianParts} amcPlans={amcPlans} products={products} salesPersons={salesPersons} businessSettings={businessSettings} initialFilter={reportFilter} onUpdated={loadAll} />}
        {page === "customers" && <CustomerHistoryPage mode="list" customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} usage={usage} coverages={coverages} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} onCustomerOpen={(mobile) => { setSelectedCustomerMobile(mobile); setPage("customerDetail"); }} onCreateBooking={(customer) => { setBookingDraft({ customer_name: customer.name, mobile: customer.mobile, address: customer.address || "", area: customer.area || "" }); setPage("booking"); }} />}
        {page === "customerHistory" && <CustomerHistoryPage mode="search" customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} usage={usage} coverages={coverages} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} onCustomerOpen={(mobile) => { setSelectedCustomerMobile(mobile); setPage("customerDetail"); }} onCreateBooking={(customer) => { setBookingDraft({ customer_name: customer.name, mobile: customer.mobile, address: customer.address || "", area: customer.area || "" }); setPage("booking"); }} />}
        {page === "customerDetail" && <CustomerHistoryPage mode="detail" initialMobile={selectedCustomerMobile} customers={customers} bookings={bookings} jobs={jobs} technicians={technicians} invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} usage={usage} coverages={coverages} leads={leads} businessSettings={businessSettings} onUpdated={loadAll} onBack={() => setPage("customers")} onCreateBooking={(customer) => { setBookingDraft({ customer_name: customer.name, mobile: customer.mobile, address: customer.address || "", area: customer.area || "" }); setPage("booking"); }} />}
        {page === "business" && <BusinessSettingsPage settings={businessSettings} language={language} setLanguage={setLanguage} onUpdated={loadAll} />}
        {page === "invoices" && <InvoicesPage invoices={invoices} invoiceItems={invoiceItems} invoicePayments={invoicePayments} businessSettings={businessSettings} onUpdated={loadAll} />}
        {page === "settings" && <SettingsPage services={services} serviceAreas={serviceAreas} setPage={setPage} onUpdated={loadAll} />}
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
