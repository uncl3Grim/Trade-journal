'use client';

const OPTIONS = Array.from({ length: 15 }, (_, i) => i + 1); // 1 through 15

export default function DrawdownLimitSelect({ label, value, onChange, allowNone = true }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
      >
        {allowNone && <option value="">— none —</option>}
        {OPTIONS.map((pct) => (
          <option key={pct} value={pct}>
            {pct}%
          </option>
        ))}
      </select>
    </div>
  );
}
