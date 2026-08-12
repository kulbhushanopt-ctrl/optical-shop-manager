import React from "react";
import { X, Mic, Loader2 } from "lucide-react";
import { useVoiceInput } from "../../hooks/useVoiceInput";
import { useModalBackClose } from "../../hooks/useModalBackClose";

export function Modal({ title, onClose, children, wide }) {
  useModalBackClose(onClose);
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
      className={`w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-lens focus:ring-2 focus:ring-lens/15 ${props.className || ""}`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-lens focus:ring-2 focus:ring-lens/15"
    >
      {children}
    </select>
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-lens focus:ring-2 focus:ring-lens/15 resize-none"
    />
  );
}

export function MicButton({ listening, supported, onClick }) {
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-full ${listening ? "bg-warnSoft text-warn animate-pulse" : "bg-paper text-slate"}`}
      aria-label="Dictate"
    >
      <Mic size={16} />
    </button>
  );
}

export function VoiceInput({ value, onChange, placeholder, type = "text" }) {
  const { listening, supported, start } = useVoiceInput((text) => onChange(text));
  return (
    <div className="flex items-center gap-2">
      <TextInput type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <MicButton listening={listening} supported={supported} onClick={start} />
    </div>
  );
}

// Same as VoiceInput, but runs dictated speech through `parse` first — used
// for prescription/power fields so saying "minus two point five" lands as
// "-2.50" instead of being typed in verbatim. Manual typing is untouched.
export function VoiceRxInput({ value, onChange, placeholder, parse }) {
  const { listening, supported, start } = useVoiceInput((text) => onChange(parse ? parse(text) : text));
  return (
    <div className="flex items-center gap-2">
      <TextInput value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <MicButton listening={listening} supported={supported} onClick={start} />
    </div>
  );
}

// A dropdown that can also be filled by voice -- dictated speech runs
// through `parse` (if given) and sets the select's value, same as
// VoiceRxInput does for a text field. `children` are the <option>s.
export function VoiceSelect({ value, onChange, parse, children }) {
  const { listening, supported, start } = useVoiceInput((text) => onChange(parse ? parse(text) : text));
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onChange={(e) => onChange(e.target.value)}>{children}</Select>
      <MicButton listening={listening} supported={supported} onClick={start} />
    </div>
  );
}

export function VoiceTextArea({ value, onChange, placeholder, rows = 3 }) {
  const { listening, supported, start } = useVoiceInput((text) => onChange(value ? `${value} ${text}` : text));
  return (
    <div className="relative">
      <TextArea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
      {supported && (
        <button
          type="button"
          onClick={start}
          className={`absolute right-2 bottom-2 p-1.5 rounded-full ${listening ? "bg-warnSoft text-warn animate-pulse" : "bg-paper text-slate"}`}
        >
          <Mic size={14} />
        </button>
      )}
    </div>
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

export function RoundIconBtn({ onClick, children, tone = "default" }) {
  const tones = {
    default: "bg-paper text-ink",
    focus: "bg-focus text-ink shadow-sm shadow-focus/30",
    warn: "bg-warnSoft text-warn",
  };
  return (
    <button
      onClick={onClick}
      className={`${tones[tone]} rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0 active:scale-90 transition duration-150`}
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

export function StatCard({ icon: Icon, label, value, tone = "default", onClick }) {
  const tones = {
    default: "bg-card",
    warn: "bg-warnSoft",
    good: "bg-goodSoft",
    focus: "bg-focusSoft",
  };
  return (
    <button
      onClick={onClick}
      className={`${tones[tone]} border border-border/70 rounded-2xl p-4 text-left flex flex-col gap-2 w-full shadow-sm shadow-ink/[0.03] active:scale-[0.98] transition duration-150`}
    >
      <Icon size={18} className="text-ink" />
      <div>
        <div className="text-lg font-display font-semibold text-ink leading-none tracking-tight">{value}</div>
        <div className="text-xs text-slate mt-1">{label}</div>
      </div>
    </button>
  );
}

// Full-screen tap-to-enlarge view for a saved photo (patient pic, booked
// frame, etc.) -- tapping the backdrop or the close button dismisses it;
// tapping the image itself does nothing, so a pinch-zoom gesture on mobile
// doesn't accidentally close the view.
export function ImageLightbox({ src, alt, onClose }) {
  useModalBackClose(onClose);
  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 active:scale-90 transition"
        aria-label="Close"
      >
        <X size={22} />
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
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
      className="rounded-full bg-focus text-ink flex items-center justify-center font-semibold flex-shrink-0 ring-1 ring-focus/40"
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
