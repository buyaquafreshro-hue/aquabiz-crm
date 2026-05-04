import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatINR, getLocalMonthKey, todayISO } from "../utils/appUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

const emptyExpense = {
  expense_date: todayISO(),
  category_id: "",
  amount: "",
  payment_mode: "Cash",
  paid_to: "",
  notes: "",
  created_by: "Admin",
};

function Accordion({ title, count, defaultOpen = false, children }) {
  return (
    <details className="settings-accordion" defaultOpen={defaultOpen}>
      <summary>
        <span>{title}</span>
        {typeof count === "number" && <strong>{count}</strong>}
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function ExpensesPage({ expenseCategories = [], expenses = [], onUpdated }) {
  const [month, setMonth] = useState(getLocalMonthKey());
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [billFile, setBillFile] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useAutoHideMessage(message, setMessage);

  const categoriesById = useMemo(() => {
    const map = new Map();
    expenseCategories.forEach((category) => map.set(String(category.id), category));
    return map;
  }, [expenseCategories]);

  const activeCategories = expenseCategories.filter((category) => category.is_active !== false);
  const monthExpenses = expenses.filter((expense) => String(expense.expense_date || expense.created_at || "").slice(0, 7) === month);
  const filteredExpenses = monthExpenses.filter((expense) => {
    const categoryName = categoriesById.get(String(expense.category_id))?.name || expense.category_name || "";
    const text = `${categoryName} ${expense.paid_to || ""} ${expense.notes || ""} ${expense.payment_mode || ""} ${expense.created_by || ""}`.toLowerCase();
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
    if (categoryFilter && String(expense.category_id) !== String(categoryFilter)) return false;
    if (modeFilter && String(expense.payment_mode) !== modeFilter) return false;
    return true;
  });

  const totalExpense = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const cashExpense = filteredExpenses.filter((expense) => expense.payment_mode === "Cash").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const upiExpense = filteredExpenses.filter((expense) => expense.payment_mode === "UPI").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const bankExpense = filteredExpenses.filter((expense) => expense.payment_mode === "Bank").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  function resetExpenseForm() {
    setExpenseForm(emptyExpense);
    setEditingExpenseId("");
    setBillFile(null);
  }

  async function addCategory() {
    setMessage("");
    if (!categoryForm.name.trim()) return setMessage("Expense category name is required.");
    const { error } = await supabase.from("expense_categories").insert([{ name: categoryForm.name.trim(), is_active: true }]);
    if (error) return setMessage(error.message);
    setCategoryForm({ name: "" });
    setMessage("Expense category saved.");
    await onUpdated();
  }

  function startCategoryEdit(category) {
    setEditingCategoryId(category.id);
    setCategoryDraft(category.name || "");
  }

  async function saveCategoryEdit(categoryId) {
    setMessage("");
    if (!categoryDraft.trim()) return setMessage("Category name is required.");
    const { error } = await supabase.from("expense_categories").update({ name: categoryDraft.trim() }).eq("id", categoryId);
    if (error) return setMessage(error.message);
    setEditingCategoryId("");
    setCategoryDraft("");
    setMessage("Expense category updated.");
    await onUpdated();
  }

  async function toggleCategory(category) {
    setMessage("");
    const nextStatus = category.is_active === false;
    const { error } = await supabase.from("expense_categories").update({ is_active: nextStatus }).eq("id", category.id);
    if (error) return setMessage(error.message);
    setMessage(nextStatus ? "Expense category activated." : "Expense category deactivated.");
    await onUpdated();
  }

  async function uploadBill() {
    if (!billFile) return "";
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(billFile.type)) throw new Error("Bill file must be JPG, PNG, WEBP or PDF.");
    if (billFile.size > 3 * 1024 * 1024) throw new Error("Bill file size must be under 3MB.");
    const ext = billFile.name.split(".").pop() || "jpg";
    const path = `expense-bills/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("expense-bills").upload(path, billFile, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("expense-bills").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveExpense() {
    setMessage("");
    if (!expenseForm.category_id) return setMessage("Select expense category.");
    if (Number(expenseForm.amount || 0) <= 0) return setMessage("Expense amount is required.");
    setSaving(true);
    try {
      const category = categoriesById.get(String(expenseForm.category_id));
      const billUrl = await uploadBill();
      const payload = {
        expense_date: expenseForm.expense_date || todayISO(),
        category_id: expenseForm.category_id,
        category_name: category?.name || "",
        amount: Number(expenseForm.amount || 0),
        payment_mode: expenseForm.payment_mode,
        paid_to: expenseForm.paid_to.trim(),
        notes: expenseForm.notes.trim(),
        created_by: expenseForm.created_by.trim() || "Admin",
      };
      if (billUrl) payload.bill_url = billUrl;

      const query = editingExpenseId
        ? supabase.from("expenses").update(payload).eq("id", editingExpenseId)
        : supabase.from("expenses").insert([payload]);
      const { error } = await query;
      if (error) throw error;
      resetExpenseForm();
      setMessage(editingExpenseId ? "Expense updated." : "Expense saved.");
      await onUpdated();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startExpenseEdit(expense) {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      expense_date: expense.expense_date || todayISO(),
      category_id: expense.category_id || "",
      amount: String(expense.amount || ""),
      payment_mode: expense.payment_mode || "Cash",
      paid_to: expense.paid_to || "",
      notes: expense.notes || "",
      created_by: expense.created_by || "Admin",
    });
    setBillFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(expense) {
    const confirmDelete = window.confirm(`Delete expense ${formatINR(expense.amount)}?`);
    if (!confirmDelete) return;
    setMessage("");
    const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
    if (error) return setMessage(error.message);
    setMessage("Expense deleted.");
    await onUpdated();
  }

  function exportCsv() {
    const headers = ["Date", "Category", "Amount", "Payment Mode", "Paid To", "Created By", "Notes", "Bill URL"];
    const rows = filteredExpenses.map((expense) => [
      expense.expense_date || "",
      expense.category_name || categoriesById.get(String(expense.category_id))?.name || "Expense",
      expense.amount || 0,
      expense.payment_mode || "",
      expense.paid_to || "",
      expense.created_by || "",
      expense.notes || "",
      expense.bill_url || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aquabiz-expenses-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const success = ["saved", "updated", "deleted", "activated", "deactivated"].some((word) => message.toLowerCase().includes(word));

  return (
    <>
      <section className="page-head expenses-page-head">
        <h2>Expenses</h2>
        <p>Record business expenses and review monthly expense reports.</p>
      </section>

      <section className="amount-grid expenses-summary-grid">
        <div className="amount-box total">
          <span>Monthly Total</span>
          <strong>{formatINR(totalExpense)}</strong>
        </div>
        <div className="amount-box">
          <span>Cash</span>
          <strong>{formatINR(cashExpense)}</strong>
        </div>
        <div className="amount-box">
          <span>UPI</span>
          <strong>{formatINR(upiExpense)}</strong>
        </div>
        <div className="amount-box">
          <span>Bank</span>
          <strong>{formatINR(bankExpense)}</strong>
        </div>
      </section>

      {message && <div className={success ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel expenses-panel">
        <Accordion title="Expense Categories" count={expenseCategories.length}>
          <div className="two-col">
            <input placeholder="Category name e.g. Rent, Salary, Fuel" value={categoryForm.name} onChange={(event) => setCategoryForm({ name: event.target.value })} />
            <button className="primary-btn" onClick={addCategory}>Save Category</button>
          </div>

          <div className="responsive-table mt-sm">
            <table className="parts-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {editingCategoryId === category.id ? (
                        <input value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} />
                      ) : (
                        <strong>{category.name}</strong>
                      )}
                    </td>
                    <td><span className={category.is_active === false ? "stock-badge out" : "stock-badge in"}>{category.is_active === false ? "Inactive" : "Active"}</span></td>
                    <td>
                      <div className="table-actions">
                        {editingCategoryId === category.id ? (
                          <>
                            <button className="primary-btn small" onClick={() => saveCategoryEdit(category.id)}>Save</button>
                            <button className="danger-btn small" onClick={() => setEditingCategoryId("")}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="link-btn" onClick={() => startCategoryEdit(category)}>Edit</button>
                            <button className="danger-btn small" onClick={() => toggleCategory(category)}>{category.is_active === false ? "Activate" : "Deactivate"}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {expenseCategories.length === 0 && (
                  <tr>
                    <td colSpan="3">No expense categories added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Accordion>
      </section>

      <section className="panel expenses-panel">
        <Accordion title={editingExpenseId ? "Edit Expense" : "Add New Expense"} defaultOpen>
          <div className="form-stack">
            <div className="two-col">
              <input type="date" value={expenseForm.expense_date} onChange={(event) => setExpenseForm({ ...expenseForm, expense_date: event.target.value })} />
              <select value={expenseForm.category_id} onChange={(event) => setExpenseForm({ ...expenseForm, category_id: event.target.value })}>
                <option value="">Select category</option>
                {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="two-col">
              <input type="number" placeholder="Amount" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} />
              <select value={expenseForm.payment_mode} onChange={(event) => setExpenseForm({ ...expenseForm, payment_mode: event.target.value })}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
              </select>
            </div>
            <div className="two-col">
              <input placeholder="Paid to" value={expenseForm.paid_to} onChange={(event) => setExpenseForm({ ...expenseForm, paid_to: event.target.value })} />
              <input placeholder="Created by" value={expenseForm.created_by} onChange={(event) => setExpenseForm({ ...expenseForm, created_by: event.target.value })} />
            </div>
            <textarea placeholder="Notes" rows={3} value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} />
            <div>
              <label className="field-label">Bill / Photo Optional</label>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setBillFile(event.target.files?.[0] || null)} />
              <p className="helper">{editingExpenseId ? "Upload only if you want to replace/add a bill. " : ""}JPG, PNG, WEBP or PDF. Max 3MB.</p>
            </div>
            <div className="action-row">
              <button className="primary-btn big" onClick={saveExpense} disabled={saving}>{saving ? "Saving..." : editingExpenseId ? "Update Expense" : "Save Expense"}</button>
              {editingExpenseId && <button className="danger-btn big" onClick={resetExpenseForm}>Cancel Edit</button>}
            </div>
          </div>
        </Accordion>
      </section>

      <section className="panel expenses-panel expenses-report-panel">
        <div className="section-heading-row">
          <div>
            <h3>Monthly Expense Report</h3>
            <p className="muted">Filter expenses by month, category, payment mode and text search.</p>
          </div>
          <button className="primary-btn" onClick={exportCsv} disabled={filteredExpenses.length === 0}>Export CSV</button>
        </div>
        <div className="two-col">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <input placeholder="Search category, paid to, notes" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="two-col mt-sm">
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">All categories</option>
            {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
            <option value="">All payment modes</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Bank</option>
          </select>
        </div>

        <section className="cards-grid payroll-summary-grid">
          <div className="amount-box total"><strong>Total Expenses</strong><strong>{formatINR(totalExpense)}</strong></div>
          <div className="amount-box"><strong>Cash</strong><strong>{formatINR(cashExpense)}</strong></div>
          <div className="amount-box"><strong>UPI</strong><strong>{formatINR(upiExpense)}</strong></div>
          <div className="amount-box"><strong>Bank</strong><strong>{formatINR(bankExpense)}</strong></div>
        </section>
      </section>

      <section className="panel expenses-panel">
        <Accordion title="Expense Records" count={filteredExpenses.length} defaultOpen>
          <div className="responsive-table">
            <table className="parts-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Paid To</th>
                  <th>Mode</th>
                  <th>Amount</th>
                  <th>Bill</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expense_date || "-"}</td>
                    <td>
                      <strong>{expense.category_name || categoriesById.get(String(expense.category_id))?.name || "Expense"}</strong>
                      {expense.notes && <p className="muted">{expense.notes}</p>}
                    </td>
                    <td>{expense.paid_to || "N/A"}</td>
                    <td>{expense.payment_mode || "-"}</td>
                    <td><strong>{formatINR(expense.amount)}</strong></td>
                    <td>{expense.bill_url ? <a className="link-btn" href={expense.bill_url} target="_blank" rel="noreferrer">View</a> : <span className="muted">No bill</span>}</td>
                    <td>
                      <div className="table-actions">
                        <button className="link-btn" onClick={() => startExpenseEdit(expense)}>Edit</button>
                        <button className="danger-btn small" onClick={() => deleteExpense(expense)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan="7">No expenses found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Accordion>
      </section>
    </>
  );
}
