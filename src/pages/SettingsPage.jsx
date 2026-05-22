import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { formatINR, uniqueServices } from "../utils/appUtils";
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
        {status && <span className={status === "Inactive" ? "status unassigned" : "status assigned"}>{status}</span>}
      </summary>
      <div className="settings-item-body">{children}</div>
    </details>
  );
}

const DEFAULT_SERVICE_RATES = [
  { name: "Online", price: 99 },
  { name: "COD", price: 249 },
  { name: "Installation", price: 399 },
];

export function SettingsPage({ services, serviceAreas = [], setPage, onUpdated }) {
  const [serviceForm, setServiceForm] = useState({ name: "", price: "" });
  const [serviceEdit, setServiceEdit] = useState({});
  const [areaForm, setAreaForm] = useState({ name: "", technician_ids: [] });
  const [areaEdit, setAreaEdit] = useState({});
  const [techForm, setTechForm] = useState({ name: "", mobile: "", pin: "123456" });
  const [techEdit, setTechEdit] = useState({});
  const [telecallerForm, setTelecallerForm] = useState({ name: "", mobile: "", pin: "123456" });
  const [telecallerEdit, setTelecallerEdit] = useState({});
  const [salesForm, setSalesForm] = useState({ name: "", mobile: "", pin: "123456", incentive_type: "percentage", incentive_value: "" });
  const [salesEdit, setSalesEdit] = useState({});
  const [techniciansList, setTechniciansList] = useState([]);
  const [telecallersList, setTelecallersList] = useState([]);
  const [salesPersonsList, setSalesPersonsList] = useState([]);
  const [message, setMessage] = useState("");
  const cleanServices = uniqueServices(services);

  function noRowsMessage(tableName) {
    return `${tableName} save nahi hua. Supabase RLS/update policy check karein.`;
  }

  async function loadTechnicians() {
    const { data, error } = await supabase.from("technicians").select("*").order("name", { ascending: true });
    if (!error) setTechniciansList(data || []);
  }

  async function loadTelecallers() {
    const { data, error } = await supabase.from("telecallers").select("*").order("name", { ascending: true });
    if (!error) setTelecallersList(data || []);
  }

  async function loadSalesPersons() {
    const { data, error } = await supabase.from("sales_persons").select("*").order("name", { ascending: true });
    if (!error) setSalesPersonsList(data || []);
  }

  useEffect(() => {
    loadTechnicians();
    loadTelecallers();
    loadSalesPersons();
  }, []);

  useAutoHideMessage(message, setMessage);

  function serviceDraft(service) {
    return serviceEdit[service.id] || { name: service.name || "", price: service.price || "" };
  }

  function personDraft(map, person) {
    return map[person.id] || {
      name: person.name || "",
      mobile: person.mobile || "",
      pin: person.pin || "",
      incentive_type: person.incentive_type || "percentage",
      incentive_value: person.incentive_value || "",
    };
  }

  function areaDraft(area) {
    return areaEdit[area.id] || { name: area.name || "", technician_ids: Array.isArray(area.technician_ids) ? area.technician_ids : [] };
  }

  function toggleAreaTechnician(currentIds = [], technicianId) {
    const ids = currentIds.map(String);
    return ids.includes(String(technicianId))
      ? ids.filter((id) => id !== String(technicianId))
      : [...ids, String(technicianId)];
  }

  function technicianNames(ids = []) {
    const idSet = new Set((Array.isArray(ids) ? ids : []).map(String));
    return techniciansList.filter((tech) => idSet.has(String(tech.id))).map((tech) => tech.name).join(", ") || "No technicians linked";
  }

  async function addService() {
    setMessage("");
    if (!serviceForm.name.trim()) return setMessage("Service name is required.");
    const { error } = await supabase.from("services").insert([{ name: serviceForm.name.trim(), price: Number(serviceForm.price || 0) }]);
    if (error) return setMessage(error.message);
    setServiceForm({ name: "", price: "" });
    setMessage("Service added.");
    await onUpdated();
  }

  async function applyDefaultServiceRates() {
    setMessage("");
    for (const service of DEFAULT_SERVICE_RATES) {
      const existing = services.find((item) => String(item.name || "").trim().toLowerCase() === service.name.toLowerCase());
      const response = existing?.id
        ? await supabase.from("services").update({ price: service.price }).eq("id", existing.id)
        : await supabase.from("services").insert([service]);

      if (response.error) {
        setMessage(response.error.message);
        return;
      }
    }
    setMessage("Default service rates saved: Online ₹99, COD ₹249, Installation ₹399.");
    await onUpdated();
  }

  async function updateService(service) {
    setMessage("");
    const draft = serviceDraft(service);
    if (!draft.name.trim()) return setMessage("Service name is required.");
    const sameNameIds = services
      .filter((item) => String(item.name || "").trim().toLowerCase() === String(service.name || "").trim().toLowerCase())
      .map((item) => item.id);
    const { data, error } = await supabase.from("services").update({ name: draft.name.trim(), price: Number(draft.price || 0) }).in("id", sameNameIds).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Service"));
    setServiceEdit({});
    setMessage("Service updated.");
    await onUpdated();
  }

  async function deleteService(service) {
    if (!window.confirm(`Delete service "${service.name}"? Existing bookings will remain unchanged.`)) return;
    const sameNameIds = services
      .filter((item) => String(item.name || "").trim().toLowerCase() === String(service.name || "").trim().toLowerCase())
      .map((item) => item.id);
    const { data, error } = await supabase.from("services").delete().in("id", sameNameIds).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Service delete"));
    setMessage("Service deleted.");
    await onUpdated();
  }

  async function addArea() {
    setMessage("");
    if (!areaForm.name.trim()) return setMessage("Area / territory name is required.");
    const { error } = await supabase.from("service_areas").insert([{
      name: areaForm.name.trim(),
      technician_ids: areaForm.technician_ids,
      is_active: true,
    }]);
    if (error) return setMessage(error.message);
    setAreaForm({ name: "", technician_ids: [] });
    setMessage("Area added.");
    await onUpdated();
  }

  async function updateArea(area, updates = null) {
    setMessage("");
    const draft = areaDraft(area);
    const payload = updates || {
      name: draft.name.trim(),
      technician_ids: draft.technician_ids,
    };
    if (!updates && !payload.name) return setMessage("Area / territory name is required.");
    const { data, error } = await supabase.from("service_areas").update(payload).eq("id", area.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Area"));
    setAreaEdit({});
    setMessage("Area updated.");
    await onUpdated();
  }

  async function toggleAreaStatus(area) {
    const nextActive = area.is_active === false;
    await updateArea(area, { is_active: nextActive });
  }

  async function addTechnician() {
    setMessage("");
    if (!techForm.name.trim() || !techForm.mobile.trim() || !techForm.pin.trim()) return setMessage("Technician name, mobile and PIN are required.");
    if (String(techForm.pin).trim().length !== 6) return setMessage("PIN must be 6 digits.");
    const { error } = await supabase.from("technicians").insert([{ name: techForm.name.trim(), mobile: techForm.mobile.trim(), pin: techForm.pin.trim() }]);
    if (error) return setMessage(error.message);
    setTechForm({ name: "", mobile: "", pin: "123456" });
    setMessage("Technician added.");
    await loadTechnicians();
    await onUpdated();
  }

  async function updateTechnician(tech) {
    setMessage("");
    const draft = personDraft(techEdit, tech);
    if (!draft.name.trim() || !draft.mobile.trim() || !draft.pin.trim()) return setMessage("Technician name, mobile and PIN are required.");
    if (String(draft.pin).trim().length !== 6) return setMessage("PIN must be 6 digits.");
    const { data, error } = await supabase.from("technicians").update({ name: draft.name.trim(), mobile: draft.mobile.trim(), pin: draft.pin.trim() }).eq("id", tech.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Technician"));
    setTechEdit({});
    setMessage("Technician updated.");
    await loadTechnicians();
    await onUpdated();
  }

  async function deleteTechnician(tech) {
    const nextActive = tech.is_active === false;
    const { data, error } = await supabase.from("technicians").update({ is_active: nextActive }).eq("id", tech.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Technician status"));
    setMessage(nextActive ? "Technician activated." : "Technician deactivated.");
    await loadTechnicians();
    await onUpdated();
  }

  async function addTelecaller() {
    setMessage("");
    if (!telecallerForm.name.trim() || !telecallerForm.mobile.trim() || !telecallerForm.pin.trim()) return setMessage("Telecaller name, mobile and PIN are required.");
    if (String(telecallerForm.pin).trim().length !== 6) return setMessage("PIN must be 6 digits.");
    const { error } = await supabase.from("telecallers").insert([{ name: telecallerForm.name.trim(), mobile: telecallerForm.mobile.trim(), pin: telecallerForm.pin.trim() }]);
    if (error) return setMessage(error.message);
    setTelecallerForm({ name: "", mobile: "", pin: "123456" });
    setMessage("Telecaller added.");
    await loadTelecallers();
    await onUpdated();
  }

  async function updateTelecaller(telecaller) {
    setMessage("");
    const draft = personDraft(telecallerEdit, telecaller);
    if (!draft.name.trim() || !draft.mobile.trim() || !draft.pin.trim()) return setMessage("Telecaller name, mobile and PIN are required.");
    if (String(draft.pin).trim().length !== 6) return setMessage("PIN must be 6 digits.");
    const { data, error } = await supabase.from("telecallers").update({ name: draft.name.trim(), mobile: draft.mobile.trim(), pin: draft.pin.trim() }).eq("id", telecaller.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Telecaller"));
    setTelecallerEdit({});
    setMessage("Telecaller updated.");
    await loadTelecallers();
    await onUpdated();
  }

  async function deleteTelecaller(telecaller) {
    const nextActive = telecaller.is_active === false;
    const { data, error } = await supabase.from("telecallers").update({ is_active: nextActive }).eq("id", telecaller.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Telecaller status"));
    setMessage(nextActive ? "Telecaller activated." : "Telecaller deactivated.");
    await loadTelecallers();
    await onUpdated();
  }

  async function addSalesPerson() {
    setMessage("");
    if (!salesForm.name.trim() || !salesForm.mobile.trim() || !salesForm.pin.trim()) return setMessage("Sales person name, mobile and PIN are required.");
    if (String(salesForm.pin).trim().length !== 6) return setMessage("PIN must be 6 digits.");
    const { error } = await supabase.from("sales_persons").insert([{
      name: salesForm.name.trim(),
      mobile: salesForm.mobile.trim(),
      pin: salesForm.pin.trim(),
      incentive_type: salesForm.incentive_type,
      incentive_value: Number(salesForm.incentive_value || 0),
      is_active: true,
    }]);
    if (error) return setMessage(error.message);
    setSalesForm({ name: "", mobile: "", pin: "123456", incentive_type: "percentage", incentive_value: "" });
    setMessage("Sales person added.");
    await loadSalesPersons();
    await onUpdated();
  }

  async function updateSalesPerson(person, updates = null) {
    setMessage("");
    const draft = personDraft(salesEdit, person);
    const payload = updates || {
      name: draft.name.trim(),
      mobile: draft.mobile.trim(),
      pin: draft.pin.trim(),
      incentive_type: draft.incentive_type,
      incentive_value: Number(draft.incentive_value || 0),
    };
    if (!payload.name && !updates) return setMessage("Sales person name is required.");
    if (!updates && String(payload.pin).length !== 6) return setMessage("PIN must be 6 digits.");
    const { data, error } = await supabase.from("sales_persons").update(payload).eq("id", person.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Sales person"));
    setSalesEdit({});
    setMessage("Sales person updated.");
    await loadSalesPersons();
    await onUpdated();
  }

  async function deleteSalesPerson(person) {
    const nextActive = person.is_active === false;
    const { data, error } = await supabase.from("sales_persons").update({ is_active: nextActive }).eq("id", person.id).select("id");
    if (error) return setMessage(error.message);
    if (!data?.length) return setMessage(noRowsMessage("Sales person status"));
    setMessage(nextActive ? "Sales person activated." : "Sales person deactivated.");
    await loadSalesPersons();
    await onUpdated();
  }

  const successMessage = isSuccessToast(message);

  return (
    <>
      <section className="page-head">
        <h2>Admin Settings</h2>
        <p>Manage services, staff logins, sales persons, and admin shortcuts.</p>
      </section>

      {message && <div className={successMessage ? "success-box" : "error-box"}>{message}</div>}
      {message && <div className={successMessage ? "settings-toast success" : "settings-toast error"}>{message}</div>}

      <section className="panel">
        <h3>Services</h3>
        <div className="row-actions">
          <button className="ghost-btn small" type="button" onClick={applyDefaultServiceRates}>Set Default Rates</button>
          <p className="helper">Defaults: Online ₹99, COD ₹249, Installation ₹399. You can edit each rate below anytime.</p>
        </div>
        <Accordion title="Already Added Services" count={cleanServices.length} icon="🧾">
          {cleanServices.length === 0 ? <p className="muted">No services added.</p> : cleanServices.map((service) => {
            const draft = serviceDraft(service);
            return (
              <SettingsItemCard key={service.id} title={service.name} subtitle={`Price: ${formatINR(service.price)}`} icon="🧾">
                <div className="settings-sheet-grid two">
                  <label><span>Service Name</span><input value={draft.name} onChange={(e) => setServiceEdit({ ...serviceEdit, [service.id]: { ...draft, name: e.target.value } })} /></label>
                  <label><span>Price</span><input type="number" value={draft.price} onChange={(e) => setServiceEdit({ ...serviceEdit, [service.id]: { ...draft, price: e.target.value } })} /></label>
                </div>
                <div className="row-actions">
                  <button className="primary-btn small" onClick={() => updateService(service)}>Save</button>
                  <button className="danger-btn small" onClick={() => deleteService(service)}>Delete</button>
                </div>
              </SettingsItemCard>
            );
          })}
        </Accordion>
        <Accordion title="Add New Service" icon="➕">
          <div className="form-stack">
            <div className="two-col">
              <input placeholder="Service name e.g. Installation" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
              <input placeholder="Price" type="number" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
            </div>
            <button className="primary-btn" onClick={addService}>Add Service</button>
          </div>
        </Accordion>
      </section>

      <section className="panel">
        <h3>Areas / Territories / Zones</h3>
        <p className="helper">Add areas like North Delhi, South Delhi, Loni, Gurugram, then link technicians who normally handle that territory.</p>
        <Accordion title="Already Added Areas" count={serviceAreas.length} icon="📍">
          {serviceAreas.length === 0 ? <p className="muted">No areas added.</p> : serviceAreas.map((area) => {
            const draft = areaDraft(area);
            return (
              <SettingsItemCard key={area.id} title={area.name} subtitle={technicianNames(draft.technician_ids)} status={area.is_active === false ? "Inactive" : "Active"} icon="📍">
                <div className="form-stack">
                  <label className="settings-field"><span>Area / Territory</span><input value={draft.name} onChange={(e) => setAreaEdit({ ...areaEdit, [area.id]: { ...draft, name: e.target.value } })} /></label>
                  <div className="settings-check-grid">
                    {techniciansList.filter((tech) => tech.is_active !== false).map((tech) => (
                      <label className="check-row" key={tech.id}>
                        <input
                          type="checkbox"
                          checked={(draft.technician_ids || []).map(String).includes(String(tech.id))}
                          onChange={() => setAreaEdit({ ...areaEdit, [area.id]: { ...draft, technician_ids: toggleAreaTechnician(draft.technician_ids, tech.id) } })}
                        />
                        {tech.name}
                      </label>
                    ))}
                  </div>
                  <p className="helper">Linked: {technicianNames(draft.technician_ids)}</p>
                </div>
                <div className="row-actions">
                  <button className="primary-btn small" onClick={() => updateArea(area)}>Save</button>
                  <button className="danger-btn small" onClick={() => toggleAreaStatus(area)}>{area.is_active === false ? "Activate" : "Deactivate"}</button>
                </div>
              </SettingsItemCard>
            );
          })}
        </Accordion>
        <Accordion title="Add New Area" icon="➕">
          <div className="form-stack">
            <input placeholder="Area / territory name e.g. North Delhi" value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} />
            <div className="settings-check-grid">
              {techniciansList.filter((tech) => tech.is_active !== false).map((tech) => (
                <label className="check-row" key={tech.id}>
                  <input
                    type="checkbox"
                    checked={areaForm.technician_ids.map(String).includes(String(tech.id))}
                    onChange={() => setAreaForm({ ...areaForm, technician_ids: toggleAreaTechnician(areaForm.technician_ids, tech.id) })}
                  />
                  {tech.name}
                </label>
              ))}
            </div>
            <button className="primary-btn" onClick={addArea}>Add Area</button>
          </div>
        </Accordion>
      </section>

      <PeopleSection title="Technicians" count={techniciansList.length} people={techniciansList} editMap={techEdit} setEditMap={setTechEdit} onSave={updateTechnician} onDelete={deleteTechnician} />
      <section className="panel">
        <Accordion title="Add New Technician" icon="🔧">
          <div className="form-stack">
            <div className="two-col">
              <input placeholder="Technician name" value={techForm.name} onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} />
              <input placeholder="Mobile number" inputMode="numeric" value={techForm.mobile} onChange={(e) => setTechForm({ ...techForm, mobile: e.target.value })} />
            </div>
            <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" value={techForm.pin} onChange={(e) => setTechForm({ ...techForm, pin: e.target.value })} />
            <button className="primary-btn" onClick={addTechnician}>Add Technician</button>
          </div>
        </Accordion>
      </section>

      <PeopleSection title="Telecallers" count={telecallersList.length} people={telecallersList} editMap={telecallerEdit} setEditMap={setTelecallerEdit} onSave={updateTelecaller} onDelete={deleteTelecaller} />
      <section className="panel">
        <Accordion title="Add New Telecaller" icon="☎️">
          <div className="form-stack">
            <div className="two-col">
              <input placeholder="Telecaller name" value={telecallerForm.name} onChange={(e) => setTelecallerForm({ ...telecallerForm, name: e.target.value })} />
              <input placeholder="Mobile number" inputMode="numeric" value={telecallerForm.mobile} onChange={(e) => setTelecallerForm({ ...telecallerForm, mobile: e.target.value })} />
            </div>
            <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" value={telecallerForm.pin} onChange={(e) => setTelecallerForm({ ...telecallerForm, pin: e.target.value })} />
            <button className="primary-btn" onClick={addTelecaller}>Add Telecaller</button>
          </div>
        </Accordion>
      </section>

      <section className="panel">
        <h3>Sales Persons</h3>
        <Accordion title="Already Added Sales Persons" count={salesPersonsList.length} icon="🎯">
          {salesPersonsList.length === 0 ? <p className="muted">No sales persons added.</p> : salesPersonsList.map((person) => {
            const draft = personDraft(salesEdit, person);
            return (
              <SettingsItemCard key={person.id} title={person.name} subtitle={`${person.mobile || "No mobile"} | Incentive ${draft.incentive_type}: ${draft.incentive_value || 0}`} status={person.is_active === false ? "Inactive" : "Active"} icon="🎯">
                <div className="settings-sheet-grid two">
                  <label><span>Name</span><input value={draft.name} onChange={(e) => setSalesEdit({ ...salesEdit, [person.id]: { ...draft, name: e.target.value } })} /></label>
                  <label><span>Mobile</span><input value={draft.mobile} inputMode="numeric" onChange={(e) => setSalesEdit({ ...salesEdit, [person.id]: { ...draft, mobile: e.target.value } })} /></label>
                  <label><span>PIN</span><input value={draft.pin} inputMode="numeric" maxLength="6" onChange={(e) => setSalesEdit({ ...salesEdit, [person.id]: { ...draft, pin: e.target.value } })} /></label>
                  <label><span>Incentive Type</span><select value={draft.incentive_type} onChange={(e) => setSalesEdit({ ...salesEdit, [person.id]: { ...draft, incentive_type: e.target.value } })}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select></label>
                  <label><span>Incentive Value</span><input type="number" value={draft.incentive_value} onChange={(e) => setSalesEdit({ ...salesEdit, [person.id]: { ...draft, incentive_value: e.target.value } })} /></label>
                </div>
                <div className="row-actions">
                  <button className="primary-btn small" onClick={() => updateSalesPerson(person)}>Save</button>
                  <button className="danger-btn small" onClick={() => deleteSalesPerson(person)}>{person.is_active === false ? "Activate" : "Deactivate"}</button>
                </div>
              </SettingsItemCard>
            );
          })}
        </Accordion>
        <Accordion title="Add New Sales Person" icon="➕">
          <div className="form-stack">
            <div className="two-col">
              <input placeholder="Sales person name" value={salesForm.name} onChange={(e) => setSalesForm({ ...salesForm, name: e.target.value })} />
              <input placeholder="Mobile number" inputMode="numeric" value={salesForm.mobile} onChange={(e) => setSalesForm({ ...salesForm, mobile: e.target.value })} />
            </div>
            <div className="two-col">
              <input placeholder="6 digit PIN" inputMode="numeric" maxLength="6" value={salesForm.pin} onChange={(e) => setSalesForm({ ...salesForm, pin: e.target.value })} />
              <select value={salesForm.incentive_type} onChange={(e) => setSalesForm({ ...salesForm, incentive_type: e.target.value })}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <input placeholder="Incentive value" type="number" value={salesForm.incentive_value} onChange={(e) => setSalesForm({ ...salesForm, incentive_value: e.target.value })} />
            <button className="primary-btn" onClick={addSalesPerson}>Add Sales Person</button>
          </div>
        </Accordion>
      </section>

      <section className="panel">
        <h3>Other Admin Pages</h3>
        <div className="action-grid">
          <button onClick={() => setPage("business")}>Business Settings</button>
          <button onClick={() => setPage("plans")}>Plans / Products</button>
          <button onClick={() => setPage("inventory")}>Inventory</button>
          <button onClick={() => setPage("bom")}>BOM / Assembly</button>
          <button onClick={() => setPage("technicianParts")}>Technician Parts</button>
          <button onClick={() => setPage("technicianTracking")}>Technician Tracking</button>
          <button onClick={() => setPage("payroll")}>Payroll</button>
          <button onClick={() => setPage("expenses")}>Expenses</button>
          <button onClick={() => setPage("cashbook")}>Accounts / Cashbook</button>
          <button onClick={() => setPage("emi")}>EMI Management</button>
          <button onClick={() => setPage("reports")}>Reports</button>
          <button onClick={() => setPage("communicationReport")}>Communication Logs</button>
        </div>
      </section>
    </>
  );
}

function PeopleSection({ title, count, people, editMap, setEditMap, onSave, onDelete }) {
  const draftFor = (person) => editMap[person.id] || { name: person.name || "", mobile: person.mobile || "", pin: person.pin || "" };

  return (
    <section className="panel admin-settings-panel">
      <h3>{title}</h3>
      <Accordion title={`Already Added ${title}`} count={count} icon={title === "Technician" ? "🔧" : "☎️"}>
        {people.length === 0 ? <p className="muted">No {title.toLowerCase()} added.</p> : people.map((person) => {
          const draft = draftFor(person);
          return (
            <SettingsItemCard key={person.id} title={person.name || "Staff"} subtitle={person.mobile || "No mobile"} status={person.is_active === false ? "Inactive" : "Active"} icon={title === "Technician" ? "🔧" : "☎️"}>
              <div className="settings-sheet-grid two">
                <label><span>Name</span><input value={draft.name} onChange={(e) => setEditMap({ ...editMap, [person.id]: { ...draft, name: e.target.value } })} /></label>
                <label><span>Mobile</span><input value={draft.mobile} inputMode="numeric" onChange={(e) => setEditMap({ ...editMap, [person.id]: { ...draft, mobile: e.target.value } })} /></label>
                <label><span>PIN</span><input value={draft.pin} inputMode="numeric" maxLength="6" onChange={(e) => setEditMap({ ...editMap, [person.id]: { ...draft, pin: e.target.value } })} /></label>
              </div>
              <div className="row-actions">
                <button className="primary-btn small" onClick={() => onSave(person)}>Save</button>
                <button className="danger-btn small" onClick={() => onDelete(person)}>{person.is_active === false ? "Activate" : "Deactivate"}</button>
              </div>
            </SettingsItemCard>
          );
        })}
      </Accordion>
    </section>
  );
}
