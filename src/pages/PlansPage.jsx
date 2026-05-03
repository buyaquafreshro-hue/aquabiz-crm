import { useEffect, useState } from "react";
import { emptyPlan, emptyProduct } from "../constants/defaults";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { arrIncludes, formatINR } from "../utils/appUtils";

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

export function PlansPage({ categories, inventory, amcPlans, products, onUpdated }) {
  const [plan, setPlan] = useState(emptyPlan);
  const [product, setProduct] = useState(emptyProduct);
  const [planEdit, setPlanEdit] = useState({});
  const [productEdit, setProductEdit] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  function noRowsMessage(tableName) {
    return `${tableName} save nahi hua. Supabase RLS/update policy check karein.`;
  }

  function toggleArray(obj, setObj, key, id) {
    const arr = obj[key] || [];
    const next = arrIncludes(arr, id) ? arr.filter((x) => String(x) !== String(id)) : [...arr, id];
    setObj({ ...obj, [key]: next });
  }

  function normalizePlan(data) {
    return {
      name: data.name || "",
      price: data.price || "",
      validity_days: data.validity_days || 365,
      free_visits_enabled: !!data.free_visits_enabled,
      free_visits: data.free_visits || 0,
      service_reminder_days: data.service_reminder_days || 90,
      coverage_type: data.coverage_type || "none",
      covered_category_ids: data.covered_category_ids || [],
      covered_part_ids: data.covered_part_ids || [],
      notes: data.notes || "",
    };
  }

  function normalizeProduct(data) {
    return {
      name: data.name || "",
      price: data.price || "",
      min_down_payment: data.min_down_payment || 0,
      warranty_validity_days: data.warranty_validity_days || 365,
      free_visits_enabled: !!data.free_visits_enabled,
      free_visits: data.free_visits || 0,
      service_reminder_days: data.service_reminder_days || 180,
      coverage_type: data.coverage_type || "none",
      covered_category_ids: data.covered_category_ids || [],
      covered_part_ids: data.covered_part_ids || [],
      notes: data.notes || "",
    };
  }

  function planPayload(data) {
    return {
      name: data.name.trim(),
      price: Number(data.price || 0),
      validity_days: Number(data.validity_days || 365),
      free_visits_enabled: !!data.free_visits_enabled,
      free_visits: data.free_visits_enabled ? Number(data.free_visits || 0) : 0,
      service_reminder_days: Number(data.service_reminder_days || 90),
      coverage_type: data.coverage_type,
      covered_category_ids: data.covered_category_ids || [],
      covered_part_ids: data.covered_part_ids || [],
      notes: String(data.notes || "").trim(),
    };
  }

  function productPayload(data) {
    return {
      name: data.name.trim(),
      price: Number(data.price || 0),
      min_down_payment: Number(data.min_down_payment || 0),
      warranty_validity_days: Number(data.warranty_validity_days || 365),
      free_visits_enabled: !!data.free_visits_enabled,
      free_visits: data.free_visits_enabled ? Number(data.free_visits || 0) : 0,
      service_reminder_days: Number(data.service_reminder_days || 180),
      coverage_type: data.coverage_type,
      covered_category_ids: data.covered_category_ids || [],
      covered_part_ids: data.covered_part_ids || [],
      notes: String(data.notes || "").trim(),
    };
  }

  async function savePlan() {
    setMessage("");
    if (!plan.name.trim()) return setMessage("Plan name is required.");
    const { error } = await supabase.from("amc_plans").insert([planPayload(plan)]);
    if (error) return setMessage(error.message);
    setPlan(emptyPlan);
    setMessage("AMC plan saved.");
    await onUpdated();
  }

  async function updatePlan(row) {
    setMessage("");
    const draft = planEdit[row.id] || normalizePlan(row);
    if (!draft.name.trim()) return setMessage("Plan name is required.");
    const { data, error } = await supabase.from("amc_plans").update(planPayload(draft)).eq("id", row.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("AMC plan"));
    setPlanEdit({});
    setMessage("AMC plan updated.");
    await onUpdated();
  }

  async function deletePlan(row) {
    if (!window.confirm(`Delete AMC plan "${row.name}"? Existing customer coverages will remain unchanged.`)) return;
    const { data, error } = await supabase.from("amc_plans").delete().eq("id", row.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("AMC plan delete"));
    setMessage("AMC plan deleted.");
    await onUpdated();
  }

  async function saveProduct() {
    setMessage("");
    if (!product.name.trim()) return setMessage("Product name is required.");
    const { error } = await supabase.from("ro_products").insert([productPayload(product)]);
    if (error) return setMessage(error.message);
    setProduct(emptyProduct);
    setMessage("RO product saved.");
    await onUpdated();
  }

  async function updateProduct(row) {
    setMessage("");
    const draft = productEdit[row.id] || normalizeProduct(row);
    if (!draft.name.trim()) return setMessage("Product name is required.");
    const { data, error } = await supabase.from("ro_products").update(productPayload(draft)).eq("id", row.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("RO product"));
    setProductEdit({});
    setMessage("RO product updated.");
    await onUpdated();
  }

  async function deleteProduct(row) {
    if (!window.confirm(`Delete RO product "${row.name}"? Existing invoices and warranties will remain unchanged.`)) return;
    const { data, error } = await supabase.from("ro_products").delete().eq("id", row.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("RO product delete"));
    setMessage("RO product deleted.");
    await onUpdated();
  }

  const successMessage = ["saved", "updated", "deleted"].some((word) => message.toLowerCase().includes(word));

  return (
    <>
      <section className="page-head">
        <h2>Plans / Products</h2>
        <p>Manage AMC plans and RO products separately.</p>
      </section>

      {message && <div className={successMessage ? "success-box" : "error-box"}>{message}</div>}
      {message && <div className={successMessage ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel">
        <h3>AMC Plans</h3>
        <Accordion title="Saved AMC Plans" count={amcPlans.length} defaultOpen>
          {amcPlans.length === 0 ? <p className="muted">No AMC plans added.</p> : amcPlans.map((row) => {
            const draft = planEdit[row.id] || normalizePlan(row);
            return (
              <EditablePlan
                key={row.id}
                data={draft}
                setData={(next) => setPlanEdit({ ...planEdit, [row.id]: next })}
                categories={categories}
                inventory={inventory}
                toggleArray={toggleArray}
                type="amc"
                onSave={() => updatePlan(row)}
                onDelete={() => deletePlan(row)}
              />
            );
          })}
        </Accordion>
        <Accordion title="Add New AMC Plan">
          <PlanFields data={plan} setData={setPlan} categories={categories} inventory={inventory} toggleArray={toggleArray} type="amc" />
          <button className="primary-btn big" onClick={savePlan}>Save AMC Plan</button>
        </Accordion>
      </section>

      <section className="panel">
        <h3>RO Products</h3>
        <Accordion title="Saved RO Products" count={products.length} defaultOpen>
          {products.length === 0 ? <p className="muted">No RO products added.</p> : products.map((row) => {
            const draft = productEdit[row.id] || normalizeProduct(row);
            return (
              <EditablePlan
                key={row.id}
                data={draft}
                setData={(next) => setProductEdit({ ...productEdit, [row.id]: next })}
                categories={categories}
                inventory={inventory}
                toggleArray={toggleArray}
                type="product"
                onSave={() => updateProduct(row)}
                onDelete={() => deleteProduct(row)}
              />
            );
          })}
        </Accordion>
        <Accordion title="Add New RO Product">
          <PlanFields data={product} setData={setProduct} categories={categories} inventory={inventory} toggleArray={toggleArray} type="product" />
          <button className="primary-btn big" onClick={saveProduct}>Save RO Product</button>
        </Accordion>
      </section>
    </>
  );
}

function EditablePlan({ data, setData, categories, inventory, toggleArray, type, onSave, onDelete }) {
  return (
    <div className="edit-card">
      <div className="edit-card-head">
        <div>
          <strong>{data.name || (type === "amc" ? "AMC Plan" : "RO Product")}</strong>
          <p>{formatINR(data.price)} {type === "product" ? `| Min DP ${formatINR(data.min_down_payment)}` : ""}</p>
        </div>
        <div className="row-actions">
          <button className="primary-btn small" onClick={onSave}>Save</button>
          <button className="danger-btn small" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <PlanFields data={data} setData={setData} categories={categories} inventory={inventory} toggleArray={toggleArray} type={type} compact />
    </div>
  );
}

function PlanFields({ data, setData, categories, inventory, toggleArray, type }) {
  return (
    <div className="form-stack">
      <input placeholder={type === "amc" ? "Plan Name" : "RO Machine Name"} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
      <div className="two-col">
        <input placeholder="Price" type="number" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
        <input placeholder="Validity days" type="number" value={type === "amc" ? data.validity_days : data.warranty_validity_days} onChange={(e) => type === "amc" ? setData({ ...data, validity_days: e.target.value }) : setData({ ...data, warranty_validity_days: e.target.value })} />
      </div>
      {type === "product" && (
        <FormCard label="Minimum Down Payment for EMI">
          <input placeholder="Example: 1999" type="number" value={data.min_down_payment} onChange={(e) => setData({ ...data, min_down_payment: e.target.value })} />
        </FormCard>
      )}
      <FormCard label="Free Service Visits">
        <div className="chip-grid">
          <button className={data.free_visits_enabled ? "chip active" : "chip"} type="button" onClick={() => setData({ ...data, free_visits_enabled: true })}>Yes</button>
          <button className={!data.free_visits_enabled ? "chip active" : "chip"} type="button" onClick={() => setData({ ...data, free_visits_enabled: false, free_visits: "0" })}>No</button>
        </div>
        {data.free_visits_enabled && <input placeholder="No. of free visits" type="number" value={data.free_visits} onChange={(e) => setData({ ...data, free_visits: e.target.value })} />}
      </FormCard>
      <FormCard label="Service Reminder Interval Days">
        <input placeholder="Example: 90 means reminder after every 90 days" type="number" value={data.service_reminder_days} onChange={(e) => setData({ ...data, service_reminder_days: e.target.value })} />
        <p className="helper">Service reminders will appear on the admin dashboard based on this interval.</p>
      </FormCard>
      <FormCard label="Coverage Type">
        <div className="chip-grid">
          {[["none", "No Parts"], ["electric", "Electric Pump+SMPS"], ["selected", "Selected Parts/Categories"], ["all", "All Parts"]].map(([value, label]) => <button className={data.coverage_type === value ? "chip active" : "chip"} type="button" key={value} onClick={() => setData({ ...data, coverage_type: value })}>{label}</button>)}
        </div>
      </FormCard>
      {data.coverage_type === "selected" && (
        <>
          <FormCard label="Covered Categories">
            <div className="check-grid">{categories.map((c) => <label className="check-row" key={c.id}><input type="checkbox" checked={arrIncludes(data.covered_category_ids, c.id)} onChange={() => toggleArray(data, setData, "covered_category_ids", c.id)} /> {c.name}</label>)}</div>
          </FormCard>
          <FormCard label="Covered Parts">
            <div className="check-grid">{inventory.map((p) => <label className="check-row" key={p.id}><input type="checkbox" checked={arrIncludes(data.covered_part_ids, p.id)} onChange={() => toggleArray(data, setData, "covered_part_ids", p.id)} /> {p.name}</label>)}</div>
          </FormCard>
        </>
      )}
      <input placeholder="Terms / Notes" value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} />
    </div>
  );
}
