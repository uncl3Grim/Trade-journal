'use client';

// ---- Shared form styles (dark glass UI) -----------------------------------
export const fieldClass =
  'w-full bg-white/[0.04] border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 hover:border-neutral-700 focus:border-indigo-500/70 outline-none';

export const labelClass = 'block text-xs font-medium text-neutral-400 mb-1.5';

export const primaryBtn =
  'bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-600/20';

export const ghostBtn =
  'border border-neutral-800 hover:border-neutral-700 hover:bg-white/[0.05] disabled:opacity-40 text-neutral-300 rounded-xl px-4 py-2.5 text-sm font-medium';

export const dangerBtn =
  'border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40 rounded-xl px-3.5 py-2 text-sm font-medium';

// ---- Collapse: smooth height animation without measuring -------------------
export function Collapse({ open, children, className = '' }) {
  return (
    <div className={`bk-collapse ${open ? 'is-open' : ''} ${className}`} aria-hidden={!open}>
      <div className="bk-collapse-inner" {...(!open ? { inert: '' } : {})}>
        {children}
      </div>
    </div>
  );
}

// ---- Segmented control with a sliding highlight ---------------------------
export function Segmented({ options, value, onChange, className = '' }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const count = options.length;
  return (
    <div
      role="tablist"
      className={`relative grid bg-black/30 border border-neutral-800/60 rounded-xl p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <div
        className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-white/10 border border-white/10 bk-slide"
        style={{
          width: `calc((100% - 0.5rem) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 px-2 py-2 text-xs sm:text-sm font-medium rounded-lg truncate ${
            o.value === value ? 'text-neutral-50' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- Switch ---------------------------------------------------------------
export function Switch({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-sm text-neutral-100 font-medium">{label}</span>
        {hint && <span className="block text-xs text-neutral-500 mt-0.5">{hint}</span>}
      </span>
      <span
        className={`relative flex-shrink-0 h-6 w-11 rounded-full border bk-switch ${
          checked ? 'bg-indigo-500 border-indigo-400' : 'bg-white/5 border-neutral-700'
        }`}
      >
        <span
          className="absolute top-0.5 left-0.5 rounded-full bg-white shadow bk-switch-knob"
          style={{ width: 18, height: 18, transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </span>
    </button>
  );
}

// ---- Method intro: what it is + what you need -----------------------------
export function MethodIntro({ title, what, need }) {
  return (
    <div className="mb-4">
      <h3 className="font-heading text-base font-semibold text-neutral-50">{title}</h3>
      <p className="text-sm text-neutral-300 mt-1 leading-relaxed">{what}</p>
      {need && (
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
          <span className="text-neutral-400 font-medium">You'll need: </span>
          {need}
        </p>
      )}
    </div>
  );
}
