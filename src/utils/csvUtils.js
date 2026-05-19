export function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => String(header || "").trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((values) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || "";
    });
    return record;
  });
}

export async function parseCustomerUploadFile(file) {
  const lowerName = String(file?.name || "").toLowerCase();
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    const rows = await readXlsxFile(file);
    if (!rows.length) return [];
    const headers = rows[0].map((header) => String(header || "").trim().toLowerCase().replace(/\s+/g, "_"));
    return rows.slice(1).map((values) => {
      const record = {};
      headers.forEach((header, index) => {
        const value = values[index];
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          record[header] = value.toISOString().slice(0, 10);
        } else {
          record[header] = String(value ?? "").trim();
        }
      });
      return record;
    });
  }

  return parseCsv(await file.text());
}
