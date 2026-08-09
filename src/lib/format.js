export function currency(n) {
  const v = Number(n) || 0;
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dob) ? `${dob}T00:00:00` : dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

export function formatDate(iso) {
  if (!iso) return "";
  // Treat a plain YYYY-MM-DD as local midnight so it doesn't shift a day
  // backward in timezones behind UTC.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(isDateOnly ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function invoiceStatus(amountPaid, total) {
  const paid = Number(amountPaid) || 0;
  const t = Number(total) || 0;
  if (paid <= 0) return "due";
  if (paid >= t) return "paid";
  return "partial";
}

export function statusTone(status) {
  if (status === "paid") return { text: "text-good", bg: "bg-goodSoft" };
  if (status === "partial") return { text: "text-focus", bg: "bg-focusSoft" };
  return { text: "text-warn", bg: "bg-warnSoft" };
}

export const ORDER_STATUSES = ["processing", "ready", "delivered"];

export function orderStatusLabel(status) {
  if (status === "processing") return "Processing";
  if (status === "ready") return "Ready for pickup";
  return "Delivered";
}

export function orderStatusTone(status) {
  if (status === "ready") return { text: "text-lens", bg: "bg-lensSoft" };
  if (status === "processing") return { text: "text-focus", bg: "bg-focusSoft" };
  return { text: "text-white", bg: "bg-ink" };
}
