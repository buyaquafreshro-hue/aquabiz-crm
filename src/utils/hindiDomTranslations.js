import { useEffect } from "react";

const HINDI_TEXT = {
  "Menu": "मेन्यू",
  "Language": "भाषा",
  "English": "अंग्रेजी",
  "Hindi": "हिंदी",
  "Hinglish": "हिंग्लिश",
  "Backup": "बैकअप",
  "Restore": "रिस्टोर",
  "Refresh": "रिफ्रेश",
  "Loading...": "लोड हो रहा है...",
  "Contact / Help": "संपर्क / सहायता",
  "Enable Notifications": "नोटिफिकेशन चालू करें",
  "Logout": "लॉगआउट",
  "Login": "लॉगिन",
  "Admin Login": "एडमिन लॉगिन",
  "Technician App": "टेक्नीशियन ऐप",
  "Telecaller App": "टेलीकॉलर ऐप",
  "Sales Login": "सेल्स लॉगिन",
  "Dashboard": "डैशबोर्ड",
  "New Booking": "नई बुकिंग",
  "Jobs Pipeline": "जॉब पाइपलाइन",
  "Technician Parts": "टेक्नीशियन पार्ट्स",
  "Inventory": "इन्वेंटरी",
  "Plans / Products": "प्लान / प्रोडक्ट",
  "AMC / New Sale": "एएमसी / नई बिक्री",
  "Leads": "लीड्स",
  "Collections": "कलेक्शन",
  "Reminders": "रिमाइंडर",
  "Reports": "रिपोर्ट",
  "Customers": "ग्राहक",
  "Customer History": "ग्राहक इतिहास",
  "Business Settings": "बिजनेस सेटिंग्स",
  "Invoices": "इनवॉइस",
  "Settings": "सेटिंग्स",
  "Expenses": "खर्चे",
  "Cashbook": "कैशबुक",
  "EMI": "ईएमआई",
  "Payroll": "पेरोल",
  "Save": "सेव",
  "Save Changes": "बदलाव सेव करें",
  "Cancel": "रद्द करें",
  "Delete": "डिलीट",
  "Edit": "एडिट",
  "Add": "जोड़ें",
  "Remove": "हटाएं",
  "Close": "बंद करें",
  "View": "देखें",
  "Search": "खोजें",
  "Call": "कॉल",
  "WhatsApp": "व्हाट्सऐप",
  "Print": "प्रिंट",
  "Download CSV": "CSV डाउनलोड करें",
  "Copy Summary": "सारांश कॉपी करें",
  "Customer": "ग्राहक",
  "Customer Name": "ग्राहक का नाम",
  "Mobile": "मोबाइल",
  "Mobile number": "मोबाइल नंबर",
  "Alternate Mobile": "दूसरा मोबाइल नंबर",
  "Address": "पता",
  "Area / Locality": "एरिया / लोकैलिटी",
  "Area / Territory": "एरिया / टेरिटरी",
  "Service Type": "सर्विस प्रकार",
  "Complaint Notes": "शिकायत नोट्स",
  "Visit Date": "विजिट तारीख",
  "Time Slot": "समय स्लॉट",
  "Priority": "प्राथमिकता",
  "Status": "स्थिति",
  "Technician": "टेक्नीशियन",
  "Technicians": "टेक्नीशियन",
  "Telecallers": "टेलीकॉलर",
  "Sales Person": "सेल्स पर्सन",
  "Name": "नाम",
  "PIN": "पिन",
  "Price": "कीमत",
  "Amount": "राशि",
  "Total": "कुल",
  "Paid": "भुगतान",
  "Pending": "बकाया",
  "Due": "देय",
  "Payment Status": "भुगतान स्थिति",
  "Payment Method": "भुगतान तरीका",
  "Cash": "कैश",
  "UPI": "यूपीआई",
  "Cash Full": "पूरा कैश",
  "UPI Full": "पूरा यूपीआई",
  "Cash + UPI": "कैश + यूपीआई",
  "Cash Received": "कैश प्राप्त",
  "UPI Received": "यूपीआई प्राप्त",
  "Pending Amount": "बकाया राशि",
  "Paid Amount": "भुगतान राशि",
  "Invoice": "इनवॉइस",
  "Invoice Type": "इनवॉइस प्रकार",
  "Generate Invoice": "इनवॉइस बनाएं",
  "Generate Final Invoice": "फाइनल इनवॉइस बनाएं",
  "Create Invoice": "इनवॉइस बनाएं",
  "Service Invoice": "सर्विस इनवॉइस",
  "AMC Sale": "एएमसी बिक्री",
  "New RO Sale": "नई आरओ बिक्री",
  "RO Rental": "आरओ किराया",
  "Invoice Discount": "इनवॉइस डिस्काउंट",
  "Used Parts": "इस्तेमाल किए गए पार्ट्स",
  "Part Name": "पार्ट का नाम",
  "Category": "कैटेगरी",
  "Shop Stock": "दुकान स्टॉक",
  "Tech Stock": "टेक्नीशियन स्टॉक",
  "Selling": "बिक्री मूल्य",
  "Low Stock": "कम स्टॉक",
  "In Stock": "स्टॉक में",
  "Out of Stock": "स्टॉक खत्म",
  "Select technician...": "टेक्नीशियन चुनें...",
  "Select Tech...": "टेक्नीशियन चुनें...",
  "Select Service": "सर्विस चुनें",
  "Select area / territory": "एरिया / टेरिटरी चुनें",
  "Select reason": "कारण चुनें",
  "Select reason/note": "कारण / नोट चुनें",
  "Actions": "कार्य",
  "Assign": "असाइन",
  "Reassign...": "री-असाइन...",
  "Set": "सेट",
  "Send OTP": "OTP भेजें",
  "Start Job": "जॉब शुरू करें",
  "Close Job": "जॉब बंद करें",
  "Direct Close Job": "सीधे जॉब बंद करें",
  "No Invoice Reason": "बिना इनवॉइस का कारण",
  "Confirm Close Job": "जॉब बंद कन्फर्म करें",
  "Closing...": "बंद हो रहा है...",
  "Edit Booking": "बुकिंग एडिट करें",
  "No jobs found.": "कोई जॉब नहीं मिला।",
  "No data found.": "कोई डेटा नहीं मिला।",
  "No reminders due": "कोई रिमाइंडर देय नहीं है",
  "No bookings yet": "अभी कोई बुकिंग नहीं है",
  "No open jobs assigned to you.": "आपको कोई खुला जॉब असाइन नहीं है।",
  "Business Name": "बिजनेस नाम",
  "UPI ID": "यूपीआई आईडी",
  "Bank Name": "बैंक नाम",
  "Account Number": "खाता नंबर",
  "IFSC Code": "IFSC कोड",
  "Branch Name": "शाखा नाम",
  "Notes": "नोट्स",
  "Date": "तारीख",
  "Month": "महीना",
  "Role": "भूमिका",
  "Salary": "सैलरी",
  "Expense": "खर्च",
  "Profit": "लाभ",
  "Loss": "नुकसान",
};

