'use client';

import { Component, useMemo } from 'react';
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
import * as UI from './ui';
import * as Lib from '../../lib/trackRecord';
import * as Motion from '../../lib/useMotion';

const { Reveal } = UI;

// Error #130 ("element type is invalid") means a file is missing, misnamed or
// was pasted without its `export` line. Check everything the page needs up
// front so the page can say exactly which file to fix.
const REQUIRED = {
  'components/trackrecord/AmbientBackground.js': AmbientBackground,
  'components/trackrecord/TrackHeader.js': TrackHeader,
  'components/trackrecord/HeadlineStrip.js': HeadlineStrip,
  'components/trackrecord/TrackEquityChart.js': TrackEquityChart,
  'components/trackrecord/MonthlyHeatmap.js': MonthlyHeatmap,
  'components/trackrecord/RiskRatios.js': RiskRatios,
  'components/trackrecord/TrackBreakdowns.js': TrackBreakdowns,
  'components/trackrecord/TradeLog.js': TradeLog,
  'components/trackrecord/ui.js (Reveal)': UI.Reveal,
  'components/trackrecord/ui.js (GlassCard)': UI.GlassCard,
  'components/trackrecord/ui.js (CountUp)': UI.CountUp,
  'lib/trackRecord.js (computeTrackRecord)': Lib.computeTrackRecord,
  'lib/trackRecord.js (validDate)': Lib.validDate,
  'lib/trackRecord.js (fmtNum / fmtPct / fmtMoneyShort / MONTH_LABELS)': Lib.fmtNum && Lib.fmtPct && Lib.fmtMoneyShort && Lib.MONTH_LABELS,
  'lib/useMotion.js (useInView / useProgress)': Motion.useInView && Motion.useProgress && Motion.usePrefersReducedMotion,
};
const MISSING = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([k]) => k);

function TrackRecordInner({ report, banner }) {
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

// If anything in the report data trips a render error, show a readable message
// instead of the blank "Application error" screen.
class ReportBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-sm text-rose-200">
          <div className="font-medium mb-1">This report couldn&apos;t be displayed.</div>
          <div className="text-xs text-rose-300/80 break-words">{String(this.state.error?.message || this.state.error)}</div>
        </div>
      </div>
    );
  }
}

export default function TrackRecordView(props) {
  if (MISSING.length) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5 text-sm text-amber-100">
          <div className="font-medium mb-2">Some track-record files are missing or incomplete.</div>
          <div className="text-xs text-amber-200/80 mb-2">
            Re-upload these files exactly as sent (each must start with &apos;use client&apos; where shown and keep its export line):
          </div>
          <ul className="text-xs font-mono space-y-1 text-amber-100">
            {MISSING.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  return (
    <ReportBoundary>
      <TrackRecordInner {...props} />
    </ReportBoundary>
  );
}
