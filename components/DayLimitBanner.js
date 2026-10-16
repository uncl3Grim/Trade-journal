'use client';

import { formatMoney } from '../lib/format';
import BatteryCellIcon from './BatteryCellIcon';

const TONE = {
  ok: 'border-white/10 bg-white/[0.03] text-neutral-300',
  warn: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  danger: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
  breach: 'border-rose-400/60 bg-rose-500/15 text-rose-100',
};

const money = (n) => formatMoney(n).replace(/^\+/, '');

// Shown at the top of "Log trade". `status` comes from computeDayLimitStatus,
// `riskAmount` is whatever the trade form is about to risk.
export default function DayLimitBanner({ status, riskAmount, accountName }) {
  if (!status || (!status.daily && !status.max)) return null;
  const { daily, max } = status;

  const worst = [daily, max].filter(Boolean).sort((a, b) => b.usedPct - a.usedPct)[0];
  const level = worst.level;

  let headline = 'Loss limits for this account';
  if (daily?.level === 'breach') headline = 'Daily loss limit reached. Consider stopping for the day.';
  else if (max?.level === 'breach') headline = 'Max drawdown limit reached. Protect the account.';
  else if (level === 'danger') headline = 'You are very close to a loss limit.';
  else if (level === 'warn') headline = 'Loss limit is getting used up.';

  // What a full loss on the trade being logged would do to the daily limit
  let projection = null;
  const risk = Number(riskAmount);
  if (daily && risk > 0 && daily.level !== 'breach' && daily.limit > 0) {
    const proj = ((daily.loss + risk) / daily.limit) * 100;
    if (proj >= 100) projection = `If this trade loses its full ${money(risk)} risk, it breaches the daily limit.`;
    else if (proj >= 75) projection = `If this trade loses its full ${money(risk)} risk, you would be at ${proj.toFixed(0)}% of the daily limit.`;
  }

  return (
    <div className={`pf-swap rounded-2xl border px-4 py-3 mb-4 ${TONE[level] || TONE.ok}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-start gap-4 flex-shrink-0">
          {daily && (
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Daily</div>
              <BatteryCellIcon percent={Math.min(100, daily.usedPct)} size={30} color={daily.usedPct >= 90 ? 'red' : 'indigo'} />
            </div>
          )}
          {max && (
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Max DD</div>
              <BatteryCellIcon percent={Math.min(100, max.usedPct)} size={30} color={max.usedPct >= 90 ? 'red' : 'indigo'} />
            </div>
          )}
        </div>
        <div className="min-w-0 text-sm">
          <div className="font-medium">{headline}</div>
          {daily && (
            <div className="text-xs opacity-80 mt-0.5">
              Today: {money(daily.loss)} lost of {money(daily.limit)} limit ({money(daily.remaining)} left)
            </div>
          )}
          {max && (
            <div className="text-xs opacity-80 mt-0.5">
              Drawdown: {money(max.drawdown)} of {money(max.limit)} ({money(max.remaining)} left)
            </div>
          )}
          {projection && <div className="text-xs font-medium mt-1.5">{projection}</div>}
          {accountName && <div className="text-[11px] opacity-60 mt-1">{accountName}</div>}
        </div>
      </div>
    </div>
  );
}
