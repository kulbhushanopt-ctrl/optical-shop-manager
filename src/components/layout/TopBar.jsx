import React, { useState } from "react";
import { Glasses, ChevronDown } from "lucide-react";
import ShopDetailsModal from "./ShopDetailsModal";
import BranchSwitcherModal from "./BranchSwitcherModal";

export default function TopBar({ shopInfo, onBranchUpdated, isOwner, branchId, memberships, onSwitchBranch, onBranchCreated }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const hasMultipleBranches = memberships && memberships.length > 1;

  return (
    <div className="bg-ink px-5 pt-6 pb-5 flex items-center gap-3 sticky top-0 z-20">
      <div className="bg-focus rounded-full w-[38px] h-[38px] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {shopInfo.logo ? (
          <img src={shopInfo.logo} alt="" className="w-full h-full object-cover" />
        ) : (
          <Glasses size={19} className="text-ink" strokeWidth={2.4} />
        )}
      </div>
      <button onClick={() => setShowDetails(true)} className="text-left flex-1 min-w-0">
        <div className="font-display text-white text-lg font-semibold leading-tight truncate">{shopInfo.name}</div>
        <div className="text-[11px] mt-0.5 truncate" style={{ color: "#8FA3C4" }}>
          {shopInfo.address || "Tap to add shop details"}
        </div>
      </button>
      {hasMultipleBranches && (
        <button
          onClick={() => setShowSwitcher(true)}
          className="flex items-center gap-1 text-white text-xs bg-white/10 rounded-full px-3 py-1.5 flex-shrink-0"
        >
          Switch <ChevronDown size={14} />
        </button>
      )}

      {showDetails && (
        <ShopDetailsModal
          shopInfo={shopInfo}
          onClose={() => setShowDetails(false)}
          isOwner={isOwner}
          branchId={branchId}
          onBranchUpdated={onBranchUpdated}
        />
      )}
      {showSwitcher && (
        <BranchSwitcherModal
          memberships={memberships}
          currentBranchId={branchId}
          onSelect={onSwitchBranch}
          onClose={() => setShowSwitcher(false)}
          onBranchCreated={onBranchCreated}
        />
      )}
    </div>
  );
}
