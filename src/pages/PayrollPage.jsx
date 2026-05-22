import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatINR, getLocalMonthKey } from "../utils/appUtils";
import { calculatePayroll, employeeLabel, employeeRoles, getEmployeesByRole, salaryTypes } from "../utils/payrollUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

const emptySetting = {
  role: "telecaller",
  employee_id: "",
  fixed_salary: "",
  salary_type: "fixed_incentive",
  per_booking_incentive: "",
  per_completed_job_incentive: "",
  sales_percentage_incentive: "",
  amc_sale_incentive: "",
  installation_incentive: "",
  repeat_job_penalty: "",
  target_amount: "",
  target_bonus: "",
  advance_deduction: "",
};

const emptyAdvance = {
  role: "telecaller",
  employee_id: "",
  amount: "",
  advance_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

function Accordion({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="settings-accordion" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>{title}</span>
        {typeof count === "number" && <strong>{count}</strong>}
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}

export function PayrollPage({
  telecallers = [],
  technicians = [],
  salesPersons = [],
  payrollSettings = [],
  salaryAdvances = [],
  payrollRuns = [],
  bookings = [],
  jobs = [],
  invoices = [],
  businessSettings = {},
  onUpdated,
}) {
  const [month, setMonth] = useState(getLocalMonthKey());
  const [settingForm, setSettingForm] = useState(emptySetting);
  const [settingEdit, setSettingEdit] = useState({});
  const [advanceForm, setAdvanceForm] = useState(emptyAdvance);
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  useAutoHideMessage(message, setMessage);

  const employeesByRole = { telecallers, technicians, salesPersons };
  const payrollRows = useMemo(() => calculatePayroll({
    settings: payrollSettings,
    monthKey: month,
    bookings,
    jobs,
    invoices,
    salaryAdvances,
    payrollRuns,
  }), [payrollSettings, month, bookings, jobs, invoices, salaryAdvances, payrollRuns]);

  function employeeOptions(role) {
    return getEmployeesByRole(role, employeesByRole).filter((employee) => employee.is_active !== false);
  }

  function selectedEmployee(role, employeeId) {
    return getEmployeesByRole(role, employeesByRole).find((employee) => String(employee.id) === String(employeeId));
  }

  function settingPayload(data) {
    const employee = selectedEmployee(data.role, data.employee_id);
    return {
      role: data.role,
      employee_id: data.employee_id,
      employee_name: employee?.name || data.employee_name || "",
      fixed_salary: Number(data.fixed_salary || 0),
      salary_type: data.salary_type || "fixed_incentive",
      per_booking_incentive: Number(data.per_booking_incentive || 0),
      per_completed_job_incentive: Number(data.per_completed_job_incentive || 0),
      sales_percentage_incentive: Number(data.sales_percentage_incentive || 0),
      amc_sale_incentive: Number(data.amc_sale_incentive || 0),
      installation_incentive: Number(data.installation_incentive || 0),
      repeat_job_penalty: Number(data.repeat_job_penalty || 0),
      target_amount: Number(data.target_amount || 0),
      target_bonus: Number(data.target_bonus || 0),
      advance_deduction: Number(data.advance_deduction || 0),
      is_active: true,
    };
  }

  async function saveSetting() {
    setMessage("");
    if (!settingForm.employee_id) return setMessage("Select employee.");
    const exists = payrollSettings.some((setting) => String(setting.role) === String(settingForm.role) && String(setting.employee_id) === String(settingForm.employee_id));
    if (exists) return setMessage("Salary setting already exists for this employee. Edit existing setting.");
    const { error } = await supabase.from("employee_salary_settings").insert([settingPayload(settingForm)]);
    if (error) return setMessage(error.message);
    setSettingForm(emptySetting);
    setMessage("Salary setting saved.");
    await onUpdated();
  }

  async function updateSetting(setting) {
    setMessage("");
    const draft = settingEdit[setting.id] || setting;
    const { data, error } = await supabase.from("employee_salary_settings").update(settingPayload(draft)).eq("id", setting.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage("Salary setting save nahi hua. Supabase policy check karein.");
    setSettingEdit({});
    setMessage("Salary setting updated.");
    await onUpdated();
  }

  async function toggleSetting(setting) {
    const nextActive = setting.is_active === false;
    const { error } = await supabase.from("employee_salary_settings").update({ is_active: nextActive }).eq("id", setting.id);
    if (error) return setMessage(error.message);
    setMessage(nextActive ? "Salary setting activated." : "Salary setting deactivated.");
    await onUpdated();
  }

  async function saveAdvance() {
    setMessage("");
    const employee = selectedEmployee(advanceForm.role, advanceForm.employee_id);
    if (!employee) return setMessage("Select employee for advance.");
    if (Number(advanceForm.amount || 0) <= 0) return setMessage("Advance amount required.");
    const { error } = await supabase.from("salary_advances").insert([{
      role: advanceForm.role,
      employee_id: advanceForm.employee_id,
      employee_name: employee.name,
      amount: Number(advanceForm.amount || 0),
      advance_date: advanceForm.advance_date,
      notes: advanceForm.notes.trim(),
      status: "pending",
    }]);
    if (error) return setMessage(error.message);
    setAdvanceForm(emptyAdvance);
    setMessage("Salary advance saved.");
    await onUpdated();
  }

  async function savePayrollRow(row) {
    const payload = {
      month: row.month,
      employee_salary_setting_id: row.employee_salary_setting_id,
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      role: row.role,
      salary_type: row.salary_type,
      fixed_salary: row.fixed_salary,
      revenue_generated: row.revenue_generated,
      bookings_count: row.bookings_count,
      completed_jobs_count: row.completed_jobs_count,
      sales_count: row.sales_count,
      incentive_amount: row.incentive_amount,
      penalty_amount: row.penalty_amount,
      advance_amount: row.advance_amount,
      final_payable: row.final_payable,
      status: row.status || "Draft",
      calculated_at: row.calculated_at,
      paid_at: row.status === "Paid" ? row.paid_at || new Date().toISOString() : row.paid_at || null,
      payment_mode: row.payment_mode || "Cash",
      meta: row.meta,
    };

    const query = row.id
      ? supabase.from("payroll_runs").update(payload).eq("id", row.id).select("id")
      : supabase.from("payroll_runs").insert([payload]).select("id");
    const { data, error } = await query;
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage("Payroll save nahi hua. Supabase policy check karein.");
    setMessage(`Payroll saved as ${payload.status}.`);
    await onUpdated();
  }

  async function updatePayrollStatus(row, status) {
    if (!row.id) {
      await savePayrollRow({ ...row, status });
      return;
    }
    const payload = status === "Paid"
      ? { status, paid_at: new Date().toISOString(), payment_mode: row.payment_mode || "Cash" }
      : { status };
    const { data, error } = await supabase.from("payroll_runs").update(payload).eq("id", row.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage("Payroll status update nahi hua. Supabase policy check karein.");
    setMessage(`Payroll ${status}.`);
    await onUpdated();
  }

  function printPayslip(row) {
    const businessName = businessSettings?.business_name || "AquaBiz";
    const logoUrl = businessSettings?.logo_url || businessSettings?.business_logo_url || "";
    const businessPhone = businessSettings?.business_phone || businessSettings?.phone || "";
    const businessAddress = businessSettings?.business_address || businessSettings?.address || "";
    const html = `
      <html>
        <head>
          <title>Payslip - ${row.employee_name}</title>
          <style>
            body { font-family: Arial, sans-serif; color:#111827; margin:0; padding:30px; background:#f8fafc; }
            .sheet { max-width:760px; margin:auto; background:#fff; border:1px solid #e5e7eb; padding:28px; }
            .head { display:flex; justify-content:space-between; gap:20px; border-bottom:2px solid #0f766e; padding-bottom:16px; }
            .brand { display:flex; gap:14px; align-items:center; }
            .logo { width:64px; height:64px; object-fit:contain; border:1px solid #e5e7eb; border-radius:8px; }
            h1 { margin:0; color:#000666; }
            p { margin:4px 0; color:#475569; }
            h2 { margin:22px 0 10px; color:#000666; }
            .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
            .box { border:1px solid #e5e7eb; padding:12px; border-radius:8px; }
            table { width:100%; border-collapse:collapse; margin-top:12px; }
            th, td { border:1px solid #e5e7eb; padding:10px; text-align:left; }
            th { background:#ecfdf5; color:#064e3b; }
            .total { font-size:22px; font-weight:800; color:#0f766e; }
            .signature { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:50px; }
            @media print { body { background:#fff; padding:0; } .sheet { border:0; } .no-print { display:none; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="head">
              <div class="brand">
                ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ""}
                <div><h1>${businessName}</h1><p>Employee Payslip</p><p>${businessPhone}</p><p>${businessAddress}</p></div>
              </div>
              <div><strong>Month:</strong> ${row.month}<br><strong>Status:</strong> ${row.status}</div>
            </div>
            <h2>Employee Details</h2>
            <div class="grid">
              <div class="box"><strong>Name</strong><br>${row.employee_name}</div>
              <div class="box"><strong>Role</strong><br>${employeeLabel(row.role)}</div>
            </div>
            <h2>Payroll Summary</h2>
            <table>
              <tr><th>Item</th><th>Amount / Count</th></tr>
              <tr><td>Fixed Salary</td><td>${formatINR(row.fixed_salary)}</td></tr>
              <tr><td>Revenue Generated</td><td>${formatINR(row.revenue_generated)}</td></tr>
              <tr><td>Bookings</td><td>${row.bookings_count}</td></tr>
              <tr><td>Completed Jobs</td><td>${row.completed_jobs_count}</td></tr>
              <tr><td>Sales Count</td><td>${row.sales_count}</td></tr>
              <tr><td>Incentive</td><td>${formatINR(row.incentive_amount)}</td></tr>
              <tr><td>Penalty</td><td>${formatINR(row.penalty_amount)}</td></tr>
              <tr><td>Advance / Deduction</td><td>${formatINR(row.advance_amount)}</td></tr>
              <tr><td class="total">Final Payable</td><td class="total">${formatINR(row.final_payable)}</td></tr>
            </table>
            <div class="signature">
              <div>Employee Signature<br><br>________________</div>
              <div>Authorized Signature<br><br>________________</div>
            </div>
            <button class="no-print" onclick="window.print()">Print</button>
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=900,height=900");
    win.document.write(html);
    win.document.close();
  }

  const activeSettings = payrollSettings.filter((setting) => setting.is_active !== false);
  const activeRows = payrollRows.filter((row) => activeSettings.some((setting) => String(setting.id) === String(row.employee_salary_setting_id)));
  const filteredRows = activeRows.filter((row) => statusFilter === "all" || String(row.status || "Draft") === statusFilter);
  const totalPayable = filteredRows.reduce((sum, row) => sum + Number(row.final_payable || 0), 0);
  const totalRevenue = filteredRows.reduce((sum, row) => sum + Number(row.revenue_generated || 0), 0);
  const totalIncentive = filteredRows.reduce((sum, row) => sum + Number(row.incentive_amount || 0), 0);
  const totalAdvance = filteredRows.reduce((sum, row) => sum + Number(row.advance_amount || 0), 0);
  const draftCount = activeRows.filter((row) => String(row.status || "Draft") === "Draft").length;
  const approvedCount = activeRows.filter((row) => String(row.status || "") === "Approved").length;
  const paidCount = activeRows.filter((row) => String(row.status || "") === "Paid").length;
  const success = ["saved", "updated", "approved", "paid", "activated", "deactivated"].some((word) => message.toLowerCase().includes(word));

  return (
    <>
      <section className="page-head payroll-page-head">
        <h2>Payroll</h2>
        <p>Monthly salary, incentive, advance deduction, and payslip.</p>
      </section>

      {message && <div className={success ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel payroll-month-panel">
        <h3>Monthly Payroll</h3>
        <div className="two-col">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
        <section className="cards-grid payroll-summary-grid payroll-total-grid">
          <div className="amount-box total"><strong>Total Payable</strong><strong>{formatINR(totalPayable)}</strong></div>
          <div className="amount-box"><strong>Total Revenue</strong><strong>{formatINR(totalRevenue)}</strong></div>
          <div className="amount-box"><strong>Total Incentive</strong><strong>{formatINR(totalIncentive)}</strong></div>
          <div className="amount-box"><strong>Advance/Deduction</strong><strong>{formatINR(totalAdvance)}</strong></div>
        </section>
        <div className="row-actions">
          <span className="status unassigned">Draft {draftCount}</span>
          <span className="status assigned">Approved {approvedCount}</span>
          <span className="status assigned">Paid {paidCount}</span>
        </div>
      </section>

      <section className="panel payroll-settings-panel">
        <h3>Employee Salary Settings</h3>
        <Accordion title="Already Added Salary Settings" count={payrollSettings.length} defaultOpen>
          {payrollSettings.length === 0 ? <p className="muted">No salary settings added.</p> : payrollSettings.map((setting) => {
            const draft = settingEdit[setting.id] || setting;
            return (
              <div className="edit-card" key={setting.id}>
                <div className="edit-card-head">
                  <div>
                    <strong>{setting.employee_name}</strong>
                    <p>{employeeLabel(setting.role)} | {salaryTypes.find(([value]) => value === setting.salary_type)?.[1]}</p>
                  </div>
                  <div className="row-actions">
                    <span className={setting.is_active === false ? "status unassigned" : "status assigned"}>{setting.is_active === false ? "Inactive" : "Active"}</span>
                    <button className="primary-btn small" onClick={() => updateSetting(setting)}>Save</button>
                    <button className="danger-btn small" onClick={() => toggleSetting(setting)}>{setting.is_active === false ? "Activate" : "Deactivate"}</button>
                  </div>
                </div>
                <SalarySettingFields
                  data={draft}
                  setData={(next) => setSettingEdit({ ...settingEdit, [setting.id]: next })}
                  employeeOptions={employeeOptions}
                />
              </div>
            );
          })}
        </Accordion>

        <Accordion title="Add Employee Salary Setting">
          <SalarySettingFields data={settingForm} setData={setSettingForm} employeeOptions={employeeOptions} />
          <button className="primary-btn big" onClick={saveSetting}>Save Salary Setting</button>
        </Accordion>
      </section>

      <section className="panel payroll-advance-panel">
        <h3>Salary Advance</h3>
        <Accordion title="Add Salary Advance" defaultOpen>
          <div className="form-stack">
            <div className="two-col">
              <select value={advanceForm.role} onChange={(event) => setAdvanceForm({ ...advanceForm, role: event.target.value, employee_id: "" })}>
                {employeeRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={advanceForm.employee_id} onChange={(event) => setAdvanceForm({ ...advanceForm, employee_id: event.target.value })}>
                <option value="">Select employee</option>
                {employeeOptions(advanceForm.role).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div className="two-col">
              <input type="number" placeholder="Advance amount" value={advanceForm.amount} onChange={(event) => setAdvanceForm({ ...advanceForm, amount: event.target.value })} />
              <input type="date" value={advanceForm.advance_date} onChange={(event) => setAdvanceForm({ ...advanceForm, advance_date: event.target.value })} />
            </div>
            <input placeholder="Notes" value={advanceForm.notes} onChange={(event) => setAdvanceForm({ ...advanceForm, notes: event.target.value })} />
            <button className="primary-btn" onClick={saveAdvance}>Save Advance</button>
          </div>
        </Accordion>
        <Accordion title="Advance Records" count={salaryAdvances.length}>
          {salaryAdvances.length === 0 ? <p className="muted">No salary advance records.</p> : salaryAdvances.slice(0, 20).map((advance) => (
            <div className="booking-row" key={advance.id}>
              <div>
                <strong>{advance.employee_name}</strong>
                <p>{employeeLabel(advance.role)} | {advance.advance_date} | {advance.notes}</p>
              </div>
              <strong>{formatINR(advance.amount)}</strong>
            </div>
          ))}
        </Accordion>
      </section>

      <section className="panel payroll-calculated-panel">
        <h3>Calculated Payroll</h3>
        {activeSettings.length === 0 ? <p className="muted">Add employee salary settings first.</p> : filteredRows.length === 0 ? <p className="muted">No payroll rows found for this filter.</p> : filteredRows.map((row) => (
          <details className="payroll-card payroll-accordion" key={`${row.employee_salary_setting_id}-${row.month}`}>
            <summary>
              <div>
                <strong>{row.employee_name}</strong>
                <p>{employeeLabel(row.role)} | {row.month} | {row.status}</p>
              </div>
              <strong className="payable-amount">{formatINR(row.final_payable)}</strong>
            </summary>
            <div className="payroll-grid">
              <div><span>Fixed Salary</span><strong>{formatINR(row.fixed_salary)}</strong></div>
              <div><span>Revenue</span><strong>{formatINR(row.revenue_generated)}</strong></div>
              <div><span>Bookings</span><strong>{row.bookings_count}</strong></div>
              <div><span>Completed Jobs</span><strong>{row.completed_jobs_count}</strong></div>
              <div><span>Sales</span><strong>{row.sales_count}</strong></div>
              <div><span>Incentive</span><strong>{formatINR(row.incentive_amount)}</strong></div>
              <div><span>Penalty</span><strong>{formatINR(row.penalty_amount)}</strong></div>
              <div><span>Advance</span><strong>{formatINR(row.advance_amount)}</strong></div>
            </div>
            <div className="row-actions">
              <button className="primary-btn small" onClick={() => savePayrollRow(row)}>Save Draft</button>
              <button className="ghost-btn small" onClick={() => updatePayrollStatus(row, "Approved")}>Approve</button>
              <button className="ghost-btn small" onClick={() => updatePayrollStatus(row, "Paid")}>Mark Paid</button>
              <button className="ghost-btn small" onClick={() => printPayslip(row)}>Print Payslip</button>
            </div>
          </details>
        ))}
      </section>
    </>
  );
}

function SalarySettingFields({ data, setData, employeeOptions }) {
  return (
    <div className="form-stack">
      <div className="two-col">
        <select value={data.role} onChange={(event) => setData({ ...data, role: event.target.value, employee_id: "" })}>
          {employeeRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={data.employee_id} onChange={(event) => setData({ ...data, employee_id: event.target.value })}>
          <option value="">Select employee</option>
          {employeeOptions(data.role).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
      </div>
      <div className="two-col">
        <select value={data.salary_type} onChange={(event) => setData({ ...data, salary_type: event.target.value })}>
          {salaryTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input type="number" placeholder="Fixed salary" value={data.fixed_salary} onChange={(event) => setData({ ...data, fixed_salary: event.target.value })} />
      </div>
      <div className="two-col">
        <input type="number" placeholder="Per booking incentive" value={data.per_booking_incentive} onChange={(event) => setData({ ...data, per_booking_incentive: event.target.value })} />
        <input type="number" placeholder="Per completed job incentive" value={data.per_completed_job_incentive} onChange={(event) => setData({ ...data, per_completed_job_incentive: event.target.value })} />
      </div>
      <div className="two-col">
        <input type="number" placeholder="Sales percentage incentive" value={data.sales_percentage_incentive} onChange={(event) => setData({ ...data, sales_percentage_incentive: event.target.value })} />
        <input type="number" placeholder="AMC sale incentive" value={data.amc_sale_incentive} onChange={(event) => setData({ ...data, amc_sale_incentive: event.target.value })} />
      </div>
      <div className="two-col">
        <input type="number" placeholder="Installation incentive" value={data.installation_incentive} onChange={(event) => setData({ ...data, installation_incentive: event.target.value })} />
        <input type="number" placeholder="Repeat job penalty" value={data.repeat_job_penalty} onChange={(event) => setData({ ...data, repeat_job_penalty: event.target.value })} />
      </div>
      <div className="two-col">
        <input type="number" placeholder="Target amount" value={data.target_amount} onChange={(event) => setData({ ...data, target_amount: event.target.value })} />
        <input type="number" placeholder="Target bonus" value={data.target_bonus} onChange={(event) => setData({ ...data, target_bonus: event.target.value })} />
      </div>
      <input type="number" placeholder="Advance / deduction" value={data.advance_deduction} onChange={(event) => setData({ ...data, advance_deduction: event.target.value })} />
    </div>
  );
}
