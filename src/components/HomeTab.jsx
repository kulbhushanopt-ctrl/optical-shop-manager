import React, { useMemo } from "react";
import {
  Users,
  Package,
  Receipt,
  AlertTriangle,
  Clock,
  CalendarClock,
  UserPlus,
  FilePlus,
  PackagePlus,
  ScanLine,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Avatar, EmptyState } from "./shared/ui";
import { currency, formatDate, formatTime, orderStatusLabel, invoiceStatus, statusTone } from "../lib/format";

function greetingForHour(h) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function sameMonth(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
}

// A percentage trend is only meaningful when there's a real prior number to
// compare against -- with zero in the prior period, "New" is honest where a
// computed percentage (division by zero, or a triple-digit swing off a
// count of 1) would just be noise on a small shop's real numbers.
function trendFor(curr, prev, suffix) {
  if (!prev) return curr > 0 ? { label: "New", up: true, suffix } : null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return { label: "No change", up: null, suffix };
  return { label: `${pct > 0 ? "+" : ""}${pct}%`, up: pct > 0, suffix };
}

function DashCard({ icon: Icon, iconBg, iconColor, label, value, trend, tag, tagTone, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border/70 rounded-2xl p-4 text-left shadow-sm shadow-ink/[0.03] active:scale-[0.98] transition duration-150 flex flex-col gap-2.5 w-full"
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={17} className={iconColor} strokeWidth={2.2} />
        </div>
        {onClick && <ChevronRight size={15} className="text-slate/50" />}
      </div>
      <div>
        <div className="text-xl font-display font-bold text-ink leading-none tracking-tight">{value}</div>
        <div className="text-xs text-slate mt-1.5">{label}</div>
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-[11px] font-semibold ${
            trend.up === null ? "text-slate" : trend.up ? "text-good" : "text-warn"
          }`}
        >
          {trend.up === true && <TrendingUp size={12} />}
          {trend.up === false && <TrendingDown size={12} />}
          {trend.label}
          {trend.suffix && <span className="text-slate font-normal">{trend.suffix}</span>}
        </div>
      )}
      {tag && <span className={`inline-block w-fit text-[11px] font-semibold px-2 py-0.5 rounded-full ${tagTone}`}>{tag}</span>}
    </button>
  );
}

function QuickAction({ icon: Icon, label, bg, color, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 active:scale-95 transition duration-150 flex-1">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bg}`}>
        <Icon size={22} className={color} strokeWidth={2.2} />
      </div>
      <span className="text-[11px] font-medium text-ink text-center leading-tight">{label}</span>
    </button>
  );
}

