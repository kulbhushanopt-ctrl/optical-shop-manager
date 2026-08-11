import React from "react";
import { X, Loader2 } from "lucide-react";

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 sm:px-4 animate-modal-backdrop">
      <div
        className={`w-full ${wide ? "sm:max-w-lg" : "sm:max-w-sm"} bg-card rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/20 animate-modal-panel`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-card/95 backdrop-blur-sm z-10 border-b border-border/60">
          <h2 className="font-display font-semibold text-lg text-ink tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-slate hover:text-ink hover:bg-paper active:scale-90 transition p-1.5 -mr-1.5 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-6 pt-1">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-slate mb-1">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-focus focus:ring-2 focus:ring-focus/15 ${props.className || ""}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-focus focus:ring-2 focus:ring-focus/15"
    >
      {children}
    </select>
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-focus focus:ring-2 focus:ring-focus/15 resize-none"
    />
  );
}

export function PrimaryBtn({ children, onClick, disabled, full, type = "button", tone = "focus" }) {
  const tones = {
    focus: "bg-ink text-white shadow-sm shadow-ink/20",
    warn: "bg-warn text-white shadow-sm shadow-warn/20",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full" : ""} ${tones[tone]} rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.97] transition duration-150`}
    >
      {children}
    </button>
  );
}

export function SecondaryBtn({ children, onClick, disabled, full }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full" : ""} border border-border bg-paper text-ink rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition duration-150`}
    >
      {children}
    </button>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-2">
      <div>
        <h2 className="font-display font-semibold text-lg text-ink tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-paper border border-border flex items-center justify-center mb-3">
          <Icon size={22} className="text-slate" strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {subtitle && <p className="text-xs text-slate mt-1 max-w-[240px]">{subtitle}</p>}
    </div>
  );
}

export function Avatar({ name, size = 38, photo }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0 ring-1 ring-border"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-focusSoft text-ink flex items-center justify-center font-semibold flex-shrink-0 ring-1 ring-focus/30"
    >
      {initials}
    </div>
  );
}

export function BottomNav({ tabs, active, onChange }) {
  return (
    <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border flex items-stretch">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 active:scale-95 transition duration-150 ${isActive ? "text-ink" : "text-slate"}`}
          >
            <div className={`flex items-center justify-center w-10 h-6 rounded-full transition-colors duration-150 ${isActive ? "bg-focusSoft" : ""}`}>
              <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
            </div>
            <span className={`text-[11px] ${isActive ? "font-semibold" : ""}`}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-ink" size={26} strokeWidth={2.25} />
        {label && <span className="text-sm text-slate">{label}</span>}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, body, confirmLabel = "Delete", onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate mb-4">{body}</p>
      <div className="flex gap-2">
        <SecondaryBtn full onClick={onClose}>Cancel</SecondaryBtn>
        <PrimaryBtn full tone="warn" onClick={onConfirm}>{confirmLabel}</PrimaryBtn>
      </div>
    </Modal>
  );
}

// Small colored pill used for status labels (fitting/order/invoice status).
export function StatusPill({ label, tone = "default" }) {
  const tones = {
    default: "bg-paper text-slate border border-border",
    focus: "bg-focusSoft text-focus",
    lens: "bg-lensSoft text-lens",
    good: "bg-goodSoft text-good",
    warn: "bg-warnSoft text-warn",
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${tones[tone]}`}>{label}</span>;
}

// Full-screen tap-to-view for a stored photo (e.g. a topography map) --
// mirrors CameraCapture's black overlay so viewing feels like part of the
// same capture flow instead of a different UI pattern.
export function ImageLightbox({ src, alt, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-end px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="text-white p-1" aria-label="Close">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 pb-4">
        <img src={src} alt={alt || "Photo"} className="max-h-full max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>
  );
}
