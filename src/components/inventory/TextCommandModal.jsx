import React, { useState } from "react";
import { Modal, TextInput, PrimaryBtn } from "../shared/ui";

export default function TextCommandModal({ onClose, onParse }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    const errMsg = await onParse(text.trim());
    if (errMsg) setError(errMsg);
    setBusy(false);
  };

  return (
    <Modal title="Add by typing" onClose={onClose}>
      <p className="text-xs text-slate mb-3">
        Type what to add, e.g. "add ten black Ray-Ban frames, price two thousand each".
      </p>
      <TextInput
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Add ten black frames, price 2000…'
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      {error && <p className="text-[11px] text-warn mt-2">{error}</p>}
      <div className="mt-3">
        <PrimaryBtn full disabled={!text.trim() || busy} onClick={submit}>
          {busy ? "Reading…" : "Parse & review"}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
