'use client';

const OPTIONS = Array.from({ length: 15 }, (_, i) => i + 1); // 1 through 15

export default function DrawdownLimitSelect({ label, value, onChange, allowNone = true }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-neutral-400 mb-1.5">{label}</label>}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full bg-white/[0.04] border border-neutral-800 hover:border-neutral-700 focus:border-indigo-500/70 outline-none rounded-xl px-3 py-2.5 text-sm text-neutral-100"
      >
        {allowNone && <option value="">None</option>}
        {OPTIONS.map((pct) => (
          <option key={pct} value={pct}>
            {pct}%
          </option>
        ))}
      </select>
    </div>
  );
}
