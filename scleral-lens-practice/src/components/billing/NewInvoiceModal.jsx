import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, Field, TextInput, Select, TextArea, PrimaryBtn, SecondaryBtn } from "../shared/ui";
import { uid } from "../../lib/constants";
import { todayISO, formatCurrency } from "../../lib/format";

const COMMON_ITEMS = ["Fitting fee", "Trial lens fee", "Follow-up visit", "Final lens (per eye)", "Solution/care kit"];

export default function NewInvoiceModal({ onClose, onSave, patients, initial }) {
  const [patientId, setPatientId] = useState(initial?.patient_id || "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [{ id: uid(), description: "", amount: "" }]);
  const [amountPaid, setAmountPaid] = useState(initial?.amount_paid ? String(initial.amount_paid) : "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const setItem = (id, patch) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, { id: uid(), description: "", amount: "" }]);
  const removeItem = (id) => setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));

  const save = () => {
    const paid = Number(amountPaid) || 0;
    const status = paid <= 0 ? "due" : paid >= total ? "paid" : "partial";
    onSave({
      patient_id: patientId,
      date,
      items: items.filter((it) => it.description.trim() || Number(it.amount) > 0),
      total,
      amount_paid: paid,
      status,
      notes,
    });
  };

  return (
    <Modal title={initial ? "Edit invoice" : "New invoice"} onClose={onClose} wide>
      <Field label="Patient">
        <Select value={patientId} onChange={(e) => setPatientId(e.target.value)} disabled={!!initial}>
          <option value="">— Select patient —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Date">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <span className="block text-xs font-medium text-slate mb-1.5">Line items</span>
      <div className="flex flex-col gap-2 mb-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-1.5">
            <input
              list="common-items"
              value={it.description}
              onChange={(e) => setItem(it.id, { description: e.target.value })}
              placeholder="Description"
              className="flex-1 rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
            <input
              type="number"
              inputMode="decimal"
              value={it.amount}
              onChange={(e) => setItem(it.id, { amount: e.target.value })}
              placeholder="0"
              className="w-20 rounded-xl border border-border bg-paper px-2 py-2 text-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/15"
            />
            <button type="button" onClick={() => removeItem(it.id)} className="w-7 h-7 rounded-full bg-warnSoft text-warn flex items-center justify-center flex-shrink-0">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <datalist id="common-items">
          {COMMON_ITEMS.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
      </div>
      <button type="button" onClick={addItem} className="text-xs font-medium text-focus flex items-center gap-1 mb-4">
        <Plus size={13} /> Add line item
      </button>

      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-semibold text-ink">Total</span>
        <span className="font-display text-base font-bold text-ink">{formatCurrency(total)}</span>
      </div>

      <Field label="Amount paid">
        <TextInput type="number" inputMode="decimal" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment method, reference…" />
      </Field>

      <div className="flex gap-2">
        <SecondaryBtn full onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn full onClick={save} disabled={!patientId || total <= 0}>Save invoice</PrimaryBtn>
      </div>
    </Modal>
  );
}
