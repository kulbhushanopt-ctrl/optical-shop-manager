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

/* ---------- Branches & membership ---------- */
export async function fetchMyMemberships() {
  const { data, error } = await supabase
    .from("branch_members")
    .select("role,branch_id,branches(id,name,address,phone,gstin)");
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
      prescriptions: patient.prescriptions || [],
    })
    .select()
    .single();
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
  };
}

export function inventoryFromDb(row) {
  return {
    id: row.id,
    type: row.type,
    brand: row.brand,
    model: row.model,
    sku: row.sku,
    price: row.price,
    stock: row.stock,
    low: row.low,
    power: row.power,
    addPower: row.add_power,
    lensIndex: row.lens_index,
    coatings: row.coatings || [],
    baseCurve: row.base_curve,
    diameter: row.diameter,
    duration: row.duration,
    contactType: row.contact_type,
    hsnCode: row.hsn_code,
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

// Staff can sell inventory (via invoices) but can't edit it directly — RLS
// restricts inventory writes to branch owners. This calls a SECURITY DEFINER
// RPC that only decrements stock, so a sale doesn't require owner access.
export async function decrementInventoryStock(id, qty) {
  const { data, error } = await supabase.rpc("decrement_inventory_stock", { p_item_id: id, p_qty: qty });
  if (error) throw error;
  return inventoryFromDb(data);
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
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

export async function createInvoice(branchId, invoice) {
  const { data, error } = await supabase
    .from("invoices")
    .insert({ branch_id: branchId, ...invoiceToDb(invoice) })
    .select()
    .single();
  if (error) throw error;
  return invoiceFromDb(data);
}

export async function updateInvoicePayment(id, patch) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ amount_paid: patch.amountPaid, status: patch.status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return invoiceFromDb(data);
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- AI voice-command inventory entry ---------- */
// Parses a spoken "add N frames, price X" style sentence into item fields
// via the parse-inventory-command Edge Function. Returns
// { error: "not_configured", message } until a GEMINI_API_KEY secret is set
// on the Supabase project -- that's a normal, expected response.
export async function parseInventoryCommand(text) {
  const { data, error } = await supabase.functions.invoke("parse-inventory-command", {
    body: { text },
  });
  if (error) throw error;
  return data;
}
