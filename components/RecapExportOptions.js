'use client';

import { outputSize } from '../lib/recapExport';

function Seg({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg bg-white/5 border border-white/10 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === o.value ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function RecapExportOptions({ quality, setQuality, layout, setLayout }) {
  const size = outputSize(quality, layout);
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Seg
          value={layout}
          onChange={setLayout}
          options={[
            { value: 'story', label: 'Story 9:16' },
            { value: 'card', label: 'Card only' },
          ]}
        />
        <Seg
          value={quality}
          onChange={setQuality}
          options={[
            { value: 'hd', label: 'HD' },
            { value: '4k', label: '4K' },
          ]}
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        {size.h ? `${size.w} × ${size.h} px · fits TikTok, Instagram Stories and Reels` : `${size.w} px wide · fits Instagram posts`}
      </p>
    </div>
  );
}
