import React, { useMemo, useState } from "react";
import { Plus, CalendarClock, Clock } from "lucide-react";
import { createAppointment, updateAppointmentStatus, deleteAppointment } from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState } from "../shared/ui";
import { formatTime, appointmentDayLabel, appointmentStatusLabel, appointmentStatusTone } from "../../lib/format";
import AddAppointmentModal from "./AddAppointmentModal";
import AppointmentDetailModal from "./AppointmentDetailModal";

const FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

export default function AppointmentsTab({ appointments, setAppointments, patients, setPatients, branchId, isOwner, shopInfo }) {
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState("upcoming");
  const [error, setError] = useState("");

  const open = appointments.find((a) => a.id === openId) || null;

  const filtered = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));
    if (filter === "all") return sorted;
    if (filter === "completed" || filter === "cancelled") return sorted.filter((a) => a.status === filter);
    // upcoming: still scheduled, regardless of whether the time has passed --
    // a missed one should stay visible until someone marks it done/cancelled.
    return sorted.filter((a) => a.status === "scheduled");
  }, [appointments, filter]);

  const grouped = useMemo(() => {
    const groups = [];
    for (const appt of filtered) {
      const label = appointmentDayLabel(appt.scheduledAt);
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push(appt);
    }
    return groups;
  }, [filtered]);

  const addAppointment = async (data) => {
    try {
      const saved = await createAppointment(branchId, data);
      setAppointments([...appointments, saved]);
      setShowAdd(false);
    } catch (e) {
      setError("Couldn't book appointment — please try again.");
    }
  };

  const changeStatus = async (appt, status) => {
    try {
      const updated = await updateAppointmentStatus(appt.id, status);
      setAppointments(appointments.map((a) => (a.id === updated.id ? updated : a)));
      setOpenId(null);
    } catch (e) {
      setError("Couldn't update appointment — please try again.");
    }
  };

  const removeAppointment = async (appt) => {
    try {
      await deleteAppointment(appt.id);
      setAppointments(appointments.filter((a) => a.id !== appt.id));
      setOpenId(null);
    } catch (e) {
      setError("Only the shop owner can delete appointments.");
    }
  };

  return (
    <div>
      <SectionHeader
        title="Appointments"
        subtitle={`${appointments.filter((a) => a.status === "scheduled").length} upcoming`}
        action={
          <RoundIconBtn onClick={() => setShowAdd(true)} tone="focus">
            <Plus size={17} className="text-ink" />
          </RoundIconBtn>
        }
      />
      {error && (
        <div className="px-5 mb-3">
          <p className="text-xs rounded-lg px-3 py-2 text-warn bg-warnSoft">{error}</p>
        </div>
      )}
      <div className="px-5 flex gap-2 mb-3 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 border transition duration-150 ${
              filter === f.id ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No appointments"
          subtitle={filter === "upcoming" ? "Book your first appointment to see it here." : "Nothing in this filter yet."}
        />
      ) : (
        <div className="px-5 flex flex-col gap-4">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate mb-2">{group.label}</p>
              <div className="flex flex-col gap-2">
                {group.items.map((appt) => {
                  const tone = appointmentStatusTone(appt.status);
                  return (
                    <button
                      key={appt.id}
                      onClick={() => setOpenId(appt.id)}
                      className="rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition duration-150 bg-card border border-border/70 shadow-sm shadow-ink/[0.03]"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-lensSoft">
                        <Clock size={16} className="text-lens" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-ink">{appt.patientName}</p>
                        <p className="text-[11px] truncate text-slate font-mono">
                          {formatTime(appt.scheduledAt)}
                          {appt.reason ? ` · ${appt.reason}` : ""}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ${tone.text} ${tone.bg}`}>
                        {appointmentStatusLabel(appt.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddAppointmentModal
          patients={patients}
          setPatients={setPatients}
          branchId={branchId}
          onClose={() => setShowAdd(false)}
          onSave={addAppointment}
        />
      )}
      {open && (
        <AppointmentDetailModal
          appointment={open}
          shopInfo={shopInfo}
          onClose={() => setOpenId(null)}
          onChangeStatus={(status) => changeStatus(open, status)}
          onDelete={() => removeAppointment(open)}
          canDelete={isOwner}
        />
      )}
    </div>
  );
}
