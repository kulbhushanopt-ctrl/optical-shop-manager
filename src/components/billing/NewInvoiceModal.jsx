import React, { Suspense, lazy, useState } from "react";
import { Plus, X, Barcode, QrCode } from "lucide-react";
import { createPatient } from "../../lib/api";
import { Modal, Field, TextInput, Select, PrimaryBtn, SecondaryBtn } from "../shared/ui";
import { currency, todayISO, formatDate, invoiceStatus, PAYMENT_METHODS, paymentMethodLabel } from "../../lib/format";

const BarcodeScanner = lazy(() => import("../shared/BarcodeScanner"));
const UpiQrModal = lazy(() => import("./UpiQrModal"));

const GST_RATES = [0, 5, 12, 18, 28];

export default function NewInvoiceModal({ patients, setPatients, inventory, branchId, onClose, onSave, shopInfo }) {
  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [lines, setLines] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [gstRate, setGstRate] = useState(12);
  const [isGstBill, setIsGstBill] = useState(true);
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [collectLater, setCollectLater] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState("");
  const [showQr, setShowQr] = useState(false);

  const addNewPatient = async () => {
    if (!newPatientName.trim()) return;
    try {
      const p = await createPatient(branchId, { name: newPatientName.trim(), phone: newPatientPhone.trim() });
      setPatients([p, ...patients]);
      setPatientId(p.id);
      setNewPatientOpen(false);
      setNewPatientName("");
      setNewPatientPhone("");
    } catch (e) {
      alert("Couldn't add patient — please try again.");
    }
  };

  const addLine = (item) => {
    const existing = lines.find((l) => l.itemId === item.id);
    if (existing) {
      setLines(lines.map((l) => (l.itemId === item.id ? { ...l, qty: Math.min(l.maxStock, l.qty + 1) } : l)));
    } else {
      setLines([...lines, { itemId: item.id, name: `${item.brand} ${item.model}`, price: item.price, qty: 1, maxStock: item.stock, hsnCode: item.hsnCode || "", discount: 0 }]);
    }
    setPickerOpen(false);
  };
  const handleScan = (code) => {
    setShowScanner(false);
    const match = inventory.find((i) => i.stock > 0 && (i.sku || "").trim().toLowerCase() === code.trim().toLowerCase());
    if (match) {
      addLine(match);
      setScanError("");
    } else {
      setScanError(`No in-stock item found for code "${code}".`);
    }
  };
  const addCustomLine = () => {
    if (!customName.trim() || customPrice === "") return;
    setLines([...lines, { itemId: null, name: customName.trim(), price: Number(customPrice), qty: 1, maxStock: Infinity, custom: true, hsnCode: "", discount: 0 }]);
    setCustomName("");
    setCustomPrice("");
    setCustomOpen(false);
  };
  const changeQty = (idx, delta) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, qty: Math.max(1, Math.min(l.maxStock, l.qty + delta)) } : l)));
  };
  const changeDiscount = (idx, value) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, discount: Math.max(0, Number(value) || 0) } : l)));
  };
  const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

  const effectiveGstRate = isGstBill ? gstRate : 0;
  const grossTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const totalDiscount = lines.reduce((s, l) => s + Math.min(l.discount || 0, l.price * l.qty), 0);
  const subtotal = grossTotal - totalDiscount;
  const gstAmount = subtotal * (effectiveGstRate / 100);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const total = subtotal + gstAmount;
  const patient = patients.find((p) => p.id === patientId);
  const patientPrescriptions = patient?.prescriptions || [];
  const selectedPrescription = patientPrescriptions.find((r) => r.id === prescriptionId) || null;
  const valid = lines.length > 0;
  const amountPaid = Math.max(0, Math.min(total, Number(amountPaidInput) || 0));
  const balanceLeft = Math.max(0, total - amountPaid);

  const save = () => {
    onSave({
      date: todayISO(),
      patientId: patientId || null,
      patientName: patient?.name || "Walk-in",
      items: lines,
      subtotal,
      gstRate: effectiveGstRate,
      cgst,
      sgst,
      total,
      amountPaid,
      status: invoiceStatus(amountPaid, total),
      prescription: selectedPrescription,
      orderStatus: collectLater ? "processing" : "delivered",
      paymentMethod,
    });
  };

  return (
    <Modal title="New invoice" onClose={onClose} wide>
      <Field label="Patient">
        <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Walk-in customer</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      {newPatientOpen ? (
        <div className="rounded-xl p-3 mb-3.5 -mt-2 bg-lensSoft border border-lens/30">
          <p className="text-xs font-semibold mb-2 text-ink">New patient</p>
          <Field label="Name"><TextInput value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="Jordan Lee" /></Field>
          <Field label="Phone"><TextInput value={newPatientPhone} onChange={(e) => setNewPatientPhone(e.target.value)} placeholder="+91 98765 43210" /></Field>
          <div className="flex gap-2">
            <SecondaryBtn full onClick={() => { setNewPatientOpen(false); setNewPatientName(""); setNewPatientPhone(""); }}>Cancel</SecondaryBtn>
            <PrimaryBtn full disabled={!newPatientName.trim()} onClick={addNewPatient}>Add patient</PrimaryBtn>
          </div>
        </div>
      ) : (
        <button onClick={() => setNewPatientOpen(true)} className="text-xs font-medium flex items-center gap-1 -mt-2 mb-3.5 text-lens">
          <Plus size={13} /> Patient not in list? Add new
        </button>
      )}

      <div className="flex items-center justify-between mb-2 mt-4">
        <h4 className="font-display text-sm font-semibold text-ink">Items</h4>
        <div className="flex gap-3">
          <button onClick={() => setCustomOpen(true)} className="text-xs font-medium flex items-center gap-1 text-focus">
            <Plus size={13} /> Custom item
          </button>
          <button onClick={() => setPickerOpen(true)} className="text-xs font-medium flex items-center gap-1 text-lens">
            <Plus size={13} /> From stock
          </button>
          <button onClick={() => setShowScanner(true)} className="text-xs font-medium flex items-center gap-1 text-lens">
            <Barcode size={13} /> Scan
          </button>
        </div>
      </div>
      {scanError && <p className="text-[11px] text-warn -mt-2 mb-2">{scanError}</p>}
      {showScanner && (
        <Suspense fallback={null}>
          <BarcodeScanner onDetect={handleScan} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      {customOpen && (
        <div className="rounded-xl p-3 mb-3 bg-focusSoft border border-focus/40">
          <p className="text-xs font-semibold mb-2 text-ink">Add a custom item</p>
          <Field label="Description"><TextInput value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Custom lens fitting" /></Field>
          <Field label="Price"><TextInput type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="500" /></Field>
          <div className="flex gap-2">
            <SecondaryBtn full onClick={() => { setCustomOpen(false); setCustomName(""); setCustomPrice(""); }}>Cancel</SecondaryBtn>
            <PrimaryBtn full disabled={!customName.trim() || customPrice === ""} onClick={addCustomLine}>Add</PrimaryBtn>
          </div>
        </div>
      )}

      {lines.length === 0 ? (
        <p className="text-xs mb-4 text-slate">No items added yet.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {lines.map((l, idx) => (
            <div key={idx} className="rounded-xl p-3 flex flex-col gap-2 bg-card border border-border">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-ink">
                    {l.name} {l.custom && <span className="text-focus">· custom</span>}
                  </p>
                  <p className="text-[11px] text-slate font-mono">{currency(l.price)} each{l.hsnCode ? ` · HSN ${l.hsnCode}` : ""}</p>
                </div>
                <button onClick={() => changeQty(idx, -1)} className="w-6 h-6 rounded-full text-xs font-semibold bg-border">−</button>
                <span className="text-xs w-4 text-center text-ink font-mono">{l.qty}</span>
                <button onClick={() => changeQty(idx, 1)} className="w-6 h-6 rounded-full text-xs font-semibold bg-border">+</button>
                <button onClick={() => removeLine(idx)} className="ml-1">
                  <X size={13} className="text-warn" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide flex-shrink-0 text-slate">Discount ₹</span>
                <TextInput type="number" value={l.discount || ""} onChange={(e) => changeDiscount(idx, e.target.value)} placeholder="0" className="!py-1 !text-xs" />
              </div>
            </div>
          ))}
        </div>
      )}

      {pickerOpen && (
        <div className="rounded-xl p-2 mb-4 max-h-48 overflow-y-auto bg-card border border-border">
          {inventory.filter((i) => i.stock > 0).map((item) => (
            <button key={item.id} onClick={() => addLine(item)} className="w-full flex items-center justify-between px-2 py-2 text-left rounded-lg hover:bg-black/5">
              <span className="text-xs text-ink">{item.brand} {item.model}</span>
              <span className="text-[11px] text-slate font-mono">{currency(item.price)} · {item.stock} left</span>
            </button>
          ))}
        </div>
      )}

      <Field label="Bill type">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsGstBill(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${isGstBill ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"}`}
          >
            GST bill
          </button>
          <button
            type="button"
            onClick={() => setIsGstBill(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${!isGstBill ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"}`}
          >
            Without GST
          </button>
        </div>
      </Field>

      <Field label="Handover">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCollectLater(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${!collectLater ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"}`}
          >
            Given now
          </button>
          <button
            type="button"
            onClick={() => setCollectLater(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${collectLater ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"}`}
          >
            Collect later
          </button>
        </div>
      </Field>

      {patient && patientPrescriptions.length > 0 && (
        <Field label="Attach prescription (optional)">
          <Select value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)}>
            <option value="">No prescription attached</option>
            {patientPrescriptions.map((rx) => (
              <option key={rx.id} value={rx.id}>{formatDate(rx.date)} — SPH {rx.odSphere || "—"}/{rx.osSphere || "—"}</option>
            ))}
          </Select>
        </Field>
      )}

      {isGstBill && (
        <Field label="GST rate">
          <div className="flex gap-2 flex-wrap">
            {GST_RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setGstRate(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${gstRate === r ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"}`}
              >
                {r}%
              </button>
            ))}
          </div>
        </Field>
      )}

      <div className="border-t border-border pt-3 mb-1 flex items-center justify-between">
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
        <span className="text-xs text-ink font-mono">{currency(subtotal)}</span>
      </div>
      {isGstBill && gstRate > 0 && (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate">CGST ({gstRate / 2}%)</span>
            <span className="text-xs text-slate font-mono">{currency(cgst)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate">SGST ({gstRate / 2}%)</span>
            <span className="text-xs text-slate font-mono">{currency(sgst)}</span>
          </div>
        </>
      )}
      <div className="pt-1 mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate">Total</span>
        <span className="text-lg font-semibold text-ink font-mono">{currency(total)}</span>
      </div>

      <Field label="Amount paid now">
        <div className="flex gap-2 mb-2">
          <div className="flex-1"><TextInput type="number" value={amountPaidInput} onChange={(e) => setAmountPaidInput(e.target.value)} placeholder="0" /></div>
          <button type="button" onClick={() => setAmountPaidInput(String(total))} className="px-3 rounded-xl text-xs font-semibold whitespace-nowrap bg-lensSoft text-lens">Full amount</button>
          <button type="button" onClick={() => setAmountPaidInput("")} className="px-3 rounded-xl text-xs font-semibold whitespace-nowrap bg-border text-slate">Unpaid</button>
        </div>
      </Field>
      {total > 0 &&
        (shopInfo?.upi_id ? (
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-focusSoft text-ink flex items-center justify-center gap-1.5 mb-3.5"
          >
            <QrCode size={14} /> Show UPI QR to collect {currency(balanceLeft > 0 ? balanceLeft : total)}
          </button>
        ) : (
          <p className="text-[11px] text-slate -mt-1.5 mb-3.5">Add a UPI ID in Shop details to show a "Scan to pay" QR here.</p>
        ))}
      {amountPaid > 0 && (
        <Field label="Payment mode">
          <div className="flex gap-2 flex-wrap">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  paymentMethod === m ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
                }`}
              >
                {paymentMethodLabel(m)}
              </button>
            ))}
          </div>
        </Field>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate">Amount paid</span>
        <span className="text-xs text-good font-mono">{currency(amountPaid)}</span>
      </div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-medium text-slate">Balance left</span>
        <span className={`text-lg font-semibold font-mono ${balanceLeft > 0 ? "text-warn" : "text-good"}`}>{currency(balanceLeft)}</span>
      </div>

      <PrimaryBtn full disabled={!valid} onClick={save}>Save invoice</PrimaryBtn>
      {showQr && shopInfo?.upi_id && (
        <Suspense fallback={null}>
          <UpiQrModal
            upiId={shopInfo.upi_id}
            payeeName={shopInfo?.name}
            amount={balanceLeft > 0 ? balanceLeft : total}
            note={`Invoice for ${patient?.name || "walk-in customer"}`}
            onClose={() => setShowQr(false)}
          />
        </Suspense>
      )}
    </Modal>
  );
}
