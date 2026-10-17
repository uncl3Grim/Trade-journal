'use client';

import { useEffect, useState } from 'react';

// A number field with quick-pick chips. Used for every rule on the Broker page.
// Empty means "not set". Percent fields go up to 75 by default.
export default function DrawdownLimitSelect({
  label,
  value,
  onChange,
  max = 75,
  step = 0.5,
  suffix = '%',
  presets = [],
  hint,
}) {
  const asText = (v) => (v === null || v === undefined ? '' : String(v));
  const [text, setText] = useState(asText(value));

  // follow outside changes (presets, reset) without fighting what the person is typing
  useEffect(() => {
    if (Number(text) !== value && !(text === '' && (value === null || value === undefined))) setText(asText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handle(e) {
    const raw = e.target.value;
    setText(raw);
    if (raw === '') return onChange(null);
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) return; // use the empty field or Clear to unset
    const clamped = Math.min(max, n);
    if (clamped !== n) setText(String(clamped));
    onChange(step >= 1 ? Math.round(clamped) : Math.round(clamped * 100) / 100);
  }

  return (
    <div>
      {label && <label className="block text-xs font-medium text-neutral-400 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          type="number"
          inputMode={step >= 1 ? 'numeric' : 'decimal'}
          min="0"
          max={max}
          step={step}
          value={text}
          placeholder="Not set"
          onChange={handle}
          onBlur={() => setText(asText(value))}
          className="w-full bg-white/[0.04] border border-neutral-800 hover:border-neutral-700 focus:border-indigo-500/70 outline-none rounded-xl pl-3 pr-12 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600"
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{suffix}</span>}
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                value === p ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100' : 'border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {p}
              {suffix === '%' ? '%' : ''}
            </button>
          ))}
          {value !== null && value !== undefined && (
            <button type="button" onClick={() => onChange(null)} className="rounded-full px-2 py-0.5 text-[11px] text-neutral-500 hover:text-neutral-300">
              Clear
            </button>
          )}
        </div>
      )}
      {hint && <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}
