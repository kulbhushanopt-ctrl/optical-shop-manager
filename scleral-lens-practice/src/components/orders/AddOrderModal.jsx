import React, { useState } from "react";
import { Modal, Field, TextInput, Select, TextArea, PrimaryBtn } from "../shared/ui";
import { EYE_OPTIONS, ORDER_STATUSES } from "../../lib/constants";
import { todayISO } from "../../lib/format";

const BLANK = {
  patient_id: "",
  eye: "OD",
  brand: "",
  base_curve: "",
  diameter: "",
  power: "",
  lab_name: "",
  order_date: todayISO(),
  expected_date: "",
  status: "ordered",
  notes: "",
};

export default function AddOrderModal({ onClose, onSave, patients, initial }) {
  const [f, setF] = useState({ ...BLANK, ...(initial || {}) });
  const set = (k) => (v) => setF({ ...f, [k]: v });

  return (
    <Modal title={initial ? "Edit lens order" : "New lens order"} onClose={onClose}>
      <Field label="Patient">
        <Select value={f.patient_id} onChange={(e) => set("patient_id")(e.target.value)} disabled={!!initial}>
          <option value="">— Select patient —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Eye">
          <Select value={f.eye} onChange={(e) => set("eye")(e.target.value)}>
            {EYE_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set("status")(e.target.value)}>
            {ORDER_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Brand / lens design">
        <TextInput value={f.brand} onChange={(e) => set("brand")(e.target.value)} placeholder="Zenlens, EyePrintPro…" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Base curve (mm)"><TextInput value={f.base_curve} onChange={(e) => set("base_curve")(e.target.value)} placeholder="8.6" /></Field>
        <Field label="Diameter (mm)"><TextInput value={f.diameter} onChange={(e) => set("diameter")(e.target.value)} placeholder="16.0" /></Field>
      </div>
      <Field label="Power">
        <TextInput value={f.power} onChange={(e) => set("power")(e.target.value)} placeholder="-3.50" />
      </Field>
      <Field label="Lab / manufacturer">
        <TextInput value={f.lab_name} onChange={(e) => set("lab_name")(e.target.value)} placeholder="Lab name" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Order date"><TextInput type="date" value={f.order_date} onChange={(e) => set("order_date")(e.target.value)} /></Field>
        <Field label="Expected date"><TextInput type="date" value={f.expected_date || ""} onChange={(e) => set("expected_date")(e.target.value)} /></Field>
      </div>
      <Field label="Notes (optional)">
        <TextArea rows={2} value={f.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Order reference, special instructions…" />
      </Field>

      <PrimaryBtn full onClick={() => onSave(f)} disabled={!f.patient_id}>
        {initial ? "Save changes" : "Save order"}
      </PrimaryBtn>
    </Modal>
  );
}
