import React, { useState } from "react";
import { Plus, Package, Glasses, Eye, Droplet, AlertTriangle, Mic, Loader2, FileSpreadsheet, Keyboard, Barcode } from "lucide-react";
import { createInventoryItem, updateInventoryItem, deleteInventoryItem, parseInventoryCommand } from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState } from "../shared/ui";
import { currency } from "../../lib/format";
import { ITEM_TYPES, itemTypeLabel } from "../../lib/rxConstants";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import ItemFormModal from "./ItemFormModal";
import ImportExcelModal from "./ImportExcelModal";
import TextCommandModal from "./TextCommandModal";
import PrintLabelsModal from "./PrintLabelsModal";

function voicePrefill(parsed) {
  return {
    type: ITEM_TYPES.some((t) => t.id === parsed.type) ? parsed.type : "frame",
    brand: parsed.brand || "",
    model: parsed.model || "",
    sku: parsed.sku || "",
    price: parsed.price != null ? String(parsed.price) : "",
    stock: parsed.stock != null ? String(parsed.stock) : "",
  };
}

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
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTextAdd, setShowTextAdd] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  const filtered = inventory.filter((i) => filter === "all" || i.type === filter);

  const addItem = async (data) => {
    try {
      const saved = await createInventoryItem(branchId, data);
      setInventory([saved, ...inventory]);
      setShowAdd(false);
      setVoiceDraft(null);
    } catch (e) {
      setError("Couldn't save item — please try again.");
    }
  };

  // Shared by the mic and typed-text entry points -- both just need a
  // sentence turned into a prefilled item, or an error message to show.
  const runCommand = async (text) => {
    try {
      const result = await parseInventoryCommand(text);
      if (result?.error === "not_configured") {
        return result.message || "AI entry isn't set up yet.";
      }
      if (result?.error) {
        return "Didn't catch that — please try again or add the item manually.";
      }
      setVoiceDraft(voicePrefill(result));
      return null;
    } catch (e) {
      return "Didn't catch that — please try again or add the item manually.";
    }
  };

  const { listening, supported: voiceSupported, start: startVoiceCommand } = useVoiceInput(async (text) => {
    setVoiceBusy(true);
    setError("");
    const errMsg = await runCommand(text);
    if (errMsg) setError(errMsg);
    setVoiceBusy(false);
  });
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
            <div className="flex items-center gap-2">
              <RoundIconBtn onClick={() => setShowLabels(true)}>
                <Barcode size={15} />
              </RoundIconBtn>
              <RoundIconBtn onClick={() => setShowImport(true)}>
                <FileSpreadsheet size={15} />
              </RoundIconBtn>
              <RoundIconBtn onClick={() => setShowTextAdd(true)}>
                <Keyboard size={15} />
              </RoundIconBtn>
              {voiceSupported && (
                <RoundIconBtn onClick={startVoiceCommand} tone={listening ? "warn" : "default"}>
                  {voiceBusy ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
                </RoundIconBtn>
              )}
              <RoundIconBtn onClick={() => setShowAdd(true)} tone="focus">
                <Plus size={17} className="text-ink" />
              </RoundIconBtn>
            </div>
          ) : undefined
        }
      />
      {isOwner && (listening || voiceBusy) && (
        <div className="px-5 mb-3">
          <p className="text-xs rounded-lg px-3 py-2 text-lens bg-lensSoft">
            {listening ? "Listening — say what to add, e.g. \"add ten black frames, price two thousand\"…" : "Reading that…"}
          </p>
        </div>
      )}
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

      {isOwner && showAdd && <ItemFormModal title="Add stock item" inventory={inventory} onClose={() => setShowAdd(false)} onSave={addItem} />}
      {isOwner && editItem && (
        <ItemFormModal title="Edit item" initial={editItem} inventory={inventory} onClose={() => setEditItem(null)} onSave={saveEdit} onDelete={() => removeItem(editItem.id)} />
      )}
      {isOwner && voiceDraft && (
        <ItemFormModal title="Add stock item" initial={voiceDraft} inventory={inventory} onClose={() => setVoiceDraft(null)} onSave={addItem} />
      )}
      {isOwner && showImport && (
        <ImportExcelModal
          branchId={branchId}
          inventory={inventory}
          onClose={() => setShowImport(false)}
          onImported={({ created, updated }) => {
            const updatedIds = new Set(updated.map((u) => u.id));
            setInventory([...created, ...inventory.map((i) => (updatedIds.has(i.id) ? updated.find((u) => u.id === i.id) : i))]);
            setShowImport(false);
          }}
        />
      )}
      {isOwner && showTextAdd && (
        <TextCommandModal
          onClose={() => setShowTextAdd(false)}
          onParse={async (text) => {
            const errMsg = await runCommand(text);
            if (!errMsg) setShowTextAdd(false);
            return errMsg;
          }}
        />
      )}
      {isOwner && showLabels && <PrintLabelsModal inventory={inventory} onClose={() => setShowLabels(false)} />}
    </div>
  );
}
