'use client';

import { useState } from 'react';
import { GlassCard } from './ui';
import { useInView } from '../../lib/useMotion';
import { MONTH_LABELS, fmtMoneyShort, fmtPct } from '../../lib/trackRecord';
import { formatMoney } from '../../lib/format';

function cellStyle(value, maxAbs) {
  if (value === null) return {};
  const i = Math.min(1, Math.abs(value) / (maxAbs || 1));
  const a = 0.18 + i * 0.62;
  return {
    backgroundColor: value >= 0 ? `rgba(16,185,129,${a})` : `rgba(244,63,94,${a})`,
    boxShadow: `inset 0 0 0 1px ${value >= 0 ? 'rgba(52,211,153,0.35)' : 'rgba(251,113,133,0.35)'}`,
  };
}

export default function MonthlyHeatmap({ tr }) {
  const [ref, inView] = useInView(0.2);
  const [sel, setSel] = useState(null);
  const usePct = tr.startingBalance !== null;
  const val = (m) => (usePct ? m.pct : m.pnl);
  const all = tr.monthlyByYear.flatMap((y) => y.months.filter(Boolean));
  const maxAbs = Math.max(...all.map((m) => Math.abs(val(m) ?? 0)), 0.0001);
  const fmtCell = (m) => (usePct ? `${(m.pct * 100).toFixed(1)}` : fmtMoneyShort(m.pnl).replace('$', ''));

  return (
    <GlassCard
      title="Monthly returns"
      subtitle={usePct ? 'Return per calendar month, % of account equity' : 'Net P&L per calendar month'}
      right={
        <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-500">
          <span>Loss</span>
          <i className="h-2 w-16 rounded-full bg-gradient-to-r from-rose-500/80 via-neutral-700 to-emerald-500/80" />
          <span>Gain</span>
        </div>
      }
    >
      <div ref={ref} className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="min-w-[560px]">
          <div className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '44px repeat(12, minmax(0,1fr)) 64px' }}>
            <div />
            {MONTH_LABELS.map((m) => (
              <div key={m} className="text-center text-[10px] text-neutral-500">{m}</div>
            ))}
            <div className="text-center text-[10px] text-neutral-400">Year</div>
          </div>

          {tr.monthlyByYear.map((row, ri) => (
            <div key={row.year} className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '44px repeat(12, minmax(0,1fr)) 64px' }}>
              <div className="flex items-center text-xs text-neutral-400 font-medium">{row.year}</div>
              {row.months.map((m, ci) => (
                <button
                  key={ci}
                  type="button"
                  disabled={!m}
                  onMouseEnter={() => m && setSel(m)}
                  onFocus={() => m && setSel(m)}
                  onClick={() => m && setSel(m)}
                  className={`h-11 rounded-lg text-[11px] font-medium tabular-nums text-white/95 ${m ? 'tr-cell' : 'border border-dashed border-neutral-800/80'} ${
                    m && inView ? 'tr-pop-cell' : ''
                  }`}
                  style={{
                    ...(m ? cellStyle(val(m), maxAbs) : {}),
                    opacity: m && !inView ? 0 : 1,
                    animationDelay: `${(ri * 12 + ci) * 35}ms`,
                  }}
                  aria-label={m ? `${MONTH_LABELS[m.month]} ${m.year}: ${usePct ? fmtPct(m.pct) : formatMoney(m.pnl)}` : undefined}
                >
                  {m ? fmtCell(m) : ''}
                </button>
              ))}
              <div
                className={`h-11 rounded-lg flex items-center justify-center text-xs font-semibold tabular-nums border ${
                  row.pnl >= 0 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                }`}
              >
                {usePct ? fmtPct(row.pct, 1) : fmtMoneyShort(row.pnl)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-neutral-400 min-h-[18px] tabular-nums">
          {sel ? (
            <>
              <span className="text-neutral-100 font-medium">{MONTH_LABELS[sel.month]} {sel.year}</span>
              {' · '}
              <span className={sel.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {usePct ? `${fmtPct(sel.pct)} · ` : ''}{formatMoney(sel.pnl)}
              </span>
              {' · '}{sel.trades} trades
            </>
          ) : (
            <span className="text-neutral-600">Hover or tap a month for detail</span>
          )}
        </div>
        <div className="flex gap-4 text-neutral-500">
          <span>
            Positive months <b className="text-neutral-200">{tr.positiveMonths}/{tr.monthCount}</b>
          </span>
          {tr.bestMonth && (
            <span>
              Best <b className="text-emerald-400">{MONTH_LABELS[tr.bestMonth.month]} {String(tr.bestMonth.year).slice(2)}</b>
            </span>
          )}
          {tr.worstMonth && (
            <span>
              Worst <b className="text-rose-400">{MONTH_LABELS[tr.worstMonth.month]} {String(tr.worstMonth.year).slice(2)}</b>
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
