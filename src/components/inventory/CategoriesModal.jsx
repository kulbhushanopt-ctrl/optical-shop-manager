import React, { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal, Field, TextInput, PrimaryBtn } from "../shared/ui";
import { createBranchCategory, updateBranchCategory, deleteBranchCategory } from "../../lib/api";

// Lets an owner define their own frame category list (e.g. "Oval",
// "Square", "Supra" instead of -- or alongside -- the starter gender/
// material/tier set every branch is seeded with) instead of being stuck
// with one fixed scheme. The code doubles as the SKU prefix everywhere
// else in the app, so it's kept short and uppercased.
export default function CategoriesModal({ branchId, categories, setCategories, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startEdit = (cat) => {
    setEditingId(cat.dbId);
    setEditCode(cat.id);
    setEditLabel(cat.label);
  };

  const saveEdit = async () => {
    if (!editCode.trim() || !editLabel.trim()) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateBranchCategory(editingId, { code: editCode, label: editLabel });
      setCategories(categories.map((c) => (c.dbId === editingId ? updated : c)));
      setEditingId(null);
    } catch (e) {
      setError(e.message?.includes("duplicate") ? "That code is already used by another category." : "Couldn't save changes.");
    }
    setBusy(false);
  };

  const remove = async (cat) => {
    setBusy(true);
    setError("");
    try {
      await deleteBranchCategory(cat.dbId);
      setCategories(categories.filter((c) => c.dbId !== cat.dbId));
    } catch (e) {
      setError("Couldn't delete this category.");
    }
    setBusy(false);
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCode.trim() || !newLabel.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createBranchCategory(branchId, { code: newCode, label: newLabel, sortOrder: categories.length });
      setCategories([...categories, created]);
      setNewCode("");
      setNewLabel("");
    } catch (e) {
      setError(e.message?.includes("duplicate") ? "That code is already used by another category." : "Couldn't add category.");
    }
    setBusy(false);
  };

  return (
    <Modal title="Frame categories" onClose={onClose}>
      <p className="text-xs text-slate mb-3">
        Your own category list for frames and sunglasses — each one's code doubles as its SKU prefix (e.g. "OV" → OV-001).
        Used in Add Item, Excel import, photo scans, and voice/text commands.
      </p>

      <div className="space-y-2 mb-4">
        {categories.map((cat) => (
          <div key={cat.dbId} className="rounded-xl px-3 py-2 bg-paper">
            {editingId === cat.dbId ? (
              <div className="flex items-center gap-2">
                <div className="w-16 flex-shrink-0">
                  <TextInput value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="Code" />
                </div>
                <div className="flex-1">
                  <TextInput value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" />
                </div>
                <button onClick={saveEdit} disabled={busy} className="text-xs font-semibold text-lens px-1.5 flex-shrink-0">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate p-1 flex-shrink-0" aria-label="Cancel">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-mono font-semibold text-ink">{cat.id}</span>
                  <span className="text-sm text-ink ml-2 truncate">{cat.label}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(cat)} className="text-slate p-1" aria-label="Edit">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(cat)} disabled={busy} className="text-warn p-1" aria-label="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="text-xs text-slate">No categories yet — add your first one below.</p>}
      </div>

      <form onSubmit={addCategory} className="mb-2">
        <Field label="Add a category">
          <div className="flex gap-2">
            <div className="w-16 flex-shrink-0">
              <TextInput value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="OV" />
            </div>
            <div className="flex-1">
              <TextInput value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Oval" />
            </div>
            <PrimaryBtn type="submit" disabled={busy || !newCode.trim() || !newLabel.trim()}>
              <Plus size={15} />
            </PrimaryBtn>
          </div>
        </Field>
      </form>
      {error && <p className="text-[11px] text-warn">{error}</p>}
      <p className="text-[10px] text-slate mt-2">
        Deleting a category doesn't change items that already use it — they'll keep their old code until you edit them.
      </p>
    </Modal>
  );
}
