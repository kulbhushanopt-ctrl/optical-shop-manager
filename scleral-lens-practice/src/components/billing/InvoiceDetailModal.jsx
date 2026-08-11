import React, { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Modal, StatusPill, PrimaryBtn, SecondaryBtn, TextInput } from "../shared/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { INVOICE_STATUSES, invoiceStatusLabel } from "../../lib/constants";

const statusTone = (id) => INVOICE_STATUSES.find((s) => s.id === id)?.tone || "default";

export default function InvoiceDetailModal({ invoice, patientName, onClose, onEdit, onDelete, onRecordPayment }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const balanceDue = invoice.total - invoice.amount_paid;

  return (
    <Modal title="Invoice" onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-display text-sm font-semibold text-ink">{patientName}</p>
          <p className="text-xs text-slate">{formatDate(invoice.date)}</p>
        </div>
        <StatusPill label={invoiceStatusLabel(invoice.status)} tone={statusTone(invoice.status)} />
      </div>

      <div className="rounded-xl border border-border overflow-hidden mb-3">
        {(invoice.items || []).map((it, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm border-b border-border last:border-b-0">
            <span className="text-ink">{it.description || "—"}</span>
            <span className="text-ink font-mono">{formatCurrency(it.amount)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 mb-4 px-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate">Total</span>
          <span className="font-semibold text-ink">{formatCurrency(invoice.total)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate">Paid</span>
          <span className="text-good font-medium">{formatCurrency(invoice.amount_paid)}</span>
        </div>
        {balanceDue > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate">Balance due</span>
            <span className="text-warn font-semibold">{formatCurrency(balanceDue)}</span>
          </div>
        )}
      </div>

      {invoice.notes && <p className="text-xs text-slate mb-4">{invoice.notes}</p>}

      {balanceDue > 0 && (
        paying ? (
          <div className="flex items-center gap-2 mb-3">
            <TextInput
              type="number"
              inputMode="decimal"
              autoFocus
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={String(balanceDue)}
            />
            <button
              onClick={() => {
                const amt = Number(payAmount) || balanceDue;
                onRecordPayment(Math.min(amt, balanceDue));
                setPaying(false);
                setPayAmount("");
              }}
              className="px-3 py-2.5 rounded-xl bg-good text-white text-sm font-semibold flex-shrink-0"
            >
              Confirm
            </button>
          </div>
        ) : (
          <button onClick={() => setPaying(true)} className="w-full py-2.5 rounded-xl bg-goodSoft text-good text-sm font-semibold mb-3">
            Record payment
          </button>
        )
      )}

      {confirmDelete ? (
        <div className="rounded-xl p-3 flex items-center justify-between bg-warnSoft border border-warn/30">
          <span className="text-xs font-medium text-warn">Delete this invoice?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 text-slate">Cancel</button>
            <button onClick={onDelete} className="text-xs px-3 py-1 rounded-lg text-white font-medium bg-warn">Delete</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <SecondaryBtn full onClick={onEdit}>
            <span className="flex items-center justify-center gap-1"><Pencil size={12} /> Edit</span>
          </SecondaryBtn>
          <button onClick={() => setConfirmDelete(true)} className="px-4 py-2.5 rounded-xl bg-warnSoft text-warn flex-shrink-0">
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </Modal>
  );
}
