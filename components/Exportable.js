'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { renderRecapImageSafe } from '../lib/recapExport';

// "Share images" mode: tap the toggle, then every exportable section shows a Save image button.
const ExportCtx = createContext({ on: false, setOn: () => {} });

export function ExportModeProvider({ children }) {
  const [on, setOn] = useState(false);
  return <ExportCtx.Provider value={{ on, setOn }}>{children}</ExportCtx.Provider>;
}

export function ExportModeToggle() {
  const { on, setOn } = useContext(ExportCtx);
  return (
    <button
      onClick={() => setOn(!on)}
      aria-pressed={on}
      className={`flex-shrink-0 whitespace-nowrap text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors ${
        on ? 'bg-indigo-500/25 border-indigo-400/60 text-indigo-100' : 'bg-white/[0.04] border-neutral-800/60 text-neutral-300 hover:text-white'
      }`}
    >
      {on ? 'Done' : 'Share images'}
    </button>
  );
}

function useStored(key, initial) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = useCallback(
    (v) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
    [key]
  );
  return [value, set];
}

const chip = (active) =>
  `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-100' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
  }`;
const field = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/60';
const BG = '#0b0d1a';

function ExportSheet({ node, title, name, onClose }) {
  const [layout, setLayout] = useStored('tj_export_layout', 'story');
  const [quality, setQuality] = useStored('tj_export_quality', 'hd');
  const [handle, setHandle] = useStored('tj_kit_handle', '');
  const [showTitle, setShowTitle] = useStored('tj_export_title', true);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const urlRef = useRef(null);

  const opts = (q) => ({ quality: q, layout, title: showTitle ? title : '', handle: handle.trim(), backgroundColor: BG });

  // Live preview (always HD so it stays quick); re-renders when options change.
  useEffect(() => {
    const id = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const blob = await renderRecapImageSafe(node, opts('hd'));
        if (id !== seq.current) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setPreview({ url: urlRef.current, blob });
        setError('');
      } catch (e) {
        console.error(e);
        if (id === seq.current) setError('Could not turn this section into an image. Please try again.');
      }
      if (id === seq.current) setBusy(false);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, layout, handle, showTitle, title]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  async function finalBlob() {
    if (quality === 'hd' && preview) return preview.blob;
    return renderRecapImageSafe(node, opts(quality));
  }
  const fileName = `${name}-${new Date().toISOString().slice(0, 10)}.png`;

  async function save() {
    setBusy(true);
    try {
      const blob = await finalBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
      alert('Could not save the image. Please try again.');
    }
    setBusy(false);
  }
  async function share() {
    setBusy(true);
    try {
      const file = new File([await finalBlob()], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else alert('Your browser cannot share images directly. Use Save image instead.');
    } catch (e) {
      if (e?.name !== 'AbortError') alert('Could not open the share sheet. Use Save image instead.');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="relative bg-[#0b0d1a] border border-white/10 rounded-[28px] p-4 sm:p-5 w-full max-w-sm my-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm">Save as image</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden" style={{ minHeight: 200 }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="Preview" style={{ maxHeight: '52vh', width: 'auto', maxWidth: '100%', opacity: busy ? 0.5 : 1 }} />
          ) : (
            <span className="text-xs text-slate-500">{error || 'Preparing preview…'}</span>
          )}
        </div>
        {error && preview && <p className="text-xs text-rose-300 mt-2">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button onClick={() => setLayout('story')} className={chip(layout === 'story')}>Story 9:16</button>
          <button onClick={() => setLayout('card')} className={chip(layout === 'card')}>Card only</button>
          <span className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => setQuality('hd')} className={chip(quality === 'hd')}>HD</button>
          <button onClick={() => setQuality('4k')} className={chip(quality === '4k')}>4K</button>
        </div>

        {layout === 'story' && (
          <div className="mt-3 space-y-2.5">
            <label className="block">
              <span className="text-[11px] text-slate-400">Your handle (shown under the title)</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="yourhandle" className={`${field} mt-1`} />
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} className="h-4 w-4 accent-indigo-500" />
              <span className="text-xs text-slate-300">Show “{title}” above the image</span>
            </label>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={share} disabled={busy || !preview} className="flex-1 bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2.5">
            Share
          </button>
          <button onClick={save} disabled={busy || !preview} className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm font-medium text-slate-200 border border-white/10 px-4 py-2.5">
            Save image
          </button>
        </div>
        <p className="text-[11px] text-slate-500 text-center mt-3 leading-snug">Look the image over before you post: hide account names or amounts you want to keep private. Your own results, not financial advice.</p>
      </div>
    </div>
  );
}

export default function Exportable({ title, name, children }) {
  const { on } = useContext(ExportCtx);
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${on ? 'rounded-2xl ring-2 ring-indigo-400/50' : ''}`}>
      <div ref={ref}>{children}</div>
      {on && (
        <button
          onClick={() => setOpen(true)}
          className="absolute top-2 right-2 z-20 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium px-2.5 py-1 shadow-lg shadow-black/40"
        >
          ↗ Save image
        </button>
      )}
      {open && ref.current && <ExportSheet node={ref.current} title={title} name={name} onClose={() => setOpen(false)} />}
    </div>
  );
}
