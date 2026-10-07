'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, subDays, format, isSameDay } from 'date-fns';
import { computeDailyRecap } from '../lib/dailyRecap';
import DailyRecapCard from './DailyRecapCard';
import { supabase } from '../lib/supabaseClient';

export default function DailyRecap({ trades, date, defaultRiskAmount, onClose, appName, userId }) {
  const [bg, setBg] = useState({ url: null, dim: 0.55 });

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_settings')
      .select('daily_recap_bg_url, daily_recap_bg_dim')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setBg({ url: data?.daily_recap_bg_url || null, dim: data?.daily_recap_bg_dim ?? 0.55 });
      });
  }, [userId]);

  const [anchor, setAnchor] = useState(date || new Date());
  const [mode, setMode] = useState('dollar');
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);

  const recap = useMemo(
    () => computeDailyRecap(trades, anchor, defaultRiskAmount, mode),
    [trades, anchor, defaultRiskAmount, mode]
  );

  const isToday = isSameDay(anchor, new Date());

  async function handleDownload() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement('a');
      link.download = `daily-recap-${format(anchor, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export recap image', err);
      alert('Could not generate the image. Please try again.');
    }
    setExporting(false);
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const file = new File([blob], 'daily-recap.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Daily recap' });
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Failed to share recap image', err);
      alert('Could not share the image. Please try again.');
    }
    setExporting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b0d1a] border border-white/10 rounded-[32px] p-4 sm:p-6 w-full max-w-xl my-8 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">Daily recap</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center text-sm transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            onClick={() => setAnchor((d) => subDays(d, 1))}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors"
          >
            ← Prev day
          </button>

          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            {[
              { key: 'dollar', label: '$' },
              { key: 'r', label: 'R' },
            ].map((o) => (
              <button
                key={o.key}
                onClick={() => setMode(o.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === o.key ? 'bg-white/15 text-white' : 'text-slate-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAnchor((d) => addDays(d, 1))}
            disabled={isToday}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-white/10 transition-colors"
          >
            Next day →
          </button>
        </div>

        <DailyRecapCard ref={cardRef} recap={recap} mode={mode} appName={appName} backgroundUrl={bg.url} backgroundDim={bg.dim} />

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex-1 bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-opacity"
          >
            {exporting ? 'Preparing…' : 'Download PNG'}
          </button>
          <button
            onClick={handleShare}
            disabled={exporting}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-sm font-medium text-slate-200 border border-white/10 transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
