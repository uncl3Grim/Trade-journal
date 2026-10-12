'use client';

const OPTIONS = [
  { key: 'dollar', label: '$' },
  { key: 'percent', label: '%' },
  { key: 'r', label: 'R' },
];

export default function DisplayModeToggle({ mode, onChange }) {
  const index = Math.max(0, OPTIONS.findIndex((o) => o.key === mode));
  return (
    <div
      role="tablist"
      aria-label="Display mode"
      className="relative grid grid-cols-3 w-[8.5rem] bg-black/30 backdrop-blur-md border border-neutral-800/60 rounded-xl p-0.5"
    >
      <div
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 rounded-[10px] bg-white/10 border border-white/10 transition-transform duration-300 ease-bouncy"
        style={{ width: 'calc((100% - 0.25rem) / 3)', transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={mode === o.key}
          onClick={() => onChange(o.key)}
          className={`relative z-10 py-1.5 rounded-[10px] text-sm font-medium transition-colors duration-200 ${
            mode === o.key ? 'text-neutral-50' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
