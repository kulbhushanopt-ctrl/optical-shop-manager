// Status-aware WhatsApp message templates sent to a customer about their
// order, keeping tone warm and short enough to read on a phone at a glance.
export function orderStatusMessage({ shopName, patientName, orderStatus, reviewLink }) {
  const shop = shopName || "our shop";
  const name = patientName && patientName !== "Walk-in" ? patientName : "there";

  if (orderStatus === "processing") {
    return `Hi ${name}, thank you for your order at ${shop}! Your order is currently being processed — we'll let you know the moment it's ready for pickup.`;
  }
  if (orderStatus === "ready") {
    return `Hi ${name}, good news! Your order at ${shop} is ready. Please visit us at your convenience to collect it.`;
  }
  // delivered
  let msg = `Hi ${name}, thank you for shopping with ${shop}! We hope you're loving your new eyewear.`;
  if (reviewLink) {
    msg += ` If you have a moment, we'd really appreciate a quick Google review: ${reviewLink}`;
  }
  return msg;
}

// Reminder sent to a patient about an upcoming appointment -- includes the
// reason only if one was given, so a plain checkup doesn't read oddly.
export function appointmentReminderMessage({ shopName, patientName, dateLabel, timeLabel, reason }) {
  const shop = shopName || "our shop";
  const name = patientName || "there";
  const reasonPart = reason ? ` for ${reason}` : "";
  return `Hi ${name}, this is a reminder of your appointment${reasonPart} at ${shop} on ${dateLabel} at ${timeLabel}. See you then!`;
}

// Nudge sent to a patient about whatever their follow-up flag note says
// (e.g. "Need specs") -- lowercased mid-sentence since it reads more like a
// dropped-in phrase than a standalone sentence.
export function followUpFlagMessage({ shopName, patientName, note }) {
  const shop = shopName || "our shop";
  const name = patientName || "there";
  return `Hi ${name}, this is ${shop} — just a reminder about "${note}". Do drop by whenever it's convenient!`;
}
