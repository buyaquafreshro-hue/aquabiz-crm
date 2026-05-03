import { useState } from "react";
import { emptyCategory, emptyPart } from "../constants/defaults";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { formatINR, todayISO } from "../utils/appUtils";
export function InventoryPage({ categories, inventory, inventoryPurchases = [], onUpdated }) {
  const [cat, setCat] = useState(emptyCategory);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [form, setForm] = useState(emptyPart);
  const [message, setMessage] = useState("");
  const [restockItemId, setRestockItemId] = useState("");
  const [restock, setRestock] = useState({
    restock_date: todayISO(),
    quantity: "",
    purchase_price: "",
    supplier_name: "",
    notes: "",
  });

  async function addCategory() {
    if (!cat.name.trim()) {
      setMessage("Category name is required.");
      return;
    }

    const { data, error } = await supabase
      .from("part_categories")
      .insert([{ name: cat.name.trim() }])
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setForm({ ...form, category_id: data.id });
    setCat(emptyCategory);
    setShowNewCategory(false);
    setMessage("Category added and selected.");
    await onUpdated();
  }

  async function addPart() {
    if (!form.name.trim()) return setMessage("Part name is required.");
    if (!form.category_id) return setMessage("Please select or add a category.");

    const { error } = await supabase.from("inventory_items").insert([{
      name: form.name.trim(),
      category_id: form.category_id || null,
      purchase_price: Number(form.purchase_price || 0),
      selling_price: Number(form.selling_price || 0),
      stock_qty: Number(form.stock_qty || 0),
      low_stock_qty: Number(form.low_stock_qty || 0),
      supplier_name: form.supplier_name.trim(),
    }]);

    if (error) return setMessage(error.message);

    setForm(emptyPart);
    setMessage("Part added.");
    await onUpdated();
  }

  async function saveRestock(item) {
    setMessage("");

    if (!item) {
      setMessage("Select a part first.");
      return;
    }

    const qty = Number(restock.quantity || 0);
    const purchasePrice = Number(restock.purchase_price || 0);

    if (qty <= 0) {
      setMessage("Restock quantity must be greater than 0.");
      return;
    }

    const currentStock = Number(item.stock_qty || 0);
    const newStock = currentStock + qty;

    const { error: purchaseError } = await supabase.from("inventory_purchases").insert([{
      inventory_item_id: item.id,
      part_name: item.name,
      restock_date: restock.restock_date || todayISO(),
      quantity: qty,
      purchase_price: purchasePrice,
      total_purchase_amount: qty * purchasePrice,
      supplier_name: restock.supplier_name.trim(),
      notes: restock.notes.trim(),
    }]);

    if (purchaseError) {
      setMessage(purchaseError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_qty: newStock,
        purchase_price: purchasePrice || Number(item.purchase_price || 0),
        supplier_name: restock.supplier_name.trim() || item.supplier_name || "",
      })
      .eq("id", item.id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setRestockItemId("");
    setRestock({
      restock_date: todayISO(),
      quantity: "",
      purchase_price: "",
      supplier_name: "",
      notes: "",
    });
    setMessage("Stock restocked successfully.");
    await onUpdated();
  }

  return (
    <>
      <section className="page-head">
        <h2>Inventory</h2>
        <p>Add parts, manage stock, and track purchase/restock history.</p>
      </section>

      <section className="panel">
        <h3>Add Part</h3>
        <div className="form-stack">
          <input
            placeholder="Part name e.g. Vontron Membrane"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <FormCard label="Part Category">
            <select
              value={showNewCategory ? "__new__" : form.category_id}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewCategory(true);
                  setForm({ ...form, category_id: "" });
                } else {
                  setShowNewCategory(false);
                  setForm({ ...form, category_id: e.target.value });
                }
              }}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>{c.name}</option>
              ))}
              <option value="__new__">+ Add New Category</option>
            </select>

            {showNewCategory && (
              <div className="two-col mt-sm">
                <input
                  placeholder="New category name"
                  value={cat.name}
                  onChange={(e) => setCat({ name: e.target.value })}
                />
                <button className="primary-btn" onClick={addCategory}>Add Category</button>
              </div>
            )}
          </FormCard>

          <div className="two-col">
            <input placeholder="Purchase price" type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            <input placeholder="Selling price" type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          </div>
          <div className="two-col">
            <input placeholder="Opening stock" type="number" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} />
            <input placeholder="Low stock alert" type="number" value={form.low_stock_qty} onChange={(e) => setForm({ ...form, low_stock_qty: e.target.value })} />
          </div>
          <input placeholder="Supplier name optional" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
          <button className="primary-btn" onClick={addPart}>Add Part</button>
          {message && <div className={message.includes("success") || message.includes("added") || message.includes("selected") ? "success-box" : "error-box"}>{message}</div>}
        </div>
      </section>

      <section className="panel">
        <h3>Parts List & Restock</h3>
        {inventory.length === 0 ? <p className="muted">No parts added.</p> : inventory.map((p) => {
          const itemPurchases = inventoryPurchases.filter((x) => String(x.inventory_item_id) === String(p.id)).slice(0, 3);
          const isRestocking = restockItemId === p.id;

          return (
            <div className="job-card" key={p.id}>
              <div className="panel-head">
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.category_name} • Sell {formatINR(p.selling_price)} • Last Purchase {formatINR(p.purchase_price)}</p>
                  <p className={Number(p.stock_qty || 0) <= Number(p.low_stock_qty || 0) ? "danger-line" : ""}>
                    Current Stock: {p.stock_qty} | Low alert: {p.low_stock_qty}
                  </p>
                </div>
                <button className="primary-btn small" onClick={() => setRestockItemId(isRestocking ? "" : p.id)}>
                  {isRestocking ? "Close" : "Restock"}
                </button>
              </div>

              {isRestocking && (
                <div className="restock-box">
                  <FormCard label="Restock Details">
                    <div className="two-col">
                      <div>
                        <label className="field-label">Restock Date</label>
                        <input
                          type="date"
                          value={restock.restock_date}
                          onChange={(e) => setRestock({ ...restock, restock_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Quantity Added</label>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={restock.quantity}
                          onChange={(e) => setRestock({ ...restock, quantity: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="two-col mt-sm">
                      <div>
                        <label className="field-label">Purchase Price / Unit</label>
                        <input
                          type="number"
                          placeholder="Purchase price"
                          value={restock.purchase_price}
                          onChange={(e) => setRestock({ ...restock, purchase_price: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Supplier Name</label>
                        <input
                          placeholder="Supplier name"
                          value={restock.supplier_name}
                          onChange={(e) => setRestock({ ...restock, supplier_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <input
                      className="mt-sm"
                      placeholder="Notes optional"
                      value={restock.notes}
                      onChange={(e) => setRestock({ ...restock, notes: e.target.value })}
                    />

                    <div className="payment-summary">
                      <div>
                        <span>Current Stock</span>
                        <strong>{p.stock_qty}</strong>
                      </div>
                      <div>
                        <span>After Restock</span>
                        <strong>{Number(p.stock_qty || 0) + Number(restock.quantity || 0)}</strong>
                      </div>
                      <div>
                        <span>Total Purchase</span>
                        <strong>{formatINR(Number(restock.quantity || 0) * Number(restock.purchase_price || 0))}</strong>
                      </div>
                    </div>

                    <button className="primary-btn big mt-sm" onClick={() => saveRestock(p)}>
                      Save Restock
                    </button>
                  </FormCard>
                </div>
              )}

              {itemPurchases.length > 0 && (
                <div className="purchase-history">
                  <strong>Recent Restock History</strong>
                  {itemPurchases.map((x) => (
                    <div className="mini-line" key={x.id}>
                      {x.restock_date} — Qty {x.quantity} — {formatINR(x.purchase_price)}/unit — {x.supplier_name || "No supplier"}
                    </div>
                  ))}
                  {payments.length > 0 && (
                    <div className="sub-panel">
                      <h3>Payments</h3>
                      {payments.map((payment) => (
                        <div className="mini-line" key={payment.id}>
                          {payment.payment_date} - Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)}
                          {payment.note ? ` - ${payment.note}` : ""}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h3>All Restock History</h3>
        {inventoryPurchases.length === 0 ? (
          <p className="muted">No restock entries yet.</p>
        ) : (
          inventoryPurchases.slice(0, 12).map((x) => (
            <div className="booking-row" key={x.id}>
              <div>
                <strong>{x.part_name}</strong>
                <p>{x.restock_date} • Qty {x.quantity} • Supplier: {x.supplier_name || "N/A"}</p>
              </div>
              <div>
                <strong>{formatINR(x.total_purchase_amount)}</strong>
                <p>{formatINR(x.purchase_price)}/unit</p>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}