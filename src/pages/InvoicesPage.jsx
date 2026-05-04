import { useState } from "react";
import { InvoicePaymentForm } from "./CollectionsPage";
import { formatINR, todayISO } from "../utils/appUtils";
export function InvoicesPage({ invoices, invoiceItems, invoicePayments = [], businessSettings, onUpdated }) {
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const business = businessSettings || {
    business_name: "AquaBiz",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    gst_number: "",
    google_business_link: "",
    instagram_link: "",
    invoice_prefix: "INV",
    gst_enabled: false,
    gst_rate: 18,
    terms: "Thank you for your business.",
  };

  function getInvoiceNumber(inv, index = 0) {
    const shortId = String(inv.id || "").slice(0, 6).toUpperCase();
    return `${business.invoice_prefix || "INV"}-${shortId || index + 1}`;
  }

  function gstBreakup(total) {
    const rate = Number(business.gst_rate || 18);
    if (!business.gst_enabled) {
      return { taxable: total, gst: 0, cgst: 0, sgst: 0, rate };
    }

    const taxable = total / (1 + rate / 100);
    const gst = total - taxable;
    return {
      taxable,
      gst,
      cgst: gst / 2,
      sgst: gst / 2,
      rate,
    };
  }

  function invoiceText(inv, items, index) {
    const g = gstBreakup(Number(inv.total_amount || 0));

    const lines = [
      `${business.business_name || "AquaBiz"} Invoice`,
      `Invoice No: ${getInvoiceNumber(inv, index)}`,
      `Customer: ${inv.customer_name || ""}`,
      `Mobile: ${inv.mobile || ""}`,
      `Invoice Type: ${inv.invoice_type || "service"}`,
      `Total: ${formatINR(inv.total_amount)}`,
      `Paid: ${formatINR(inv.paid_amount)}`,
      `Pending: ${formatINR(inv.due_amount)}`,
      `Status: ${inv.payment_status}`,
    ];

    if (business.gst_enabled) {
      lines.push(`GSTIN: ${business.gst_number || ""}`);
      lines.push(`Taxable: ${formatINR(g.taxable)}`);
      lines.push(`CGST: ${formatINR(g.cgst)}`);
      lines.push(`SGST: ${formatINR(g.sgst)}`);
    }

    lines.push("");
    lines.push("Items:");
    items.forEach((item) => {
      lines.push(`${item.item_name} x ${item.quantity} - ${formatINR(item.billing_price)}${item.is_covered ? " (Covered)" : ""}`);
    });

    lines.push("");
    if (business.phone) lines.push(`Phone: ${business.phone}`);
    if (business.whatsapp) lines.push(`WhatsApp: ${business.whatsapp}`);
    if (business.email) lines.push(`Email: ${business.email}`);
    if (business.google_business_link) lines.push(`Google Profile: ${business.google_business_link}`);
    if (business.instagram_link) lines.push(`Instagram: ${business.instagram_link}`);
    if (business.terms) lines.push(`Terms: ${business.terms}`);

    return lines.join("\\n");
  }

  function shareWhatsApp(inv, items, index) {
    const text = encodeURIComponent(invoiceText(inv, items, index));
    const mobile = String(inv.mobile || "").replace(/\D/g, "");
    const url = mobile ? `https://wa.me/91${mobile}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  function printInvoice(inv, items, index) {
    const total = Number(inv.total_amount || 0);
    const g = gstBreakup(total);
    const invoiceNo = getInvoiceNumber(inv, index);
    const logoUrl = business.logo_url || business.business_logo_url || "";
    const isEmi = !!inv.is_emi || inv.payment_method === "emi";
    const emiAmount = Number(inv.emi_amount || inv.emi_monthly_amount || 0);
    const upiAmount = isEmi
      ? Number(inv.invoice_print_qr_amount || emiAmount || 0)
      : Number(inv.invoice_print_qr_amount || inv.upi_qr_amount || inv.upi_amount || 0);
    const invoiceUpiId = inv.upi_id || business.upi_id || "";
    const upiName = business.upi_name || business.business_name || "AquaBiz";
    const upiUri = `upi://pay?pa=${encodeURIComponent(invoiceUpiId)}&pn=${encodeURIComponent(upiName)}&am=${encodeURIComponent(upiAmount.toFixed(2))}&cu=INR&tn=${encodeURIComponent("AquaBiz Invoice Payment")}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(upiUri)}`;
    const hasBankDetails = business.bank_name || business.account_holder_name || business.account_number || business.ifsc_code || business.branch_name;
    const premiumItemRows = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.item_name || ""}</td>
        <td>${item.quantity || 1}</td>
        <td>₹${Number(item.actual_price || 0).toLocaleString("en-IN")}</td>
        <td>₹${Number(item.billing_price || 0).toLocaleString("en-IN")}</td>
        <td>${item.is_covered ? "Covered" : "Chargeable"}</td>
      </tr>
    `).join("");
    const premiumGstRows = business.gst_enabled ? `
      <tr><td>Taxable Value</td><td>₹${g.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
      <tr><td>CGST ${(g.rate / 2).toFixed(1)}%</td><td>₹${g.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
      <tr><td>SGST ${(g.rate / 2).toFixed(1)}%</td><td>₹${g.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
    ` : "";
    const emiSummaryBlock = isEmi ? `
      <div class="box avoid-break">
        <div class="section-title">EMI Summary</div>
        <div><strong>Product Price:</strong> Rs ${Number(inv.product_price || inv.total_amount || 0).toLocaleString("en-IN")}</div>
        <div><strong>Down Payment Total:</strong> Rs ${Number(inv.down_payment_total || inv.paid_amount || 0).toLocaleString("en-IN")}</div>
        <div>Cash Received: Rs ${Number(inv.down_payment_cash || inv.cash_amount || 0).toLocaleString("en-IN")}</div>
        <div>UPI Received: Rs ${Number(inv.down_payment_upi || inv.upi_amount || 0).toLocaleString("en-IN")}</div>
        <div><strong>Monthly EMI:</strong> Rs ${emiAmount.toLocaleString("en-IN")}</div>
        <div><strong>Tenure:</strong> ${Number(inv.emi_months || 0)} months</div>
        <div><strong>Total EMI Balance:</strong> Rs ${Number(inv.due_amount || 0).toLocaleString("en-IN")}</div>
        <div><strong>Payment Mode:</strong> Cash Rs ${Number(inv.down_payment_cash || inv.cash_amount || 0).toLocaleString("en-IN")} + UPI Rs ${Number(inv.down_payment_upi || inv.upi_amount || 0).toLocaleString("en-IN")}</div>
        <div><strong>Payment Confirmed:</strong> ${inv.payment_confirmed ? "Yes" : "No"}</div>
      </div>
    ` : "";
    const qrBlock = upiAmount > 0 ? `
      <div class="qr-card">
        <div class="section-title">${isEmi ? "Monthly EMI QR" : "Scan to Pay"}</div>
        <div class="qr-layout">
          <img class="qr-img" src="${qrUrl}" alt="UPI QR Code" />
          <div>
            <div><strong>UPI ID:</strong> ${invoiceUpiId}</div>
            <div><strong>${isEmi ? "EMI Amount" : "UPI Amount"}:</strong> Rs ${upiAmount.toLocaleString("en-IN")}</div>
            ${isEmi ? "<div>Scan to pay monthly EMI</div>" : ""}
            <div><strong>Status:</strong> ${inv.payment_status || ""}</div>
          </div>
        </div>
      </div>
    ` : "";    const bankBlock = hasBankDetails ? `
      <div class="box avoid-break">
        <div class="section-title">Bank Account Details</div>
        ${business.bank_name ? `<div><strong>Bank:</strong> ${business.bank_name}</div>` : ""}
        ${business.account_holder_name ? `<div><strong>Account Holder:</strong> ${business.account_holder_name}</div>` : ""}
        ${business.account_number ? `<div><strong>Account No:</strong> ${business.account_number}</div>` : ""}
        ${business.ifsc_code ? `<div><strong>IFSC:</strong> ${business.ifsc_code}</div>` : ""}
        ${business.branch_name ? `<div><strong>Branch:</strong> ${business.branch_name}</div>` : ""}
      </div>
    ` : "";
    const premiumHtml = `
      <html>
        <head>
          <title>${business.business_name || "AquaBiz"} Invoice</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #eef3f8; font-family: Arial, sans-serif; color: #111827; }
            .screen-bar { max-width: 920px; margin: 18px auto 0; text-align: right; }
            .print-btn { border: 0; background: #008a73; color: white; padding: 10px 16px; border-radius: 8px; font-weight: 700; }
            .invoice-wrap { max-width: 920px; margin: 18px auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.08); }
            .top-band { height: 8px; background: linear-gradient(90deg, #000666, #008a73); border-radius: 8px; margin-bottom: 22px; }
            .header { display: grid; grid-template-columns: 1.3fr .7fr; gap: 22px; padding-bottom: 18px; border-bottom: 1px solid #d7d7e8; }
            .brand-line { display: flex; gap: 14px; align-items: flex-start; }
            .logo { width: 74px; height: 74px; object-fit: contain; border: 1px solid #d7d7e8; border-radius: 10px; padding: 6px; }
            .text-logo { width: 74px; height: 74px; border-radius: 10px; background: #e9e9ff; color: #000666; display:flex; align-items:center; justify-content:center; font-weight: 900; font-size: 24px; }
            h1 { color:#000666; margin:0 0 8px; font-size: 30px; }
            .muted { color:#6b7280; font-size: 13px; line-height: 1.55; }
            .invoice-title { text-align:right; }
            .invoice-title h2 { margin: 0 0 10px; color:#000666; font-size: 28px; text-transform: uppercase; }
            .status-pill { display: inline-block; margin-top: 8px; padding: 7px 12px; border-radius: 999px; background: #e9f8f5; color: #008a73; font-weight: 800; }
            .grid { display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-top:20px; }
            .box, .qr-card { border:1px solid #d7d7e8; padding:16px; border-radius:10px; line-height:1.65; background:#fff; margin-bottom: 12px; }
            .section-title { color:#000666; font-weight:900; margin-bottom:8px; text-transform: uppercase; font-size: 12px; letter-spacing: .04em; }
            table { width:100%; border-collapse:collapse; margin-top:20px; overflow: hidden; border-radius: 8px; }
            th, td { border:1px solid #d7d7e8; padding:10px; text-align:left; font-size: 13px; }
            th { background:#f2f4ff; color:#000666; }
            .summary-grid { display:grid; grid-template-columns: 1fr 360px; gap:18px; margin-top:20px; align-items:start; }
            .summary table { margin-top: 0; }
            .total td { font-size:18px; font-weight:bold; color:#008a73; background:#f2fffb; }
            .qr-layout { display:grid; grid-template-columns: 120px 1fr; gap:14px; align-items:center; }
            .qr-img { width: 120px; height: 120px; image-rendering: pixelated; }
            .terms { margin-top:20px; border-top:1px solid #d7d7e8; padding-top:14px; color:#374151; line-height:1.6; }
            .signature { display:grid; grid-template-columns: 1fr 220px; gap:20px; margin-top:34px; align-items:end; }
            .sign-line { border-top:1px solid #111827; text-align:center; padding-top:8px; color:#374151; }
            .footer { margin-top:20px; color:#6b7280; font-size:12px; text-align:center; }
            .avoid-break { break-inside: avoid; page-break-inside: avoid; }
            @media (max-width: 700px) {
              .invoice-wrap { margin: 0; border-radius: 0; padding: 18px; }
              .header, .grid, .summary-grid, .signature { grid-template-columns: 1fr; }
              .invoice-title { text-align: left; }
              table { display:block; overflow-x:auto; white-space:nowrap; }
            }
            @media print {
              @page { size: A4; margin: 12mm; }
              body { background: #fff; }
              .screen-bar { display: none; }
              .invoice-wrap { max-width: 100%; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
              .box, .qr-card { border-color: #bbb; }
              th { background: #f2f2f2 !important; color:#000 !important; }
              h1, .invoice-title h2, .section-title { color:#000 !important; }
            }
          </style>
        </head>
        <body>
          <div class="screen-bar"><button class="print-btn" onclick="window.print()">Print Invoice</button></div>
          <div class="invoice-wrap">
            <div class="top-band"></div>
            <div class="header">
              <div class="brand-line">
                ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Business Logo" />` : `<div class="text-logo">AB</div>`}
                <div>
                  <h1>${business.business_name || "AquaBiz"}</h1>
                  <div class="muted">${business.address || ""}</div>
                  <div class="muted">Phone: ${business.phone || ""} ${business.whatsapp ? "| WhatsApp: " + business.whatsapp : ""}</div>
                  <div class="muted">Email: ${business.email || ""}</div>
                  ${business.gst_enabled ? `<div class="muted"><strong>GSTIN:</strong> ${business.gst_number || ""}</div>` : ""}
                </div>
              </div>
              <div class="invoice-title">
                <h2>Invoice</h2>
                <div><strong>No:</strong> ${invoiceNo}</div>
                <div><strong>Date:</strong> ${new Date(inv.created_at).toLocaleDateString("en-IN")}</div>
                <div class="status-pill">${inv.payment_status || ""}</div>
              </div>
            </div>
            <div class="grid">
              <div class="box">
                <div class="section-title">Customer Details</div>
                <div><strong>Name:</strong> ${inv.customer_name || ""}</div>
                <div><strong>Mobile:</strong> ${inv.mobile || ""}</div>
              </div>
              <div class="box">
                <div class="section-title">Invoice Details</div>
                <div><strong>Type:</strong> ${inv.invoice_type || "service"}</div>
                <div><strong>Payment:</strong> ${inv.payment_method || ""}</div>
                <div><strong>Cash:</strong> ₹${Number(inv.cash_amount || 0).toLocaleString("en-IN")} | <strong>UPI:</strong> ₹${Number(inv.upi_amount || 0).toLocaleString("en-IN")}</div>
              </div>
            </div>
            <table>
              <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Actual Price</th><th>Billing Price</th><th>Status</th></tr></thead>
              <tbody>${premiumItemRows}</tbody>
            </table>
            <div class="summary-grid avoid-break">
              <div>${emiSummaryBlock}${qrBlock}${bankBlock}</div>
              <div class="summary">
                <table>
                  <tr><td>Service Charge</td><td>₹${Number(inv.service_charge || 0).toLocaleString("en-IN")}</td></tr>
                  <tr><td>Parts Charge</td><td>₹${Number(inv.parts_charge || 0).toLocaleString("en-IN")}</td></tr>
                  <tr><td>Discount</td><td>₹${Number(inv.discount || 0).toLocaleString("en-IN")}</td></tr>
                  ${premiumGstRows}
                  <tr><td>Cash Amount</td><td>₹${Number(inv.cash_amount || 0).toLocaleString("en-IN")}</td></tr>
                  <tr><td>UPI Amount</td><td>₹${Number(inv.upi_amount || 0).toLocaleString("en-IN")}</td></tr>
                  <tr class="total"><td>Total</td><td>₹${Number(inv.total_amount || 0).toLocaleString("en-IN")}</td></tr>
                  <tr><td>Paid</td><td>₹${Number(inv.paid_amount || 0).toLocaleString("en-IN")}</td></tr>
                  <tr><td>Pending</td><td>₹${Number(inv.due_amount || 0).toLocaleString("en-IN")}</td></tr>
                </table>
              </div>
            </div>
            <div class="terms avoid-break">
              <div class="section-title">Terms & Conditions</div>
              <div>${business.terms || "Thank you for your business."}</div>
            </div>
            <div class="signature avoid-break">
              <div class="muted">Thank you for choosing ${business.business_name || "AquaBiz"}.</div>
              <div class="sign-line">Authorized Signature</div>
            </div>
            <div class="footer">Generated by AquaBiz</div>
          </div>
        </body>
      </html>
    `;

    const premiumWindow = window.open("", "_blank");
    premiumWindow.document.open();
    premiumWindow.document.write(premiumHtml);
    premiumWindow.document.close();
    return;

    const itemRows = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.item_name || ""}</td>
        <td>${item.quantity || 1}</td>
        <td>₹${Number(item.actual_price || 0).toLocaleString("en-IN")}</td>
        <td>₹${Number(item.billing_price || 0).toLocaleString("en-IN")}</td>
        <td>${item.is_covered ? "Covered" : "Chargeable"}</td>
      </tr>
    `).join("");

    const gstRows = business.gst_enabled ? `
      <tr><td>Taxable Value</td><td>₹${g.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
      <tr><td>CGST ${(g.rate / 2).toFixed(1)}%</td><td>₹${g.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
      <tr><td>SGST ${(g.rate / 2).toFixed(1)}%</td><td>₹${g.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>
    ` : "";

    const links = [
      business.google_business_link ? `<div>Google Profile: ${business.google_business_link}</div>` : "",
      business.instagram_link ? `<div>Instagram: ${business.instagram_link}</div>` : "",
    ].join("");

    const html = `
      <html>
        <head>
          <title>${business.business_name || "AquaBiz"} Invoice</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 28px; color: #111; }
            .invoice-wrap { max-width: 820px; margin: 0 auto; }
            .header { display:flex; justify-content:space-between; border-bottom:3px solid #000666; padding-bottom:16px; gap: 24px; }
            .brand h1 { color:#000666; margin:0 0 6px; font-size: 34px; }
            .brand div { line-height:1.45; }
            .invoice-title { text-align:right; line-height:1.6; }
            .grid { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top:20px; }
            .box { border:1px solid #ddd; padding:14px; border-radius:8px; line-height:1.6; }
            .box-title { color:#000666; font-weight:bold; margin-bottom:8px; }
            table { width:100%; border-collapse:collapse; margin-top:20px; }
            th, td { border:1px solid #ddd; padding:10px; text-align:left; }
            th { background:#f2f4ff; color:#000666; }
            .summary { width: 360px; margin-left:auto; margin-top:20px; }
            .summary table { margin-top: 0; }
            .total { font-size:22px; font-weight:bold; color:#007c68; }
            .footer { margin-top:32px; color:#666; font-size:13px; border-top:1px solid #ddd; padding-top:12px; line-height:1.6; }
            @media print { body { padding: 0; } .invoice-wrap { max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="invoice-wrap">
            <div class="header">
              <div class="brand">
                <h1>${business.business_name || "AquaBiz"}</h1>
                <div>${business.address || ""}</div>
                <div>Phone: ${business.phone || ""} ${business.whatsapp ? "| WhatsApp: " + business.whatsapp : ""}</div>
                <div>Email: ${business.email || ""}</div>
                ${business.gst_enabled ? `<div><strong>GSTIN:</strong> ${business.gst_number || ""}</div>` : ""}
              </div>
              <div class="invoice-title">
                <h2>Invoice</h2>
                <div><strong>No:</strong> ${invoiceNo}</div>
                <div><strong>Date:</strong> ${new Date(inv.created_at).toLocaleDateString("en-IN")}</div>
                <div><strong>Status:</strong> ${inv.payment_status || ""}</div>
              </div>
            </div>

            <div class="grid">
              <div class="box">
                <div class="box-title">Bill To</div>
                <div><strong>Name:</strong> ${inv.customer_name || ""}</div>
                <div><strong>Mobile:</strong> ${inv.mobile || ""}</div>
              </div>
              <div class="box">
                <div class="box-title">Invoice Details</div>
                <div><strong>Type:</strong> ${inv.invoice_type || "service"}</div>
                <div><strong>Payment:</strong> ${inv.payment_method || ""}</div>
                <div><strong>Cash:</strong> ₹${Number(inv.cash_amount || 0).toLocaleString("en-IN")} | <strong>UPI:</strong> ₹${Number(inv.upi_amount || 0).toLocaleString("en-IN")}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Actual Price</th>
                  <th>Billing Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="summary">
              <table>
                <tr><td>Service Charge</td><td>₹${Number(inv.service_charge || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Parts Charge</td><td>₹${Number(inv.parts_charge || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Discount</td><td>₹${Number(inv.discount || 0).toLocaleString("en-IN")}</td></tr>
                ${gstRows}
                <tr class="total"><td>Total</td><td>₹${Number(inv.total_amount || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Paid</td><td>₹${Number(inv.paid_amount || 0).toLocaleString("en-IN")}</td></tr>
                <tr><td>Pending</td><td>₹${Number(inv.due_amount || 0).toLocaleString("en-IN")}</td></tr>
              </table>
            </div>

            <div class="footer">
              <div>${business.terms || "Thank you for your business."}</div>
              ${links}
              <div>Generated by AquaBiz</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <>
      <section className="page-head invoice-page-head">
        <h2>Invoices</h2>
        <p>Professional invoice print/PDF aur WhatsApp share.</p>
      </section>

      <section className="panel invoice-card-grid">
        {invoices.length === 0 ? <p className="muted">No invoices yet.</p> : invoices.map((inv, index) => {
          const items = invoiceItems.filter((i) => String(i.invoice_id) === String(inv.id));
          const payments = invoicePayments.filter((p) => String(p.invoice_id) === String(inv.id));
          return (
            <div className="job-card" key={inv.id}>
              <strong>{business.business_name || "AquaBiz"} — {getInvoiceNumber(inv, index)}</strong>
              <p>{inv.customer_name} • {inv.mobile} • {inv.invoice_type}</p>
              <p>Service: {formatINR(inv.service_charge)} | Parts: {formatINR(inv.parts_charge)} | Discount: {formatINR(inv.discount)}</p>
              <div className="amount-box total"><strong>Total</strong><strong>{formatINR(inv.total_amount)}</strong></div>
              <p>Status: {inv.payment_status} | Method: {inv.payment_method}</p>
              <p>Cash: {formatINR(inv.cash_amount)} | UPI: {formatINR(inv.upi_amount)} | Paid: {formatINR(inv.paid_amount)} | Due: {formatINR(inv.due_amount)}</p>
              {inv.payment_method === "emi" && (
                <p className={inv.emi_next_due_date && String(inv.emi_next_due_date) <= todayISO() && Number(inv.due_amount || 0) > 0 ? "danger-line" : "muted"}>
                  EMI: {formatINR(inv.emi_monthly_amount)} monthly | Next Due: {inv.emi_next_due_date || "Not set"}
                </p>
              )}

              {items.map((item) => (
                <div className="mini-line" key={item.id}>
                  {item.item_name} x {item.quantity} — {formatINR(item.billing_price)}
                  {item.is_covered && <span className="success-line"> Covered</span>}
                </div>
              ))}

              {payments.length > 0 && (
                <div className="sub-panel">
                  <h3>Payment History</h3>
                  {payments.map((payment) => (
                    <div className="mini-line" key={payment.id}>
                      {payment.payment_date} — Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)}
                      {payment.note ? ` — ${payment.note}` : ""}
                    </div>
                  ))}
                </div>
              )}

              <div className="row-actions">
                {Number(inv.due_amount || 0) > 0 && (
                  <button className="primary-btn small" onClick={() => setPaymentInvoiceId(paymentInvoiceId === inv.id ? null : inv.id)}>
                    Add Payment
                  </button>
                )}
                <button className="primary-btn small" onClick={() => printInvoice(inv, items, index)}>
                  Print / Save PDF
                </button>
                <button className="ghost-btn small" onClick={() => shareWhatsApp(inv, items, index)}>
                  Share WhatsApp
                </button>
              </div>
              {paymentInvoiceId === inv.id && (
                <InvoicePaymentForm
                  invoice={inv}
                  onClose={() => setPaymentInvoiceId(null)}
                  onDone={async () => {
                    setPaymentInvoiceId(null);
                    await onUpdated?.();
                  }}
                />
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
