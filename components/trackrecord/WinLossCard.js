'use client';

import { CountUp, GlassCard } from './ui';
import { useInView, useProgress } from '../../lib/useMotion';
import { fmtMoneyShort } from '../../lib/trackRecord';

const R = 56;
const C = 2 * Math.PI * R;

function Donut({ tr, p }) {
  const total = tr.n || 1;
  const segs = [
    { key: 'win', n: tr.winCount, color: '#34d399' },
    { key: 'loss', n: tr.lossCount, color: '#fb7185' },
    { key: 'be', n: tr.breakevenCount, color: '#737373' },
  ].filter((s) => s.n > 0);
  let start = 0;
  return (
    <svg width="148" height="148" viewBox="0 0 148 148" className="flex-shrink-0" role="img" aria-label="Wins versus losses">
      <circle cx="74" cy="74" r={R} fill="none" stroke="#fff" strokeOpacity="0.06" strokeWidth="14" />
      {segs.map((s) => {
        const frac = s.n / total;
        const vis = Math.max(0, Math.min(frac, p - start)) * C;
        const el = (
          <circle
            key={s.key}
            cx="74"
            cy="74"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${vis} ${C - vis}`}
            strokeDashoffset={-start * C}
            transform="rotate(-90 74 74)"
          />
        );
        start += frac;
        return el;
      })}
      <text x="74" y="72" textAnchor="middle" className="fill-neutral-50 font-heading" fontSize="26" fontWeight="700">
        {Math.round(tr.winRate * p)}%
      </text>
      <text x="74" y="90" textAnchor="middle" fontSize="10" fill="#737373">
        win rate
      </text>
    </svg>
  );
}

// Loss bar grows left from the centre line, win bar grows right.
function Versus({ label, win, loss, p, delay }) {
  const max = Math.max(win, loss, 1);
  const ease = Math.max(0, Math.min(1, p * 1.15 - delay));
  return (
    <div className="py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1.5 text-center">{label}</div>
      <div className="grid grid-cols-[64px_1fr_1fr_64px] items-center gap-1.5">
        <div className="text-right text-xs font-medium text-rose-400 tabular-nums">-{fmtMoneyShort(loss).replace('-', '')}</div>
        <div className="h-3 flex justify-end rounded-l-full bg-neutral-800/60 overflow-hidden">
          <div className="h-full rounded-l-full bg-gradient-to-l from-rose-500 to-rose-400" style={{ width: `${(loss / max) * 100 * ease}%` }} />
        </div>
        <div className="h-3 flex justify-start rounded-r-full bg-neutral-800/60 overflow-hidden">
          <div className="h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${(win / max) * 100 * ease}%` }} />
        </div>
        <div className="text-left text-xs font-medium text-emerald-400 tabular-nums">+{fmtMoneyShort(win)}</div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, n, total }) {
  return (
    <div className="flex items-center justify-between gap-6 py-1.5 border-b border-neutral-800/40 last:border-0">
      <span className="flex items-center gap-2 text-sm text-neutral-300">
        <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm text-neutral-100 tabular-nums">
        <CountUp value={n} format={(v) => Math.round(v).toString()} />
        <span className="text-neutral-500 text-xs ml-1.5">{total ? ((n / total) * 100).toFixed(1) : 0}%</span>
      </span>
    </div>
  );
}

export default function WinLossCard({ tr }) {
  const [ref, inView] = useInView(0.2);
  const p = useProgress(inView, 1500, 150);
  return (
    <GlassCard title="Wins vs losses" subtitle="How often you win, and how big the wins and losses are">
      <div ref={ref} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="flex items-center gap-5 justify-center md:justify-start">
          <Donut tr={tr} p={p} />
          <div className="min-w-[150px]">
            <LegendRow color="#34d399" label="Wins" n={tr.winCount} total={tr.n} />
            <LegendRow color="#fb7185" label="Losses" n={tr.lossCount} total={tr.n} />
            {tr.breakevenCount > 0 && <LegendRow color="#737373" label="Breakeven" n={tr.breakevenCount} total={tr.n} />}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-neutral-500 px-1">
            <span className="text-rose-400">Losses</span>
            <span className="text-emerald-400">Wins</span>
          </div>
          <Versus label="Average trade" win={tr.avgWin} loss={tr.avgLoss} p={p} delay={0} />
          <Versus label="Largest trade" win={tr.largestWin} loss={tr.largestLoss} p={p} delay={0.1} />
          <Versus label="Total" win={tr.grossProfit} loss={tr.grossLoss} p={p} delay={0.2} />
        </div>
      </div>
    </GlassCard>
  );
}
