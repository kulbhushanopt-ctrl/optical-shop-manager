// Builds the standard UPI deep link that every UPI app (Google Pay, PhonePe,
// Paytm, etc.) recognizes to prefill a payment -- payee VPA, name, amount,
// and a short note. Encoding this into a QR code lets a customer scan and
// pay straight into the shop's bank account, no payment gateway involved.
export function buildUpiLink({ upiId, payeeName, amount, note }) {
  const params = new URLSearchParams({ pa: upiId, pn: payeeName || "", cu: "INR" });
  if (amount != null && amount > 0) params.set("am", Number(amount).toFixed(2));
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}
