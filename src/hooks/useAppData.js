import { useCallback, useEffect, useState } from "react";
import { fetchAppData } from "../services/appDataService";

const initialData = {
  services: [],
  serviceAreas: [],
  technicians: [],
  telecallers: [],
  bookings: [],
  jobs: [],
  customersCount: 0,
  customers: [],
  categories: [],
  inventory: [],
  amcPlans: [],
  products: [],
  coverages: [],
  invoices: [],
  invoicePayments: [],
  invoiceItems: [],
  usage: [],
  inventoryPurchases: [],
  technicianParts: [],
  businessSettings: null,
  leads: [],
  salesPersons: [],
  payrollSettings: [],
  salaryAdvances: [],
  payrollRuns: [],
  expenseCategories: [],
  expenses: [],
  cashbookOpenings: [],
  bomTemplates: [],
  bomItems: [],
  assemblyOrders: [],
  dataErrors: [],
};

export function useAppData({ onLanguageChange } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const nextData = await fetchAppData();
    setData(nextData);
    if (nextData.businessSettings?.app_language) {
      onLanguageChange?.(nextData.businessSettings.app_language);
    }
    setLoading(false);
  }, [onLanguageChange]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    ...data,
    loading,
    loadAll,
  };
}
