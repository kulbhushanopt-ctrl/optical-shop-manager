import React, { useMemo, useRef, useState } from "react";
import { Images, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Modal, PrimaryBtn } from "../shared/ui";
import { uploadProductPhoto, setInventoryPhoto } from "../../lib/api";
import { compressImageToBlob } from "../../lib/image";

// "FR-001.jpg", "fr-001 (2).JPG", "FR-001_front.png", "FR 001.jpeg" all
// point at SKU FR-001. Spaces/underscores count as dashes, case is ignored,
// and anything after the SKU (a copy number or "_front") is dropped when the
// exact name doesn't match.
function normalize(s) {
  return (s || "").toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").trim();
}

function matchSku(fileName, skuMap) {
  const base = normalize(fileName.replace(/\.[^.]+$/, "").replace(/\(\d+\)$/, "").trim());
  if (skuMap.has(base)) return skuMap.get(base);
  // Try progressively shorter prefixes: "FR-001-FRONT" -> "FR-001".
  const parts = base.split("-");
  for (let n = parts.length - 1; n >= 1; n--) {
    const candidate = parts.slice(0, n).join("-");
    if (skuMap.has(candidate)) return skuMap.get(candidate);
  }
  return null;
}

export default function BulkPhotosModal({ branchId, inventory, onClose, onUpdated }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState([]);
  const [finished, setFinished] = useState(false);

  const skuMap = useMemo(() => {
    const m = new Map();
    inventory.forEach((i) => {
      if (i.sku) m.set(normalize(i.sku), i);
    });
    return m;
  }, [inventory]);

  // First photo per SKU wins; extra angles of the same frame are skipped.
  const plan = useMemo(() => {
    const matched = [];
    const unmatched = [];
    const seen = new Set();
    files.forEach((file) => {
      const item = matchSku(file.name, skuMap);
      if (!item) return unmatched.push(file.name);
      if (seen.has(item.id)) return;
      seen.add(item.id);
      matched.push({ file, item });
    });
    const toUpload = matched.filter((m) => replaceExisting || !m.item.photoUrl);
    return { matched, unmatched, toUpload, skippedHasPhoto: matched.length - toUpload.length };
  }, [files, skuMap, replaceExisting]);

  const withoutPhoto = inventory.filter((i) => !i.photoUrl).length;

  const run = async () => {
    setRunning(true);
    setDone(0);
    setFailed([]);
    const updated = [];
    const bad = [];
    // Two at a time: fast enough for a few hundred photos, gentle enough on
    // a shop phone's memory and mobile data.
    const queue = [...plan.toUpload];
    const worker = async () => {
      while (queue.length) {
        const { file, item } = queue.shift();
        try {
          const blob = await compressImageToBlob(file);
          const url = await uploadProductPhoto(branchId, blob, item.sku);
          updated.push(await setInventoryPhoto(item.id, url));
        } catch (e) {
          bad.push(file.name);
        }
        setDone((d) => d + 1);
      }
    };
    await Promise.all([worker(), worker()]);
    setFailed(bad);
    setRunning(false);
    setFinished(true);
    if (updated.length) onUpdated(updated);
  };

  return (
    <Modal title="Add photos in bulk" onClose={running ? () => {} : onClose} wide>
      {!finished ? (
        <>
          <p className="text-xs text-slate leading-relaxed mb-3">
            Name each photo with the item's SKU, for example <span className="font-mono text-ink">FR-001.jpg</span> or{" "}
            <span className="font-mono text-ink">SG-078.jpg</span>, then pick them all at once. Each photo is matched to its stock item
            automatically. <b className="text-ink">{withoutPhoto}</b> of {inventory.length} items have no photo yet.
          </p>

          <button
            type="button"
            disabled={running}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-border py-6 flex flex-col items-center gap-2 text-slate active:scale-[0.99] transition disabled:opacity-50"
          >
            <Images size={24} />
            <span className="text-sm font-medium text-ink">{files.length ? `${files.length} photos selected — pick again to change` : "Choose photos"}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              setFiles(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />

          {files.length > 0 && (
            <div className="mt-3 space-y-2 text-xs">
              <p className="flex items-center gap-1.5 text-ink">
                <CheckCircle2 size={14} className="text-focus" /> {plan.matched.length} matched to a stock item
                {plan.skippedHasPhoto > 0 && !replaceExisting && <span className="text-slate"> ({plan.skippedHasPhoto} already have a photo)</span>}
              </p>
              {plan.unmatched.length > 0 && (
                <div className="rounded-lg px-3 py-2 bg-warnSoft text-warn">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertCircle size={14} /> {plan.unmatched.length} didn't match any SKU
                  </p>
                  <p className="mt-1 font-mono break-all opacity-80">
                    {plan.unmatched.slice(0, 8).join(", ")}
                    {plan.unmatched.length > 8 ? ` +${plan.unmatched.length - 8} more` : ""}
                  </p>
                </div>
              )}
              {plan.skippedHasPhoto > 0 && (
                <label className="flex items-center gap-2 text-ink">
                  <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} className="accent-ink" />
                  Replace photos that are already there
                </label>
              )}
            </div>
          )}

          {running && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-paper overflow-hidden">
                <div className="h-full bg-ink transition-all" style={{ width: `${(done / Math.max(1, plan.toUpload.length)) * 100}%` }} />
              </div>
              <p className="text-xs text-slate mt-1.5 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Uploading {done} of {plan.toUpload.length}… keep this screen open
              </p>
            </div>
          )}

          <div className="mt-4">
            <PrimaryBtn full disabled={running || plan.toUpload.length === 0} onClick={run}>
              {running ? "Uploading…" : `Upload ${plan.toUpload.length} photo${plan.toUpload.length === 1 ? "" : "s"}`}
            </PrimaryBtn>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <CheckCircle2 size={32} className="text-focus mx-auto mb-2" />
          <p className="text-sm font-semibold text-ink">{done - failed.length} photos added</p>
          {failed.length > 0 && (
            <p className="text-xs text-warn mt-2">
              {failed.length} didn't upload: <span className="font-mono">{failed.slice(0, 6).join(", ")}</span>. Try those again.
            </p>
          )}
          <div className="mt-4">
            <PrimaryBtn full onClick={onClose}>Done</PrimaryBtn>
          </div>
        </div>
      )}
    </Modal>
  );
}
