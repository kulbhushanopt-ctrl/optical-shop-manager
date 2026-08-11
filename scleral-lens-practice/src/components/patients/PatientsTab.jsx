import React, { useMemo, useState } from "react";
import { Plus, Search, Users, Phone } from "lucide-react";
import { SectionHeader, EmptyState, Avatar } from "../shared/ui";
import { createPatient, updatePatient, deletePatient } from "../../lib/api";
import AddPatientModal from "./AddPatientModal";
import PatientDetailModal from "./PatientDetailModal";

export default function PatientsTab({ patients, setPatients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || "").includes(q));
  }, [patients, query]);

  const handleAdd = async (patient) => {
    const created = await createPatient(patient);
    setPatients((prev) => [created, ...prev]);
    setShowAdd(false);
  };

  const handleEdit = async (patient) => {
    const updated = await updatePatient(editingPatient.id, patient);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingPatient(null);
    setSelected((s) => (s?.id === updated.id ? updated : s));
  };

  const handleUpdate = async (patient) => {
    const { id, ...patch } = patient;
    const updated = await updatePatient(id, patch);
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  };

  const handleDelete = async (id) => {
    await deletePatient(id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setSelected(null);
  };

  return (
    <div>
      <SectionHeader
        title="Patients"
        subtitle={`${patients.length} on file`}
        action={
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center active:scale-90 transition">
            <Plus size={18} />
          </button>
        }
      />

      <div className="px-5 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/15"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={patients.length === 0 ? "No patients yet" : "No matches"}
          subtitle={patients.length === 0 ? "Add your first contact lens patient to get started." : "Try a different name or phone number."}
        />
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3 text-left active:scale-[0.98] transition"
            >
              <Avatar name={p.name} photo={p.photo} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-semibold text-ink truncate">{p.name}</p>
                <p className="text-xs text-slate flex items-center gap-1">
                  <Phone size={10} /> {p.phone || "—"}
                  {(p.fittings || []).length > 0 && <span> · {p.fittings.length} fitting{p.fittings.length > 1 ? "s" : ""}</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editingPatient && <AddPatientModal initial={editingPatient} onClose={() => setEditingPatient(null)} onSave={handleEdit} />}
      {selected && (
        <PatientDetailModal
          patient={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onEdit={() => setEditingPatient(selected)}
        />
      )}
    </div>
  );
}
