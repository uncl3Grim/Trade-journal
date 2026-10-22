'use client';

import { forwardRef, useId } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { formatMoney } from '../lib/format';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

function fmtPrice(v) {
  const n = Number(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
}

const fmtR = (r, digits = 1) => `${r >= 0 ? '+' : ''}${r.toFixed(digits)}R`;
const toneOf = (v) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-neutral-400');

// The day's running total, one point per trade, starting from zero.
function DayCurve({ values, color }) {
  const gid = useId().replace(/:/g, '');
  const w = 300;
  const h = 56;
  const pad = 4;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), y(v)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const zero = y(0).toFixed(1);
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${zero} L${pts[0][0].toFixed(1)} ${zero} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-14 block" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={w} y1={zero} y2={zero} stroke="rgba(255,255,255,.18)" strokeDasharray="3 4" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

function Chip({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'border-neutral-700/80 bg-black/30 text-neutral-400',
    good: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    warn: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
    bad: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
  };
  return <span className={`inline-block rounded-full border px-1.5 py-px text-[9px] font-medium leading-4 ${tones[tone]}`}>{children}</span>;
}

function TradeRow({ trade, isBest, mode }) {
  const primary = mode === 'r' ? trade.r : trade.pnl;
  const isLong = trade.direction === 'long';
  const meta = [trade.time, trade.duration ? `held ${trade.duration}` : null, trade.setup].filter(Boolean).join(' · ');

  return (
    <li className="flex items-start gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${trade.direction ? (isLong ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-neutral-500'}`} />
          <span className="text-[12px] font-semibold text-neutral-100 truncate">{trade.symbol}</span>
          {trade.direction && <Chip>{isLong ? 'Long' : 'Short'}</Chip>}
          {isBest && <Chip tone="good">Best</Chip>}
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-500 truncate">{meta}</div>
        {trade.priceLine && (
          <div className="mt-0.5 text-[10px] tabular-nums text-neutral-400">
            {fmtPrice(trade.priceLine.entry)} → {fmtPrice(trade.priceLine.exit)}
          </div>
        )}
        {(trade.plan || trade.mistakes.length > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {trade.plan === 'followed' && <Chip tone="good">Plan followed</Chip>}
            {trade.plan === 'deviated' && <Chip tone="warn">Off plan</Chip>}
            {trade.mistakes.map((m) => (
              <Chip key={m} tone="bad">{m}</Chip>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        <div className={`text-[14px] font-bold tabular-nums leading-tight ${toneOf(primary ?? 0)}`}>
          {primary === null ? '—' : mode === 'r' ? fmtR(primary, 2) : formatMoney(primary)}
        </div>
        <div className="text-[10px] tabular-nums text-neutral-500 mt-0.5">
          {mode === 'r' ? formatMoney(trade.pnl) : trade.r === null ? '' : fmtR(trade.r)}
        </div>
      </div>
    </li>
  );
}

const DailyRecapCard = forwardRef(function DailyRecapCard(
  { recap, mode, appName = 'Trade Journal', backgroundUrl, backgroundDim = 0.6 },
  ref
) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const sign = total > 0 ? 1 : total < 0 ? -1 : 0;
  const color = sign < 0 ? '#fb7185' : '#34d399';
  const visibleTrades = recap.trades.slice(0, 8);
  const extraCount = recap.trades.length - visibleTrades.length;
  const hasBg = !!backgroundUrl;
  const proc = recap.process;
  // "Best" only means something when that trade actually made money.
  const bestValue = recap.bestTrade ? (mode === 'r' ? recap.bestTrade.r : recap.bestTrade.pnl) : null;
  const best = bestValue !== null && bestValue > 0 ? recap.bestTrade : null;
  // With a wallpaper the panels are more see-through so the image reads across the whole card.
  const panel = hasBg ? 'border-neutral-700/70 bg-black/35' : 'border-neutral-800 bg-neutral-900/60';

  const tiles = [
    { label: 'Win rate', value: `${recap.winRate}%`, sub: `${recap.wins}W · ${recap.losses}L` },
    { label: 'Avg R', value: fmtR(recap.avgR, 2), sub: 'per trade', tone: toneOf(recap.avgR) },
    {
      label: 'Best trade',
      value: best ? best.symbol : '—',
      sub: best ? (mode === 'r' ? fmtR(best.r) : formatMoney(best.pnl)) : 'no winner today',
    },
  ];
  if (proc.score !== null) {
    tiles.push({
      label: 'Process',
      value: `${Math.round(proc.score)}%`,
      sub: proc.planRated ? `plan ${proc.planFollowed}/${proc.planRated}` : 'rules followed',
      tone: proc.score >= 80 ? 'text-emerald-400' : proc.score >= 50 ? 'text-amber-300' : 'text-rose-400',
    });
  }

  return (
    <div
      ref={ref}
      className={`relative w-full max-w-[540px] mx-auto overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-5 sm:p-7 ${bricolage.className}`}
    >
      {/* Wallpaper: its own full-bleed layer, so it always spans the whole card however tall it gets. */}
      {hasBg && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${backgroundUrl}")` }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: `rgba(10,10,10,${backgroundDim})` }} />
        </>
      )}

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 font-bold text-[10px]">
              {appName.charAt(0)}
            </div>
            <span className="text-neutral-100 font-medium text-sm tracking-tight">{appName}</span>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1">
            Daily recap
          </span>
        </div>

        {/* date + trade count */}
        <div className="text-[11px] text-neutral-400 mb-2">
          {recap.dateLabel} · {recap.totalTrades} trade{recap.totalTrades !== 1 ? 's' : ''}
        </div>

        {/* headline */}
        <div className="flex items-end justify-between gap-3">
          <div className={`text-4xl sm:text-5xl font-bold tracking-tight leading-none ${sign < 0 ? 'text-rose-400' : sign > 0 ? 'text-emerald-400' : 'text-neutral-200'}`}>
            {mode === 'r' ? fmtR(total, 2) : formatMoney(total)}
          </div>
          {recap.totalTrades > 0 && (
            <span
              className={`mb-1 flex-shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                sign > 0
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  : sign < 0
                    ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                    : 'border-neutral-700 bg-black/30 text-neutral-400'
              }`}
            >
              {sign > 0 ? 'Green day' : sign < 0 ? 'Red day' : 'Flat day'}
            </span>
          )}
        </div>

        {/* the day's path */}
        {recap.trades.length >= 2 && (
          <div className="mt-4">
            <DayCurve values={mode === 'r' ? recap.curveR : recap.curve} color={color} />
          </div>
        )}

        {recap.verdict && <p className="mt-3 text-[12px] leading-relaxed text-neutral-300">{recap.verdict}</p>}

        {/* stat tiles */}
        {recap.totalTrades > 0 ? (
          <div className={`grid gap-2 mt-5 mb-5 ${tiles.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
            {tiles.map((t) => (
              <div key={t.label} className={`border rounded-lg px-2.5 py-2.5 min-w-0 ${panel}`}>
                <div className="text-[9px] uppercase tracking-wide text-neutral-500 mb-1 truncate">{t.label}</div>
                <div className={`text-[13px] font-semibold truncate ${t.tone || 'text-neutral-100'}`}>{t.value}</div>
                {t.sub && <div className="text-[9px] text-neutral-500 mt-0.5 truncate">{t.sub}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5" />
        )}

        {/* trades */}
        {visibleTrades.length > 0 ? (
          <ul className={`border rounded-lg overflow-hidden divide-y divide-neutral-800/60 ${hasBg ? 'border-neutral-700/70 bg-black/30' : 'border-neutral-800 bg-neutral-900/30'}`}>
            {visibleTrades.map((trade) => (
              <TradeRow key={trade.id} trade={trade} mode={mode} isBest={!!best && best.id === trade.id} />
            ))}
          </ul>
        ) : (
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-lg px-4 py-6 text-center text-[12px] text-neutral-500">
            No trades logged this day.
          </div>
        )}
        {extraCount > 0 && <div className="text-[10px] text-neutral-500 text-right mt-1.5">+{extraCount} more trade{extraCount !== 1 ? 's' : ''}</div>}

        {proc.mistakeCost > 0 && (
          <div className="mt-3 text-[11px] text-rose-300/90">
            Mistakes cost {formatMoney(proc.mistakeCost).replace(/^[+-]/, '')} today across {proc.mistakeCount} trade{proc.mistakeCount !== 1 ? 's' : ''}.
          </div>
        )}

        {/* watermark */}
        <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 mt-5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Tracked and reviewed in {appName}
        </div>
      </div>
    </div>
  );
});

export default DailyRecapCard;
