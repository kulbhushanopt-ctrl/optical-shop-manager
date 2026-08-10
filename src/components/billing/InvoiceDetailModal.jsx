import React, { Suspense, lazy, useMemo, useRef, useState } from "react";
import { Glasses, Check, Trash2, MessageCircle, QrCode } from "lucide-react";
import { Modal, Field, TextInput, PrimaryBtn, ConfirmModal } from "../shared/ui";
import ShareBar from "../shared/ShareBar";

// The qrcode library is only needed once someone actually opens the
// payment QR, so it's split into its own chunk instead of bloating every
// invoice-view page load.
const UpiQrModal = lazy(() => import("./UpiQrModal"));
import {
  currency,
  formatDate,
  statusTone,
  ORDER_STATUSES,
  orderStatusLabel,
  orderStatusTone,
  PAYMENT_METHODS,
  paymentMethodLabel,
} from "../../lib/format";
import { orderStatusMessage } from "../../lib/messages";
import { openWhatsapp } from "../../lib/share";

export default function InvoiceDetailModal({ invoice, payments, onClose, onRecordPayment, onChangeOrderStatus, onDelete, shopInfo, patients }) {
  const invoiceRef = useRef(null);
  const [payInput, setPayInput] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const patient = patients?.find((p) => p.id === invoice.patientId);
  const balanceLeft = Math.max(0, invoice.total - (invoice.amountPaid || 0));
  const grossTotal = invoice.items.reduce((s, l) => s + l.price * l.qty, 0);
  const totalDiscount = invoice.items.reduce((s, l) => s + (l.discount || 0), 0);
  const rx = invoice.prescription;
  const tone = statusTone(invoice.status);

  const gstGroups = useMemo(
    () =>
      Object.values(
        invoice.items.reduce((acc, l) => {
          const key = l.hsnCode || "—";
          const saleValue = l.price * l.qty - (l.discount || 0);
          if (!acc[key]) acc[key] = { hsnCode: key, saleValue: 0 };
          acc[key].saleValue += saleValue;
          return acc;
        }, {})
      ).map((g) => {
        const gstAmt = g.saleValue * ((invoice.gstRate || 0) / 100);
        return { ...g, cgst: gstAmt / 2, sgst: gstAmt / 2, totalGst: gstAmt };
      }),
    [invoice]
  );

  const receiptText =
    `${shopInfo?.name || "Optical Shop"} — Tax Invoice\n` +
    (shopInfo?.address ? `${shopInfo.address}\n` : "") +
    (shopInfo?.phone ? `Phone: ${shopInfo.phone}\n` : "") +
    (shopInfo?.gstin ? `GSTIN: ${shopInfo.gstin}\n` : "") +
    `\nCustomer: ${invoice.patientName}\n` +
    (patient?.phone ? `Phone: ${patient.phone}\n` : "") +
    (patient?.address ? `Address: ${patient.address}\n` : "") +
    `Date: ${formatDate(invoice.date)}\n` +
    (rx
      ? `\nPrescription (${formatDate(rx.date)})\nRight Eye (OD): SPH ${rx.odSphere || "—"} CYL ${rx.odCyl || "—"} AXIS ${rx.odAxis || "—"}${rx.odAdd ? ` ADD ${rx.odAdd}` : ""}\nLeft Eye (OS): SPH ${rx.osSphere || "—"} CYL ${rx.osCyl || "—"} AXIS ${rx.osAxis || "—"}${rx.osAdd ? ` ADD ${rx.osAdd}` : ""}\n`
      : "\n") +
    invoice.items
      .map((l) => `${l.name}${l.hsnCode ? ` (HSN ${l.hsnCode})` : ""} x${l.qty}  ${currency(l.price * l.qty)}${l.discount ? `  -${currency(l.discount)} disc` : ""}`)
      .join("\n") +
    `\n\nGross total: ${currency(grossTotal)}\n` +
    (totalDiscount > 0 ? `Total discount: -${currency(totalDiscount)}\n` : "") +
    `Subtotal: ${currency(invoice.subtotal ?? invoice.total)}\n` +
    (invoice.gstRate ? `CGST (${invoice.gstRate / 2}%): ${currency(invoice.cgst)}\nSGST (${invoice.gstRate / 2}%): ${currency(invoice.sgst)}\n` : "") +
    `Total: ${currency(invoice.total)}\n` +
    `Amount paid: ${currency(invoice.amountPaid || 0)}\n` +
    `Balance left: ${currency(balanceLeft)}\n` +
    `Status: ${invoice.status.toUpperCase()}`;

  return (
    <Modal title={`Invoice · ${invoice.patientName}`} onClose={onClose} wide>
      <ShareBar
        targetRef={invoiceRef}
        filenameBase={`invoice-${invoice.patientName.replace(/\s+/g, "-").toLowerCase()}-${invoice.date}`}
        shareTitle={`Invoice — ${invoice.patientName}`}
        shareText={receiptText}
      />

      {onChangeOrderStatus && (
        <div className="no-print mb-4">
          <Field label="Order status">
            <div className="flex gap-2">
              {ORDER_STATUSES.map((s) => {
                const active = invoice.orderStatus === s;
                const activeTone = orderStatusTone(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChangeOrderStatus(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                      active ? `${activeTone.bg} ${activeTone.text} border-transparent` : "bg-card text-slate border-border"
                    }`}
                  >
                    {orderStatusLabel(s)}
                  </button>
                );
              })}
            </div>
          </Field>
          <button
            type="button"
            onClick={() =>
              openWhatsapp(
                orderStatusMessage({
                  shopName: shopInfo?.name,
                  patientName: invoice.patientName,
                  orderStatus: invoice.orderStatus,
                  reviewLink: shopInfo?.google_review_link,
                }),
                patient?.phone
              )
            }
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-lensSoft text-lens flex items-center justify-center gap-1.5"
          >
            <MessageCircle size={13} /> Send WhatsApp update ({orderStatusLabel(invoice.orderStatus)})
          </button>
        </div>
      )}

      <div id="print-area" ref={invoiceRef} className="bg-card border-[1.5px] border-border rounded-2xl p-5">
        <div className="border-b-2 border-ink pb-3 mb-3.5 flex items-center gap-3">
          <div className="bg-focus rounded-full w-[34px] h-[34px] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {shopInfo?.logo ? (
              <img src={shopInfo.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Glasses size={16} className="text-ink" strokeWidth={2.4} />
            )}
          </div>
          <div>
            <p className="font-display text-sm font-bold text-ink leading-tight">{shopInfo?.name || "Optical Shop"}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate">Tax Invoice</p>
            {shopInfo?.address && <p className="text-[10px] mt-0.5 max-w-[200px] text-slate">{shopInfo.address}</p>}
            {shopInfo?.phone && <p className="text-[10px] text-slate">Ph: {shopInfo.phone}</p>}
            {shopInfo?.gstin && <p className="text-[10px] text-slate">GSTIN: {shopInfo.gstin}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate">Customer</p>
            <p className="font-display text-sm font-semibold text-ink">{invoice.patientName}</p>
            {patient?.phone && <p className="text-[11px] mt-0.5 text-slate">Ph: {patient.phone}</p>}
            {patient?.address && <p className="text-[11px] max-w-[160px] text-slate">{patient.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate">Date</p>
            <p className="text-sm font-semibold text-ink font-mono">{formatDate(invoice.date)}</p>
          </div>
        </div>

        {rx && (
          <div className="border-t-[1.5px] border-dashed border-border pt-3.5 mb-4">
            <p className="font-display text-sm font-bold mb-1 text-ink">Prescription</p>
            <p className="text-[10px] uppercase tracking-wide mb-2 text-slate">{formatDate(rx.date)}</p>
            <div className="rounded-lg overflow-hidden border border-lens/25 mb-2">
              <table className="w-full table-fixed text-[11px] font-mono border-collapse">
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "16.4%" }} />
                  <col style={{ width: "16.4%" }} />
                  <col style={{ width: "16.4%" }} />
                  <col style={{ width: "16.4%" }} />
                  <col style={{ width: "16.4%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-lensSoft">
                    <th className="py-1 px-1.5"></th>
                    <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">SPH</th>
                    <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">CYL</th>
                    <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">AXIS</th>
                    <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">ADD</th>
                    <th className="py-1 px-1.5 text-slate font-medium border-l border-lens/20">VA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-lens/20">
                    <td className="py-1 px-1.5 font-semibold text-ink">OD</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odSphere || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odCyl || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odAxis || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odAdd || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.odVA || "—"}</td>
                  </tr>
                  <tr className="border-t border-lens/20">
                    <td className="py-1 px-1.5 font-semibold text-ink">OS</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osSphere || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osCyl || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osAxis || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osAdd || "—"}</td>
                    <td className="py-1 px-1.5 text-center text-ink border-l border-lens/20">{rx.osVA || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {rx.pd && <p className="text-[11px] text-slate"><span className="font-semibold">PD:</span> {rx.pd}mm</p>}
            {rx.lensType && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-[11px] h-[11px] border-[1.5px] border-ink rounded-[3px] flex items-center justify-center flex-shrink-0">
                  <Check size={8} className="text-ink" strokeWidth={3} />
                </div>
                <span className="text-[11px] font-medium text-slate">{rx.lensType}</span>
              </div>
            )}
            {(rx.coatings?.length > 0 || rx.lensIndex || rx.tint) && (
              <p className="text-[11px] mt-1 text-slate">
                <span className="font-semibold">Lens:</span>{" "}
                {[rx.lensIndex && `${rx.lensIndex} index`, rx.tint, rx.coatings?.length ? rx.coatings.join(" + ") : null].filter(Boolean).join(", ")}
              </p>
            )}
            {rx.framePhoto && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-wide mb-1 text-slate">Booked frame</p>
                <img src={rx.framePhoto} alt="Booked frame" className="w-20 h-20 rounded-[10px] object-cover border border-border" />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[10px] mb-1.5 font-mono">
          <span className="text-slate">ITEM</span>
          <span className="text-slate text-right">QTY</span>
          <span className="text-slate text-right">AMOUNT</span>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {invoice.items.map((l, idx) => (
            <div key={l.itemId || `${l.name}-${idx}`} className="grid grid-cols-[1fr_auto_auto] gap-x-2 items-start">
              <div>
                <span className="text-sm text-ink">{l.name}</span>
                {l.hsnCode && <span className="text-[10px] block text-slate">HSN {l.hsnCode}</span>}
                {l.discount > 0 && <span className="text-[10px] block text-warn">Discount −{currency(l.discount)}</span>}
              </div>
              <span className="text-sm text-right text-slate font-mono">×{l.qty}</span>
              <span className="text-sm text-right text-slate font-mono">{currency(l.price * l.qty - (l.discount || 0))}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-border pt-3 mb-1 flex items-center justify-between">
          <span className="text-xs text-slate">Gross total</span>
          <span className="text-xs text-slate font-mono">{currency(grossTotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate">Total discount</span>
            <span className="text-xs text-warn font-mono">−{currency(totalDiscount)}</span>
          </div>
        )}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate">Subtotal</span>
          <span className="text-xs text-slate font-mono">{currency(invoice.subtotal ?? invoice.total)}</span>
        </div>
        {invoice.gstRate > 0 && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate">CGST ({invoice.gstRate / 2}%)</span>
              <span className="text-xs text-slate font-mono">{currency(invoice.cgst)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate">SGST ({invoice.gstRate / 2}%)</span>
              <span className="text-xs text-slate font-mono">{currency(invoice.sgst)}</span>
            </div>
          </>
        )}
        <div className="border-t border-dashed border-border pt-2 mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-slate">Total</span>
          <span className="text-lg font-semibold text-ink font-mono">{currency(invoice.total)}</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate">Amount paid</span>
          <span className="text-xs text-good font-mono">{currency(invoice.amountPaid || 0)}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate">Balance left</span>
          <span className={`text-lg font-semibold font-mono ${balanceLeft > 0 ? "text-warn" : "text-good"}`}>{currency(balanceLeft)}</span>
        </div>

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${tone.text} ${tone.bg}`}>{invoice.status}</span>

        {invoice.gstRate > 0 && gstGroups.length > 0 && (
          <div className="border-t border-dashed border-border pt-3 mt-3.5">
            <p className="font-display text-xs font-bold mb-2 text-ink">GST Details</p>
            <div className="grid grid-cols-5 gap-1 text-[9px] mb-1 font-mono">
              <span className="text-slate">HSN</span>
              <span className="text-slate text-right">SALE VAL.</span>
              <span className="text-slate text-right">CGST</span>
              <span className="text-slate text-right">SGST</span>
              <span className="text-slate text-right">TOTAL GST</span>
            </div>
            {gstGroups.map((g) => (
              <div key={g.hsnCode} className="grid grid-cols-5 gap-1 text-[10px] mb-0.5 font-mono">
                <span className="text-ink">{g.hsnCode}</span>
                <span className="text-ink text-right">{currency(g.saleValue)}</span>
                <span className="text-ink text-right">{currency(g.cgst)}</span>
                <span className="text-ink text-right">{currency(g.sgst)}</span>
                <span className="text-ink text-right">{currency(g.totalGst)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-dashed border-border pt-3.5 mt-3.5 flex items-end justify-between">
          <div>
            <div className="border-b border-slate w-[130px] h-[22px]" />
            <p className="text-[10px] mt-1 text-slate">Authorised signature</p>
          </div>
          <p className="text-[9px] text-right max-w-[140px] text-slate">This is a computer generated document.</p>
        </div>
      </div>

      {balanceLeft > 0 && (
        <div className="no-print mt-4">
          {shopInfo?.upi_id ? (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-focusSoft text-ink flex items-center justify-center gap-1.5 mb-3"
            >
              <QrCode size={14} /> Show UPI QR to collect {currency(balanceLeft)}
            </button>
          ) : (
            <p className="text-[11px] text-slate mb-3">Add a UPI ID in Shop details to show a "Scan to pay" QR here.</p>
          )}
          <Field label="Record a payment">
            <div className="flex gap-2">
              <div className="flex-1"><TextInput type="number" value={payInput} onChange={(e) => setPayInput(e.target.value)} placeholder={`up to ${balanceLeft}`} /></div>
              <button type="button" onClick={() => setPayInput(String(balanceLeft))} className="px-3 rounded-xl text-xs font-semibold whitespace-nowrap bg-lensSoft text-lens">
                Full balance
              </button>
            </div>
          </Field>
          <Field label="Payment mode">
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    payMethod === m ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
                  }`}
                >
                  {paymentMethodLabel(m)}
                </button>
              ))}
            </div>
          </Field>
          <PrimaryBtn
            full
            disabled={!payInput || Number(payInput) <= 0}
            onClick={() => {
              onRecordPayment(Number(payInput) || 0, payMethod);
              setPayInput("");
            }}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Check size={15} /> Record payment
            </span>
          </PrimaryBtn>
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="no-print mt-4">
          <p className="text-xs font-semibold text-slate mb-2">Payment history</p>
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-paper rounded-lg px-3 py-2">
                <span className="text-xs text-slate">{formatDate(p.paidAt)} · {paymentMethodLabel(p.method)}</span>
                <span className="text-xs font-semibold text-ink font-mono">{currency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onDelete && (
        <button onClick={() => setConfirmDelete(true)} className="no-print text-xs flex items-center gap-1 mt-4 mx-auto text-warn">
          <Trash2 size={12} /> Delete invoice
        </button>
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete this invoice?"
          body="This removes the invoice permanently and restores any inventory stock it sold. This can't be undone."
          confirmLabel="Delete"
          onConfirm={onDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      {showQr && shopInfo?.upi_id && (
        <Suspense fallback={null}>
          <UpiQrModal
            upiId={shopInfo.upi_id}
            payeeName={shopInfo?.name}
            amount={balanceLeft}
            note={`Invoice for ${invoice.patientName}`}
            onClose={() => setShowQr(false)}
          />
        </Suspense>
      )}
    </Modal>
  );
}