const HINDI_PLACEHOLDERS = {
  "Search customer, mobile...": "ग्राहक या मोबाइल खोजें...",
  "Technician mobile number": "टेक्नीशियन मोबाइल नंबर",
  "Mobile number": "मोबाइल नंबर",
  "6 digit PIN": "6 अंकों का पिन",
  "Customer name": "ग्राहक का नाम",
  "Address": "पता",
  "Complaint notes": "शिकायत नोट्स",
  "Enter cash amount": "कैश राशि दर्ज करें",
  "Enter UPI amount": "यूपीआई राशि दर्ज करें",
  "EMI notes": "ईएमआई नोट्स",
  "Note": "नोट",
  "Price": "कीमत",
  "Service name e.g. Installation": "सर्विस नाम, जैसे इंस्टॉलेशन",
  "Area / territory name e.g. North Delhi": "एरिया / टेरिटरी नाम, जैसे नॉर्थ दिल्ली",
  "Technician name": "टेक्नीशियन नाम",
  "Telecaller name": "टेलीकॉलर नाम",
  "Sales person name": "सेल्स पर्सन नाम",
};

function translateTextValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return value;
  if (HINDI_TEXT[trimmed]) return String(value).replace(trimmed, HINDI_TEXT[trimmed]);
  return value;
}

function translateElementAttributes(root) {
  const elements = root.querySelectorAll?.("input, textarea, button, a, option, [title], [aria-label]") || [];
  elements.forEach((el) => {
    if (el.placeholder && HINDI_PLACEHOLDERS[el.placeholder]) el.placeholder = HINDI_PLACEHOLDERS[el.placeholder];
    if (el.title && HINDI_TEXT[el.title]) el.title = HINDI_TEXT[el.title];
    const aria = el.getAttribute("aria-label");
    if (aria && HINDI_TEXT[aria]) el.setAttribute("aria-label", HINDI_TEXT[aria]);
  });
}

function translateTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("input, textarea")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const nextValue = translateTextValue(node.nodeValue);
    if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
  });
}

function translateDom() {
  if (!document.body) return;
  translateTextNodes(document.body);
  translateElementAttributes(document.body);
}

export function useHindiDomTranslations(language) {
  useEffect(() => {
    if (language !== "hi") return undefined;

    translateDom();
    const observer = new MutationObserver(() => translateDom());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);
}
