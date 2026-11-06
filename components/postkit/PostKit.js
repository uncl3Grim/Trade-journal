'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { TEMPLATES, buildKitData, buildCaption, makeFormatters, latestTradeDate, firstTradeDate, shiftAnchor, canGoNext } from '../../lib/postKit';
import { renderRecapImageSafe } from '../../lib/recapExport';
import { SLIDE_COMPONENTS } from './Slides';

function useSetting(key, initial) {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chip = (active) =>
  `flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-100' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
  }`;
const field = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/60';

export default function PostKit({ trades, account, startingBalance, onClose }) {
  const accountKey = account?.id || 'all';
  const [templateKey, setTemplateKey] = useState('daily');
  const [anchor, setAnchor] = useState(() => latestTradeDate(trades));
  const [slideIdx, setSlideIdx] = useState(0);
  const [variant, setVariant] = useState(0);
  const [series, setSeries] = useSetting('tj_kit_series', '');
  const [handle, setHandle] = useSetting('tj_kit_handle', '');
  const [showBalances, setShowBalances] = useSetting('tj_kit_show_balances', true);
  const [quality, setQuality] = useSetting('tj_kit_quality', 'hd');
  const [day1Str, setDay1Str] = useSetting(`tj_kit_day1_${accountKey}`, '');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const refs = useRef([]);

  const tpl = TEMPLATES[templateKey];
  const defaultDay1 = useMemo(() => firstTradeDate(trades), [trades]);
  const day1 = day1Str ? new Date(`${day1Str}T00:00:00`) : defaultDay1;

  const d = useMemo(
    () => buildKitData(trades, { anchor, scope: tpl.scope, startingBalance, day1 }),
    [trades, anchor, tpl.scope, startingBalance, day1Str, defaultDay1] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const f = useMemo(() => makeFormatters(d, showBalances), [d, showBalances]);
  const s = { series: (series || '').trim(), handle };
  const generated = useMemo(() => buildCaption(templateKey, d, f, { series: s.series, variant }), [templateKey, d, f, s.series, variant]);
  const [captionEdit, setCaptionEdit] = useState(null);
  useEffect(() => setCaptionEdit(null), [generated]);
  const caption = captionEdit ?? generated;

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (Math.min(window.innerWidth, 560) - 72) / 360));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  useEffect(() => setSlideIdx(0), [templateKey]);

  const slides = tpl.slides;
  const fileBase = `${templateKey}-${format(anchor, 'yyyy-MM-dd')}`;

  async function renderSlide(i) {
    const node = refs.current[i];
    if (!node) throw new Error('Slide not ready');
    return renderRecapImageSafe(node, { quality, layout: 'card' });
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function saveSlide(i) {
    setBusy('Preparing image…');
    try {
      saveBlob(await renderSlide(i), `${fileBase}-${i + 1}.png`);
    } catch (e) {
      console.error(e);
      alert('Could not generate the image. Please try again.');
    }
    setBusy('');
  }
  async function saveAll() {
    setBusy('Saving slides…');
    try {
      for (let i = 0; i < slides.length; i++) {
        saveBlob(await renderSlide(i), `${fileBase}-${i + 1}.png`);
        await sleep(500);
      }
    } catch (e) {
      console.error(e);
      alert('Could not generate the images. Please try again.');
    }
    setBusy('');
  }
  async function shareAll() {
    setBusy('Preparing slides…');
    try {
      const files = [];
      for (let i = 0; i < slides.length; i++) files.push(new File([await renderSlide(i)], `${fileBase}-${i + 1}.png`, { type: 'image/png' }));
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, text: caption });
      } else {
        alert('Your browser cannot share images directly. Use Save all slides instead.');
      }
    } catch (e) {
      if (e?.name !== 'AbortError') alert('Could not open the share sheet. Use Save all slides instead.');
    }
    setBusy('');
  }
  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = caption;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const Active = SLIDE_COMPONENTS[slides[slideIdx]];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-[#0b0d1a] border border-white/10 rounded-[32px] p-4 sm:p-6 w-full max-w-xl my-8 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">Post kit</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button key={key} onClick={() => setTemplateKey(key)} className={chip(key === templateKey)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setAnchor((a) => shiftAnchor(a, tpl.scope, -1))} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10">
            ← Prev
          </button>
          <div className="text-xs text-slate-200 font-medium">{d.periodLabel}</div>
          <button
            onClick={() => setAnchor((a) => shiftAnchor(a, tpl.scope, 1))}
            disabled={!canGoNext(anchor, tpl.scope)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-white/10"
          >
            Next →
          </button>
        </div>

        {/* Preview: the real slide, scaled to fit the screen. */}
        <div className="flex justify-center mt-4">
          <div style={{ width: 360 * scale, height: 640 * scale }} className="rounded-2xl overflow-hidden border border-white/10">
            <div style={{ width: 360, height: 640, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <Active d={d} f={f} s={s} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-3">
          <button onClick={() => setSlideIdx((i) => Math.max(0, i - 1))} disabled={slideIdx === 0} className="px-3 py-1 rounded-lg bg-white/5 disabled:opacity-30 text-xs text-slate-300 border border-white/10">
            ‹
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setSlideIdx(i)} aria-label={`Slide ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === slideIdx ? 'w-5 bg-indigo-400' : 'w-1.5 bg-white/25'}`} />
            ))}
          </div>
          <button onClick={() => setSlideIdx((i) => Math.min(slides.length - 1, i + 1))} disabled={slideIdx === slides.length - 1} className="px-3 py-1 rounded-lg bg-white/5 disabled:opacity-30 text-xs text-slate-300 border border-white/10">
            ›
          </button>
        </div>
        <div className="text-center text-[11px] text-slate-500 mt-1.5">
          Slide {slideIdx + 1} of {slides.length} · {quality === '4k' ? '2160 × 3840' : '1080 × 1920'} px
        </div>

        {/* Settings */}
        <div className="mt-5 rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-[11px] text-slate-400">Series name (optional)</span>
              <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="e.g. Road to $50K" className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400">Your handle</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="yourhandle" className={`${field} mt-1`} />
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] text-slate-400">Day 1 started on</span>
            <input
              type="date"
              value={day1Str || format(defaultDay1, 'yyyy-MM-dd')}
              onChange={(e) => setDay1Str(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className={`${field} mt-1`}
            />
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={showBalances || !d.hasStart} disabled={!d.hasStart} onChange={(e) => setShowBalances(e.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-500" />
            <span>
              <span className="block text-sm text-slate-200">Show account balance</span>
              <span className="block text-[11px] text-slate-500">
                {d.hasStart ? (showBalances ? 'Dollar amounts and balances are shown.' : 'Only percentages are shown. No dollar amounts.') : 'Set a starting balance on the Broker page to show percentages.'}
              </span>
            </span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 mr-1">Quality</span>
            {[
              ['hd', 'HD'],
              ['4k', '4K'],
            ].map(([v, l]) => (
              <button key={v} onClick={() => setQuality(v)} className={chip(quality === v)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-300">Caption</span>
            <button onClick={() => setVariant((v) => v + 1)} className="text-[11px] text-indigo-300 hover:text-indigo-200">
              New hook ↻
            </button>
          </div>
          <textarea value={caption} onChange={(e) => setCaptionEdit(e.target.value)} rows={10} className={`${field} leading-relaxed`} />
          <button onClick={copyCaption} className="mt-2 w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-slate-200 py-2.5">
            {copied ? 'Copied ✓' : 'Copy caption'}
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={shareAll} disabled={!!busy} className="flex-1 bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2.5">
            {busy || 'Share all slides'}
          </button>
          <button onClick={saveAll} disabled={!!busy} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm font-medium text-slate-200 border border-white/10">
            Save all
          </button>
        </div>
        <button onClick={() => saveSlide(slideIdx)} disabled={!!busy} className="mt-2 w-full text-[12px] text-slate-400 hover:text-slate-200 py-1.5 disabled:opacity-50">
          Save this slide only
        </button>
        <p className="text-[11px] text-slate-500 text-center mt-1">Educational content about your own results, not financial advice. Check TikTok&apos;s rules on finance posts.</p>
      </div>

      {/* Full-size copies used for exporting. Kept off-screen so the preview scaling never affects image quality. */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
        {slides.map((key, i) => {
          const Slide = SLIDE_COMPONENTS[key];
          return <Slide key={`${templateKey}-${key}-${i}`} ref={(el) => (refs.current[i] = el)} d={d} f={f} s={s} />;
        })}
      </div>
    </div>
  );
}
