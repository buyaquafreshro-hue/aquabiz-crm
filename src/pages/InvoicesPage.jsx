import { useState } from "react";
import { jsPDF } from "jspdf";
import { InvoicePaymentForm } from "./CollectionsPage";
import { PartsTable } from "../components/PartsTable";
import { DetailDrawer } from "../components/shared";
import { supabase } from "../supabaseClient";
import { formatINR, todayISO, formatISTDate } from "../utils/appUtils";
import { buildWhatsAppUrl } from "../utils/whatsappUtils";
export function InvoicesPage({ invoices, invoiceItems, invoicePayments = [], businessSettings, onUpdated }) {
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const [detailInvoiceId, setDetailInvoiceId] = useState(null);
  const [editInvoiceData, setEditInvoiceData] = useState(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({ total_amount: 0, paid_amount: 0, due_amount: 0, discount: 0, payment_status: "", payment_method: "", cash_amount: 0, upi_amount: 0 });
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

  function pdfMoney(value) {
    return `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }

  function savePdfBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function buildInvoicePdf(inv, items, index) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const invoiceNo = getInvoiceNumber(inv, index);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 42;
    let y = 44;

    const addLine = (left, right = "") => {
      if (y > 760) {
        doc.addPage();
        y = 44;
      }
      doc.text(String(left || ""), margin, y);
      if (right) doc.text(String(right), pageWidth - margin, y, { align: "right" });
      y += 18;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(business.business_name || "AquaBiz", margin, y);
    doc.text("INVOICE", pageWidth - margin, y, { align: "right" });
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (business.address) addLine(business.address);
    if (business.phone || business.whatsapp) addLine(`Phone: ${business.phone || ""}${business.whatsapp ? ` | WhatsApp: ${business.whatsapp}` : ""}`);
    if (business.email) addLine(`Email: ${business.email}`);
    if (business.gst_enabled && business.gst_number) addLine(`GSTIN: ${business.gst_number}`);

    y += 8;
    doc.setDrawColor(0, 102, 90);
    doc.line(margin, y, pageWidth - margin, y);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    addLine(`Invoice No: ${invoiceNo}`, `Date: ${inv.created_at ? formatISTDate(inv.created_at) : ""}`);
    doc.setFont("helvetica", "normal");
    addLine(`Customer: ${inv.customer_name || ""}`, `Mobile: ${inv.mobile || ""}`);
    addLine(`Type: ${inv.invoice_type || "service"}`, `Status: ${inv.payment_status || ""}`);
    addLine(`Payment Method: ${inv.payment_method || ""}`);

    y += 8;
    doc.setFont("helvetica", "bold");
    addLine("Items");
    doc.setFont("helvetica", "normal");
    items.forEach((item, itemIndex) => {
      const line = `${itemIndex + 1}. ${item.item_name || "Item"} x ${item.quantity || 1}`;
      const amount = `${pdfMoney(item.billing_price)}${item.is_covered ? " (Covered)" : ""}`;
      addLine(line.slice(0, 62), amount);
    });
    if (items.length === 0) addLine("No invoice items.");

    y += 8;
    doc.setDrawColor(210, 210, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    const g = gstBreakup(Number(inv.total_amount || 0));
    addLine("Service Charge", pdfMoney(inv.service_charge));
    addLine("Parts Charge", pdfMoney(inv.parts_charge));
    addLine("Discount", pdfMoney(inv.discount));
    if (business.gst_enabled) {
      addLine("Taxable", pdfMoney(g.taxable));
      addLine(`CGST ${(g.rate / 2).toFixed(1)}%`, pdfMoney(g.cgst));
      addLine(`SGST ${(g.rate / 2).toFixed(1)}%`, pdfMoney(g.sgst));
    }
    doc.setFont("helvetica", "bold");
    addLine("Total", pdfMoney(inv.total_amount));
    doc.setFont("helvetica", "normal");
    addLine("Paid", pdfMoney(inv.paid_amount));
    addLine("Pending", pdfMoney(inv.due_amount));

    if (inv.payment_method === "emi") {
      y += 8;
      doc.setFont("helvetica", "bold");
      addLine("EMI Details");
      doc.setFont("helvetica", "normal");
      addLine("Monthly EMI", pdfMoney(inv.emi_monthly_amount || inv.emi_amount));
      addLine("Tenure", `${Number(inv.emi_months || 0)} months`);
      addLine("Next Due", inv.emi_next_due_date || "Not set");
    }

    y += 16;
    if (business.terms) addLine(`Terms: ${business.terms}`);
    addLine(`Generated by ${business.business_name || "AquaBiz"}`);

    return {
      blob: doc.output("blob"),
      filename: `${invoiceNo}-${String(inv.customer_name || "customer").replace(/[^a-z0-9]+/gi, "-")}.pdf`,
    };
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
    window.open(buildWhatsAppUrl(inv.mobile, invoiceText(inv, items, index)), "_blank");
  }

  async function handleEditInvoiceSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from("invoices").update({
      total_amount: editInvoiceForm.total_amount,
      paid_amount: editInvoiceForm.paid_amount,
      due_amount: editInvoiceForm.due_amount,
      discount: editInvoiceForm.discount,
      payment_status: editInvoiceForm.payment_status,
      payment_method: editInvoiceForm.payment_method,
      cash_amount: editInvoiceForm.cash_amount,
      upi_amount: editInvoiceForm.upi_amount
    }).eq("id", editInvoiceData.id);
    if (error) return alert(error.message);
    setEditInvoiceData(null);
    await onUpdated?.();
  }

  async function sharePdf(inv, items, index) {
    const { blob, filename } = buildInvoicePdf(inv, items, index);
    const file = new File([blob], filename, { type: "application/pdf" });

    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({
        title: `${business.business_name || "AquaBiz"} Invoice`,
        text: `Invoice for ${inv.customer_name || "customer"}`,
        files: [file],
      });
      return;
    }

    savePdfBlob(blob, filename);
    window.open(buildWhatsAppUrl(inv.mobile, "Invoice PDF downloaded. Please attach and send the downloaded PDF."), "_blank");
  }

  const detailInvoice = invoices.find((invoice) => String(invoice.id) === String(detailInvoiceId));
  const detailItems = detailInvoice ? invoiceItems.filter((item) => String(item.invoice_id) === String(detailInvoice.id)) : [];
  const detailPayments = detailInvoice ? invoicePayments.filter((payment) => String(payment.invoice_id) === String(detailInvoice.id)) : [];

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
                <div><strong>Date:</strong> ${formatISTDate(inv.created_at)}</div>
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
                <div><strong>Date:</strong> ${formatISTDate(inv.created_at)}</div>
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
            <div
              className="job-card clickable-row"
              key={inv.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailInvoiceId(inv.id)}
              onKeyDown={(event) => { if (event.key === "Enter") setDetailInvoiceId(inv.id); }}
            >
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

              <PartsTable
                items={items.map((item) => ({ ...item, name: item.item_name, stock_qty: item.quantity, category_name: item.item_type || "invoice" }))}
                showStockFilter={false}
                emptyText="No invoice items."
                columns={[
                  { key: "item_name", label: "Item" },
                  { key: "item_type", label: "Type" },
                  { key: "quantity", label: "Qty", sortValue: (item) => Number(item.quantity || 0), render: (item) => <strong>{item.quantity}</strong> },
                  { key: "actual_price", label: "Actual", sortValue: (item) => Number(item.actual_price || 0), render: (item) => formatINR(item.actual_price) },
                  { key: "billing_price", label: "Billing", sortValue: (item) => Number(item.billing_price || 0), render: (item) => formatINR(item.billing_price) },
                  { key: "status", label: "Status", render: (item) => <span className={item.is_covered ? "status assigned" : "status unassigned"}>{item.is_covered ? "Covered" : "Chargeable"}</span> },
                ]}
              />

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

              <div className="row-actions" onClick={(event) => event.stopPropagation()}>
                {Number(inv.due_amount || 0) > 0 && (
                  <button className="primary-btn small" onClick={() => setPaymentInvoiceId(paymentInvoiceId === inv.id ? null : inv.id)}>
                    Add Payment
                  </button>
                )}
                <button className="primary-btn small" onClick={() => printInvoice(inv, items, index)}>
                  Print / Save PDF
                </button>
                <button className="ghost-btn small" onClick={() => {
                  setEditInvoiceData(inv);
                  setEditInvoiceForm({
                    total_amount: inv.total_amount || 0,
                    paid_amount: inv.paid_amount || 0,
                    due_amount: inv.due_amount || 0,
                    discount: inv.discount || 0,
                    payment_status: inv.payment_status || "",
                    payment_method: inv.payment_method || "",
                    cash_amount: inv.cash_amount || 0,
                    upi_amount: inv.upi_amount || 0
                  });
                }}>Edit</button>
                <button className="ghost-btn small" onClick={() => sharePdf(inv, items, index)}>
                  Share PDF
                </button>
                <button className="ghost-btn small" onClick={() => shareWhatsApp(inv, items, index)}>
                  Share WhatsApp
                </button>
              </div>
              {paymentInvoiceId === inv.id && (
                <div onClick={(event) => event.stopPropagation()}>
                  <InvoicePaymentForm
                    invoice={inv}
                    onClose={() => setPaymentInvoiceId(null)}
                    onDone={async () => {
                      setPaymentInvoiceId(null);
                      await onUpdated?.();
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {editInvoiceData && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
          <div className="panel" style={{ width: "100%", maxWidth: "500px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h3>Edit Invoice</h3>
            <p className="muted mt-sm mb-sm" style={{fontSize: '14px'}}>Update basic invoice values manually.</p>
            <form onSubmit={handleEditInvoiceSubmit} className="form-stack mt-md">
              <div className="two-col">
                <div>
                  <label>Total Amount</label>
                  <input type="number" value={editInvoiceForm.total_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, total_amount: e.target.value})} />
                </div>
                <div>
                  <label>Discount</label>
                  <input type="number" value={editInvoiceForm.discount} onChange={e => setEditInvoiceForm({...editInvoiceForm, discount: e.target.value})} />
                </div>
              </div>
              <div className="two-col">
                <div>
                  <label>Paid Amount</label>
                  <input type="number" value={editInvoiceForm.paid_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, paid_amount: e.target.value})} />
                </div>
                <div>
                  <label>Due Amount</label>
                  <input type="number" value={editInvoiceForm.due_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, due_amount: e.target.value})} />
                </div>
              </div>
              <div className="two-col">
                <div>
                  <label>Cash Amount</label>
                  <input type="number" value={editInvoiceForm.cash_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, cash_amount: e.target.value})} />
                </div>
                <div>
                  <label>UPI Amount</label>
                  <input type="number" value={editInvoiceForm.upi_amount} onChange={e => setEditInvoiceForm({...editInvoiceForm, upi_amount: e.target.value})} />
                </div>
              </div>
              <div className="two-col">
                <div>
                  <label>Payment Method</label>
                  <select value={editInvoiceForm.payment_method} onChange={e => setEditInvoiceForm({...editInvoiceForm, payment_method: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="split">Split</option>
                    <option value="pending">Pending</option>
                    <option value="emi">EMI</option>
                    <option value="free">Free / Covered</option>
                  </select>
                </div>
                <div>
                  <label>Payment Status</label>
                  <select value={editInvoiceForm.payment_status} onChange={e => setEditInvoiceForm({...editInvoiceForm, payment_status: e.target.value})}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Covered">Covered</option>
                  </select>
                </div>
              </div>
              <div className="row-actions mt-sm" style={{justifyContent: "flex-end", marginTop: "20px"}}>
                <button type="button" className="ghost-btn" onClick={() => setEditInvoiceData(null)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DetailDrawer
        title={detailInvoice ? `Invoice: ${detailInvoice.customer_name || "Customer"}` : ""}
        subtitle={detailInvoice ? `${detailInvoice.mobile || ""} | ${detailInvoice.invoice_type || "invoice"}` : ""}
        onClose={() => setDetailInvoiceId(null)}
        fields={detailInvoice ? [
          { label: "Total", value: formatINR(detailInvoice.total_amount) },
          { label: "Paid", value: formatINR(detailInvoice.paid_amount) },
          { label: "Due", value: formatINR(detailInvoice.due_amount) },
          { label: "Status", value: detailInvoice.payment_status },
          { label: "Payment Method", value: detailInvoice.payment_method },
          { label: "Cash", value: formatINR(detailInvoice.cash_amount) },
          { label: "UPI", value: formatINR(detailInvoice.upi_amount) },
          { label: "Created", value: detailInvoice.created_at ? formatISTDate(detailInvoice.created_at) : "" },
          { label: "Booking ID", value: detailInvoice.booking_id },
          { label: "Invoice ID", value: detailInvoice.id },
        ] : []}
      >
        {detailItems.length > 0 && (
          <section className="sub-panel">
            <h3>Items</h3>
            {detailItems.map((item) => (
              <div className="mini-line" key={item.id}>
                {item.item_name} x {item.quantity} | Billing {formatINR(item.billing_price)}
              </div>
            ))}
          </section>
        )}
        {detailPayments.length > 0 && (
          <section className="sub-panel">
            <h3>Payments</h3>
            {detailPayments.map((payment) => (
              <div className="mini-line" key={payment.id}>
                {payment.payment_date} | Cash {formatINR(payment.cash_amount)} | UPI {formatINR(payment.upi_amount)}
              </div>
            ))}
          </section>
        )}
      </DetailDrawer>
    </>
  );
}
