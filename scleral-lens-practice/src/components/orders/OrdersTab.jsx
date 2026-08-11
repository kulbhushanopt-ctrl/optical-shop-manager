import React, { useState } from "react";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { SectionHeader, EmptyState, StatusPill, Select } from "../shared/ui";
import { createLensOrder, updateLensOrder, deleteLensOrder } from "../../lib/api";
import { ORDER_STATUSES, orderStatusLabel } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import AddOrderModal from "./AddOrderModal";

const statusTone = (id) => ORDER_STATUSES.find((s) => s.id === id)?.tone || "default";

export default function OrdersTab({ orders, setOrders, patients }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const patientName = (id) => patients.find((p) => p.id === id)?.name || "Unknown patient";

  const handleAdd = async (order) => {
    const created = await createLensOrder(order);
    setOrders((prev) => [created, ...prev]);
    setShowAdd(false);
  };

  const handleEdit = async (order) => {
    const { patient_id, ...patch } = order;
    const updated = await updateLensOrder(editingOrder.id, patch);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setEditingOrder(null);
  };

  const handleStatusChange = async (order, status) => {
    const updated = await updateLensOrder(order.id, { status });
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const handleDelete = async (id) => {
    await deleteLensOrder(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div>
      <SectionHeader
        title="Lens orders"
        subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            disabled={patients.length === 0}
            className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center active:scale-90 transition disabled:opacity-40"
          >
            <Plus size={18} />
          </button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No lens orders yet"
          subtitle={patients.length === 0 ? "Add a patient first, then order trial or final lenses for them." : "Order a trial or final lens set for a patient."}
        />
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-card border border-border rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="font-display text-sm font-semibold text-ink">{o.patient_name || patientName(o.patient_id)}</p>
                  <p className="text-[11px] text-slate">{o.eye} · {formatDate(o.order_date)}</p>
                </div>
                {confirmDelete === o.id ? (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setConfirmDelete(null)} className="text-[10px] px-2 py-0.5 text-slate">Cancel</button>
                    <button onClick={() => handleDelete(o.id)} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium bg-warn">Delete</button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditingOrder({ ...o, patient_id: o.patient_id })} className="w-6 h-6 rounded-full flex items-center justify-center bg-focusSoft">
                      <Pencil size={11} className="text-focus" />
                    </button>
                    <button onClick={() => setConfirmDelete(o.id)} className="w-6 h-6 rounded-full flex items-center justify-center bg-warnSoft">
                      <Trash2 size={11} className="text-warn" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-ink mb-1">
                {[o.brand, o.base_curve && `BC ${o.base_curve}`, o.diameter && `DIA ${o.diameter}`, o.power].filter(Boolean).join(" · ") || "—"}
              </p>
              {o.lab_name && <p className="text-[11px] text-slate mb-1.5">Lab: {o.lab_name}</p>}
              {o.expected_date && <p className="text-[11px] text-slate mb-1.5">Expected: {formatDate(o.expected_date)}</p>}
              {o.notes && <p className="text-[11px] text-slate mb-1.5">{o.notes}</p>}
              <div className="flex items-center justify-between mt-1">
                <StatusPill label={orderStatusLabel(o.status)} tone={statusTone(o.status)} />
                <div className="w-32">
                  <Select value={o.status} onChange={(e) => handleStatusChange(o, e.target.value)}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddOrderModal patients={patients} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editingOrder && <AddOrderModal patients={patients} initial={editingOrder} onClose={() => setEditingOrder(null)} onSave={handleEdit} />}
    </div>
  );
}
