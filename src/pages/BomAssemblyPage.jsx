import { useMemo, useState } from "react";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { formatINR, todayISO } from "../utils/appUtils";
import { useAutoHideMessage } from "../utils/toastUtils";

const emptyTemplate = {
  product_id: "",
  name: "",
  notes: "",
};

const emptyItem = {
  part_id: "",
  quantity: "",
};

export function BomAssemblyPage({ products = [], inventory = [], bomTemplates = [], bomItems = [], assemblyOrders = [], onUpdated }) {
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assemblyQty, setAssemblyQty] = useState("1");
  const [assemblyNotes, setAssemblyNotes] = useState("");
  const [message, setMessage] = useState("");

  useAutoHideMessage(message, setMessage);

  const selectedTemplate = bomTemplates.find((template) => String(template.id) === String(selectedTemplateId)) || bomTemplates[0];
  const selectedItems = selectedTemplate
    ? bomItems.filter((item) => String(item.bom_template_id) === String(selectedTemplate.id))
    : [];
  const product = products.find((item) => String(item.id) === String(selectedTemplate?.product_id));
  const safeAssemblyQty = Math.max(Number(assemblyQty || 0), 0);

  const templateCost = selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0), 0);
  const assemblyCost = templateCost * safeAssemblyQty;
  const sellingPrice = Number(product?.price || product?.selling_price || 0) * safeAssemblyQty;
  const profit = sellingPrice - assemblyCost;
  const lowStockParts = selectedItems.filter((item) => {
    const part = inventory.find((row) => String(row.id) === String(item.part_id));
    return Number(part?.stock_qty || 0) < Number(item.quantity || 0) * safeAssemblyQty;
  });

  const summary = useMemo(() => ({
    templates: bomTemplates.length,
    assemblyOrders: assemblyOrders.length,
    templateCost,
    lowStock: lowStockParts.length,
  }), [bomTemplates.length, assemblyOrders.length, templateCost, lowStockParts.length]);

  function partById(partId) {
    return inventory.find((part) => String(part.id) === String(partId));
  }

  async function createTemplate() {
    setMessage("");
    const selectedProduct = products.find((item) => String(item.id) === String(templateForm.product_id));
    if (!selectedProduct) return setMessage("Select RO product.");
    if (!templateForm.name.trim()) return setMessage("BOM template name is required.");

    const { error } = await supabase.from("bom_templates").insert([{
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      name: templateForm.name.trim(),
      notes: templateForm.notes.trim(),
    }]);
    if (error) return setMessage(error.message);
    setTemplateForm(emptyTemplate);
    setMessage("BOM template saved.");
    await onUpdated?.();
  }

  async function addTemplateItem() {
    setMessage("");
    if (!selectedTemplate) return setMessage("Select BOM template.");
    const part = partById(itemForm.part_id);
    if (!part) return setMessage("Select inventory part.");
    if (Number(itemForm.quantity || 0) <= 0) return setMessage("Part quantity is required.");

    const { error } = await supabase.from("bom_template_items").insert([{
      bom_template_id: selectedTemplate.id,
      part_id: part.id,
      part_name: part.name,
      quantity: Number(itemForm.quantity || 0),
      unit_cost: Number(part.purchase_price || 0),
    }]);
    if (error) return setMessage(error.message);
    setItemForm(emptyItem);
    setMessage("BOM part added.");
    await onUpdated?.();
  }

  async function removeTemplateItem(item) {
    const ok = window.confirm(`Remove ${item.part_name} from BOM?`);
    if (!ok) return;
    const { error } = await supabase.from("bom_template_items").delete().eq("id", item.id);
    if (error) return setMessage(error.message);
    setMessage("BOM part removed.");
    await onUpdated?.();
  }

  async function createAssemblyOrder() {
    setMessage("");
    if (!selectedTemplate || !product) return setMessage("Select BOM template.");
    if (safeAssemblyQty <= 0) return setMessage("Assembly quantity is required.");
    if (selectedItems.length === 0) return setMessage("Add parts to BOM template first.");
    if (lowStockParts.length > 0) return setMessage("Some parts have low stock. Restock before assembly.");

    const orderPayload = {
      bom_template_id: selectedTemplate.id,
      product_id: product.id,
      product_name: product.name,
      quantity: safeAssemblyQty,
      unit_cost: templateCost,
      total_cost: assemblyCost,
      selling_price: sellingPrice,
      profit,
      assembled_at: todayISO(),
      notes: assemblyNotes.trim(),
    };

    const { data: order, error: orderError } = await supabase.from("assembly_orders").insert([orderPayload]).select().single();
    if (orderError) return setMessage(orderError.message);

    const orderItems = selectedItems.map((item) => ({
      assembly_order_id: order.id,
      part_id: item.part_id,
      part_name: item.part_name,
      quantity: Number(item.quantity || 0) * safeAssemblyQty,
      unit_cost: Number(item.unit_cost || 0),
      total_cost: Number(item.quantity || 0) * safeAssemblyQty * Number(item.unit_cost || 0),
    }));
    const { error: itemError } = await supabase.from("assembly_order_items").insert(orderItems);
    if (itemError) return setMessage(itemError.message);

    for (const item of selectedItems) {
      const part = partById(item.part_id);
      const usedQty = Number(item.quantity || 0) * safeAssemblyQty;
      const { error } = await supabase
        .from("inventory_items")
        .update({ stock_qty: Math.max(Number(part.stock_qty || 0) - usedQty, 0) })
        .eq("id", part.id);
      if (error) return setMessage(error.message);
    }

    const { error: productError } = await supabase
      .from("ro_products")
      .update({ stock_qty: Number(product.stock_qty || 0) + safeAssemblyQty })
      .eq("id", product.id);
    if (productError) return setMessage(productError.message);

    setAssemblyQty("1");
    setAssemblyNotes("");
    setMessage("Assembly completed and inventory deducted.");
    await onUpdated?.();
  }

  const success = ["saved", "added", "removed", "completed"].some((word) => message.toLowerCase().includes(word));

  return (
    <>
      <section className="page-head bom-page-head">
        <h2>BOM / Product Assembly</h2>
        <p>Create product-wise parts templates, calculate cost/profit, and deduct inventory during assembly.</p>
      </section>

      {message && <div className={success ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="amount-grid bom-summary-grid">
        <div className="amount-box"><span>BOM Templates</span><strong>{summary.templates}</strong></div>
        <div className="amount-box"><span>Assembly Orders</span><strong>{summary.assemblyOrders}</strong></div>
        <div className="amount-box"><span>Template Cost</span><strong>{formatINR(summary.templateCost)}</strong></div>
        <div className="amount-box"><span>Low Stock Parts</span><strong>{summary.lowStock}</strong></div>
      </section>

      <section className="panel bom-panel">
        <h3>Create BOM Template</h3>
        <div className="form-stack">
          <div className="two-col">
            <select value={templateForm.product_id} onChange={(event) => setTemplateForm({ ...templateForm, product_id: event.target.value })}>
              <option value="">Select RO product</option>
              {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input placeholder="Template name e.g. Standard RO Assembly" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} />
          </div>
          <input placeholder="Notes" value={templateForm.notes} onChange={(event) => setTemplateForm({ ...templateForm, notes: event.target.value })} />
          <button className="primary-btn" onClick={createTemplate}>Save BOM Template</button>
        </div>
      </section>

      <section className="panel bom-panel">
        <div className="section-heading-row">
          <div>
            <h3>BOM Parts List</h3>
            <p className="muted">Add required parts and quantity per product.</p>
          </div>
          <select value={selectedTemplateId || selectedTemplate?.id || ""} onChange={(event) => setSelectedTemplateId(event.target.value)}>
            {bomTemplates.length === 0 ? <option value="">No templates</option> : bomTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.name} - {template.product_name}</option>
            ))}
          </select>
        </div>

        {selectedTemplate ? (
          <>
            <div className="two-col">
              <select value={itemForm.part_id} onChange={(event) => setItemForm({ ...itemForm, part_id: event.target.value })}>
                <option value="">Select inventory part</option>
                {inventory.map((part) => <option key={part.id} value={part.id}>{part.name} - Stock {part.stock_qty}</option>)}
              </select>
              <input type="number" placeholder="Qty per product" value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: event.target.value })} />
            </div>
            <button className="primary-btn mt-sm" onClick={addTemplateItem}>Add Part to BOM</button>
            <div className="responsive-table mt-sm">
              <table className="parts-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Qty/Product</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                    <th>Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => {
                    const part = partById(item.part_id);
                    return (
                      <tr key={item.id}>
                        <td><strong>{item.part_name}</strong></td>
                        <td>{item.quantity}</td>
                        <td>{formatINR(item.unit_cost)}</td>
                        <td>{formatINR(Number(item.quantity || 0) * Number(item.unit_cost || 0))}</td>
                        <td><span className={Number(part?.stock_qty || 0) <= Number(part?.low_stock_qty || 0) ? "stock-badge out" : "stock-badge in"}>{part?.stock_qty || 0}</span></td>
                        <td><button className="danger-btn small" onClick={() => removeTemplateItem(item)}>Remove</button></td>
                      </tr>
                    );
                  })}
                  {selectedItems.length === 0 && <tr><td colSpan="6">No parts added to this BOM.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="muted">Create a BOM template first.</p>}
      </section>

      <section className="panel bom-panel">
        <h3>Assembly Order</h3>
        {selectedTemplate && product ? (
          <div className="form-stack">
            <div className="two-col">
              <FormCard label="Assembly Quantity">
                <input type="number" value={assemblyQty} onChange={(event) => setAssemblyQty(event.target.value)} />
              </FormCard>
              <FormCard label="Notes">
                <input placeholder="Assembly notes" value={assemblyNotes} onChange={(event) => setAssemblyNotes(event.target.value)} />
              </FormCard>
            </div>
            <section className="payment-summary">
              <div><span>Product</span><strong>{product.name}</strong></div>
              <div><span>Total Cost</span><strong>{formatINR(assemblyCost)}</strong></div>
              <div><span>Expected Sale</span><strong>{formatINR(sellingPrice)}</strong></div>
              <div><span>Profit</span><strong className={profit >= 0 ? "success-line" : "danger-line"}>{formatINR(profit)}</strong></div>
            </section>
            {lowStockParts.length > 0 && (
              <div className="error-box">
                Low stock: {lowStockParts.map((item) => item.part_name).join(", ")}
              </div>
            )}
            <button className="primary-btn big" onClick={createAssemblyOrder}>Complete Assembly + Deduct Inventory</button>
          </div>
        ) : <p className="muted">Select a BOM template to create assembly order.</p>}
      </section>

      <section className="panel bom-panel">
        <h3>Assembly History</h3>
        {assemblyOrders.length === 0 ? <p className="muted">No assembly orders yet.</p> : assemblyOrders.slice(0, 20).map((order) => (
          <div className="booking-row" key={order.id}>
            <div>
              <strong>{order.product_name}</strong>
              <p>{order.assembled_at || ""} | Qty {order.quantity} | Cost {formatINR(order.total_cost)} | Profit {formatINR(order.profit)}</p>
            </div>
            <span className="status assigned">Assembled</span>
          </div>
        ))}
      </section>
    </>
  );
}
