import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Receipt } from "lucide-react";
import { Modal, Field, TextInput, EmptyState } from "../shared/ui";
import { currency, todayISO, formatDate, statusTone, PAYMENT_METHODS, paymentMethodLabel } from "../../lib/format";

const REPORT_RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

function computeReportRange(range, customFrom, customTo) {
  const today = todayISO();
  const now = new Date();
  if (range === "today") return { from: today, to: today };
  if (range === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    return { from: monday.toISOString().slice(0, 10), to: today };
  }
  if (range === "month") {
    return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: today };
  }
  if (range === "year") {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  if (range === "all") return { from: "0001-01-01", to: "9999-12-31" };
  return { from: customFrom || today, to: customTo || today };
}

export default function SalesReportModal({ invoices, payments, shopInfo, onClose }) {
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());

  const { from, to } = computeReportRange(range, customFrom, customTo);
  const filtered = invoices.filter((i) => i.date >= from && i.date <= to);
  const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  const filteredPayments = (payments || []).filter((p) => {
    const d = (p.paidAt || "").slice(0, 10);
    return d >= from && d <= to;
  });
  const byMethod = PAYMENT_METHODS.map((m) => ({
    method: m,
    total: filteredPayments.filter((p) => p.method === m).reduce((s, p) => s + (p.amount || 0), 0),
  })).filter((m) => m.total > 0);

  const totalRevenue = filtered.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = filtered.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const totalOutstanding = Math.max(0, totalRevenue - totalCollected);
  const totalCgst = filtered.reduce((s, i) => s + (i.cgst || 0), 0);
  const totalSgst = filtered.reduce((s, i) => s + (i.sgst || 0), 0);
  const paidCount = filtered.filter((i) => i.status === "paid").length;
  const partialCount = filtered.filter((i) => i.status === "partial").length;
  const dueCount = filtered.filter((i) => i.status === "due").length;

  const exportExcel = () => {
    const rows = sorted.map((inv) => ({
      Date: formatDate(inv.date),
      Patient: inv.patientName,
      Items: inv.items.length,
      "Subtotal (₹)": inv.subtotal ?? inv.total,
      "GST rate": inv.gstRate ? `${inv.gstRate}%` : "—",
      "CGST (₹)": inv.cgst || 0,
      "SGST (₹)": inv.sgst || 0,
      "Total (₹)": inv.total,
      "Amount paid (₹)": inv.amountPaid || 0,
      "Balance (₹)": Math.max(0, inv.total - (inv.amountPaid || 0)),
      Status: inv.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    const branchLabel = (shopInfo?.name || "shop").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const rangeLabel = REPORT_RANGES.find((r) => r.id === range)?.label.replace(/\s+/g, "-").toLowerCase() || "report";
    XLSX.writeFile(wb, `${branchLabel}-sales-${rangeLabel}-${todayISO()}.xlsx`);
  };

  return (
    <Modal title="Sales report" onClose={onClose} wide>
      <Field label="Time period">
        <div className="flex gap-2 flex-wrap">
          {REPORT_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${range === r.id ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Field>

      {range === "custom" && (
        <div className="grid grid-cols-2 gap-2 mb-3.5">
          <Field label="From"><TextInput type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></Field>
          <Field label="To"><TextInput type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-3.5 bg-lensSoft border border-lens/20">
          <p className="text-[11px] uppercase tracking-wide mb-1 text-lens">Total revenue</p>
          <p className="text-lg font-semibold text-ink font-mono">{currency(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl p-3.5 bg-goodSoft border border-good/20">
          <p className="text-[11px] uppercase tracking-wide mb-1 text-good">Collected</p>
          <p className="text-lg font-semibold text-ink font-mono">{currency(totalCollected)}</p>
        </div>
        <div className="rounded-2xl p-3.5 bg-warnSoft border border-warn/20">
          <p className="text-[11px] uppercase tracking-wide mb-1 text-warn">Outstanding</p>
          <p className="text-lg font-semibold text-ink font-mono">{currency(totalOutstanding)}</p>
        </div>
        <div className="rounded-2xl p-3.5 bg-focusSoft border border-focus/20">
          <p className="text-[11px] uppercase tracking-wide mb-1 text-focus">Invoices</p>
          <p className="text-lg font-semibold text-ink font-mono">{filtered.length}</p>
        </div>
      </div>

      {byMethod.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate mb-2">Collected by payment mode</p>
          <div className="flex flex-col gap-1.5">
            {byMethod.map((m) => (
              <div key={m.method} className="flex items-center justify-between bg-paper rounded-lg px-3 py-2">
                <span className="text-xs text-ink">{paymentMethodLabel(m.method)}</span>
                <span className="text-xs font-semibold text-ink font-mono">{currency(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate">GST collected (CGST + SGST)</span>
        <span className="text-xs text-ink font-mono">{currency(totalCgst + totalSgst)}</span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate">Paid · Partial · Due</span>
        <span className="text-xs text-slate font-mono">{paidCount} · {partialCount} · {dueCount}</span>
      </div>

      <button
        onClick={exportExcel}
        disabled={filtered.length === 0}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 mb-4 bg-lens"
      >
        <Download size={15} /> Export to Excel
      </button>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices in this period" subtitle="Try a different time range." />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((inv) => {
            const tone = statusTone(inv.status);
            return (
              <div key={inv.id} className="rounded-xl p-3 flex items-center justify-between bg-card border border-border">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-ink">{inv.patientName}</p>
                  <p className="text-[11px] text-slate">{formatDate(inv.date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-ink font-mono">{currency(inv.total)}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${tone.text} ${tone.bg}`}>{inv.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
