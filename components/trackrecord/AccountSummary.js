'use client';

import { format } from 'date-fns';
import { GlassCard, CountUp } from './ui';
import { MONTH_LABELS, fmtMoneyShort, fmtPct } from '../../lib/trackRecord';

const money = (v) =>
  v === null || v === undefined || isNaN(v)
    ? '—'
    : `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signedMoney = (v) => `${v > 0 ? '+' : ''}${fmtMoneyShort(v)}`;
const monthName = (m) => (m ? `${MONTH_LABELS[m.month]} ${m.year}` : '—');
const tone = (v) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-neutral-50');

function Stat({ label, value, sub, color = 'text-neutral-50' }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2.5">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className={`font-heading text-lg font-semibold mt-0.5 tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{sub}</div>}
    </div>
  );
}

export default function AccountSummary({ tr }) {
  const hasBalance = tr.startingBalance !== null;
  const best = tr.bestMonth;
  const worst = tr.worstMonth;
  const since = tr.periodStart || tr.firstTime;
  const up = tr.totalPnl >= 0;

  return (
    <GlassCard
      title="Account summary"
      subtitle={[tr.accountName, since ? `Since ${format(since, 'MMM d, yyyy')}` : null].filter(Boolean).join(' · ')}
    >
      {hasBalance ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
          <div>
            <div className="text-[11px] text-neutral-500">Starting balance</div>
            <div className="font-heading text-xl sm:text-2xl font-bold text-neutral-300 tabular-nums">{money(tr.startingBalance)}</div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <div className="text-right">
            <div className="text-[11px] text-neutral-500">Current balance</div>
            <div className={`font-heading text-xl sm:text-2xl font-bold tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
              <CountUp value={tr.currentBalance} format={money} />
            </div>
            <div className={`text-[11px] tabular-nums ${up ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
              {signedMoney(tr.totalPnl)} ({fmtPct(tr.returnPct, 1)})
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-neutral-800/60 bg-white/[0.03] px-3 py-2.5 text-xs text-neutral-400">
          The trader chose to keep account balances private, so balances and percentage returns are hidden. Results are shown in dollars.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <Stat label="Net P&L" value={signedMoney(tr.totalPnl)} color={tone(tr.totalPnl)} sub={`${tr.n.toLocaleString()} closed trades`} />
        {hasBalance && (
          <Stat
            label="Avg monthly return"
            value={fmtPct(tr.avgMonthlyPct, 2)}
            color={tone(tr.avgMonthlyPct)}
            sub={`Across ${tr.monthSpan} month${tr.monthSpan === 1 ? '' : 's'}, empty months count as 0%`}
          />
        )}
        <Stat
          label="Avg monthly P&L"
          value={signedMoney(tr.avgMonthlyPnl)}
          color={tone(tr.avgMonthlyPnl)}
          sub={hasBalance ? undefined : `Across ${tr.monthSpan} month${tr.monthSpan === 1 ? '' : 's'}`}
        />
        <Stat label="Profitable months" value={`${tr.positiveMonths} of ${tr.monthCount}`} sub={tr.monthSpan > tr.monthCount ? `${tr.monthSpan - tr.monthCount} with no trades` : undefined} />
        <Stat label="Best month" value={signedMoney(best?.pnl)} color={tone(best?.pnl)} sub={monthName(best)} />
        <Stat label="Worst month" value={signedMoney(worst?.pnl)} color={tone(worst?.pnl)} sub={monthName(worst)} />
      </div>

      {hasBalance && (
        <p className="text-[11px] text-neutral-500 mt-3 leading-snug">
          Current balance = starting balance + net trade results. Deposits and withdrawals aren&apos;t tracked.
        </p>
      )}
    </GlassCard>
  );
}
