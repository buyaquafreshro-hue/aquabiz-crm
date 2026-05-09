import { useState } from "react";
import { PartsTable } from "../components/PartsTable";
import { supabase } from "../supabaseClient";
import { useAutoHideMessage } from "../utils/toastUtils";
export function TechnicianPartsPage({ technicians, technicianParts = [], inventory, onUpdated }) {
  const [technicianId, setTechnicianId] = useState("");
  const [selectedPartIds, setSelectedPartIds] = useState({});
  const [qtyByPartId, setQtyByPartId] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useAutoHideMessage(message, setMessage);

  const availableInventory = inventory.filter((part) => Number(part.stock_qty || 0) > 0);
  const selectedCount = Object.values(selectedPartIds).filter(Boolean).length;

  function togglePart(partId) {
    setSelectedPartIds((current) => {
      const next = { ...current, [partId]: !current[partId] };
      if (!next[partId]) delete next[partId];
      return next;
    });
    setQtyByPartId((current) => ({ ...current, [partId]: current[partId] || "1" }));
  }

  function updateQuantity(partId, quantity) {
    setQtyByPartId((current) => ({ ...current, [partId]: quantity }));
    if (Number(quantity || 0) > 0) {
      setSelectedPartIds((current) => ({ ...current, [partId]: true }));
    }
  }

  function selectAllAvailable() {
    const nextSelected = {};
    const nextQty = { ...qtyByPartId };
    availableInventory.forEach((part) => {
      nextSelected[part.id] = true;
      nextQty[part.id] = nextQty[part.id] || "1";
    });
    setSelectedPartIds(nextSelected);
    setQtyByPartId(nextQty);
  }

  function clearSelection() {
    setSelectedPartIds({});
    setQtyByPartId({});
  }

  async function assignTechnicianParts() {
    setMessage("");
    if (saving) return;

    if (!technicianId) {
      setMessage("Select technician.");
      return;
    }

    const selectedParts = availableInventory
      .filter((part) => selectedPartIds[part.id])
      .map((part) => ({ part, quantity: Number(qtyByPartId[part.id] || 0) }));

    if (selectedParts.length === 0) {
      setMessage("Select at least one available part.");
      return;
    }

    const invalidPart = selectedParts.find(({ part, quantity }) => quantity <= 0 || quantity > Number(part.stock_qty || 0));
    if (invalidPart) {
      setMessage(`${invalidPart.part.name} quantity must be between 1 and ${invalidPart.part.stock_qty}.`);
      return;
    }

    const tech = technicians.find((t) => String(t.id) === String(technicianId));
    setSaving(true);
    const { error } = await supabase.from("technician_parts").insert(selectedParts.map(({ part, quantity }) => ({
      technician_id: technicianId,
      technician_name: tech?.name || "",
      inventory_item_id: part.id,
      part_name: part.name || "",
      quantity,
      notes: notes.trim(),
    })));
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    clearSelection();
    setNotes("");
    setMessage(`${selectedParts.length} part${selectedParts.length > 1 ? "s" : ""} assigned to technician.`);
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
        <h3>Bulk Assign Parts</h3>
        <div className="form-stack">
          <div className="two-col">
            <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
              <option value="">Select Technician</option>
              {technicians.filter((t) => t.is_active !== false).map((t) => <option value={t.id} key={t.id}>{t.name} ({t.mobile})</option>)}
            </select>
            <input placeholder="Notes for selected parts" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="part-add-actions">
            <button type="button" className="secondary-btn" onClick={selectAllAvailable}>Select All Available</button>
            <button type="button" className="secondary-btn" onClick={clearSelection}>Clear Selection</button>
            <span className="muted">Selected: {selectedCount}</span>
          </div>
          <PartsTable
            items={availableInventory}
            emptyText="No available parts in inventory."
            columns={[
              { key: "name", label: "Part Name" },
              { key: "category_name", label: "Category", render: (row) => row.category_name || row.category || "Uncategorized" },
              { key: "stock_qty", label: "Available Stock", sortValue: (row) => Number(row.stock_qty || 0), render: (row) => <strong>{row.stock_qty}</strong> },
              {
                key: "assign",
                label: "Assign",
                sortable: false,
                render: (row) => (
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={!!selectedPartIds[row.id]}
                      onChange={() => togglePart(row.id)}
                    />
                    Select
                  </label>
                ),
              },
              {
                key: "quantity",
                label: "Qty",
                sortable: false,
                render: (row) => (
                  <input
                    type="number"
                    min="1"
                    max={row.stock_qty}
                    placeholder="Qty"
                    value={qtyByPartId[row.id] || ""}
                    disabled={!selectedPartIds[row.id]}
                    onChange={(e) => updateQuantity(row.id, e.target.value)}
                  />
                ),
              },
            ]}
          />
          {message && <div className={message.includes("assigned") ? "success-box" : "error-box"}>{message}</div>}
          <button className="primary-btn big" onClick={assignTechnicianParts} disabled={saving}>
            {saving ? "Assigning..." : "Assign Selected Parts"}
          </button>
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
