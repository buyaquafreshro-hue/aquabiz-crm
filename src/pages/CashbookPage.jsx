import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatINR, getLocalMonthKey, getPaidAmount, todayISO } from "../utils/appUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

function dateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function monthKey(value) {
  if (!value) return "";
  return String(value).slice(0, 7);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildInvoiceEntries(invoices = [], invoicePayments = []) {
  const paymentsByInvoice = new Map();
  invoicePayments.forEach((payment) => {
    const key = String(payment.invoice_id || "");
    const current = paymentsByInvoice.get(key) || { cash: 0, upi: 0 };
    current.cash += Number(payment.cash_amount || 0);
    current.upi += Number(payment.upi_amount || 0);
    paymentsByInvoice.set(key, current);
  });

  const initialEntries = invoices.flatMap((invoice) => {
    const laterPayments = paymentsByInvoice.get(String(invoice.id || "")) || { cash: 0, upi: 0 };
    const initialCash = Math.max(Number(invoice.cash_amount || 0) - laterPayments.cash, 0);
    const initialUpi = Math.max(Number(invoice.upi_amount || 0) - laterPayments.upi, 0);
    const entryDate = dateKey(invoice.invoice_date || invoice.created_at);
    const base = {
      id: `invoice-${invoice.id}`,
      date: entryDate,
      source: "Invoice",
      party: invoice.customer_name || "Customer",
      note: invoice.invoice_number || invoice.invoice_type || "Invoice",
      invoice_id: invoice.id,
    };
    return [
      initialCash > 0 ? { ...base, id: `${base.id}-cash`, mode: "Cash", cash_in: initialCash, upi_in: 0, bank_in: 0, cash_out: 0, upi_out: 0, bank_out: 0 } : null,
      initialUpi > 0 ? { ...base, id: `${base.id}-upi`, mode: "UPI", cash_in: 0, upi_in: initialUpi, bank_in: 0, cash_out: 0, upi_out: 0, bank_out: 0 } : null,
    ].filter(Boolean);
  });

  const paymentEntries = invoicePayments.flatMap((payment) => {
    const entryDate = dateKey(payment.payment_date || payment.created_at);
    const base = {
      id: `payment-${payment.id}`,
      date: entryDate,
      source: "Collection",
      party: payment.customer_name || "Customer",
      note: payment.note || "Invoice payment",
      invoice_id: payment.invoice_id,
    };
    return [
      Number(payment.cash_amount || 0) > 0 ? { ...base, id: `${base.id}-cash`, mode: "Cash", cash_in: Number(payment.cash_amount || 0), upi_in: 0, bank_in: 0, cash_out: 0, upi_out: 0, bank_out: 0 } : null,
      Number(payment.upi_amount || 0) > 0 ? { ...base, id: `${base.id}-upi`, mode: "UPI", cash_in: 0, upi_in: Number(payment.upi_amount || 0), bank_in: 0, cash_out: 0, upi_out: 0, bank_out: 0 } : null,
    ].filter(Boolean);
  });

  return [...initialEntries, ...paymentEntries];
}

function buildExpenseEntries(expenses = []) {
  return expenses.map((expense) => {
    const amount = Number(expense.amount || 0);
    const mode = expense.payment_mode || "Cash";
    return {
      id: `expense-${expense.id}`,
      date: dateKey(expense.expense_date || expense.created_at),
      source: "Expense",
      party: expense.paid_to || expense.category_name || "Expense",
      note: expense.notes || expense.category_name || "",
      mode,
      cash_in: 0,
      upi_in: 0,
      bank_in: 0,
      cash_out: mode === "Cash" ? amount : 0,
      upi_out: mode === "UPI" ? amount : 0,
      bank_out: mode === "Bank" ? amount : 0,
    };
  });
}

function buildPayrollEntries(payrollRuns = []) {
  return payrollRuns
    .filter((run) => String(run.status || "").toLowerCase() === "paid")
    .map((run) => ({
      id: `payroll-${run.id}`,
      date: dateKey(run.paid_at || run.calculated_at || run.created_at),
      source: "Salary Paid",
      party: run.employee_name || "Employee",
      note: `${run.role || ""} salary - ${run.month || ""}`.trim(),
      mode: run.payment_mode || "Cash",
      cash_in: 0,
      upi_in: 0,
      bank_in: 0,
      cash_out: String(run.payment_mode || "Cash") === "Cash" ? Number(run.final_payable || 0) : 0,
      upi_out: String(run.payment_mode || "") === "UPI" ? Number(run.final_payable || 0) : 0,
      bank_out: String(run.payment_mode || "") === "Bank" ? Number(run.final_payable || 0) : 0,
    }));
}

function sumEntries(entries) {
  return entries.reduce((total, entry) => ({
    cashIn: total.cashIn + Number(entry.cash_in || 0),
    upiIn: total.upiIn + Number(entry.upi_in || 0),
    bankIn: total.bankIn + Number(entry.bank_in || 0),
    cashOut: total.cashOut + Number(entry.cash_out || 0),
    upiOut: total.upiOut + Number(entry.upi_out || 0),
    bankOut: total.bankOut + Number(entry.bank_out || 0),
  }), { cashIn: 0, upiIn: 0, bankIn: 0, cashOut: 0, upiOut: 0, bankOut: 0 });
}

export function CashbookPage({ invoices = [], invoicePayments = [], expenses = [], payrollRuns = [], cashbookOpenings = [], onUpdated }) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonthKey());
  const [openingCash, setOpeningCash] = useState("0");
  const [message, setMessage] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const savedOpening = cashbookOpenings.find((row) => String(row.cashbook_date) === selectedDate);

  useEffect(() => {
    setOpeningCash(String(savedOpening?.opening_cash || 0));
  }, [savedOpening?.id, selectedDate]);

  useAutoHideMessage(message, setMessage);

  const allEntries = useMemo(() => [
    ...buildInvoiceEntries(invoices, invoicePayments),
    ...buildExpenseEntries(expenses),
    ...buildPayrollEntries(payrollRuns),
  ].filter((entry) => entry.date), [invoices, invoicePayments, expenses, payrollRuns]);

  const dayEntries = allEntries
    .filter((entry) => entry.date === selectedDate)
    .filter((entry) => !modeFilter || entry.mode === modeFilter)
    .filter((entry) => !sourceFilter || entry.source === sourceFilter)
    .sort((a, b) => String(a.source).localeCompare(String(b.source)));

  const monthEntries = allEntries.filter((entry) => monthKey(entry.date) === selectedMonth);
  const dayTotals = sumEntries(dayEntries);
  const monthTotals = sumEntries(monthEntries);
  const opening = Number(openingCash || 0);
  const closingCash = opening + dayTotals.cashIn - dayTotals.cashOut;
  const totalCollection = dayTotals.cashIn + dayTotals.upiIn + dayTotals.bankIn;
  const totalOut = dayTotals.cashOut + dayTotals.upiOut + dayTotals.bankOut;
  const monthlyRevenue = invoices.filter((invoice) => monthKey(invoice.invoice_date || invoice.created_at) === selectedMonth).reduce((sum, invoice) => sum + getPaidAmount(invoice), 0);
  const monthlyOut = monthTotals.cashOut + monthTotals.upiOut + monthTotals.bankOut;
  const monthlyProfit = monthlyRevenue - monthlyOut;

  async function saveOpeningCash() {
    setMessage("");
    const payload = {
      cashbook_date: selectedDate,
      opening_cash: Number(openingCash || 0),
      note: "Daily opening cash",
    };
    const { error } = await supabase.from("cashbook_openings").upsert([payload], { onConflict: "cashbook_date" });
    if (error) return setMessage(error.message);
    setMessage("Opening cash saved.");
    await onUpdated?.();
  }

  function exportCsv() {
    const headers = ["Date", "Source", "Party", "Mode", "Cash In", "UPI In", "Bank In", "Cash Out", "UPI Out", "Bank Out", "Note"];
    const rows = dayEntries.map((entry) => [
      entry.date,
      entry.source,
      entry.party,
      entry.mode,
      entry.cash_in,
      entry.upi_in,
      entry.bank_in,
      entry.cash_out,
      entry.upi_out,
      entry.bank_out,
      entry.note,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aquabiz-cashbook-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const success = ["saved"].some((word) => message.toLowerCase().includes(word));

  return (
    <>
      <section className="page-head cashbook-page-head">
        <h2>Accounts / Cashbook</h2>
        <p>Daily cash, UPI, bank collection, expenses, salary paid and monthly profit view.</p>
      </section>

      {message && <div className={success ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel cashbook-control-panel">
        <div className="two-col">
          <div>
            <label className="field-label">Cashbook Date</label>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </div>
          <div>
            <label className="field-label">Report Month</label>
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          </div>
        </div>
        <div className="two-col mt-sm">
          <div>
            <label className="field-label">Opening Cash</label>
            <input type="number" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} />
          </div>
          <button className="primary-btn big" onClick={saveOpeningCash}>Save Opening Cash</button>
        </div>
      </section>

      <section className="cards-grid payroll-summary-grid cashbook-summary-grid">
        <div className="amount-box total"><strong>Closing Cash</strong><strong>{formatINR(closingCash)}</strong></div>
        <div className="amount-box"><strong>Cash In</strong><strong>{formatINR(dayTotals.cashIn)}</strong></div>
        <div className="amount-box"><strong>Cash Out</strong><strong>{formatINR(dayTotals.cashOut)}</strong></div>
        <div className="amount-box"><strong>UPI Collection</strong><strong>{formatINR(dayTotals.upiIn)}</strong></div>
        <div className="amount-box"><strong>Bank Collection</strong><strong>{formatINR(dayTotals.bankIn)}</strong></div>
        <div className="amount-box"><strong>Total Collection</strong><strong>{formatINR(totalCollection)}</strong></div>
        <div className="amount-box"><strong>Total Out</strong><strong>{formatINR(totalOut)}</strong></div>
        <div className="amount-box"><strong>Net Day</strong><strong>{formatINR(totalCollection - totalOut)}</strong></div>
      </section>

      <section className="panel cashbook-entries-panel">
        <div className="section-heading-row">
          <div>
            <h3>Daily Cashbook Entries</h3>
            <p className="muted">Invoice collections, pending payment collections, expenses and paid salary are shown here.</p>
          </div>
          <button className="primary-btn" onClick={exportCsv} disabled={dayEntries.length === 0}>Export CSV</button>
        </div>
        <div className="two-col">
          <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
            <option value="">All modes</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Bank</option>
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="">All sources</option>
            <option>Invoice</option>
            <option>Collection</option>
            <option>Expense</option>
            <option>Salary Paid</option>
          </select>
        </div>

        <div className="responsive-table mt-sm">
          <table className="parts-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Party</th>
                <th>Mode</th>
                <th>In</th>
                <th>Out</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {dayEntries.map((entry) => {
                const inAmount = Number(entry.cash_in || 0) + Number(entry.upi_in || 0) + Number(entry.bank_in || 0);
                const outAmount = Number(entry.cash_out || 0) + Number(entry.upi_out || 0) + Number(entry.bank_out || 0);
                return (
                  <tr key={entry.id}>
                    <td><strong>{entry.source}</strong></td>
                    <td>{entry.party || "-"}</td>
                    <td>{entry.mode}</td>
                    <td>{inAmount > 0 ? formatINR(inAmount) : "-"}</td>
                    <td>{outAmount > 0 ? <span className="danger-line">{formatINR(outAmount)}</span> : "-"}</td>
                    <td>{entry.note || "-"}</td>
                  </tr>
                );
              })}
              {dayEntries.length === 0 && (
                <tr>
                  <td colSpan="6">No cashbook entries found for this date.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel cashbook-profit-panel">
        <h3>Monthly Profit / Loss</h3>
        <section className="cards-grid payroll-summary-grid">
          <div className="amount-box total"><strong>Profit / Loss</strong><strong>{formatINR(monthlyProfit)}</strong></div>
          <div className="amount-box"><strong>Revenue</strong><strong>{formatINR(monthlyRevenue)}</strong></div>
          <div className="amount-box"><strong>Expenses + Salary</strong><strong>{formatINR(monthlyOut)}</strong></div>
          <div className="amount-box"><strong>Cash Net</strong><strong>{formatINR(monthTotals.cashIn - monthTotals.cashOut)}</strong></div>
        </section>
      </section>
    </>
  );
}
