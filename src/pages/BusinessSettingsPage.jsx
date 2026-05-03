import { useEffect, useState } from "react";
import { FormCard } from "../components/shared";
import { supabase } from "../supabaseClient";
export function BusinessSettingsPage({ settings, language, setLanguage, onUpdated }) {
  const [form, setForm] = useState({
    business_name: settings?.business_name || "AquaBiz",
    gst_number: settings?.gst_number || "",
    phone: settings?.phone || "",
    whatsapp: settings?.whatsapp || "",
    email: settings?.email || "",
    business_logo_url: settings?.business_logo_url || "",
    logo_url: settings?.logo_url || settings?.business_logo_url || "",
    upi_id: settings?.upi_id || "",
    upi_name: settings?.upi_name || "",
    bank_name: settings?.bank_name || "",
    account_holder_name: settings?.account_holder_name || "",
    account_number: settings?.account_number || "",
    ifsc_code: settings?.ifsc_code || "",
    branch_name: settings?.branch_name || "",
    address: settings?.address || "",
    google_business_link: settings?.google_business_link || "",
    instagram_link: settings?.instagram_link || "",
    invoice_prefix: settings?.invoice_prefix || "INV",
    gst_enabled: !!settings?.gst_enabled,
    gst_rate: settings?.gst_rate || 18,
    terms: settings?.terms || "Thank you for your business.",
    app_language: settings?.app_language || language || "en",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name || "AquaBiz",
        gst_number: settings.gst_number || "",
        phone: settings.phone || "",
        whatsapp: settings.whatsapp || "",
        email: settings.email || "",
        business_logo_url: settings.business_logo_url || "",
        logo_url: settings.logo_url || settings.business_logo_url || "",
        upi_id: settings.upi_id || "",
        upi_name: settings.upi_name || "",
        bank_name: settings.bank_name || "",
        account_holder_name: settings.account_holder_name || "",
        account_number: settings.account_number || "",
        ifsc_code: settings.ifsc_code || "",
        branch_name: settings.branch_name || "",
        address: settings.address || "",
        google_business_link: settings.google_business_link || "",
        instagram_link: settings.instagram_link || "",
        invoice_prefix: settings.invoice_prefix || "INV",
        gst_enabled: !!settings.gst_enabled,
        gst_rate: settings.gst_rate || 18,
        terms: settings.terms || "Thank you for your business.",
        app_language: settings.app_language || language || "en",
      });
    }
  }, [settings]);

  async function saveSettings() {
    setMessage("");

    const payload = {
      id: settings?.id || "00000000-0000-0000-0000-000000000001",
      business_name: form.business_name,
      gst_number: form.gst_number,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      business_logo_url: form.business_logo_url,
      logo_url: form.logo_url,
      upi_id: form.upi_id,
      upi_name: form.upi_name,
      bank_name: form.bank_name,
      account_holder_name: form.account_holder_name,
      account_number: form.account_number,
      ifsc_code: form.ifsc_code,
      branch_name: form.branch_name,
      address: form.address,
      google_business_link: form.google_business_link,
      instagram_link: form.instagram_link,
      invoice_prefix: form.invoice_prefix,
      gst_enabled: !!form.gst_enabled,
      gst_rate: Number(form.gst_rate || 18),
      terms: form.terms,
      app_language: form.app_language,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("business_settings")
      .upsert([payload], { onConflict: "id" });

    if (error) {
      setMessage(error.message);
      return;
    }

    setLanguage(form.app_language);
    setMessage("Business settings saved.");
    await onUpdated();
  }

  async function uploadLogo(file) {
    setMessage("");
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setMessage("Logo must be JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Logo size must be less than 2MB.");
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `business-logos/default-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    setForm({ ...form, logo_url: data.publicUrl, business_logo_url: data.publicUrl });
    setMessage("Logo uploaded successfully. Click Save Business Settings.");
  }

  return (
    <>
      <section className="page-head">
        <h2>Business Settings</h2>
        <p>Set business details and GST settings shown on invoices.</p>
      </section>

      <section className="panel">
        <div className="form-stack">
          <FormCard label="Business Name">
            <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </FormCard>

          <div className="two-col">
            <FormCard label="Phone Number">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormCard>
            <FormCard label="WhatsApp Number">
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </FormCard>
          </div>

          <FormCard label="Email">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormCard>

          <FormCard label="Upload Business Logo">
            {form.logo_url && <img className="logo-preview" src={form.logo_url} alt="Business logo preview" />}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            <p className="helper">JPG, PNG, or WEBP only. Max size 2MB. Logo will be used on invoices.</p>
          </FormCard>

          <FormCard label="Business Address">
            <textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FormCard>

          <section className="sub-panel">
            <h3>UPI Payment Details</h3>
            <div className="two-col">
              <FormCard label="UPI ID">
                <input placeholder="example@upi" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} />
              </FormCard>
              <FormCard label="UPI Name / Payee Name">
                <input placeholder="Business or owner name" value={form.upi_name} onChange={(e) => setForm({ ...form, upi_name: e.target.value })} />
              </FormCard>
            </div>
          </section>

          <section className="sub-panel">
            <h3>Bank Account Details</h3>
            <div className="two-col">
              <FormCard label="Bank Name">
                <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
              </FormCard>
              <FormCard label="Account Holder Name">
                <input value={form.account_holder_name} onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })} />
              </FormCard>
            </div>
            <div className="two-col">
              <FormCard label="Account Number">
                <input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
              </FormCard>
              <FormCard label="IFSC Code">
                <input value={form.ifsc_code} onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })} />
              </FormCard>
            </div>
            <FormCard label="Branch Name">
              <input value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} />
            </FormCard>
          </section>

          <div className="two-col">
            <FormCard label="GST Number">
              <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </FormCard>
            <FormCard label="GST Rate %">
              <input type="number" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} />
            </FormCard>
          </div>

          <FormCard label="GST Enabled">
            <div className="chip-grid">
              <button className={form.gst_enabled ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, gst_enabled: true })}>Yes</button>
              <button className={!form.gst_enabled ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, gst_enabled: false })}>No</button>
            </div>
          </FormCard>

          <div className="two-col">
            <FormCard label="Google Business Profile Link">
              <input value={form.google_business_link} onChange={(e) => setForm({ ...form, google_business_link: e.target.value })} />
            </FormCard>
            <FormCard label="Instagram Link">
              <input value={form.instagram_link} onChange={(e) => setForm({ ...form, instagram_link: e.target.value })} />
            </FormCard>
          </div>

          <FormCard label="Invoice Prefix">
            <input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
          </FormCard>

          <FormCard label="App Language">
            <div className="chip-grid">
              <button className={form.app_language === "en" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, app_language: "en" })}>English</button>
              <button className={form.app_language === "hi" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, app_language: "hi" })}>हिंदी</button>
              <button className={form.app_language === "hinglish" ? "chip active" : "chip"} type="button" onClick={() => setForm({ ...form, app_language: "hinglish" })}>Hinglish</button>
            </div>
            <p className="helper">This changes key dashboard and navigation labels.</p>
          </FormCard>

          <FormCard label="Invoice Terms">
            <textarea rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          </FormCard>

          {message && <div className={message.includes("saved") ? "success-box" : "error-box"}>{message}</div>}

          <button className="primary-btn big" onClick={saveSettings}>Save Business Settings</button>
        </div>
      </section>
    </>
  );
}