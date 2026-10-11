'use client';

import { useEffect, useRef, useState } from 'react';

export function Card({ title, hint, children, className = '', action }) {
  return (
    <section className={`pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>}
            {hint && <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Label({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">{children}</label>
      {right}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-indigo-400/60 focus:bg-black/40';

export function PrimaryButton({ children, className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`pf-btn-primary relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...rest }) {
  return (
    <button
      {...rest}
      className={`rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm text-neutral-200 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 text-left rounded-xl px-3 py-3 hover:bg-white/5"
    >
      <span>
        <span className="block text-sm text-neutral-100">{label}</span>
        {hint && <span className="block text-xs text-neutral-500 mt-0.5">{hint}</span>}
      </span>
      <span className={`pf-switch ${checked ? 'is-on' : ''}`}>
        <span className="pf-switch-knob" />
      </span>
    </button>
  );
}

export function Segmented({ options, value, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  return (
    <div className="relative grid rounded-xl bg-black/30 border border-white/10 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        className="pf-seg-thumb absolute top-1 bottom-1 rounded-lg bg-white/10 border border-white/10"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${idx * 100}%)`, left: '0.25rem' }}
      />
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`relative z-10 py-1.5 text-xs font-medium rounded-lg ${value === o.key ? 'text-neutral-50' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-400">{label}</span>
        <span className="text-xs tabular-nums text-neutral-200 bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="pf-range w-full"
        style={{ '--pct': `${pct}%` }}
      />
    </div>
  );
}

export function Inline({ kind = 'info', children }) {
  if (!children) return null;
  const color = kind === 'error' ? 'text-red-400' : kind === 'success' ? 'text-emerald-400' : 'text-neutral-400';
  return <p className={`pf-fade text-xs mt-2 ${color}`}>{children}</p>;
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  function notify(message, kind = 'success') {
    clearTimeout(timer.current);
    setToast({ message, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast ? (
    <div key={toast.id} className="pf-toast fixed left-1/2 bottom-24 md:bottom-8 z-50 -translate-x-1/2">
      <div
        className={`rounded-full border px-4 py-2 text-sm backdrop-blur-xl shadow-lg ${
          toast.kind === 'error'
            ? 'bg-red-500/15 border-red-500/30 text-red-200'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
        }`}
      >
        {toast.message}
      </div>
    </div>
  ) : null;
  return [notify, node];
}
