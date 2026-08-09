import React, { useState } from "react";
import { Plus, Package, Glasses, Eye, Droplet, AlertTriangle } from "lucide-react";
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState } from "../shared/ui";
import { currency } from "../../lib/format";
import { ITEM_TYPES, itemTypeLabel } from "../../lib/rxConstants";
import ItemFormModal from "./ItemFormModal";

function ItemIcon({ type }) {
  if (["frame", "sunglasses"].includes(type)) return <Glasses size={16} className="text-focus" />;
  if (type === "accessory") return <Package size={16} className="text-lens" />;
  if (type === "contact") return <Droplet size={16} className="text-lens" />;
  return <Eye size={16} className="text-lens" />;
}

export default function InventoryTab({ inventory, setInventory, branchId, isOwner }) {
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState("");

  const filtered = inventory.filter((i) => filter === "all" || i.type === filter);

  const addItem = async (data) => {
    try {
      const saved = await createInventoryItem(branchId, data);
      setInventory([saved, ...inventory]);
      setShowAdd(false);
    } catch (e) {
      setError("Couldn't save item — please try again.");
    }
  };
  const saveEdit = async (updated) => {
    try {
      const saved = await updateInventoryItem(updated.id, updated);
      setInventory(inventory.map((i) => (i.id === saved.id ? saved : i)));
      setEditItem(null);
    } catch (e) {
      setError("Couldn't save changes — please try again.");
    }
  };
  const removeItem = async (id) => {
    try {
      await deleteInventoryItem(id);
      setInventory(inventory.filter((i) => i.id !== id));
      setEditItem(null);
    } catch (e) {
      setError("Only the shop owner can remove stock items.");
    }
  };

  return (
    <div>
      <SectionHeader
        title="Stock"
        subtitle={`${inventory.length} items · ${inventory.filter((i) => i.stock <= i.low).length} low`}
        action={
          isOwner ? (
            <RoundIconBtn onClick={() => setShowAdd(true)} tone="focus">
              <Plus size={17} className="text-ink" />
            </RoundIconBtn>
          ) : undefined
        }
      />
      {error && (
        <div className="px-5 mb-3">
          <p className="text-xs rounded-lg px-3 py-2 text-warn bg-warnSoft">{error}</p>
        </div>
      )}
      <div className="px-5 flex gap-2 mb-3 overflow-x-auto">
        {[{ id: "all", label: "All" }, ...ITEM_TYPES].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 border ${
              filter === f.id ? "bg-ink text-white border-ink" : "bg-card text-slate border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No stock items"
          subtitle={isOwner ? "Add frames and lenses to track inventory and pricing." : "No items have been added to this branch yet."}
        />
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {filtered.map((item) => {
            const isLow = item.stock <= item.low;
            return (
              <div
                key={item.id}
                onClick={isOwner ? () => setEditItem(item) : undefined}
                className={`rounded-2xl p-3.5 flex items-center gap-3 text-left bg-card border border-border ${
                  isOwner ? "active:scale-[0.99] transition-transform cursor-pointer" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    ["frame", "sunglasses"].includes(item.type) ? "bg-focusSoft" : "bg-lensSoft"
                  }`}
                >
                  <ItemIcon type={item.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-ink">
                    {item.brand} {item.model}
                  </p>
                  <p className="text-[11px] truncate text-slate font-mono">
                    {itemTypeLabel(item.type)} · {item.sku} · {currency(item.price)}
                    {item.type === "lens" && item.power && ` · ${item.power}${item.addPower ? ` / ${item.addPower}` : ""}`}
                    {item.type === "contact" && item.power && ` · ${item.power}`}
                    {item.type === "contact" && item.baseCurve && ` · BC ${item.baseCurve}`}
                    {item.type === "contact" && item.duration && ` · ${item.duration}`}
                  </p>
                </div>
                <div className={`text-sm font-semibold flex items-center gap-1 font-mono ${isLow ? "text-warn" : "text-slate"}`}>
                  {isLow && <AlertTriangle size={12} />}
                  {item.stock}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOwner && showAdd && <ItemFormModal title="Add stock item" onClose={() => setShowAdd(false)} onSave={addItem} />}
      {isOwner && editItem && (
        <ItemFormModal title="Edit item" initial={editItem} onClose={() => setEditItem(null)} onSave={saveEdit} onDelete={() => removeItem(editItem.id)} />
      )}
    </div>
  );
}
