import React, { useState } from "react";
import { updateBranch, signOut } from "../../lib/api";
import { Modal, Field, TextInput, TextArea, PrimaryBtn, SecondaryBtn } from "../shared/ui";
import StaffModal from "./StaffModal";

export default function ShopDetailsModal({ shopInfo, onClose, isOwner, branchId, onBranchUpdated }) {
  const [name, setName] = useState(shopInfo.name || "");
  const [address, setAddress] = useState(shopInfo.address || "");
  const [phone, setPhone] = useState(shopInfo.phone || "");
  const [gstin, setGstin] = useState(shopInfo.gstin || "");
  const [googleReviewLink, setGoogleReviewLink] = useState(shopInfo.google_review_link || "");
  const [upiId, setUpiId] = useState(shopInfo.upi_id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showStaff, setShowStaff] = useState(false);

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

  return (
    <Modal title="Shop details" onClose={onClose}>
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
      </div>

      <button onClick={() => signOut()} className="text-xs font-medium text-warn mt-4 mx-auto block">
        Sign out
      </button>
    </Modal>
  );
}
