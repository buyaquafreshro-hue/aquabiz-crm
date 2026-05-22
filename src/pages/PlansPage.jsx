import { useState } from "react";
import { emptyPlan, emptyProduct } from "../constants/defaults";
import { FormCard, StatCard } from "../components/shared";
import { supabase } from "../supabaseClient";
import { arrIncludes, formatINR } from "../utils/appUtils";
import { isSuccessToast, useAutoHideMessage } from "../utils/toastUtils";

function Accordion({ title, count, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="settings-accordion" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="settings-tab-icon">{icon}</span>
        <span className="settings-tab-title">{title}</span>
        <span className="settings-tab-action">View</span>
        <strong>{typeof count === "number" ? count : "+"}</strong>
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}

function SettingsItemCard({ title, subtitle, status, icon, children }) {
  return (
    <details className="settings-item-card">
      <summary>
        <span className="settings-tab-icon">{icon}</span>
        <div>
          <strong>{title}</strong>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="settings-tab-action">View</span>
        {status && <span className="status assigned">{status}</span>}
      </summary>
      <div className="settings-item-body">{children}</div>
    </details>
  );
}

export function PlansPage({ categories, inventory, amcPlans, products, onUpdated }) {
  const [plan, setPlan] = useState(emptyPlan);
  const [product, setProduct] = useState(emptyProduct);
  const [planEdit, setPlanEdit] = useState({});
  const [productEdit, setProductEdit] = useState({});
  const [message, setMessage] = useState("");

  useAutoHideMessage(message, setMessage);

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

  async function updatePlan(row, draftOverride) {
    setMessage("");
    const draft = draftOverride || planEdit.data;
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

  async function updateProduct(row, draftOverride) {
    setMessage("");
    const draft = draftOverride || productEdit.data;
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

  const successMessage = isSuccessToast(message);

  return (
    <>
      <section className="page-head plans-page-head">
        <h2>Plans / Products</h2>
        <p>Manage AMC plans and RO products separately.</p>
      </section>

      <section className="amount-grid plans-summary-grid">
        <StatCard icon="🛡️" label="AMC Plans" value={amcPlans.length} onClick={() => document.getElementById("amc-plans-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        <StatCard icon="🧰" label="RO Products" value={products.length} onClick={() => document.getElementById("ro-products-section")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        <StatCard icon="🔩" label="Inventory Parts" value={inventory.length} onClick={() => window.scrollBy({ top: 400, behavior: "smooth" })} />
        <StatCard icon="📂" label="Categories" value={categories.length} onClick={() => window.scrollBy({ top: 400, behavior: "smooth" })} />
      </section>

      {message && <div className={successMessage ? "success-box" : "error-box"}>{message}</div>}
      {message && <div className={successMessage ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel plans-panel" id="amc-plans-section">
        <h3>AMC Plans</h3>
        <Accordion title="Saved AMC Plans" count={amcPlans.length} icon="🛡️">
          {amcPlans.length === 0 ? <p className="muted">No AMC plans added.</p> : (
            <div className="settings-card-list">
              {amcPlans.map((row) => (
                <SettingsItemCard
                  key={row.id}
                  title={row.name}
                  subtitle={`${formatINR(row.price)} | Free visits: ${row.free_visits_enabled ? row.free_visits : "No"} | Coverage: ${row.coverage_type}`}
                  status={`${row.validity_days} Days`}
                  icon="🛡️"
                >
                  {(() => {
                    const draft = planEdit.id === row.id ? planEdit.data : normalizePlan(row);
                    return (
                      <>
                        <PlanFields data={draft} setData={(next) => setPlanEdit({ id: row.id, data: next })} categories={categories} inventory={inventory} toggleArray={toggleArray} type="amc" />
                        <div className="row-actions mt-sm">
                          <button className="primary-btn small" onClick={() => updatePlan(row, draft)}>Save</button>
                          <button className="danger-btn small" onClick={() => deletePlan(row)}>Delete</button>
                        </div>
                      </>
                    );
                  })()}
                </SettingsItemCard>
              ))}
            </div>
          )}
        </Accordion>
        <Accordion title="Add New AMC Plan" icon="➕">
          <div className="plan-form-card">
            <PlanFields data={plan} setData={setPlan} categories={categories} inventory={inventory} toggleArray={toggleArray} type="amc" />
            <button className="primary-btn big" onClick={savePlan}>Save AMC Plan</button>
          </div>
        </Accordion>
      </section>

      <section className="panel plans-panel" id="ro-products-section">
        <h3>RO Products</h3>
        <Accordion title="Saved RO Products" count={products.length} icon="🧰">
          {products.length === 0 ? <p className="muted">No RO products added.</p> : (
            <div className="settings-card-list">
              {products.map((row) => (
                <SettingsItemCard
                  key={row.id}
                  title={row.name}
                  subtitle={`${formatINR(row.price)} | Min DP: ${formatINR(row.min_down_payment)} | Coverage: ${row.coverage_type}`}
                  status={`${row.warranty_validity_days} Days`}
                  icon="🧰"
                >
                  {(() => {
                    const draft = productEdit.id === row.id ? productEdit.data : normalizeProduct(row);
                    return (
                      <>
                        <PlanFields data={draft} setData={(next) => setProductEdit({ id: row.id, data: next })} categories={categories} inventory={inventory} toggleArray={toggleArray} type="product" />
                        <div className="row-actions mt-sm">
                          <button className="primary-btn small" onClick={() => updateProduct(row, draft)}>Save</button>
                          <button className="danger-btn small" onClick={() => deleteProduct(row)}>Delete</button>
                        </div>
                      </>
                    );
                  })()}
                </SettingsItemCard>
              ))}
            </div>
          )}
        </Accordion>
        <Accordion title="Add New RO Product" icon="➕">
          <div className="plan-form-card">
            <PlanFields data={product} setData={setProduct} categories={categories} inventory={inventory} toggleArray={toggleArray} type="product" />
            <button className="primary-btn big" onClick={saveProduct}>Save RO Product</button>
          </div>
        </Accordion>
      </section>
    </>
  );
}


function PlanFields({ data, setData, categories, inventory, toggleArray, type }) {
  return (
    <div className="form-stack plan-sheet-form">
      <div className="settings-sheet-grid two">
        <label>
          <span>{type === "amc" ? "Plan Name" : "RO Machine Name"}</span>
          <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </label>
        <label>
          <span>Price</span>
          <input type="number" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
        </label>
        <label>
          <span>{type === "amc" ? "Validity Days" : "Warranty Days"}</span>
          <input type="number" value={type === "amc" ? data.validity_days : data.warranty_validity_days} onChange={(e) => type === "amc" ? setData({ ...data, validity_days: e.target.value }) : setData({ ...data, warranty_validity_days: e.target.value })} />
        </label>
        {type === "product" && (
          <label>
            <span>Minimum Down Payment</span>
            <input type="number" value={data.min_down_payment} onChange={(e) => setData({ ...data, min_down_payment: e.target.value })} />
          </label>
        )}
        <label>
          <span>Free Visits</span>
          <select value={data.free_visits_enabled ? "yes" : "no"} onChange={(e) => setData({ ...data, free_visits_enabled: e.target.value === "yes", free_visits: e.target.value === "yes" ? data.free_visits : "0" })}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        {data.free_visits_enabled && (
          <label>
            <span>No. of Free Visits</span>
            <input type="number" value={data.free_visits} onChange={(e) => setData({ ...data, free_visits: e.target.value })} />
          </label>
        )}
        <label>
          <span>Reminder Days</span>
          <input type="number" value={data.service_reminder_days} onChange={(e) => setData({ ...data, service_reminder_days: e.target.value })} />
        </label>
        <label>
          <span>Coverage Type</span>
          <select value={data.coverage_type} onChange={(e) => setData({ ...data, coverage_type: e.target.value })}>
            <option value="none">No Parts</option>
            <option value="electric">Electric Pump+SMPS</option>
            <option value="selected">Selected Parts/Categories</option>
            <option value="all">All Parts</option>
          </select>
        </label>
        <label className="settings-field-wide">
          <span>Terms / Notes</span>
          <input value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} />
        </label>
      </div>
      {data.coverage_type === "selected" && (
        <>
          <FormCard label="Covered Categories">
            <CoveredItemsSelector 
              items={categories} 
              selectedIds={data.covered_category_ids} 
              onToggle={(id) => toggleArray(data, setData, "covered_category_ids", id)} 
              searchPlaceholder="Search categories..."
            />
          </FormCard>
          <FormCard label="Covered Parts">
            <CoveredItemsSelector 
              items={inventory} 
              selectedIds={data.covered_part_ids} 
              onToggle={(id) => toggleArray(data, setData, "covered_part_ids", id)} 
              searchPlaceholder="Search parts..."
            />
          </FormCard>
        </>
      )}
    </div>
  );
}

function CoveredItemsSelector({ items, selectedIds, onToggle, searchPlaceholder }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(item => String(item.name || "").toLowerCase().includes(search.toLowerCase()));
  
  return (
    <div className="covered-items-container">
      <div className="covered-items-search">
        <input 
          placeholder={searchPlaceholder || "Search..."} 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>
      <div className="table-responsive excel-table-container covered-items-scroll">
        <table className="excel-table" style={{ margin: 0, borderRadius: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center", position: "sticky", top: 0, zIndex: 10 }}>
                <input 
                  type="checkbox" 
                  checked={filtered.length > 0 && filtered.every(item => arrIncludes(selectedIds, item.id))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    filtered.forEach(item => {
                      const isSelected = arrIncludes(selectedIds, item.id);
                      if (checked && !isSelected) onToggle(item.id);
                      if (!checked && isSelected) onToggle(item.id);
                    });
                  }}
                />
              </th>
              <th style={{ position: "sticky", top: 0, zIndex: 10 }}>Name</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="2" className="muted text-center" style={{ padding: "16px" }}>No items found.</td></tr>
            ) : filtered.map((item) => {
              const isSelected = arrIncludes(selectedIds, item.id);
              return (
                <tr key={item.id} className={isSelected ? "selected-row" : ""} style={isSelected ? { backgroundColor: "#f0fdf4" } : {}}>
                  <td style={{ textAlign: "center" }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => onToggle(item.id)} 
                    />
                  </td>
                  <td onClick={() => onToggle(item.id)} style={{ cursor: "pointer", fontWeight: isSelected ? "600" : "normal" }}>
                    {item.name}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
