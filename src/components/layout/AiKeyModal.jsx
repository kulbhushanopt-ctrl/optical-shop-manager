import React, { useEffect, useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Modal, Field, TextInput, PrimaryBtn, SecondaryBtn } from "../shared/ui";
import { hasBranchGeminiKey, setBranchGeminiKey, clearBranchGeminiKey } from "../../lib/api";

// Every AI feature (photo scans, voice/text inventory entry) shares one
// Gemini key by default, capped at 20 free requests/day project-wide across
// EVERY shop on this deployment. Setting a key here makes this branch use
// its own quota instead, so heavy use by one shop never blocks another's.
export default function AiKeyModal({ branchId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    hasBranchGeminiKey(branchId)
      .then(setHasKey)
      .catch(() => setError("Couldn't check the current status — please try again."))
      .finally(() => setLoading(false));
  }, [branchId]);

  const save = async () => {
    if (!keyInput.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setBranchGeminiKey(branchId, keyInput.trim());
      setHasKey(true);
      setKeyInput("");
      setNotice("Saved — this shop now uses its own Gemini key for AI scans and voice/text entry.");
    } catch (e) {
      setError("Couldn't save that key — please check it and try again.");
    }
    setBusy(false);
  };

  const clear = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await clearBranchGeminiKey(branchId);
      setHasKey(false);
      setNotice("Reverted to the shared default key.");
    } catch (e) {
      setError("Couldn't clear the key — please try again.");
    }
    setBusy(false);
  };

  return (
    <Modal title="AI usage & API key" onClose={onClose}>
      <p className="text-xs text-slate mb-3">
        Photo scans and voice/text inventory entry all use Google's Gemini AI. By default every shop on this app
        shares one key with a free daily limit — so heavy use by one shop can use up another shop's scans for the
        day. Setting your own key here gives this shop its own separate daily limit.
      </p>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate" /></div>
      ) : (
        <>
          <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 text-xs font-medium ${hasKey ? "bg-lensSoft text-lens" : "bg-card border border-border text-slate"}`}>
            {hasKey ? <Check size={14} /> : <Sparkles size={14} />}
            {hasKey ? "This shop is using its own Gemini key." : "This shop is using the shared default key."}
          </div>

          <Field label={hasKey ? "Replace key" : "Gemini API key"}>
            <TextInput
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIza…"
              type="password"
            />
          </Field>
          <p className="text-[10px] text-slate -mt-2 mb-3">
            Get a free key from Google AI Studio (aistudio.google.com) — sign in with any Google account, create an
            API key, and paste it here. Google's free tier still has its own daily cap, but it's separate from every
            other shop's usage.
          </p>

          {notice && <p className="text-[11px] text-lens mb-2">{notice}</p>}
          {error && <p className="text-[11px] text-warn mb-2">{error}</p>}

          <div className="space-y-2">
            <PrimaryBtn full disabled={busy || !keyInput.trim()} onClick={save}>
              {busy ? "Saving…" : hasKey ? "Save new key" : "Save key"}
            </PrimaryBtn>
            {hasKey && (
              <SecondaryBtn full disabled={busy} onClick={clear}>
                Revert to shared default
              </SecondaryBtn>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
