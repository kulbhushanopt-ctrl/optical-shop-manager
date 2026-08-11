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

export const PAYMENT_METHODS = ["cash", "upi", "card", "other"];

export function paymentMethodLabel(method) {
  if (method === "upi") return "UPI";
  if (method === "card") return "Card";
  if (method === "other") return "Other";
  return "Cash";
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

export function appointmentStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Scheduled";
}

export function appointmentStatusTone(status) {
  if (status === "completed") return { text: "text-good", bg: "bg-goodSoft" };
  if (status === "cancelled") return { text: "text-warn", bg: "bg-warnSoft" };
  return { text: "text-lens", bg: "bg-lensSoft" };
}

export function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

// Groups a sorted list of appointments into "Today", "Tomorrow", or a plain
// date label, for the day-by-day list view.
export function appointmentDayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
