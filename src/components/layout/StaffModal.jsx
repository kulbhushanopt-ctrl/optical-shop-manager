import React, { useEffect, useState } from "react";
import { MessageCircle, UserMinus, X } from "lucide-react";
import { fetchBranchStaff, fetchPendingInvites, inviteStaff, cancelInvite, removeBranchMember } from "../../lib/api";
import { Modal, Field, TextInput, PrimaryBtn, Spinner } from "../shared/ui";
import { openWhatsapp } from "../../lib/share";
import { staffInviteMessage } from "../../lib/messages";

export default function StaffModal({ branchId, branchName, onClose }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([fetchBranchStaff(branchId), fetchPendingInvites(branchId)]);
      setMembers(m);
      setInvites(i);
    } catch (e) {
      setError("Couldn't load staff.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const submitInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      await inviteStaff(branchId, email.trim());
      setEmail("");
      await load();
    } catch (e) {
      setError(e.message?.includes("duplicate") ? "Already invited." : "Couldn't send invite.");
    }
    setBusy(false);
  };

  const removeMember = async (userId) => {
    try {
      await removeBranchMember(branchId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (e) {
      setError("Couldn't remove member.");
    }
  };

  const removeInvite = async (id) => {
    try {
      await cancelInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError("Couldn't cancel invite.");
    }
  };

  return (
    <Modal title={`Staff · ${branchName}`} onClose={onClose}>
      {loading ? (
        <Spinner />
      ) : (
        <>
          <form onSubmit={submitInvite} className="mb-5">
            <Field label="Invite by email">
              <div className="flex gap-2">
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@shop.com" />
                <PrimaryBtn type="submit" disabled={busy || !email.trim()}>Invite</PrimaryBtn>
              </div>
            </Field>
            {error && <p className="text-xs text-warn">{error}</p>}
          </form>
          <p className="text-[10px] text-slate -mt-3 mb-4">
            After inviting, tap the WhatsApp icon next to their name below to send them a sign-up link — they just need to
            sign in or sign up with the same email address to get access.
          </p>

          <p className="text-xs font-semibold text-slate mb-2">Members</p>
          <div className="space-y-2 mb-4">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between bg-paper rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-ink truncate">{m.email || m.user_id}</div>
                  <div className="text-[11px] text-slate capitalize">{m.role}</div>
                </div>
                {m.role !== "owner" && (
                  <button onClick={() => removeMember(m.user_id)} className="text-warn p-1">
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {invites.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate mb-2">Pending invites</p>
              <div className="space-y-2">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between bg-paper rounded-xl px-3 py-2">
                    <div className="text-sm text-ink truncate">{i.email}</div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openWhatsapp(staffInviteMessage({ shopName: branchName, email: i.email }))}
                        className="text-good p-1"
                        aria-label="Share invite link via WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button onClick={() => removeInvite(i.id)} className="text-slate p-1">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
