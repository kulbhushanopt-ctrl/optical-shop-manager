import React, { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { SectionHeader, EmptyState, StatusPill } from "../shared/ui";
import { createInvoice, updateInvoice, deleteInvoice } from "../../lib/api";
import { INVOICE_STATUSES, invoiceStatusLabel } from "../../lib/constants";
import { formatCurrency, formatDate } from "../../lib/format";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoiceDetailModal from "./InvoiceDetailModal";

const statusTone = (id) => INVOICE_STATUSES.find((s) => s.id === id)?.tone || "default";

export default function BillingTab({ invoices, setInvoices, patients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selected, setSelected] = useState(null);

  const patientName = (id) => patients.find((p) => p.id === id)?.name || "Unknown patient";

  const totals = useMemo(() => {
    const collected = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);
    const due = invoices.reduce((sum, inv) => sum + (Number(inv.total || 0) - Number(inv.amount_paid || 0)), 0);
    return { collected, due };
  }, [invoices]);

  const handleAdd = async (invoice) => {
    const created = await createInvoice({ ...invoice, patient_name: patientName(invoice.patient_id) });
    setInvoices((prev) => [created, ...prev]);
    setShowAdd(false);
  };

  const handleEdit = async (invoice) => {
    const { patient_id, ...patch } = invoice;
    const updated = await updateInvoice(editingInvoice.id, patch);
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
    setEditingInvoice(null);
    setSelected((s) => (s?.id === updated.id ? updated : s));
  };

  const handleRecordPayment = async (invoice, amount) => {
    const paid = Number(invoice.amount_paid || 0) + amount;
    const status = paid >= invoice.total ? "paid" : paid > 0 ? "partial" : "due";
    const updated = await updateInvoice(invoice.id, { amount_paid: paid, status });
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
    setSelected(updated);
  };

  const handleDelete = async (id) => {
    await deleteInvoice(id);
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    setSelected(null);
  };

  return (
    <div>
      <SectionHeader
        title="Billing"
        subtitle={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            disabled={patients.length === 0}
            className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center active:scale-90 transition disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        }
      />

      {invoices.length > 0 && (
        <div className="px-5 grid grid-cols-2 gap-2 mb-3">
          <div className="bg-goodSoft rounded-2xl p-3">
            <p className="text-[11px] text-good/80 font-medium">Collected</p>
            <p className="font-display text-base font-bold text-good">{formatCurrency(totals.collected)}</p>
          </div>
          <div className="bg-warnSoft rounded-2xl p-3">
            <p className="text-[11px] text-warn/80 font-medium">Outstanding</p>
            <p className="font-display text-base font-bold text-warn">{formatCurrency(totals.due)}</p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          subtitle={patients.length === 0 ? "Add a patient first, then bill them for fitting fees and visits." : "Bill a patient for a fitting or follow-up visit."}
        />
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setSelected(inv)}
              className="w-full bg-card border border-border rounded-2xl p-3 text-left active:scale-[0.98] transition"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-display text-sm font-semibold text-ink">{inv.patient_name || patientName(inv.patient_id)}</p>
                <StatusPill label={invoiceStatusLabel(inv.status)} tone={statusTone(inv.status)} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate">{formatDate(inv.date)}</p>
                <p className="text-sm font-semibold text-ink">{formatCurrency(inv.total)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && <NewInvoiceModal patients={patients} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editingInvoice && (
        <NewInvoiceModal patients={patients} initial={editingInvoice} onClose={() => setEditingInvoice(null)} onSave={handleEdit} />
      )}
      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          patientName={selected.patient_name || patientName(selected.patient_id)}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditingInvoice(selected);
            setSelected(null);
          }}
          onDelete={() => handleDelete(selected.id)}
          onRecordPayment={(amount) => handleRecordPayment(selected, amount)}
        />
      )}
    </div>
  );
}
