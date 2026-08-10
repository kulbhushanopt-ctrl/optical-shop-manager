import React, { useState } from "react";
import { Plus, TrendingUp, Receipt, Search } from "lucide-react";
import { createSale, deleteSale, recordPaymentRpc, updateInvoiceOrderStatus } from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState, Avatar } from "../shared/ui";
import { currency, formatDate, statusTone, orderStatusLabel, orderStatusTone } from "../../lib/format";
import NewInvoiceModal from "./NewInvoiceModal";
import InvoiceDetailModal from "./InvoiceDetailModal";
import SalesReportModal from "./SalesReportModal";

const ORDER_FILTERS = [
  { id: "all", label: "All" },
  { id: "processing", label: "Processing" },
  { id: "ready", label: "Ready for pickup" },
  { id: "delivered", label: "Delivered" },
];

export default function BillingTab({ patients, setPatients, inventory, setInventory, invoices, setInvoices, payments, setPayments, branchId, isOwner, shopInfo }) {
  const [showNew, setShowNew] = useState(false);
  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const openInvoice = invoices.find((i) => i.id === openInvoiceId) || null;

  const createInvoice = async (invoice) => {
    try {
      // Invoice creation, stock decrement, and the opening payment entry all
      // happen inside one Postgres transaction via create_sale — either the
      // whole sale is recorded or none of it is.
      const method = invoice.paymentMethod || "cash";
      const saved = await createSale(branchId, invoice, method);
      setInvoices([saved, ...invoices]);

      if (saved.amountPaid > 0) {
        setPayments([{ id: `local-${saved.id}`, invoiceId: saved.id, amount: saved.amountPaid, method, paidAt: new Date().toISOString() }, ...payments]);
      }

      // Mirror the RPC's stock decrement locally so the list reflects it
      // immediately without a second round trip.
      const stockUpdates = invoice.items.filter((l) => l.itemId);
      if (stockUpdates.length) {
        setInventory(
          inventory.map((item) => {
            const line = stockUpdates.find((l) => l.itemId === item.id);
            return line ? { ...item, stock: Math.max(0, item.stock - line.qty) } : item;
          })
        );
      }
      setShowNew(false);
    } catch (e) {
      setError("Couldn't save invoice — please try again.");
    }
  };

  const removeInvoice = async (invoice) => {
    try {
      // Deletion and the stock restore both happen inside delete_sale.
      await deleteSale(invoice.id);
      const stockUpdates = invoice.items.filter((l) => l.itemId);
      if (stockUpdates.length) {
        setInventory(
          inventory.map((item) => {
            const line = stockUpdates.find((l) => l.itemId === item.id);
            return line ? { ...item, stock: item.stock + line.qty } : item;
          })
        );
      }
      setInvoices(invoices.filter((i) => i.id !== invoice.id));
      setPayments(payments.filter((p) => p.invoiceId !== invoice.id));
      setOpenInvoiceId(null);
    } catch (e) {
      setError("Couldn't delete invoice — please try again.");
    }
  };

  const recordPayment = async (inv, additionalAmount, method) => {
    try {
      // The invoice's amount_paid/status and the payment log entry are
      // updated together inside record_payment.
      const updated = await recordPaymentRpc(inv.id, additionalAmount, method || "cash");
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
      setPayments([{ id: `local-${inv.id}-${Date.now()}`, invoiceId: inv.id, amount: additionalAmount, method: method || "cash", paidAt: new Date().toISOString() }, ...payments]);
    } catch (e) {
      setError("Couldn't update invoice — please try again.");
    }
  };

  const advanceOrderStatus = async (inv, newStatus) => {
    try {
      const updated = await updateInvoiceOrderStatus(inv.id, newStatus);
      setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setError("Couldn't update order status — please try again.");
    }
  };

  const sorted = [...invoices]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((i) => orderFilter === "all" || i.orderStatus === orderFilter)
    .filter((i) => (i.patientName || "").toLowerCase().includes(query.toLowerCase()));

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
      <div className="px-5 mb-3">
        <div className="rounded-xl px-3 py-2 flex items-center gap-2 bg-card border border-border">
          <Search size={15} className="text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name…"
            className="flex-1 outline-none text-sm bg-transparent text-ink"
          />
        </div>
      </div>
      <div className="px-5 flex gap-2 mb-3 overflow-x-auto">
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setOrderFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 border ${
              orderFilter === f.id ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" subtitle="Create your first sale to track revenue and update stock automatically." />
        ) : (
          <EmptyState icon={Search} title="No matching invoices" subtitle="Try a different name or filter." />
        )
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {sorted.map((inv) => {
            const tone = statusTone(inv.status);
            const oTone = orderStatusTone(inv.orderStatus);
            return (
              <button
                key={inv.id}
                onClick={() => setOpenInvoiceId(inv.id)}
                className="rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition duration-150 bg-card border border-border/70 shadow-sm shadow-ink/[0.03]"
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
                  <div className="flex gap-1 justify-end mt-0.5 flex-wrap">
                    {inv.orderStatus !== "delivered" && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${oTone.text} ${oTone.bg}`}>
                        {orderStatusLabel(inv.orderStatus)}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${tone.text} ${tone.bg}`}>{inv.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewInvoiceModal patients={patients} setPatients={setPatients} inventory={inventory} branchId={branchId} shopInfo={shopInfo} onClose={() => setShowNew(false)} onSave={createInvoice} />
      )}
      {openInvoice && (
        <InvoiceDetailModal
          invoice={openInvoice}
          payments={payments.filter((p) => p.invoiceId === openInvoice.id)}
          onClose={() => setOpenInvoiceId(null)}
          onRecordPayment={(amt, method) => recordPayment(openInvoice, amt, method)}
          onChangeOrderStatus={(status) => advanceOrderStatus(openInvoice, status)}
          onDelete={isOwner ? () => removeInvoice(openInvoice) : undefined}
          shopInfo={shopInfo}
          patients={patients}
        />
      )}
      {showReport && <SalesReportModal invoices={invoices} payments={payments} shopInfo={shopInfo} onClose={() => setShowReport(false)} />}
    </div>
  );
}
