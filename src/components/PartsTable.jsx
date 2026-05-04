import { useMemo, useState } from "react";

function defaultStockStatus(item) {
  const stock = Number(item.stock_qty ?? item.quantity ?? 0);
  const low = Number(item.low_stock_qty ?? 0);
  if (stock <= 0) return "out";
  if (low > 0 && stock <= low) return "low";
  return "in";
}

function statusLabel(status) {
  if (status === "out") return "Out of Stock";
  if (status === "low") return "Low Stock";
  return "In Stock";
}

export function PartsTable({
  items = [],
  columns = [],
  actions,
  renderExpanded,
  emptyText = "No parts found.",
  showStockFilter = true,
  title,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [sortKey, setSortKey] = useState(columns[0]?.key || "name");

  const categories = useMemo(() => {
    const values = items
      .map((item) => item.category_name || item.category || "")
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sortColumn = columns.find((column) => column.key === sortKey);

    return items
      .filter((item) => {
        const text = [
          item.name,
          item.part_name,
          item.category_name,
          item.category,
          item.technician_name,
          item.supplier_name,
        ].join(" ").toLowerCase();
        if (q && !text.includes(q)) return false;
        if (category && String(item.category_name || item.category || "") !== category) return false;
        if (stockStatus && defaultStockStatus(item) !== stockStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const aValue = sortColumn?.sortValue ? sortColumn.sortValue(a) : a[sortKey];
        const bValue = sortColumn?.sortValue ? sortColumn.sortValue(b) : b[sortKey];
        if (typeof aValue === "number" || typeof bValue === "number") return Number(aValue || 0) - Number(bValue || 0);
        return String(aValue || "").localeCompare(String(bValue || ""));
      });
  }, [items, search, category, stockStatus, sortKey, columns]);

  return (
    <div className="parts-table-wrap">
      {title && <h3>{title}</h3>}
      <div className="parts-filters">
        <input placeholder="Search part, category, technician" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        {showStockFilter && (
          <select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>
            <option value="">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        )}
        <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
          {columns.filter((column) => column.sortable !== false).map((column) => (
            <option key={column.key} value={column.key}>Sort: {column.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? <p className="muted">{emptyText}</p> : (
        <div className="responsive-table">
          <table className="parts-table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
                {actions && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id || `${item.inventory_item_id}-${item.technician_id}`}>
                  {columns.map((column) => (
                    <td data-label={column.label} key={column.key}>
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                  {actions && <td data-label="Action">{actions(item)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {renderExpanded && filtered.map((item) => (
            <div className="parts-expanded" key={`expanded-${item.id || `${item.inventory_item_id}-${item.technician_id}`}`}>
              {renderExpanded(item)}
            </div>
          ))}
        </div>
      )}

      <p className="helper">Showing {filtered.length} of {items.length} parts.</p>
    </div>
  );
}

export function StockBadge({ item }) {
  const status = defaultStockStatus(item);
  return <span className={`stock-badge ${status}`}>{statusLabel(status)}</span>;
}
