import React, { useRef, useState } from "react";
import { Glasses, Loader2 } from "lucide-react";
import { updateBranch, signOut } from "../../lib/api";
import { compressImage } from "../../lib/image";
import { Modal, Field, TextInput, TextArea, PrimaryBtn, SecondaryBtn } from "../shared/ui";
import StaffModal from "./StaffModal";
import AiKeyModal from "./AiKeyModal";
import { notifyFilePickerOpening } from "../../hooks/useModalBackClose";

export default function ShopDetailsModal({ shopInfo, onClose, isOwner, branchId, onBranchUpdated }) {
  const [name, setName] = useState(shopInfo.name || "");
  const [address, setAddress] = useState(shopInfo.address || "");
  const [phone, setPhone] = useState(shopInfo.phone || "");
  const [gstin, setGstin] = useState(shopInfo.gstin || "");
  const [googleReviewLink, setGoogleReviewLink] = useState(shopInfo.google_review_link || "");
  const [upiId, setUpiId] = useState(shopInfo.upi_id || "");
  const [logo, setLogo] = useState(shopInfo.logo || null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showStaff, setShowStaff] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    try {
      const compressed = await compressImage(file, 400, 0.85);
      setLogo(compressed);
    } catch (err) {
      alert("Couldn't process that image — please try another.");
    }
    setLogoLoading(false);
    e.target.value = "";
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await updateBranch(branchId, {
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        gstin: gstin.trim() || null,
        google_review_link: googleReviewLink.trim() || null,
        upi_id: upiId.trim() || null,
        logo: logo || null,
      });
      onBranchUpdated(updated);
      onClose();
    } catch (e) {
      setError("Couldn't save changes.");
    }
    setBusy(false);
  };

  if (showStaff) {
    return <StaffModal branchId={branchId} branchName={shopInfo.name} onClose={() => setShowStaff(false)} />;
  }

  if (showAiKey) {
    return <AiKeyModal branchId={branchId} onClose={() => setShowAiKey(false)} />;
  }

  return (
    <Modal title="Shop details" onClose={onClose}>
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoPick} />
      <div className="flex flex-col items-center mb-4">
        <button
          onClick={() => {
            if (!isOwner) return;
            notifyFilePickerOpening();
            logoInputRef.current?.click();
          }}
          className="relative"
          disabled={!isOwner || logoLoading}
          type="button"
        >
          {logoLoading ? (
            <div className="w-16 h-16 rounded-full border-[1.5px] border-dashed border-border flex items-center justify-center">
              <Loader2 size={18} className="text-slate animate-spin" />
            </div>
          ) : logo ? (
            <img src={logo} alt="Shop logo" className="w-16 h-16 rounded-full object-cover border-2 border-focus" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-focus flex items-center justify-center">
              <Glasses size={26} className="text-ink" strokeWidth={2.4} />
            </div>
          )}
        </button>
        {isOwner && (
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => {
                notifyFilePickerOpening();
                logoInputRef.current?.click();
              }}
              className="text-[11px] font-medium text-lens"
            >
              {logo ? "Change logo" : "Add logo"}
            </button>
            {logo && (
              <button type="button" onClick={() => setLogo(null)} className="text-[11px] font-medium text-warn">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
      <Field label="Shop name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} disabled={!isOwner} />
      </Field>
      <Field label="Address">
        <TextArea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} disabled={!isOwner} />
      </Field>
      <Field label="Phone">
        <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isOwner} />
      </Field>
      <Field label="GSTIN (optional)">
        <TextInput value={gstin} onChange={(e) => setGstin(e.target.value)} disabled={!isOwner} />
      </Field>
      <Field label="Google review link (optional)">
        <TextInput
          value={googleReviewLink}
          onChange={(e) => setGoogleReviewLink(e.target.value)}
          placeholder="https://g.page/r/.../review"
          disabled={!isOwner}
        />
      </Field>
      <Field label="UPI ID (optional)">
        <TextInput
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="yourshop@okhdfcbank"
          disabled={!isOwner}
        />
        <p className="text-[10px] text-slate mt-1">Lets you show a "Scan to pay" QR code on invoices, using this UPI ID.</p>
      </Field>
      {error && <p className="text-xs text-warn mb-3">{error}</p>}

      <div className="space-y-2">
        {isOwner && (
          <PrimaryBtn full disabled={busy || !name.trim()} onClick={save}>
            {busy ? "Saving…" : "Save changes"}
          </PrimaryBtn>
        )}

        {isOwner && (
          <SecondaryBtn full onClick={() => setShowStaff(true)}>
            Manage staff
          </SecondaryBtn>
        )}

        {isOwner && (
          <SecondaryBtn full onClick={() => setShowAiKey(true)}>
            AI usage & API key
          </SecondaryBtn>
        )}
      </div>

      <button onClick={() => signOut()} className="text-xs font-medium text-warn mt-4 mx-auto block">
        Sign out
      </button>
    </Modal>
  );
}
