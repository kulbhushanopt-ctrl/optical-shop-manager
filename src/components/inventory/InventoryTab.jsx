import React, { useState } from "react";
import { Plus, Package, Glasses, Eye, Droplet, AlertTriangle, Mic, Loader2, FileSpreadsheet, Keyboard, Barcode, Camera, Search } from "lucide-react";
import {
  createInventoryItem,
  createInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  parseInventoryCommand,
  deleteLabelReservation,
} from "../../lib/api";
import { SectionHeader, RoundIconBtn, EmptyState } from "../shared/ui";
import { currency } from "../../lib/format";
import { ITEM_TYPES, itemTypeLabel, frameCategoryLabel, suggestNextSku, FRAME_CATEGORIES, detectCategoryFromText } from "../../lib/rxConstants";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import ItemFormModal from "./ItemFormModal";
import ImportExcelModal from "./ImportExcelModal";
import ScanStockListModal from "./ScanStockListModal";
import TextCommandModal from "./TextCommandModal";
import PrintLabelsModal from "./PrintLabelsModal";

// A single spoken number is either how many units of ONE named item to
// stock, or how many SEPARATE un-named items to create -- never both (see
// the parse-inventory-command prompt). Only the single-item path needs a
// prefilled form; a category is enough to auto-suggest its SKU even without
// an explicit one, same as the manual Add Item form's "Use next" button.
function voicePrefill(parsed, inventory) {
  const category = parsed.category || "";
  const sku = parsed.sku || (category ? suggestNextSku(category, inventory) : "");
  return {
    type: ITEM_TYPES.some((t) => t.id === parsed.type) ? parsed.type : "frame",
    category,
    brand: parsed.brand || "",
    model: parsed.model || "",
    sku,
    price: parsed.price != null ? String(parsed.price) : "",
    purchasePrice: parsed.purchaseCost != null ? String(parsed.purchaseCost) : "",
    stock: parsed.stock != null ? String(parsed.stock) : "",
  };
}

function ItemIcon({ type }) {
  if (["frame", "sunglasses"].includes(type)) return <Glasses size={16} className="text-focus" />;
  if (type === "accessory") return <Package size={16} className="text-lens" />;
  if (type === "contact") return <Droplet size={16} className="text-lens" />;
  return <Eye size={16} className="text-lens" />;
}

