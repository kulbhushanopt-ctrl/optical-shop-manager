import { supabase } from "./supabaseClient";

// -- Auth --------------------------------------------------------------

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// -- Patients (each patient embeds its own fitting history, same idea as a
// prescription list -- one row per patient, no join needed to show a
// patient's fitting timeline) --------------------------------------------

export async function fetchPatients() {
  const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPatient(patient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("patients")
    .insert({ ...patient, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(id, patch) {
  const { data, error } = await supabase.from("patients").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePatient(id) {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

// -- Lens orders ---------------------------------------------------------

export async function fetchLensOrders() {
  const { data, error } = await supabase.from("lens_orders").select("*").order("order_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createLensOrder(order) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("lens_orders")
    .insert({ ...order, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLensOrder(id, patch) {
  const { data, error } = await supabase.from("lens_orders").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLensOrder(id) {
  const { error } = await supabase.from("lens_orders").delete().eq("id", id);
  if (error) throw error;
}

// -- Invoices --------------------------------------------------------------

export async function fetchInvoices() {
  const { data, error } = await supabase.from("invoices").select("*").order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createInvoice(invoice) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...invoice, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInvoice(id, patch) {
  const { data, error } = await supabase.from("invoices").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

// -- AI Rx scan (handwritten or printed fitting slip) -----------------------

export async function scanFittingRx(imageDataUrl) {
  const { data, error } = await supabase.functions.invoke("scan-fitting-rx", { body: { image: imageDataUrl } });
  if (error) throw error;
  return data;
}
