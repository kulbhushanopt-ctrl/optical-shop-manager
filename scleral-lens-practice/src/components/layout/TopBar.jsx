import React, { useState } from "react";
import { ScanEye, LogOut } from "lucide-react";
import { signOut } from "../../lib/api";

export default function TopBar() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-paper sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="bg-focus rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
          <ScanEye size={16} className="text-white" strokeWidth={2.2} />
        </div>
        <h1 className="font-display text-sm font-bold text-ink">Scleral Lens Practice</h1>
      </div>
      {confirming ? (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setConfirming(false)} className="text-[11px] px-2 py-1 text-slate">Cancel</button>
          <button onClick={() => signOut()} className="text-[11px] px-2.5 py-1 rounded-full text-white font-medium bg-warn">Sign out</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center" aria-label="Sign out">
          <LogOut size={14} className="text-slate" />
        </button>
      )}
    </div>
  );
}
