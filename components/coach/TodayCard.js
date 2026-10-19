'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { formatMoney } from '../../lib/format';
import { todayStatus, tiltState, buildNudges } from '../../lib/coach';

const OVERRIDES_KEY = 'tj_tilt_overrides';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function readOverrides() {
  try {
    const v = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const moneyAbs = (v) => formatMoney(Math.abs(v)).replace(/^[+-]/, '');
const tone = (v) => (!v ? 'text-neutral-100' : v > 0 ? 'text-emerald-400' : 'text-rose-400');

const PILL = {
  go: { label: 'Clear to trade', cls: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  caution: { label: 'Be careful', cls: 'border-amber-400/30 bg-amber-500/10 text-amber-200', dot: 'bg-amber-400' },
  stop: { label: 'Stop for today', cls: 'border-rose-400/40 bg-rose-500/10 text-rose-300', dot: 'bg-rose-400' },
};

const NUDGE = {
  warn: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
  good: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  info: 'border-white/10 bg-white/5 text-neutral-200',
};

function Stat({ label, value, sub, valueClass = 'text-neutral-100' }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-base sm:text-lg font-semibold tabular-nums truncate ${valueClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 truncate">{sub}</div>}
    </div>
  );
}

export default function TodayCard({ trades, account }) {
  const [now, setNow] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [dismissedUntil, setDismissedUntil] = useState(null);

  useEffect(() => {
    setNow(new Date());
    setOverrides(readOverrides());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const info = useMemo(() => (now ? todayStatus({ trades, account, now }) : null), [trades, account, now]);
  const tilt = useMemo(() => (now ? tiltState(trades, now) : null), [trades, now]);
  const nudges = useMemo(() => (now ? buildNudges({ trades, now, fmt: moneyAbs }) : []), [trades, now]);

  const overrideCount = useMemo(() => {
    if (!now) return 0;
    return overrides.filter((o) => now.getTime() - new Date(o.at).getTime() < THIRTY_DAYS).length;
  }, [overrides, now]);

  const overrideTilt = useCallback(() => {
    if (!tilt?.until) return;
    const next = [...overrides, { at: new Date().toISOString() }].slice(-100);
    setOverrides(next);
    setDismissedUntil(tilt.until.toISOString());
    try {
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
    } catch {}
  }, [overrides, tilt]);

  if (!now || !info) return null;

  // Don't show an empty card to someone with no trades and no limits yet.
  if (trades.length === 0 && !info.hasLimits) return null;

  const showTilt = tilt?.active && dismissedUntil !== tilt.until.toISOString();
  const status = showTilt && info.status === 'go' ? 'caution' : info.status;
  const pill = PILL[status];
  const reasons = info.reasons;

  return (
    <section className="pf-card rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-heading text-sm sm:text-base font-semibold text-neutral-100">Today</h2>
          <p className="text-[11px] text-neutral-500">{format(now, 'EEEE, d MMM')}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${pill.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
          {pill.label}
        </span>
      </div>

      {showTilt && (
        <div role="alert" className="mb-3 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3">
          <div className="text-sm font-semibold text-rose-200">{tilt.streak} losses in a row. Step away.</div>
          <p className="mt-0.5 text-xs text-rose-100/80 leading-relaxed">
            Take about {Math.ceil(tilt.minutesLeft)} more minute{Math.ceil(tilt.minutesLeft) !== 1 ? 's' : ''} before the next trade. Stand up, drink water, and look at the chart again with a clear head. The next trade should not try to pay for the last one.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={overrideTilt} className="text-xs text-rose-200/80 underline underline-offset-2 hover:text-rose-100">
              I&apos;m calm, continue anyway
            </button>
            {overrideCount > 0 && (
              <span className="text-[11px] text-rose-200/60">
                You&apos;ve overridden this {overrideCount} time{overrideCount !== 1 ? 's' : ''} in the last 30 days.
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="P&L today" value={info.tradesToday ? formatMoney(info.pnl) : '—'} valueClass={tone(info.pnl)} sub={info.tradesToday ? null : 'no trades yet'} />
        <Stat label="Trades" value={info.maxTrades ? `${info.tradesToday}/${info.maxTrades}` : info.tradesToday} sub={info.maxTrades ? 'of today’s limit' : null} />
        <Stat
          label="Losing streak"
          value={info.maxStreak ? `${info.streak}/${info.maxStreak}` : info.streak}
          valueClass={info.streak >= 2 ? 'text-rose-400' : 'text-neutral-100'}
          sub={info.maxStreak ? 'of your limit' : 'in a row'}
        />
        <Stat
          label="Daily loss left"
          value={info.dailyLeft === null ? '—' : moneyAbs(info.dailyLeft)}
          sub={info.dailyUsedPct === null ? 'no daily limit set' : `${info.dailyUsedPct.toFixed(0)}% used`}
          valueClass={info.dailyUsedPct !== null && info.dailyUsedPct >= 90 ? 'text-rose-400' : info.dailyUsedPct !== null && info.dailyUsedPct >= 60 ? 'text-amber-300' : 'text-neutral-100'}
        />
      </div>

      {reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className={`text-xs rounded-lg px-3 py-2 border ${r.level === 'stop' ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-amber-400/25 bg-amber-500/10 text-amber-100'}`}>
              {r.text}
            </li>
          ))}
        </ul>
      )}

      {nudges.length > 0 && (
        <ul className="mt-3 space-y-2">
          {nudges.slice(0, 3).map((n) => (
            <li key={n.id} className={`rounded-xl border px-3 py-2.5 ${NUDGE[n.level] || NUDGE.info}`}>
              <div className="text-xs font-semibold">{n.title}</div>
              <div className="text-xs mt-0.5 leading-relaxed opacity-90">{n.text}</div>
            </li>
          ))}
        </ul>
      )}

      {!info.hasLimits && (
        <p className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
          Set a daily loss limit, max trades per day and max losing streak for this account on the{' '}
          <a href="/broker" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2">Broker page</a> to turn on live guardrails here.
        </p>
      )}
    </section>
  );
}
