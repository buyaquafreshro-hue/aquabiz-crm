import { useState } from "react";
import { emptyTechnicianPart } from "../constants/defaults";
import { PartsTable } from "../components/PartsTable";
import { supabase } from "../supabaseClient";
export function TechnicianPartsPage({ technicians, technicianParts = [], inventory, onUpdated }) {
  const [partForm, setPartForm] = useState(emptyTechnicianPart);
  const [message, setMessage] = useState("");

  async function assignTechnicianPart() {
    setMessage("");

    if (!partForm.technician_id || !partForm.inventory_item_id || Number(partForm.quantity || 0) <= 0) {
      setMessage("Select technician, part and quantity.");
      return;
    }

    const item = inventory.find((p) => String(p.id) === String(partForm.inventory_item_id));
    const tech = technicians.find((t) => String(t.id) === String(partForm.technician_id));

    const { error } = await supabase.from("technician_parts").insert([{
      technician_id: partForm.technician_id,
      technician_name: tech?.name || "",
      inventory_item_id: partForm.inventory_item_id,
      part_name: item?.name || "",
      quantity: Number(partForm.quantity || 0),
      notes: partForm.notes.trim(),
    }]);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPartForm(emptyTechnicianPart);
    setMessage("Part assigned to technician.");
    await onUpdated();
  }

  const assignedRows = technicianParts.map((row) => {
    const item = inventory.find((part) => String(part.id) === String(row.inventory_item_id));
    return {
      ...row,
      name: row.part_name,
      category_name: item?.category_name || item?.category || "Uncategorized",
      stock_qty: row.quantity,
      low_stock_qty: 0,
    };
  });

  return (
    <>
      <section className="page-head">
        <h2>Technician Parts</h2>
        <p>Assign parts to technicians and track what stock is with each technician.</p>
      </section>

      <section className="panel">
        <h3>Assign Part</h3>
        <div className="form-stack">
          <div className="two-col">
            <select value={partForm.technician_id} onChange={(e) => setPartForm({ ...partForm, technician_id: e.target.value })}>
              <option value="">Select Technician</option>
              {technicians.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
            </select>
            <select value={partForm.inventory_item_id} onChange={(e) => setPartForm({ ...partForm, inventory_item_id: e.target.value })}>
              <option value="">Select Part</option>
              {inventory.map((p) => <option value={p.id} key={p.id}>{p.name} - Stock {p.stock_qty}</option>)}
            </select>
          </div>
          <div className="two-col">
            <input type="number" placeholder="Quantity" value={partForm.quantity} onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })} />
            <input placeholder="Notes" value={partForm.notes} onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })} />
          </div>
          {message && <div className={message.includes("assigned") ? "success-box" : "error-box"}>{message}</div>}
          <button className="primary-btn big" onClick={assignTechnicianPart}>Assign Part to Technician</button>
        </div>
      </section>

      <section className="panel">
        <h3>Assigned Parts</h3>
        <PartsTable
          items={assignedRows}
          showStockFilter={false}
          emptyText="No technician parts assigned."
          columns={[
            { key: "technician_name", label: "Technician" },
            { key: "part_name", label: "Part Name" },
            { key: "category_name", label: "Category" },
            { key: "quantity", label: "Qty With Technician", sortValue: (row) => Number(row.quantity || 0), render: (row) => <strong>{row.quantity}</strong> },
            { key: "notes", label: "Notes", render: (row) => row.notes || "-" },
          ]}
          actions={() => <span className="status assigned">With Technician</span>}
        />
      </section>
    </>
  );
}
