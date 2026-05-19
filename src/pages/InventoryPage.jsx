import { useState } from "react";
import { emptyCategory, emptyPart } from "../constants/defaults";
import { FormCard } from "../components/shared";
import { PartsTable, StockBadge } from "../components/PartsTable";
import { supabase } from "../supabaseClient";
import { formatINR, todayISO } from "../utils/appUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

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

export function InventoryPage({ categories, inventory, inventoryPurchases = [], onUpdated }) {
  const [cat, setCat] = useState(emptyCategory);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [form, setForm] = useState(emptyPart);
  const [editPartId, setEditPartId] = useState(null);
  const [editForm, setEditForm] = useState(emptyPart);
  const [message, setMessage] = useState("");
  const [restockItemId, setRestockItemId] = useState("");
  useAutoHideMessage(message, setMessage);
  const [restock, setRestock] = useState({
    restock_date: todayISO(),
    quantity: "",
    purchase_price: "",
    supplier_name: "",
    notes: "",
  });

  async function addCategory() {
    if (!cat.name.trim()) return setMessage("Category name is required.");
    const { data, error } = await supabase.from("part_categories").insert([{ name: cat.name.trim() }]).select().single();
    if (error) return setMessage(error.message);
    setForm({ ...form, category_id: data.id });
    setCat(emptyCategory);
    setShowNewCategory(false);
    setMessage("Category added and selected.");
    await onUpdated();
  }

  async function saveEditPart() {
    if (!editForm.name.trim()) return setMessage("Part name is required.");
    const { error } = await supabase.from("inventory_items").update({
      name: editForm.name.trim(),
      category_id: editForm.category_id || null,
      purchase_price: Number(editForm.purchase_price || 0),
      selling_price: Number(editForm.selling_price || 0),
      stock_qty: Number(editForm.stock_qty || 0),
      low_stock_qty: Number(editForm.low_stock_qty || 0),
      supplier_name: editForm.supplier_name.trim(),
    }).eq("id", editPartId);
    if (error) return setMessage(error.message);
    setEditPartId(null);
    setEditForm(emptyPart);
    setMessage("Part updated successfully.");
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
    if (!item) return setMessage("Select a part first.");
    const qty = Number(restock.quantity || 0);
    const purchasePrice = Number(restock.purchase_price || 0);
    if (qty <= 0) return setMessage("Restock quantity must be greater than 0.");

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
    if (purchaseError) return setMessage(purchaseError.message);

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_qty: Number(item.stock_qty || 0) + qty,
        purchase_price: purchasePrice || Number(item.purchase_price || 0),
        supplier_name: restock.supplier_name.trim() || item.supplier_name || "",
      })
      .eq("id", item.id);
    if (updateError) return setMessage(updateError.message);

    setRestockItemId("");
    setRestock({ restock_date: todayISO(), quantity: "", purchase_price: "", supplier_name: "", notes: "" });
    setMessage("Stock restocked successfully.");
    await onUpdated();
  }

  function renderRestockPanel(item) {
    const itemPurchases = inventoryPurchases.filter((x) => String(x.inventory_item_id) === String(item.id)).slice(0, 3);
    if (restockItemId !== item.id && itemPurchases.length === 0) return null;

    return (
      <>
        {restockItemId === item.id && (
          <div className="restock-box">
            <FormCard label="Restock Details">
              <div className="two-col">
                <div>
                  <label className="field-label">Restock Date</label>
                  <input type="date" value={restock.restock_date} onChange={(e) => setRestock({ ...restock, restock_date: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Quantity Added</label>
                  <input type="number" placeholder="Qty" value={restock.quantity} onChange={(e) => setRestock({ ...restock, quantity: e.target.value })} />
                </div>
              </div>
              <div className="two-col mt-sm">
                <div>
                  <label className="field-label">Purchase Price / Unit</label>
                  <input type="number" placeholder="Purchase price" value={restock.purchase_price} onChange={(e) => setRestock({ ...restock, purchase_price: e.target.value })} />
                </div>
                <div>
                  <label className="field-label">Supplier Name</label>
                  <input placeholder="Supplier name" value={restock.supplier_name} onChange={(e) => setRestock({ ...restock, supplier_name: e.target.value })} />
                </div>
              </div>
              <input className="mt-sm" placeholder="Notes optional" value={restock.notes} onChange={(e) => setRestock({ ...restock, notes: e.target.value })} />
              <div className="payment-summary">
                <div><span>Current Stock</span><strong>{item.stock_qty}</strong></div>
                <div><span>After Restock</span><strong>{Number(item.stock_qty || 0) + Number(restock.quantity || 0)}</strong></div>
                <div><span>Total Purchase</span><strong>{formatINR(Number(restock.quantity || 0) * Number(restock.purchase_price || 0))}</strong></div>
              </div>
              <button className="primary-btn big mt-sm" onClick={() => saveRestock(item)}>Save Restock</button>
            </FormCard>
          </div>
        )}
        {itemPurchases.length > 0 && (
          <div className="purchase-history">
            <strong>Recent Restock History</strong>
            {itemPurchases.map((x) => (
              <div className="mini-line" key={x.id}>
                {x.restock_date} - Qty {x.quantity} - {formatINR(x.purchase_price)}/unit - {x.supplier_name || "No supplier"}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <section className="page-head inventory-page-head">
        <h2>Inventory</h2>
        <p>Add parts, manage stock, and track purchase/restock history.</p>
      </section>

      <section className="cards-grid inventory-summary-grid">
        <div className="amount-box total"><strong>Total Parts</strong><strong>{inventory.length}</strong></div>
        <div className="amount-box"><strong>Categories</strong><strong>{categories.length}</strong></div>
        <div className="amount-box"><strong>Low Stock</strong><strong>{inventory.filter((item) => Number(item.stock_qty || 0) <= Number(item.low_stock_qty || 0)).length}</strong></div>
        <div className="amount-box"><strong>Restock Entries</strong><strong>{inventoryPurchases.length}</strong></div>
      </section>

      <section className="panel inventory-panel">
        <h3>Inventory Management</h3>
        <Accordion title="Add New Part">
        <div className="form-stack">
          <input placeholder="Part name e.g. Vontron Membrane" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              {categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
              <option value="__new__">+ Add New Category</option>
            </select>
            {showNewCategory && (
              <div className="two-col mt-sm">
                <input placeholder="New category name" value={cat.name} onChange={(e) => setCat({ name: e.target.value })} />
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
        </Accordion>
      </section>

      {editPartId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div className="panel" style={{ width: "100%", maxWidth: "500px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>Edit Part</h3>
            <div className="form-stack mt-sm">
              <label>Part Name</label>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              
              <label>Category</label>
              <select value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}>
                <option value="">Select Category</option>
                {categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
              </select>

              <div className="two-col mt-sm">
                <div>
                  <label>Purchase Price</label>
                  <input type="number" value={editForm.purchase_price} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} />
                </div>
                <div>
                  <label>Selling Price</label>
                  <input type="number" value={editForm.selling_price} onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })} />
                </div>
              </div>
              
              <div className="two-col">
                <div>
                  <label>Stock Qty</label>
                  <input type="number" value={editForm.stock_qty} onChange={(e) => setEditForm({ ...editForm, stock_qty: e.target.value })} />
                </div>
                <div>
                  <label>Low Stock Alert</label>
                  <input type="number" value={editForm.low_stock_qty} onChange={(e) => setEditForm({ ...editForm, low_stock_qty: e.target.value })} />
                </div>
              </div>
              
              <label>Supplier Name</label>
              <input value={editForm.supplier_name} onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })} />

              <div className="row-actions mt-sm" style={{justifyContent: "flex-end"}}>
                <button className="ghost-btn" onClick={() => setEditPartId(null)}>Cancel</button>
                <button className="primary-btn" onClick={saveEditPart}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="panel inventory-panel">
        <Accordion title="Parts List & Restock" count={inventory.length} defaultOpen>
        <PartsTable
          items={inventory}
          emptyText="No parts added."
          columns={[
            { key: "name", label: "Part Name" },
            { key: "category_name", label: "Category" },
            { key: "stock_qty", label: "Stock", sortValue: (item) => Number(item.stock_qty || 0), render: (item) => <strong className={Number(item.stock_qty || 0) <= Number(item.low_stock_qty || 0) ? "danger-line" : ""}>{item.stock_qty}</strong> },
            { key: "stock_status", label: "Status", sortValue: (item) => Number(item.stock_qty || 0), render: (item) => <StockBadge item={item} /> },
            { key: "purchase_price", label: "Purchase", sortValue: (item) => Number(item.purchase_price || 0), render: (item) => formatINR(item.purchase_price) },
            { key: "selling_price", label: "Selling", sortValue: (item) => Number(item.selling_price || 0), render: (item) => formatINR(item.selling_price) },
            { key: "margin", label: "Margin", sortValue: (item) => Number(item.selling_price || 0) - Number(item.purchase_price || 0), render: (item) => formatINR(Number(item.selling_price || 0) - Number(item.purchase_price || 0)) },
          ]}
          actions={(item) => (
            <div style={{ display: "flex", gap: "5px" }}>
              <button className="ghost-btn small" onClick={() => {
                setEditPartId(item.id);
                setEditForm({
                  name: item.name || "",
                  category_id: item.category_id || "",
                  purchase_price: item.purchase_price || 0,
                  selling_price: item.selling_price || 0,
                  stock_qty: item.stock_qty || 0,
                  low_stock_qty: item.low_stock_qty || 0,
                  supplier_name: item.supplier_name || ""
                });
              }}>Edit</button>
              <button className="primary-btn small" onClick={() => setRestockItemId(restockItemId === item.id ? "" : item.id)}>
                {restockItemId === item.id ? "Close" : "Restock"}
              </button>
            </div>
          )}
          renderExpanded={renderRestockPanel}
        />
        </Accordion>
      </section>

      <section className="panel inventory-panel">
        <Accordion title="All Restock History" count={inventoryPurchases.length}>
        {inventoryPurchases.length === 0 ? (
          <p className="muted">No restock entries yet.</p>
        ) : (
          inventoryPurchases.slice(0, 12).map((x) => (
            <div className="booking-row" key={x.id}>
              <div>
                <strong>{x.part_name}</strong>
                <p>{x.restock_date} - Qty {x.quantity} - Supplier: {x.supplier_name || "N/A"}</p>
              </div>
              <div>
                <strong>{formatINR(x.total_purchase_amount)}</strong>
                <p>{formatINR(x.purchase_price)}/unit</p>
              </div>
            </div>
          ))
        )}
        </Accordion>
      </section>
    </>
  );
}
