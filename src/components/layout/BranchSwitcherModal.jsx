import React, { useState } from "react";
import { Check, Plus } from "lucide-react";
import { createBranch } from "../../lib/api";
import { Modal, Field, TextInput, PrimaryBtn, SecondaryBtn } from "../shared/ui";

export default function BranchSwitcherModal({ memberships, currentBranchId, onSelect, onClose, onBranchCreated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const branch = await createBranch({ name: name.trim() });
      onBranchCreated(branch);
      onClose();
    } catch (e) {
      // no-op, keep modal open
    }
    setBusy(false);
  };

  return (
    <Modal title="Switch branch" onClose={onClose}>
      {!showCreate ? (
        <>
          <div className="space-y-2 mb-4">
            {memberships.map((m) => (
              <button
                key={m.branch_id}
                onClick={() => {
                  onSelect(m.branch_id);
                  onClose();
                }}
                className="w-full flex items-center justify-between bg-paper rounded-xl px-3 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium text-ink">{m.branches?.name}</div>
                  <div className="text-[11px] text-slate capitalize">{m.role}</div>
                </div>
                {m.branch_id === currentBranchId && <Check size={16} className="text-good" />}
              </button>
            ))}
          </div>
          <SecondaryBtn full onClick={() => setShowCreate(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={14} /> Add another branch
            </span>
          </SecondaryBtn>
        </>
      ) : (
        <>
          <Field label="Branch name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="New Branch" />
          </Field>
          <div className="flex gap-2 mt-2">
            <SecondaryBtn full onClick={() => setShowCreate(false)}>Back</SecondaryBtn>
            <PrimaryBtn full disabled={busy || !name.trim()} onClick={submit}>
              {busy ? "Creating…" : "Create"}
            </PrimaryBtn>
          </div>
        </>
      )}
    </Modal>
  );
}
