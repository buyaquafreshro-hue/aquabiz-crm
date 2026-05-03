import { supabase } from "../supabaseClient";

const BACKUP_TABLES = [
  "services",
  "technicians",
  "telecallers",
  "customers",
  "bookings",
  "job_assignments",
  "part_categories",
  "inventory_items",
  "inventory_purchases",
  "amc_plans",
  "ro_products",
  "customer_coverages",
  "invoices",
  "invoice_payments",
  "invoice_items",
  "inventory_usage",
  "technician_parts",
  "business_settings",
  "user_roles",
  "leads",
];

export async function createBackup() {
  const backup = {
    app: "AquaBiz",
    backup_date: new Date().toISOString(),
    version: "json-backup-v1",
    tables: {},
  };

  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      backup.tables[table] = { error: error.message, data: [] };
      continue;
    }

    backup.tables[table] = { count: data?.length || 0, data: data || [] };
  }

  return backup;
}

export function downloadBackupFile(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];

  a.href = url;
  a.download = `aquabiz-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export async function restoreBackupData(backup) {
  let restored = 0;
  const errors = [];

  for (const table of BACKUP_TABLES) {
    const records = backup.tables?.[table]?.data || [];
    if (!records.length) continue;

    const { error } = await supabase.from(table).upsert(records, { onConflict: "id" });

    if (error) {
      console.error(`Restore error in ${table}:`, error);
      errors.push(`${table}: ${error.message}`);
      continue;
    }

    restored += records.length;
  }

  return { restored, errors };
}
