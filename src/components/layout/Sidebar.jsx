import React from "react";
import { Glasses } from "lucide-react";

// Desktop/tablet-only left nav (md and up) -- mirrors BottomNav's tabs so
// the same `tab` state drives navigation on both layouts. Hidden on mobile,
// where BottomNav is used instead.
export default function Sidebar({ tabs, active, onChange, shopInfo }) {
  return (
    <div className="hidden md:flex md:flex-col w-56 flex-shrink-0 bg-ink min-h-screen sticky top-0 self-start">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-6">
        <div className="bg-focus rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-white/10">
          {shopInfo.logo ? (
            <img src={shopInfo.logo} alt="" className="w-full h-full object-cover" />
          ) : (
            <Glasses size={18} className="text-ink" strokeWidth={2.4} />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-display text-white text-sm font-semibold leading-tight truncate">{shopInfo.name}</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1 px-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition duration-150 active:scale-[0.98] ${
                isActive ? "bg-focus text-ink font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
