'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addWeeks, subWeeks, format, isSameWeek } from 'date-fns';
import { computeWeeklyRecap } from '../lib/weeklyRecap';
import WeeklyRecapCard from './WeeklyRecapCard';
import { supabase } from '../lib/supabaseClient';

function mostRecentTradeDate(trades) {
  const closed = trades.filter((t) => t.entry_time && t.exit_price !== null && t.exit_price !== undefined);
  if (closed.length === 0) return new Date();
  return closed.reduce((latest, t) => {
    const d = new Date(t.entry_time);
    return d > latest ? d : latest;
  }, new Date(closed[0].entry_time));
}

export default function WeeklyRecap({ trades, defaultRiskAmount, onClose, appName, userId }) {
  const [bg, setBg] = useState({ url: null, dim: 0.55 });

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_settings')
      .select('weekly_recap_bg_url, weekly_recap_bg_dim')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setBg({ url: data?.weekly_recap_bg_url || null, dim: data?.weekly_recap_bg_dim ?? 0.55 });
      });
  }, [userId]);

  // Default to the most recent week that actually has trades, rather than
  // the real current calendar week — useful when viewing historical/backtest
  // imports that don't extend up to today.
  const [anchor, setAnchor] = useState(() => mostRecentTradeDate(trades));
  const [mode, setMode] = useState('dollar');
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef(null);

  const recap = useMemo(
    () => computeWeeklyRecap(trades, anchor, defaultRiskAmount, mode),
    [trades, anchor, defaultRiskAmount, mode]
  );

  const isCurrentWeek = isSameWeek(anchor, new Date(), { weekStartsOn: 1 });

  async function handleDownload() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement('a');
      link.download = `weekly-recap-${format(recap.weekStart, 'yyyy-MM-dd')}.png`;
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
      const file = new File([blob], 'weekly-recap.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Weekly recap' });
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
          <h2 className="text-white font-semibold text-sm">Weekly recap</h2>
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
            onClick={() => setAnchor((d) => subWeeks(d, 1))}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors"
          >
            ← Prev week
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
            onClick={() => setAnchor((d) => addWeeks(d, 1))}
            disabled={isCurrentWeek}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-slate-300 border border-white/10 transition-colors"
          >
            Next week →
          </button>
        </div>

        <WeeklyRecapCard ref={cardRef} recap={recap} mode={mode} appName={appName} backgroundUrl={bg.url} backgroundDim={bg.dim} />

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