export default function InventoryTab({ inventory, setInventory, branchId, isOwner, shopName }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState("");
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showScanList, setShowScanList] = useState(false);
  const [showTextAdd, setShowTextAdd] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = inventory.filter((i) => {
    if (filter !== "all" && i.type !== filter) return false;
    if (!q) return true;
    return (
      (i.brand || "").toLowerCase().includes(q) ||
      (i.model || "").toLowerCase().includes(q) ||
      (i.sku || "").toLowerCase().includes(q)
    );
  });

  const addItem = async (data) => {
    try {
      const saved = await createInventoryItem(branchId, data);
      setInventory([saved, ...inventory]);
      setShowAdd(false);
      setVoiceDraft(null);
      // Clears the printed-label reservation (if this SKU came from a
      // scanned blank label) now that it's a real inventory item.
      if (saved.sku) deleteLabelReservation(branchId, saved.sku).catch(() => {});
    } catch (e) {
      setError("Couldn't save item — please try again.");
    }
  };

  // Shared by the mic and typed-text entry points -- both just need a
  // sentence turned into a prefilled item, or an error message to show.
  const runCommand = async (text) => {
    try {
      const result = await parseInventoryCommand(text, branchId);
      if (result?.error === "not_configured") {
        return result.message || "AI entry isn't set up yet.";
      }
      if (result?.error) {
        return "Didn't catch that — please try again or add the item manually.";
      }
      const category = result.category || detectCategoryFromText(text) || "";
      const qty = Math.max(0, Math.min(100, Number(result.quantity) || 0));
      if (qty > 1) {
        // "Twenty frames of gents metal" (no brand named) or "Giovani 11
        // frames ... each to have a separate SKU" (brand named, but still
        // wants individual listings) -- either way this creates that many
        // separate, individually-SKU'd rows instead of opening the
        // single-item form. Brand carries over if one was named; model is
        // always left blank for the shopkeeper to fill in per frame later
        // (the same "generate now, detail later" flow as blank labels).
        const type = ITEM_TYPES.some((t) => t.id === result.type) ? result.type : "frame";
        const price = result.price != null ? Number(result.price) : 0;
        const purchasePrice = result.purchaseCost != null ? Number(result.purchaseCost) : null;
        const brand = result.brand || "";
        const skusSoFar = [];
        const items = [];
        for (let i = 0; i < qty; i++) {
          const sku = suggestNextSku(category || type, inventory, skusSoFar);
          skusSoFar.push(sku);
          items.push({ type, category: category || null, brand, model: "", sku, price, purchasePrice, stock: 1, low: 3 });
        }
        const created = await createInventoryItems(branchId, items);
        setInventory([...created, ...inventory]);
        return null;
      }
      setVoiceDraft(voicePrefill({ ...result, category }, inventory));
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
              <RoundIconBtn onClick={() => setShowScanList(true)}>
                <Camera size={15} />
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
      <div className="px-5 mb-3">
        <div className="rounded-xl px-3 py-2 flex items-center gap-2 bg-card border border-border">
          <Search size={15} className="text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand, model, or SKU…"
            className="flex-1 outline-none text-sm bg-transparent text-ink"
          />
        </div>
      </div>
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
        inventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No stock items"
            subtitle={isOwner ? "Add frames and lenses to track inventory and pricing." : "No items have been added to this branch yet."}
          />
        ) : (
          <EmptyState icon={Search} title="No matching items" subtitle="Try a different search term or filter." />
        )
      ) : (
        <div className="px-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const isLow = item.stock <= item.low;
            return (
              <div
                key={item.id}
                onClick={isOwner ? () => setEditItem(item) : undefined}
                className={`rounded-2xl p-3.5 flex items-center gap-3 text-left bg-card border border-border/70 shadow-sm shadow-ink/[0.03] ${
                  isOwner ? "active:scale-[0.98] transition duration-150 cursor-pointer" : ""
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
                    {item.category ? frameCategoryLabel(item.category) : itemTypeLabel(item.type)} · {item.sku} · {currency(item.price)}
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

      {isOwner && showAdd && (
        <ItemFormModal
          title="Add stock item"
          inventory={inventory}
          branchId={branchId}
          onClose={() => setShowAdd(false)}
          onSave={addItem}
          onFoundExisting={(item) => {
            setShowAdd(false);
            setEditItem(item);
          }}
        />
      )}
      {isOwner && editItem && (
        <ItemFormModal title="Edit item" initial={editItem} inventory={inventory} branchId={branchId} onClose={() => setEditItem(null)} onSave={saveEdit} onDelete={() => removeItem(editItem.id)} />
      )}
      {isOwner && voiceDraft && (
        <ItemFormModal
          title="Add stock item"
          initial={voiceDraft}
          inventory={inventory}
          branchId={branchId}
          onClose={() => setVoiceDraft(null)}
          onSave={addItem}
          onFoundExisting={(item) => {
            setVoiceDraft(null);
            setEditItem(item);
          }}
        />
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
      {isOwner && showScanList && (
        <ScanStockListModal
          branchId={branchId}
          inventory={inventory}
          onClose={() => setShowScanList(false)}
          onImported={(created) => {
            setInventory([...created, ...inventory]);
            setShowScanList(false);
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
      {isOwner && showLabels && (
        <PrintLabelsModal inventory={inventory} shopName={shopName} branchId={branchId} onClose={() => setShowLabels(false)} />
      )}
    </div>
  );
}
