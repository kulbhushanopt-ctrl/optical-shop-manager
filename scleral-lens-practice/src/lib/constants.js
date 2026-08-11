export const uid = () => Math.random().toString(36).slice(2, 10);

export const LENS_TYPES = ["Soft", "RGP", "Scleral", "Hybrid"];

export const FITTING_STATUSES = [
  { id: "trial", label: "Trial", tone: "focus" },
  { id: "follow_up", label: "Follow-up", tone: "lens" },
  { id: "dispensed", label: "Dispensed", tone: "good" },
  { id: "discontinued", label: "Discontinued", tone: "warn" },
];

export const fittingStatusLabel = (id) => FITTING_STATUSES.find((s) => s.id === id)?.label || id;

export const ORDER_STATUSES = [
  { id: "ordered", label: "Ordered", tone: "focus" },
  { id: "received", label: "Received", tone: "lens" },
  { id: "dispensed", label: "Dispensed", tone: "good" },
  { id: "cancelled", label: "Cancelled", tone: "warn" },
];

export const orderStatusLabel = (id) => ORDER_STATUSES.find((s) => s.id === id)?.label || id;

export const EYE_OPTIONS = ["OD", "OS", "Both"];

export const INVOICE_STATUSES = [
  { id: "due", label: "Due", tone: "warn" },
  { id: "partial", label: "Partial", tone: "focus" },
  { id: "paid", label: "Paid", tone: "good" },
];

export const invoiceStatusLabel = (id) => INVOICE_STATUSES.find((s) => s.id === id)?.label || id;

// The fitting fields an AI photo scan can fill in -- kept in sync with what
// the scan-fitting-rx edge function returns.
export const FITTING_SCAN_FIELDS = [
  "odPower", "odCyl", "odAxis", "odBaseCurve", "odDiameter", "odAdd",
  "osPower", "osCyl", "osAxis", "osBaseCurve", "osDiameter", "osAdd",
  "brand",
];
