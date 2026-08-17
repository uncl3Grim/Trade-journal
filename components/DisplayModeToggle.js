'use client';

export default function DisplayModeToggle({ mode, onChange }) {
  const options = [
    { key: 'dollar', label: '$' },
    { key: 'percent', label: '%' },
    { key: 'r', label: 'R' },
  ];
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 rounded-md text-xs font-medium ${
            mode === o.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
