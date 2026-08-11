import React, { useMemo } from "react";
import { Users, Package, Receipt, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { StatCard, SectionHeader, EmptyState } from "./shared/ui";
import { currency, formatDate, formatTime, orderStatusLabel } from "../lib/format";

export default function HomeTab({ patients, inventory, invoices, appointments = [], setTab }) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthRevenue = invoices
      .filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
    const pendingDue = invoices.reduce((sum, i) => sum + (Number(i.total) - Number(i.amountPaid || 0)), 0);
    const lowStock = inventory.filter((item) => (item.stock ?? 0) <= (item.low ?? 3));
    const awaitingPickup = invoices.filter((i) => i.orderStatus === "processing" || i.orderStatus === "ready");
    const todayAppointments = appointments
      .filter((a) => a.status === "scheduled" && new Date(a.scheduledAt).toDateString() === now.toDateString())
      .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));
    return { monthRevenue, pendingDue, lowStock, awaitingPickup, todayAppointments };
  }, [invoices, inventory, appointments]);

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="pb-4">
      <SectionHeader title="Overview" subtitle="Today's snapshot" />
      <div className="grid grid-cols-2 gap-3 px-5">
        <StatCard icon={Users} label="Patients" value={patients.length} onClick={() => setTab("patients")} />
        <StatCard icon={Package} label="Stock items" value={inventory.length} onClick={() => setTab("inventory")} />
        <StatCard icon={Receipt} label="Revenue this month" value={currency(stats.monthRevenue)} tone="good" onClick={() => setTab("billing")} />
        <StatCard
          icon={AlertTriangle}
          label="Pending dues"
          value={currency(stats.pendingDue)}
          tone={stats.pendingDue > 0 ? "warn" : "default"}
          onClick={() => setTab("billing")}
        />
      </div>

      {stats.todayAppointments.length > 0 && (
        <div className="px-5 mt-5">
          <p className="text-xs font-semibold text-slate mb-2 flex items-center gap-1">
            <CalendarClock size={12} /> Today's appointments
          </p>
          <div className="space-y-2">
            {stats.todayAppointments.map((appt) => (
              <button
                key={appt.id}
                onClick={() => setTab("appointments")}
                className="w-full flex items-center justify-between bg-focusSoft rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition duration-150"
              >
                <span className="text-sm text-ink">{appt.patientName}</span>
                <span className="text-xs font-semibold text-ink font-mono">{formatTime(appt.scheduledAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats.awaitingPickup.length > 0 && (
        <div className="px-5 mt-5">
          <p className="text-xs font-semibold text-slate mb-2 flex items-center gap-1">
            <Clock size={12} /> Awaiting pickup
          </p>
          <div className="space-y-2">
            {stats.awaitingPickup.slice(0, 4).map((inv) => (
              <button
                key={inv.id}
                onClick={() => setTab("billing")}
                className="w-full flex items-center justify-between bg-lensSoft rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition duration-150"
              >
                <span className="text-sm text-ink">{inv.patientName || "Walk-in"}</span>
                <span className="text-xs font-semibold text-lens">{orderStatusLabel(inv.orderStatus)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats.lowStock.length > 0 && (
        <div className="px-5 mt-5">
          <p className="text-xs font-semibold text-slate mb-2">Low stock</p>
          <div className="space-y-2">
            {stats.lowStock.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => setTab("inventory")}
                className="w-full flex items-center justify-between bg-warnSoft rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition duration-150"
              >
                <span className="text-sm text-ink">{item.brand ? `${item.brand} ${item.model || ""}` : item.type}</span>
                <span className="text-xs font-semibold text-warn">{item.stock} left</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 mt-5">
        <p className="text-xs font-semibold text-slate mb-2">Recent invoices</p>
        {recentInvoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" subtitle="Create your first bill from the Billing tab" />
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setTab("billing")}
                className="w-full flex items-center justify-between bg-card border border-border/70 shadow-sm shadow-ink/[0.03] rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition duration-150"
              >
                <div className="min-w-0">
                  <div className="text-sm text-ink truncate">{inv.patientName || "Walk-in"}</div>
                  <div className="text-[11px] text-slate">{formatDate(inv.date)}</div>
                </div>
                <span className="text-sm font-semibold text-ink flex-shrink-0">{currency(inv.total)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
