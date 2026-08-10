import React, { useEffect, useState } from "react";
import { Glasses } from "lucide-react";
import { fetchMyShopRequest, createShopRequest, fetchMyInvite, acceptBranchInvite, signOut } from "../lib/api";
import { Field, TextInput, PrimaryBtn, Spinner } from "./shared/ui";
import BranchOnboarding from "./BranchOnboarding";

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-focus rounded-full w-[52px] h-[52px] flex items-center justify-center mb-3">
            <Glasses size={24} className="text-ink" strokeWidth={2.4} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink text-center">{title}</h1>
          {subtitle && <p className="text-xs text-slate mt-1 text-center">{subtitle}</p>}
        </div>
        {children}
        <button onClick={() => signOut()} className="text-xs font-medium text-slate mt-4 mx-auto block">
          Sign out
        </button>
      </div>
    </div>
  );
}

// Sits in front of BranchOnboarding for anyone with no branch: if they have
// a pending staff invite, it lets them accept it and join directly. If not,
// instead of blocking them outright, it collects a shop request and shows
// its status (pending/rejected), handing off to the normal branch creation
// screen once the owner has approved it.
export default function ShopAccessGate({ onCreated, onJoined }) {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [request, setRequest] = useState(null);
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchMyInvite().catch(() => null), fetchMyShopRequest().catch(() => null)])
      .then(([inv, req]) => {
        setInvite(inv);
        setRequest(req);
      })
      .finally(() => setLoading(false));
  }, []);

  const acceptInvite = async () => {
    setBusy(true);
    setError("");
    try {
      await acceptBranchInvite();
      await onJoined?.();
    } catch (e) {
      setError("Couldn't accept the invite — please try again.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Checking your access…" />;

  if (invite) {
    return (
      <Shell title="You've been invited" subtitle={`You've been added as staff for ${invite.branch_name}.`}>
        <div className="bg-card border border-border rounded-2xl p-5">
          {error && <p className="text-xs text-warn mb-3">{error}</p>}
          <PrimaryBtn full disabled={busy} onClick={acceptInvite}>
            {busy ? "Joining…" : `Join ${invite.branch_name}`}
          </PrimaryBtn>
        </div>
      </Shell>
    );
  }

  if (request?.status === "approved") {
    return <BranchOnboarding onCreated={onCreated} />;
  }

  if (request?.status === "pending") {
    return (
      <Shell
        title="Request submitted"
        subtitle="The shop owner has been notified. You'll be able to set up your shop once they approve your request."
      >
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-sm text-ink font-medium">{request.shop_name}</p>
          <p className="text-xs text-slate mt-1">Waiting for approval</p>
        </div>
      </Shell>
    );
  }

  if (request?.status === "rejected") {
    return (
      <Shell
        title="Request declined"
        subtitle="Your request to create a shop wasn't approved. Contact the app owner if you think this is a mistake."
      />
    );
  }

  const submit = async () => {
    if (!shopName.trim()) return;
    setBusy(true);
    setError("");
    try {
      const saved = await createShopRequest({ shopName: shopName.trim(), phone: phone.trim() });
      setRequest(saved);
    } catch (e) {
      setError("Couldn't submit your request — please try again.");
    }
    setBusy(false);
  };

  return (
    <Shell title="Request a new shop" subtitle="This app is invite-only. Submit your shop details and the owner will review your request.">
      <div className="bg-card border border-border rounded-2xl p-5">
        <Field label="Shop name">
          <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ashok Opticals" />
        </Field>
        <Field label="Phone (optional)">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </Field>
        {error && <p className="text-xs text-warn mb-3">{error}</p>}
        <PrimaryBtn full disabled={busy || !shopName.trim()} onClick={submit}>
          {busy ? "Submitting…" : "Request access"}
        </PrimaryBtn>
      </div>
    </Shell>
  );
}
