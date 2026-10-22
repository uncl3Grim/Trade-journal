'use client';

import { forwardRef, useId } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { format } from 'date-fns';
import { formatMoney } from '../lib/format';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

const fmtR = (r, digits = 1) => `${r >= 0 ? '+' : ''}${r.toFixed(digits)}R`;
const toneOf = (v) => (v > 0 ? 'text-emerald-400' : v < 0 ? 'text-rose-400' : 'text-neutral-400');

// Short value for under a bar, e.g. +$1.2k, -$45, +1.5R.
function compact(v, mode) {
  if (mode === 'r') return fmtR(v);
  const abs = Math.abs(v);
  const body = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `${Math.round(abs)}`;
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}$${body}`;
}

// The week's running total, one point per trading day, starting from zero.
function WeekCurve({ values, color }) {
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

// One bar per day Mon–Sun. Wins go up from the zero line, losses go down.
function DayBars({ days, mode, bestKey }) {
  const H = 84;
  const vals = days.map((d) => (d.trades ? (mode === 'r' ? d.r : d.pnl) : 0));
  const maxPos = Math.max(0, ...vals);
  const maxNeg = Math.max(0, ...vals.map((v) => -v));
  const total = maxPos + maxNeg || 1;
  const posH = maxNeg === 0 ? H : maxPos === 0 ? 0 : Math.min(H - 18, Math.max(18, Math.round((H * maxPos) / total)));
  const negH = H - posH;

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d, i) => {
        const v = vals[i];
        const has = d.trades > 0;
        const isBest = has && d.dateLabel === bestKey;
        const barH = has
          ? v >= 0
            ? Math.max(4, Math.round((maxPos ? v / maxPos : 0) * posH))
            : Math.max(4, Math.round((maxNeg ? -v / maxNeg : 0) * negH))
          : 0;
        const barColor = v > 0 ? 'bg-emerald-400' : v < 0 ? 'bg-rose-400' : 'bg-neutral-500';
        return (
          <div key={d.dateLabel} className="min-w-0 flex flex-col items-center">
            <div className="w-full flex flex-col" style={{ height: H }}>
              <div className="flex items-end justify-center" style={{ height: posH }}>
                {has && v >= 0 && <div className={`w-full max-w-[26px] rounded-t-md ${barColor} ${isBest ? '' : 'opacity-70'}`} style={{ height: barH }} />}
              </div>
              <div className="flex items-start justify-center border-t border-neutral-700/70" style={{ height: negH }}>
                {has && v < 0 && <div className={`w-full max-w-[26px] rounded-b-md ${barColor} opacity-80`} style={{ height: barH }} />}
              </div>
            </div>
            <div className={`mt-1.5 text-[9px] font-medium uppercase tracking-wide ${d.isWeekend ? 'text-indigo-300/80' : 'text-neutral-500'}`}>{d.label}</div>
            <div className={`text-[10px] font-semibold tabular-nums truncate max-w-full ${has ? toneOf(v) : 'text-neutral-700'}`}>{has ? compact(v, mode) : '—'}</div>
            <div className="text-[8px] text-neutral-600">{has ? `${d.trades} trade${d.trades !== 1 ? 's' : ''}` : 'none'}</div>
          </div>
        );
      })}
    </div>
  );
}

const WeeklyRecapCard = forwardRef(function WeeklyRecapCard(
  { recap, mode, appName = 'Trade Journal', backgroundUrl, backgroundDim = 0.6 },
  ref
) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const sign = total > 0 ? 1 : total < 0 ? -1 : 0;
  const color = sign < 0 ? '#fb7185' : '#34d399';
  const hasBg = !!backgroundUrl;
  const proc = recap.process;
  const panel = hasBg ? 'border-neutral-700/70 bg-black/35' : 'border-neutral-800 bg-neutral-900/60';

  // Against last week.
  let vs = null;
  if (recap.prev && recap.totalTrades > 0) {
    const diff = mode === 'r' ? recap.totalR - recap.prev.r : recap.totalPnl - recap.prev.pnl;
    const shown = mode === 'r' ? `${Math.abs(diff).toFixed(2)}R` : formatMoney(Math.abs(diff)).replace(/^[+-]/, '');
    vs = Math.abs(diff) < 0.005 ? 'Same as last week' : `${diff > 0 ? '▲' : '▼'} ${shown} ${diff > 0 ? 'more' : 'less'} than last week`;
    vs = { text: vs, tone: toneOf(diff) };
  }

  const tiles = [
    { label: 'Win rate', value: `${recap.winRate}%`, sub: `${recap.wins}W · ${recap.losses}L` },
    { label: 'Avg R', value: fmtR(recap.avgR, 2), sub: 'per trade', tone: toneOf(recap.avgR) },
    { label: 'Green days', value: `${recap.greenDays}/${recap.activeDayCount}`, sub: 'trading days' },
    {
      label: 'Best day',
      value: recap.bestDay && (mode === 'r' ? recap.bestDay.r : recap.bestDay.pnl) > 0 ? recap.bestDay.label : '—',
      sub:
        recap.bestDay && (mode === 'r' ? recap.bestDay.r : recap.bestDay.pnl) > 0
          ? compact(mode === 'r' ? recap.bestDay.r : recap.bestDay.pnl, mode)
          : 'no green day',
    },
  ];

  const bestKey = recap.bestDay && (mode === 'r' ? recap.bestDay.r : recap.bestDay.pnl) > 0 ? recap.bestDay.dateLabel : null;

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
            Weekly recap
          </span>
        </div>

        {/* date + trade count */}
        <div className="text-[11px] text-neutral-400 mb-2">
          {format(recap.weekStart, 'MMM d')} – {format(recap.weekEnd, 'MMM d, yyyy')} · {recap.totalTrades} trade
          {recap.totalTrades !== 1 ? 's' : ''}
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
              {sign > 0 ? 'Green week' : sign < 0 ? 'Red week' : 'Flat week'}
            </span>
          )}
        </div>
        {vs && <div className={`mt-2 text-[11px] font-medium ${vs.tone}`}>{vs.text}</div>}

        {recap.totalTrades > 0 ? (
          <>
            {/* the week's path */}
            {recap.activeDayCount >= 2 && (
              <div className="mt-4">
                <WeekCurve values={mode === 'r' ? recap.curveR : recap.curve} color={color} />
              </div>
            )}

            {recap.verdict && <p className="mt-3 text-[12px] leading-relaxed text-neutral-300">{recap.verdict}</p>}

            {/* day by day */}
            <div className={`mt-5 border rounded-lg px-3 pt-4 pb-3 ${panel}`}>
              <DayBars days={recap.days} mode={mode} bestKey={bestKey} />
            </div>

            {/* stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {tiles.map((t) => (
                <div key={t.label} className={`border rounded-lg px-2.5 py-2.5 min-w-0 ${panel}`}>
                  <div className="text-[9px] uppercase tracking-wide text-neutral-500 mb-1 truncate">{t.label}</div>
                  <div className={`text-[13px] font-semibold truncate ${t.tone || 'text-neutral-100'}`}>{t.value}</div>
                  {t.sub && <div className="text-[9px] text-neutral-500 mt-0.5 truncate">{t.sub}</div>}
                </div>
              ))}
            </div>

            {/* process */}
            {proc.score !== null && (
              <div className={`mt-3 border rounded-lg px-3 py-3 ${panel}`}>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
                  <span className="text-neutral-500">Process</span>
                  <span className={`font-semibold ${proc.score >= 80 ? 'text-emerald-400' : proc.score >= 50 ? 'text-amber-300' : 'text-rose-400'}`}>
                    {Math.round(proc.score)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${proc.score >= 80 ? 'bg-emerald-400' : proc.score >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    style={{ width: `${Math.max(2, Math.min(100, proc.score))}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] text-neutral-500">
                  {proc.planRated > 0 ? `Plan followed on ${proc.planFollowed} of ${proc.planRated} rated trades` : 'Based on checklists and stops'}
                </div>
              </div>
            )}

            {proc.mistakeCost > 0 && (
              <div className="mt-3 text-[11px] text-rose-300/90">
                Mistakes cost {formatMoney(proc.mistakeCost).replace(/^[+-]/, '')} this week across {proc.mistakeCount} trade{proc.mistakeCount !== 1 ? 's' : ''}.
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 border border-neutral-800 bg-neutral-900/40 rounded-lg px-4 py-6 text-center text-[12px] text-neutral-500">
            No trades logged this week.
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

export default WeeklyRecapCard;
