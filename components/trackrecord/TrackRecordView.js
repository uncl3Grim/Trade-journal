'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { computeTrackRecord } from '../../lib/trackRecord';
import AmbientBackground from './AmbientBackground';
import TrackHeader from './TrackHeader';
import HeadlineStrip from './HeadlineStrip';
import TrackEquityChart from './TrackEquityChart';
import MonthlyHeatmap from './MonthlyHeatmap';
import RiskRatios from './RiskRatios';
import TrackBreakdowns from './TrackBreakdowns';
import TradeLog from './TradeLog';
import { Reveal } from './ui';

export default function TrackRecordView({ report, banner }) {
  const tr = useMemo(() => computeTrackRecord(report), [report]);
  const name = report.trader_name || report.label || report.account_name || 'Verified Track Record';

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-neutral-200">
      <AmbientBackground />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:py-10 space-y-4">
        {banner && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-300">{banner}</div>
        )}
        <TrackHeader name={name} tr={tr} />

        {tr.n === 0 ? (
          <Reveal>
            <div className="rounded-2xl border border-neutral-800/60 bg-white/[0.04] p-8 text-center text-sm text-neutral-400">
              No closed trades on this report yet.
            </div>
          </Reveal>
        ) : (
          <>
            <HeadlineStrip tr={tr} />
            <TrackEquityChart tr={tr} />
            <MonthlyHeatmap tr={tr} />
            <RiskRatios tr={tr} />
            <TrackBreakdowns tr={tr} />
            <TradeLog trades={tr.trades} />
          </>
        )}

        <Reveal>
          <footer className="pt-2 pb-6 text-center text-[11px] text-neutral-500 space-y-1">
            <div>
              {tr.costsIncluded ? 'Costs included' : 'Net P&L as reported by the broker'}
              {tr.updatedAt && !isNaN(tr.updatedAt) && <> · Updated {format(tr.updatedAt, 'MMM d, yyyy')}</>}
            </div>
            <div className="text-neutral-600">Powered by Edgewise — read-only shared report</div>
          </footer>
        </Reveal>
      </div>
    </div>
  );
}
