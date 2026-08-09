import React, { useState } from "react";
import { Plus, TrendingUp, Receipt } from "lucide-react";
import {
  createInvoice as apiCreateInvoice,
  updateInvoicePayment,
  decrementInventoryStock,
  updateInventoryItem,
  deleteInvoice as apiDeleteInvoice,
} from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState, Avatar } from "../shared/ui";
import { currency, formatDate, invoiceStatus, statusTone } from "../../lib/format";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoiceDetailModal from "./InvoiceDetailModal";
import SalesReportModal from "./SalesReportModal";

export default function BillingTab({ patients, setPatients, inventory, setInventory, invoices, setInvoices, branchId, isOwner, shopInfo }) {
  const [showNew, setShowNew] = useState(false);
  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState("");

  const openInvoice = invoices.find((i) => i.id === openInvoiceId) || null;

  const createInvoice = async (invoice) => {
    try {
      const saved = await apiCreateInvoice(branchId, invoice);
      setInvoices([saved, ...invoices]);

      // Sell items decrement stock via a narrow RPC — inventory writes are
      // owner-only under RLS, but staff still need to be able to sell items.
      const stockUpdates = invoice.items.filter((l) => l.itemId);
      const updatedInventory = [...inventory];
      for (const line of stockUpdates) {
        const idx = updatedInventory.findIndex((i) => i.id === line.itemId);
        if (idx === -1) continue;
        try {
          updatedInventory[idx] = await decrementInventoryStock(line.itemId, line.qty);
        } catch (e) {
          /* stock update failed — invoice still recorded */
        }
      }
      setInventory(updatedInventory);
      setShowNew(false);
    } catch (e) {
      setError("Couldn't save invoice — please try again.");
    }
  };

  const removeInvoice = async (invoice) => {
    try {
      // Undo the stock decrement applied when this invoice was created,
      // for any line items that came from inventory.
      const updatedInventory = [...inventory];
      for (const line of invoice.items.filter((l) => l.itemId)) {
        const idx = updatedInventory.findIndex((i) => i.id === line.itemId);
        if (idx === -1) continue;
        try {
          const item = updatedInventory[idx];
          updatedInventory[idx] = await updateInventoryItem(item.id, { ...item, stock: item.stock + line.qty });
        } catch (e) {
          /* stock restore failed — invoice deletion still proceeds */
        }
      }
      setInventory(updatedInventory);
      await apiDeleteInvoice(invoice.id);
      setInvoices(invoices.filter((i) => i.id !== invoice.id));
      setOpenInvoiceId(null);
    } catch (e) {
      setError("Couldn't delete invoice — please try again.");
    }
  };

  const recordPayment = async (inv, additionalAmount) => {
    try {
      const newAmountPaid = Math.max(0, Math.min(inv.total, (inv.amountPaid || 0) + additionalAmount));
      const updated = await updateInvoicePayment(inv.id, {
        amountPaid: newAmountPaid,
        status: invoiceStatus(newAmountPaid, inv.total),
      });
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError("Couldn't update invoice — please try again.");
    }
  };

  const sorted = [...invoices].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <SectionHeader
        title="Billing"
        subtitle={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
        action={
          <div className="flex gap-2">
            <RoundIconBtn onClick={() => setShowReport(true)}>
              <TrendingUp size={16} className="text-ink" />
            </RoundIconBtn>
            <RoundIconBtn onClick={() => setShowNew(true)} tone="focus">
              <Plus size={17} className="text-ink" />
            </RoundIconBtn>
          </div>
        }
      />
      {error && (
        <div className="px-5 mb-3">
          <p className="text-xs rounded-lg px-3 py-2 text-warn bg-warnSoft">{error}</p>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" subtitle="Create your first sale to track revenue and update stock automatically." />
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {sorted.map((inv) => {
            const tone = statusTone(inv.status);
            return (
              <button
                key={inv.id}
                onClick={() => setOpenInvoiceId(inv.id)}
                className="rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform bg-card border border-border"
              >
                <Avatar name={inv.patientName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-ink">{inv.patientName}</p>
                  <p className="text-xs truncate text-slate">
                    {formatDate(inv.date)} · {inv.items.length} item{inv.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink font-mono">{currency(inv.total)}</p>
                  <div className="flex gap-1 justify-end mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${tone.text} ${tone.bg}`}>{inv.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewInvoiceModal patients={patients} setPatients={setPatients} inventory={inventory} branchId={branchId} onClose={() => setShowNew(false)} onSave={createInvoice} />
      )}
      {openInvoice && (
        <InvoiceDetailModal
          invoice={openInvoice}
          onClose={() => setOpenInvoiceId(null)}
          onRecordPayment={(amt) => recordPayment(openInvoice, amt)}
          onDelete={isOwner ? () => removeInvoice(openInvoice) : undefined}
          shopInfo={shopInfo}
          patients={patients}
        />
      )}
      {showReport && <SalesReportModal invoices={invoices} shopInfo={shopInfo} onClose={() => setShowReport(false)} />}
    </div>
  );
}
