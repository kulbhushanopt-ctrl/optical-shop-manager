import { supabase } from "./supabaseClient";

/* ---------- Auth ---------- */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/* ---------- Shop access requests (soft-stop signup) ---------- */
// A fresh sign-up with no branch and no staff invite lands here instead of
// being blocked outright: they submit a request, the owner approves or
// rejects it directly in the Supabase table editor (no in-app admin UI).
export async function fetchMyShopRequest() {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email;
  if (!email) return null;
  const { data, error } = await supabase
    .from("shop_requests")
    .select("id,status,shop_name,requested_at")
    .eq("email", email)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createShopRequest({ shopName, phone }) {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email;
  const { data, error } = await supabase
    .from("shop_requests")
    .insert({ email, shop_name: shopName, phone: phone || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------- Staff invites (accepting one) ---------- */
// Direct SELECT on branch_invites is owner-only, so a freshly-signed-in
// staff member can't see their own pending invite -- these two RPCs check
// for and consume it instead.
export async function fetchMyInvite() {
  const { data, error } = await supabase.rpc("my_pending_invite");
  if (error) throw error;
  return data?.[0] || null;
}

export async function acceptBranchInvite() {
  const { data, error } = await supabase.rpc("accept_branch_invite");
  if (error) throw error;
  return data;
}

/* ---------- Branches & membership ---------- */
export async function fetchMyMemberships() {
  const { data, error } = await supabase
    .from("branch_members")
    .select("role,branch_id,branches(id,name,address,phone,gstin,google_review_link,upi_id,logo)");
  if (error) throw error;
  return data;
}

export async function createBranch({ name, address, phone, gstin }) {
  const { data, error } = await supabase
    .from("branches")
    .insert({ name, address: address || null, phone: phone || null, gstin: gstin || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBranch(id, patch) {
  const { data, error } = await supabase.from("branches").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function fetchBranchStaff(branchId) {
  const { data, error } = await supabase
    .from("branch_members")
    .select("user_id,role,email,created_at")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function removeBranchMember(branchId, userId) {
  const { error } = await supabase
    .from("branch_members")
    .delete()
    .eq("branch_id", branchId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function fetchPendingInvites(branchId) {
  const { data, error } = await supabase
    .from("branch_invites")
    .select("id,email,role,created_at")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function inviteStaff(branchId, email) {
  const { data, error } = await supabase
    .from("branch_invites")
    .insert({ branch_id: branchId, email: email.trim().toLowerCase(), role: "staff" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelInvite(id) {
  const { error } = await supabase.from("branch_invites").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Patients ---------- */
export async function fetchPatients(branchId) {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPatient(branchId, patient) {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      branch_id: branchId,
      name: patient.name,
      phone: patient.phone || null,
      address: patient.address || null,
      notes: patient.notes || null,
      photo: patient.photo || null,
      dob: patient.dob || null,
      prescriptions: patient.prescriptions || [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Bulk insert for spreadsheet import -- one round trip instead of one per row.
export async function createPatients(branchId, patients) {
  const rows = patients.map((p) => ({
    branch_id: branchId,
    name: p.name,
    phone: p.phone || null,
    address: p.address || null,
    notes: p.notes || null,
    dob: p.dob || null,
    prescriptions: p.prescriptions || [],
  }));
  const { data, error } = await supabase.from("patients").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updatePatient(id, patch) {
  const { data, error } = await supabase
    .from("patients")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePatient(id) {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Inventory ---------- */
function inventoryToDb(item) {
  return {
    type: item.type,
    brand: item.brand || null,
    model: item.model || null,
    sku: item.sku || null,
    price: Number(item.price) || 0,
    purchase_price: item.purchasePrice !== "" && item.purchasePrice != null ? Number(item.purchasePrice) : null,
    stock: Number(item.stock) || 0,
    low: Number(item.low) || 3,
    power: item.power || null,
    add_power: item.addPower || null,
    lens_index: item.lensIndex || null,
    coatings: item.coatings || [],
    base_curve: item.baseCurve || null,
    diameter: item.diameter || null,
    duration: item.duration || null,
    contact_type: item.contactType || null,
    hsn_code: item.hsnCode || null,
    category: item.category || null,
  };
}

export function inventoryFromDb(row) {
  return {
    id: row.id,
    type: row.type,
    // Optional text fields come back as null from a blank column (e.g. a
    // bulk-generated item with brand/model left for the shopkeeper to fill
    // in later) -- normalized to "" so every consumer (forms, .trim() calls)
    // can keep assuming a string instead of null-checking everywhere.
    brand: row.brand || "",
    model: row.model || "",
    sku: row.sku || "",
    price: row.price,
    purchasePrice: row.purchase_price,
    stock: row.stock,
    low: row.low,
    power: row.power || "",
    addPower: row.add_power || "",
    lensIndex: row.lens_index || "",
    coatings: row.coatings || [],
    baseCurve: row.base_curve || "",
    diameter: row.diameter || "",
    duration: row.duration || "",
    contactType: row.contact_type || "",
    hsnCode: row.hsn_code || "",
    category: row.category || "",
  };
}

export async function fetchInventory(branchId) {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(inventoryFromDb);
}

export async function createInventoryItem(branchId, item) {
  const { data, error } = await supabase
    .from("inventory")
    .insert({ branch_id: branchId, ...inventoryToDb(item) })
    .select()
    .single();
  if (error) throw error;
  return inventoryFromDb(data);
}

// Bulk insert for spreadsheet import -- one round trip instead of one per row.
export async function createInventoryItems(branchId, items) {
  const rows = items.map((item) => ({ branch_id: branchId, ...inventoryToDb(item) }));
  const { data, error } = await supabase.from("inventory").insert(rows).select();
  if (error) throw error;
  return data.map(inventoryFromDb);
}

export async function updateInventoryItem(id, item) {
  const { data, error } = await supabase
    .from("inventory")
    .update(inventoryToDb(item))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return inventoryFromDb(data);
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Label reservations ---------- */
// Remembers the category/price printed on a "blank label" (generated before
// the item exists in inventory) so that scanning the label later at Add Item
// time can fill in more than just the SKU. One row per SKU per branch --
// generating a fresh batch upserts over any older reservation for the same
// SKU rather than erroring.
export async function createLabelReservations(branchId, labels) {
  const rows = labels.map((l) => ({ branch_id: branchId, sku: l.sku, category: l.category || null, price: l.price ?? null }));
  const { error } = await supabase.from("label_reservations").upsert(rows, { onConflict: "branch_id,sku" });
  if (error) throw error;
}

export async function fetchLabelReservation(branchId, sku) {
  const { data, error } = await supabase
    .from("label_reservations")
    .select("*")
    .eq("branch_id", branchId)
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteLabelReservation(branchId, sku) {
  const { error } = await supabase.from("label_reservations").delete().eq("branch_id", branchId).eq("sku", sku);
  if (error) throw error;
}

/* ---------- Invoices ---------- */
function invoiceToDb(inv) {
  return {
    patient_id: inv.patientId || null,
    patient_name: inv.patientName,
    date: inv.date,
    items: inv.items,
    subtotal: inv.subtotal,
    gst_rate: inv.gstRate,
    cgst: inv.cgst,
    sgst: inv.sgst,
    total: inv.total,
    status: inv.status,
    amount_paid: inv.amountPaid ?? 0,
    prescription: inv.prescription || null,
    order_status: inv.orderStatus || "delivered",
  };
}

export function invoiceFromDb(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    date: row.date,
    items: row.items || [],
    subtotal: row.subtotal,
    gstRate: row.gst_rate,
    cgst: row.cgst,
    sgst: row.sgst,
    total: row.total,
    status: row.status,
    amountPaid: row.amount_paid ?? 0,
    prescription: row.prescription || null,
    orderStatus: row.order_status || "delivered",
  };
}

export async function fetchInvoices(branchId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("branch_id", branchId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map(invoiceFromDb);
}

// Creates the invoice, decrements stock for every line item, and logs the
// opening payment (if any) all inside one Postgres transaction via the
// create_sale RPC — so a sale can never be recorded with stock left
// un-decremented, even if a step partway through would otherwise fail.
export async function createSale(branchId, invoice, paymentMethod) {
  const { data, error } = await supabase.rpc("create_sale", {
    p_branch_id: branchId,
    p_invoice: invoiceToDb(invoice),
    p_payment_method: paymentMethod || "cash",
  });
  if (error) throw error;
  return invoiceFromDb(data);
}

// Deletes the invoice and restores stock for every line item atomically via
// the delete_sale RPC (owner-only, enforced inside the function).
export async function deleteSale(invoiceId) {
  const { error } = await supabase.rpc("delete_sale", { p_invoice_id: invoiceId });
  if (error) throw error;
}

// Applies an additional payment to an existing invoice and logs the payment
// entry atomically via the record_payment RPC.
export async function recordPaymentRpc(invoiceId, amount, method) {
  const { data, error } = await supabase.rpc("record_payment", {
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_method: method || "cash",
  });
  if (error) throw error;
  return invoiceFromDb(data);
}

export async function updateInvoiceOrderStatus(id, orderStatus) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ order_status: orderStatus })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return invoiceFromDb(data);
}

/* ---------- Invoice payments (which mode each payment was made in) ---------- */
function paymentFromDb(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: row.amount,
    method: row.method,
    paidAt: row.paid_at,
  };
}

export async function fetchInvoicePayments(branchId) {
  const { data, error } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq("branch_id", branchId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return data.map(paymentFromDb);
}

/* ---------- Appointments ---------- */
function appointmentFromDb(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientPhone: row.patient_phone,
    scheduledAt: row.scheduled_at,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function fetchAppointments(branchId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("branch_id", branchId)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data.map(appointmentFromDb);
}

export async function createAppointment(branchId, appt) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      branch_id: branchId,
      patient_id: appt.patientId || null,
      patient_name: appt.patientName,
      patient_phone: appt.patientPhone || null,
      scheduled_at: appt.scheduledAt,
      reason: appt.reason || null,
      notes: appt.notes || null,
    })
    .select()
    .single();
  if (error) throw error;
  return appointmentFromDb(data);
}

export async function updateAppointment(id, appt) {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      scheduled_at: appt.scheduledAt,
      reason: appt.reason || null,
      notes: appt.notes || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return appointmentFromDb(data);
}

export async function updateAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return appointmentFromDb(data);
}

export async function deleteAppointment(id) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

// Edge Functions report upstream/timeout failures with a non-2xx status
// (so the caller can tell them apart from a normal "not configured" reply),
// but supabase-js treats any non-2xx as an opaque thrown error and never
// exposes the JSON body it came with. Read that body ourselves so callers
// still get { error, message } instead of a generic thrown error.
async function invokeAiFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error.context && typeof error.context.json === "function") {
      try {
        const errorBody = await error.context.json();
        if (errorBody && (errorBody.error || errorBody.message)) return errorBody;
      } catch {
        // response body wasn't JSON -- fall through and throw the original error
      }
    }
    throw error;
  }
  return data;
}

/* ---------- AI stock-list scan (bulk inventory intake) ---------- */
// Reads brand/model/quantity/price off a photo of a handwritten or printed
// stock list via the scan-stock-list Edge Function. Returns
// { error: "not_configured", message } until a GEMINI_API_KEY secret is set
// on the Supabase project -- that's a normal, expected response.
export async function scanStockList(imageDataUrl, branchId, categories) {
  return invokeAiFunction("scan-stock-list", {
    image: imageDataUrl,
    branchId,
    categories: (categories || []).map((c) => ({ code: c.id, label: c.label })),
  });
}

/* ---------- AI voice-command inventory entry ---------- */
// Parses a spoken "add N frames, price X" style sentence into item fields
// via the parse-inventory-command Edge Function. Returns
// { error: "not_configured", message } until a GEMINI_API_KEY secret is set
// on the Supabase project -- that's a normal, expected response.
export async function parseInventoryCommand(text, branchId, categories) {
  return invokeAiFunction("parse-inventory-command", {
    text,
    branchId,
    categories: (categories || []).map((c) => ({ code: c.id, label: c.label })),
  });
}

/* ---------- AI prescription scan ---------- */
// Reads OD/OS sphere, cylinder, axis, add-power, and PD off a photo of a
// prescription slip via the scan-prescription Edge Function. Returns
// { error: "not_configured", message } until a GEMINI_API_KEY secret is set
// on the Supabase project -- that's a normal, expected response.
export async function scanPrescription(imageDataUrl, branchId) {
  return invokeAiFunction("scan-prescription", { image: imageDataUrl, branchId });
}

/* ---------- AI contact lens prescription scan ---------- */
// Reads OD/OS power, cylinder, axis, base curve, diameter, add-power, and
// brand off a photo of a contact lens prescription/fitting slip via the
// scan-contact-rx Edge Function. Returns { error: "not_configured", message }
// until a GEMINI_API_KEY secret is set on the Supabase project -- that's a
// normal, expected response.
export async function scanContactPrescription(imageDataUrl, branchId) {
  return invokeAiFunction("scan-contact-rx", { image: imageDataUrl, branchId });
}

/* ---------- AI patient intake scan ---------- */
// Reads name/age/phone/address plus a full prescription off a photo of a
// patient intake form via the scan-patient-intake Edge Function, so a new
// patient and their first Rx can be filled from one photo. Returns
// { error: "not_configured", message } until a GEMINI_API_KEY secret is set
// on the Supabase project -- that's a normal, expected response.
export async function scanPatientIntake(imageDataUrl, branchId) {
  return invokeAiFunction("scan-patient-intake", { image: imageDataUrl, branchId });
}

/* ---------- Per-branch Gemini API key (Shop settings) ---------- */
// Lets a branch owner set their own Gemini API key instead of sharing the
// one key configured project-wide -- so their AI usage (scans, voice/text
// commands) doesn't count against every other shop's daily quota. The key
// itself is write-only from here: these RPCs never return it, only accept
// or clear it, or report whether one is set.
export async function setBranchGeminiKey(branchId, key) {
  const { error } = await supabase.rpc("set_branch_gemini_key", { p_branch_id: branchId, p_key: key });
  if (error) throw error;
}

export async function clearBranchGeminiKey(branchId) {
  const { error } = await supabase.rpc("clear_branch_gemini_key", { p_branch_id: branchId });
  if (error) throw error;
}

export async function hasBranchGeminiKey(branchId) {
  const { data, error } = await supabase.rpc("has_branch_gemini_key", { p_branch_id: branchId });
  if (error) throw error;
  return !!data;
}

/* ---------- Branch categories (editable frame category list) ---------- */
// Each branch has its own list of category codes (e.g. "GM" / "Gents
// Metal") instead of one fixed list shared by every shop -- these double
// as SKU prefixes the same way the old hardcoded list did.
// `id` here is the short code ("GM") -- every existing category consumer
// (SKU prefixes, the category picker, AI matching) already expects that
// shape from the old hardcoded FRAME_CATEGORIES list, so this keeps all of
// that working unchanged regardless of where the list now comes from.
// `dbId` (the row's real UUID) is only needed by the categories management
// screen itself, to target a specific row for update/delete.
function branchCategoryFromDb(row) {
  return { dbId: row.id, id: row.code, label: row.label, sortOrder: row.sort_order };
}

export async function fetchBranchCategories(branchId) {
  const { data, error } = await supabase
    .from("branch_categories")
    .select("id,code,label,sort_order")
    .eq("branch_id", branchId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data.map(branchCategoryFromDb);
}

export async function createBranchCategory(branchId, { code, label, sortOrder }) {
  const { data, error } = await supabase
    .from("branch_categories")
    .insert({ branch_id: branchId, code: code.trim().toUpperCase(), label: label.trim(), sort_order: sortOrder ?? 0 })
    .select("id,code,label,sort_order")
    .single();
  if (error) throw error;
  return branchCategoryFromDb(data);
}

export async function updateBranchCategory(id, { code, label }) {
  const { data, error } = await supabase
    .from("branch_categories")
    .update({ code: code.trim().toUpperCase(), label: label.trim() })
    .eq("id", id)
    .select("id,code,label,sort_order")
    .single();
  if (error) throw error;
  return branchCategoryFromDb(data);
}

export async function deleteBranchCategory(id) {
  const { error } = await supabase.from("branch_categories").delete().eq("id", id);
  if (error) throw error;
}
