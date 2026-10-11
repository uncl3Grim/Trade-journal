'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { GlassCard } from './ui';
import { useInView, useProgress } from '../../lib/useMotion';
import { fmtMoneyShort } from '../../lib/trackRecord';
import { formatMoney } from '../../lib/format';

const H1 = 270;
const H2 = 96;
const PAD = { l: 58, r: 16, t: 14, b: 24 };

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const rough = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) || rough;
  const start = Math.ceil(min / step) * step;
  const out = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

export default function TrackEquityChart({ tr }) {
  const { curve, startingBalance } = tr;
  const wrapRef = useRef(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState(null);
  const [inViewRef, inView] = useInView(0.2);
  const p = useProgress(inView, 2200);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setW(el.clientWidth || 720);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const t0 = curve[0].t;
    const t1 = curve[curve.length - 1].t || t0 + 1;
    const x = (t) => PAD.l + ((t - t0) / (t1 - t0 || 1)) * (w - PAD.l - PAD.r);

    const eqs = curve.map((c) => c.equity);
    const peaks = curve.map((c) => c.peak);
    let lo = Math.min(...eqs);
    let hi = Math.max(...peaks);
    const padY = (hi - lo || 1) * 0.08;
    lo -= padY;
    hi += padY;
    const y1 = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H1 - PAD.t - PAD.b);
    const bottom1 = H1 - PAD.b;

    const line = (key, fn = y1) => curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.t).toFixed(1)} ${fn(c[key]).toFixed(1)}`).join(' ');
    const eqLine = line('equity');
    const peakLine = line('peak');
    const area = `${eqLine} L${x(t1).toFixed(1)} ${bottom1} L${x(t0).toFixed(1)} ${bottom1} Z`;

    const minDd = Math.min(0, ...curve.map((c) => c.dd)) || -1;
    const y2 = (v) => 6 + (v / minDd) * (H2 - 6 - 8);
    const ddLine = curve.map((c, i) => `${i ? 'L' : 'M'}${x(c.t).toFixed(1)} ${y2(c.dd).toFixed(1)}`).join(' ');
    const ddArea = `M${x(t0).toFixed(1)} ${y2(0)} ${ddLine.replace(/^M/, 'L')} L${x(t1).toFixed(1)} ${y2(0)} Z`;

    const yTicks = niceTicks(lo, hi, 4).map((v) => ({ v, y: y1(v) }));
    const xCount = w < 520 ? 3 : 5;
    const xTicks = Array.from({ length: xCount }, (_, i) => {
      const t = t0 + ((t1 - t0) * i) / (xCount - 1);
      return { t, x: x(t) };
    });
    const ddBand =
      tr.maxDdTroughIdx > tr.maxDdPeakIdx
        ? { x0: x(curve[tr.maxDdPeakIdx].t), x1: x(curve[tr.maxDdTroughIdx].t) }
        : null;
    const last = curve[curve.length - 1];
    return { x, y1, eqLine, peakLine, area, ddLine, ddArea, y2, yTicks, xTicks, ddBand, t0, t1, last, minDd, bottom1 };
  }, [curve, w, tr.maxDdPeakIdx, tr.maxDdTroughIdx]);

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const t = g.t0 + ((px - PAD.l) / (w - PAD.l - PAD.r)) * (g.t1 - g.t0);
    let lo = 0;
    let hi = curve.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (curve[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && Math.abs(curve[lo - 1].t - t) < Math.abs(curve[lo].t - t)) lo -= 1;
    setHover(lo);
  }

  const hp = hover !== null ? curve[hover] : null;
  const balanceLabel = startingBalance ? 'Balance' : 'Cumulative P&L';
  const fmtAxis = (v) => (startingBalance ? fmtMoneyShort(v) : `${v > 0 ? '+' : ''}${fmtMoneyShort(v)}`);
  const tipLeft = hp ? Math.min(Math.max(g.x(hp.t), 90), w - 90) : 0;

  return (
    <GlassCard
      title="Equity curve"
      subtitle="Balance over time, with drawdown shaded below"
      right={
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-indigo-400 rounded" />{balanceLabel}</span>
          <span className="flex items-center gap-1"><i className="h-0 w-4 border-t border-dashed border-neutral-500" />High-water mark</span>
          <span className="flex items-center gap-1"><i className="h-2 w-3 rounded-sm bg-rose-500/40" />Drawdown</span>
        </div>
      }
    >
      <div ref={(el) => { wrapRef.current = el; inViewRef.current = el; }} className="relative select-none">
        <svg width={w} height={H1 + H2 + 10} className="block touch-pan-y" role="img" aria-label="Equity curve and drawdown">
          <defs>
            <linearGradient id={`eqfill${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`ddfill${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id={`eqstroke${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <clipPath id={`clip${uid}`}>
              <rect x="0" y="0" width={PAD.l + p * (w - PAD.l)} height={H1 + H2 + 10} />
            </clipPath>
          </defs>

          {/* grid + y labels */}
          {g.yTicks.map((t) => (
            <g key={t.v}>
              <line x1={PAD.l} x2={w - PAD.r} y1={t.y} y2={t.y} stroke="#fff" strokeOpacity="0.06" />
              <text x={PAD.l - 8} y={t.y + 3} textAnchor="end" fontSize="10" fill="#737373">{fmtAxis(t.v)}</text>
            </g>
          ))}
          {g.xTicks.map((t, i) => (
            <text key={i} x={t.x} y={H1 - 6} textAnchor={i === 0 ? 'start' : i === g.xTicks.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#737373">
              {format(new Date(t.t), 'MMM yy')}
            </text>
          ))}
          {startingBalance && g.y1(startingBalance) > PAD.t && g.y1(startingBalance) < g.bottom1 && (
            <line x1={PAD.l} x2={w - PAD.r} y1={g.y1(startingBalance)} y2={g.y1(startingBalance)} stroke="#fff" strokeOpacity="0.18" strokeDasharray="2 4" />
          )}

          <g clipPath={`url(#clip${uid})`}>
            {g.ddBand && (
              <rect x={g.ddBand.x0} y={PAD.t} width={Math.max(2, g.ddBand.x1 - g.ddBand.x0)} height={g.bottom1 - PAD.t} fill="#fb7185" fillOpacity="0.07" />
            )}
            <path d={g.area} fill={`url(#eqfill${uid})`} />
            <path d={g.peakLine} fill="none" stroke="#a3a3a3" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="4 4" />
            <path d={g.eqLine} fill="none" stroke={`url(#eqstroke${uid})`} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

            {/* underwater panel */}
            <g transform={`translate(0 ${H1 + 4})`}>
              <line x1={PAD.l} x2={w - PAD.r} y1={g.y2(0)} y2={g.y2(0)} stroke="#fff" strokeOpacity="0.12" />
              <path d={g.ddArea} fill={`url(#ddfill${uid})`} />
              <path d={g.ddLine} fill="none" stroke="#fb7185" strokeWidth="1.25" strokeLinejoin="round" />
            </g>
          </g>
          <text x={PAD.l - 8} y={H1 + 4 + g.y2(0) + 10} textAnchor="end" fontSize="9" fill="#737373">0</text>
          <text x={PAD.l - 8} y={H1 + 4 + g.y2(g.minDd) + 3} textAnchor="end" fontSize="9" fill="#fb7185">
            {startingBalance ? `-${((tr.maxDdPct || 0) * 100).toFixed(1)}%` : fmtMoneyShort(g.minDd)}
          </text>

          {/* live endpoint */}
          {p >= 1 && (
            <g>
              <circle cx={g.x(g.last.t)} cy={g.y1(g.last.equity)} r="4" fill="#34d399" />
              <circle cx={g.x(g.last.t)} cy={g.y1(g.last.equity)} r="4" fill="none" stroke="#34d399" className="tr-svg-ring">
                <animate attributeName="r" values="4;14" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* scrubber */}
          {hp && (
            <g pointerEvents="none">
              <line x1={g.x(hp.t)} x2={g.x(hp.t)} y1={PAD.t} y2={H1 + H2} stroke="#fff" strokeOpacity="0.25" />
              <circle cx={g.x(hp.t)} cy={g.y1(hp.equity)} r="4.5" fill="#0a0a0a" stroke="#818cf8" strokeWidth="2" />
              <circle cx={g.x(hp.t)} cy={H1 + 4 + g.y2(hp.dd)} r="3.5" fill="#0a0a0a" stroke="#fb7185" strokeWidth="2" />
            </g>
          )}
          <rect
            x={PAD.l}
            y="0"
            width={w - PAD.l - PAD.r}
            height={H1 + H2 + 10}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg border border-neutral-700/70 bg-neutral-900/90 backdrop-blur px-3 py-2 text-xs shadow-xl"
            style={{ left: tipLeft }}
          >
            <div className="text-neutral-400">{hover === 0 ? 'Start' : format(new Date(hp.t), 'MMM d, yyyy')}</div>
            <div className="text-neutral-50 font-medium tabular-nums">
              {balanceLabel}: {startingBalance ? formatMoney(hp.equity).replace('+', '') : formatMoney(hp.equity)}
            </div>
            <div className="text-rose-400 tabular-nums">
              {hp.dd === 0 ? 'At high-water mark' : `Drawdown ${formatMoney(hp.dd)}${startingBalance ? ` (${(hp.ddPct * 100).toFixed(1)}%)` : ''}`}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