function RevenueBars({ months }) {
  const max = Math.max(1, ...months.map((m) => m.value));
  const CH = 88;
  return (
    <div className="flex items-end justify-between gap-4 px-1" style={{ height: CH + 32 }}>
      {months.map((m, i) => {
        const isLast = i === months.length - 1;
        const h = Math.max(6, Math.round((m.value / max) * CH));
        return (
          <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full">
            {isLast && m.value > 0 && (
              <div className="text-[10px] font-semibold text-white bg-ink rounded-full px-2 py-0.5 mb-1 whitespace-nowrap">
                {currency(m.value)}
              </div>
            )}
            <div
              className="w-full max-w-[34px] rounded-t-md"
              style={{ height: h, backgroundColor: isLast ? "#111827" : "#EDE8DB" }}
            />
            <span className="text-[10px] text-slate mt-1.5">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PatientDonut({ segments, total }) {
  let acc = 0;
  const stops = segments.map((s) => {
    const pct = total > 0 ? (s.value / total) * 100 : 0;
    const start = acc;
    acc += pct;
    return `${s.color} ${start}% ${acc}%`;
  });
  const bg = total > 0 ? `conic-gradient(${stops.join(", ")})` : "#EDE8DB";
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[92px] h-[92px] flex-shrink-0 rounded-full" style={{ background: bg }}>
        <div className="absolute inset-[9px] bg-card rounded-full flex flex-col items-center justify-center">
          <span className="text-lg font-display font-bold text-ink leading-none">{total}</span>
          <span className="text-[9px] text-slate mt-0.5">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate">{s.label}</span>
            <span className="font-semibold text-ink ml-3">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeTab({ patients, inventory, invoices, appointments = [], shopInfo, isOwner, setTab, onQuickAction }) {
  const now = new Date();

  const stats = useMemo(() => {
    const monthRevenue = invoices
      .filter((i) => sameMonth(i.date, now))
      .reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthRevenue = invoices
      .filter((i) => sameMonth(i.date, lastMonthDate))
      .reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);

    const duesInvoices = invoices.filter((i) => Number(i.total) - Number(i.amountPaid || 0) > 0);
    const pendingDue = duesInvoices.reduce((sum, i) => sum + (Number(i.total) - Number(i.amountPaid || 0)), 0);

    const lowStockCount = inventory.filter((i) => i.stock <= i.low).length;

    const patientsOn = (dateObj) => {
      const ids = new Set();
      invoices.forEach((inv) => {
        if (inv.patientId && sameDay(inv.date, dateObj)) ids.add(inv.patientId);
      });
      appointments.forEach((a) => {
        if (a.patientId && a.scheduledAt && sameDay(a.scheduledAt, dateObj)) ids.add(a.patientId);
      });
      return ids.size;
    };
    const patientsToday = patientsOn(now);
    const patientsLastWeek = patientsOn(new Date(now.getTime() - 7 * 86400000));

    const awaitingPickup = invoices.filter((i) => i.orderStatus === "processing" || i.orderStatus === "ready");
    const todayAppointments = appointments
      .filter((a) => a.status === "scheduled" && sameDay(a.scheduledAt, now))
      .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));

    // Revenue bars: this month and the two before it.
    const monthBars = [2, 1, 0].map((back) => {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const value = invoices.filter((i) => sameMonth(i.date, d)).reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
      return { label: d.toLocaleDateString("en-IN", { month: "short" }), value };
    });

    // Patient mix: new this month vs existing patients active this month
    // (follow-up) vs existing patients with no activity this month.
    const activeIdsThisMonth = new Set();
    invoices.forEach((inv) => {
      if (inv.patientId && sameMonth(inv.date, now)) activeIdsThisMonth.add(inv.patientId);
    });
    appointments.forEach((a) => {
      if (a.patientId && a.scheduledAt && sameMonth(a.scheduledAt, now)) activeIdsThisMonth.add(a.patientId);
    });
    let newCount = 0;
    let followUpCount = 0;
    let othersCount = 0;
    patients.forEach((p) => {
      if (p.created_at && sameMonth(p.created_at, now)) newCount++;
      else if (activeIdsThisMonth.has(p.id)) followUpCount++;
      else othersCount++;
    });

    return {
      monthRevenue,
      lastMonthRevenue,
      pendingDue,
      pendingCount: duesInvoices.length,
      lowStockCount,
      patientsToday,
      patientsLastWeek,
      awaitingPickup,
      todayAppointments,
      monthBars,
      patientMix: { newCount, followUpCount, othersCount },
    };
  }, [patients, inventory, invoices, appointments]);

  const recentInvoices = invoices.slice(0, 4);

  const revenueTrend = trendFor(stats.monthRevenue, stats.lastMonthRevenue, " vs last month");
  const patientsTrend = trendFor(stats.patientsToday, stats.patientsLastWeek, " vs last week");

  return (
    <div className="pb-4">
      <div className="px-5 pt-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate tracking-wide uppercase">{greetingForHour(now.getHours())},</p>
          <h1 className="font-display text-xl font-bold text-ink tracking-tight mt-0.5">
            {shopInfo?.name || "there"} <span aria-hidden>👋</span>
          </h1>
          <p className="text-xs text-slate mt-0.5">Here's your store overview for today</p>
        </div>
        <div className="bg-lensSoft rounded-xl px-3 py-2 text-right flex-shrink-0">
          <div className="text-[11px] font-semibold text-lens flex items-center gap-1 justify-end">
            <CalendarClock size={12} /> {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
          <div className="text-[10px] text-lens/70 mt-0.5">{formatTime(now.toISOString())}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 mt-4">
        <DashCard
          icon={Users}
          iconBg="bg-lensSoft"
          iconColor="text-lens"
          label="Patients today"
          value={stats.patientsToday}
          trend={patientsTrend}
          onClick={() => setTab("patients")}
        />
        <DashCard
          icon={Package}
          iconBg="bg-focusSoft"
          iconColor="text-focus"
          label="Stock items"
          value={inventory.length}
          tag={stats.lowStockCount > 0 ? `${stats.lowStockCount} low stock` : "All stocked"}
          tagTone={stats.lowStockCount > 0 ? "bg-warnSoft text-warn" : "bg-goodSoft text-good"}
          onClick={() => setTab("inventory")}
        />
        <DashCard
          icon={Receipt}
          iconBg="bg-goodSoft"
          iconColor="text-good"
          label="Revenue this month"
          value={currency(stats.monthRevenue)}
          trend={revenueTrend}
          onClick={() => setTab("billing")}
        />
        <DashCard
          icon={AlertTriangle}
          iconBg="bg-warnSoft"
          iconColor="text-warn"
          label="Pending dues"
          value={currency(stats.pendingDue)}
          tag={stats.pendingCount > 0 ? `${stats.pendingCount} invoice${stats.pendingCount === 1 ? "" : "s"} pending` : "All settled"}
          tagTone={stats.pendingCount > 0 ? "bg-warnSoft text-warn" : "bg-goodSoft text-good"}
          onClick={() => setTab("billing")}
        />
      </div>

      <div className="px-5 mt-5 flex items-stretch justify-between gap-2">
        <QuickAction icon={UserPlus} label="Add Patient" bg="bg-ink" color="text-white" onClick={() => onQuickAction("patients", "addPatient")} />
        <QuickAction
          icon={FilePlus}
          label="Create Invoice"
          bg="bg-lensSoft"
          color="text-lens"
          onClick={() => onQuickAction("billing", "newInvoice")}
        />
        {isOwner && (
          <QuickAction
            icon={PackagePlus}
            label="Update Stock"
            bg="bg-goodSoft"
            color="text-good"
            onClick={() => onQuickAction("inventory", "addStock")}
          />
        )}
        {isOwner && (
          <QuickAction
            icon={ScanLine}
            label="Scan Stock List"
            bg="bg-focusSoft"
            color="text-focus"
            onClick={() => onQuickAction("inventory", "scanStock")}
          />
        )}
      </div>

      {stats.todayAppointments.length > 0 && (
        <div className="px-5 mt-5">
          <p className="text-xs font-semibold text-slate mb-2 flex items-center gap-1">
            <CalendarClock size={12} /> Today's appointments
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {stats.todayAppointments.map((appt) => (
              <button
                key={appt.id}
                onClick={() => setTab("patients")}
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
          <div className="grid gap-2 sm:grid-cols-2">
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

      <div className="px-5 mt-5">
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm shadow-ink/[0.03]">
          <p className="text-xs font-semibold text-ink mb-1">Monthly revenue</p>
          <RevenueBars months={stats.monthBars} />
        </div>
      </div>

      {patients.length > 0 && (
        <div className="px-5 mt-3">
          <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm shadow-ink/[0.03]">
            <p className="text-xs font-semibold text-ink mb-3">Patient mix this month</p>
            <PatientDonut
              total={patients.length}
              segments={[
                { label: "New", value: stats.patientMix.newCount, color: "#111827" },
                { label: "Follow-ups", value: stats.patientMix.followUpCount, color: "#2563EB" },
                { label: "Others", value: stats.patientMix.othersCount, color: "#E7E3D9" },
              ]}
            />
          </div>
        </div>
      )}

      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate">Recent invoices</p>
          <button onClick={() => setTab("billing")} className="text-xs font-semibold text-lens flex items-center gap-0.5">
            View all <ChevronRight size={13} />
          </button>
        </div>
        {recentInvoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" subtitle="Create your first bill from the Billing tab" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentInvoices.map((inv) => {
              const status = invoiceStatus(inv.amountPaid, inv.total);
              const tone = statusTone(status);
              return (
                <button
                  key={inv.id}
                  onClick={() => setTab("billing")}
                  className="w-full flex items-center gap-3 bg-card border border-border/70 shadow-sm shadow-ink/[0.03] rounded-xl px-3 py-2.5 text-left active:scale-[0.98] transition duration-150"
                >
                  <Avatar name={inv.patientName || "Walk-in"} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink truncate">{inv.patientName || "Walk-in"}</div>
                    <div className="text-[11px] text-slate">{formatDate(inv.date)}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tone.bg} ${tone.text}`}>
                    {status === "paid" ? "Paid" : status === "partial" ? "Partial" : "Due"}
                  </span>
                  <span className="text-sm font-semibold text-ink flex-shrink-0 w-16 text-right">{currency(inv.total)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
