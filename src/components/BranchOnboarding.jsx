import React, { useState } from "react";
import { Glasses } from "lucide-react";
import { createBranch, signOut } from "../lib/api";
import { Field, TextInput, TextArea, PrimaryBtn } from "./shared/ui";

export default function BranchOnboarding({ onCreated }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const branch = await createBranch({ name: name.trim(), address: address.trim(), phone: phone.trim() });
      onCreated(branch);
    } catch (e) {
      setError("Couldn't create branch — please try again.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-focus rounded-full w-[52px] h-[52px] flex items-center justify-center mb-3">
            <Glasses size={24} className="text-ink" strokeWidth={2.4} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">Set up your first branch</h1>
          <p className="text-xs text-slate mt-1 text-center">
            You'll be the owner of this branch and can invite staff or add more branches later.
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <Field label="Branch name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Street Branch" />
          </Field>
          <Field label="Address">
            <TextArea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop no., street, city" rows={2} />
          </Field>
          <Field label="Phone">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          {error && <p className="text-xs text-warn mb-3">{error}</p>}
          <PrimaryBtn full disabled={busy || !name.trim()} onClick={submit}>
            {busy ? "Creating…" : "Create branch"}
          </PrimaryBtn>
        </div>
        <button onClick={() => signOut()} className="text-xs font-medium text-slate mt-4 mx-auto block">
          Sign out
        </button>
      </div>
    </div>
  );
}
