'use client';

import { CountUp, GlassCard } from './ui';
import { useInView, useProgress } from '../../lib/useMotion';
import { fmtMoneyShort, fmtNum, fmtPct } from '../../lib/trackRecord';

function Stat({ label, hint, children, footer }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 p-4 hover-lift">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="font-heading text-2xl font-bold text-neutral-50 mt-1 tabular-nums">{children}</div>
      {footer}
      {hint && <div className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{hint}</div>}
    </div>
  );
}

function ScaleBar({ value, max = 3 }) {
  const [ref, inView] = useInView(0.3);
  const p = useProgress(inView, 1400, 200);
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <div ref={ref} className="mt-2">
      <div className="relative h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={{ width: `${pct * p * 100}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-neutral-600 mt-1"><span>0</span><span>{max}+</span></div>
    </div>
  );
}

function Pips({ count }) {
  const [ref, inView] = useInView(0.3);
  const shown = Math.min(count, 24);
  return (
    <div ref={ref} className="flex flex-wrap gap-1 mt-2">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-sm bg-rose-500/80"
          style={{
            transform: inView ? 'scale(1)' : 'scale(0)',
            transition: `transform 350ms cubic-bezier(0.34,1.56,0.64,1) ${i * 45}ms`,
          }}
        />
      ))}
      {count > shown && <span className="text-[10px] text-neutral-500 ml-1">+{count - shown}</span>}
    </div>
  );
}

function Concentration({ share }) {
  const [ref, inView] = useInView(0.3);
  const p = useProgress(inView, 1300, 200);
  const pct = Math.max(0, Math.min(1, share)) * 100;
  const risky = share > 0.5;
  return (
    <div ref={ref} className="mt-2">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-neutral-800">
        <div className={`h-full ${risky ? 'bg-amber-400' : 'bg-indigo-400'}`} style={{ width: `${pct * p}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
        <span className={risky ? 'text-amber-400' : 'text-indigo-300'}>Top 3 trades</span>
        <span>All other winners</span>
      </div>
    </div>
  );
}

export default function RiskRatios({ tr }) {
  const noBalance = tr.startingBalance === null;
  return (
    <GlassCard title="Risk & ratios" subtitle="How the return was earned, and what it cost in risk">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat label="Sharpe" hint={noBalance ? 'Needs starting balance' : 'Annualised from daily returns'} footer={<ScaleBar value={tr.sharpe} />}>
          <CountUp value={tr.sharpe} format={(v) => fmtNum(v, 2)} />
        </Stat>
        <Stat label="Sortino" hint={noBalance ? 'Needs starting balance' : 'Penalises downside volatility only'} footer={<ScaleBar value={tr.sortino} max={4} />}>
          <CountUp value={tr.sortino} format={(v) => fmtNum(v, 2)} />
        </Stat>
        <Stat label="Calmar" hint={noBalance ? 'Needs starting balance' : tr.calmar === null ? 'Needs 3+ months of history' : 'Annualised return ÷ max drawdown'} footer={<ScaleBar value={tr.calmar} max={4} />}>
          <CountUp value={tr.calmar} format={(v) => fmtNum(v, 2)} />
        </Stat>

        <Stat label="Max losing streak" hint={`Longest run of consecutive losing trades · best win run ${tr.maxWinStreak}`} footer={<Pips count={tr.maxLoseStreak} />}>
          <CountUp value={tr.maxLoseStreak} format={(v) => Math.round(v).toString()} />
          <span className="text-sm font-medium text-neutral-500"> trades</span>
        </Stat>

        <Stat
          label="Avg risk / trade"
          hint={tr.avgRiskAmount === null ? 'Risk amount not recorded on trades' : tr.avgRiskPct !== null ? `≈ ${fmtMoneyShort(tr.avgRiskAmount)} per trade` : 'Average amount risked per trade'}
        >
          {tr.avgRiskPct !== null ? (
            <CountUp value={tr.avgRiskPct * 100} format={(v) => `${v.toFixed(2)}%`} />
          ) : tr.avgRiskAmount !== null ? (
            <CountUp value={tr.avgRiskAmount} format={(v) => fmtMoneyShort(v)} />
          ) : (
            '—'
          )}
        </Stat>

        <Stat
          label="Top-3 concentration"
          hint={tr.top3Share === null ? 'No winning trades' : `Excluding them, net P&L is ${tr.pnlExTop3 >= 0 ? '+' : ''}${fmtMoneyShort(tr.pnlExTop3)}`}
          footer={tr.top3Share !== null ? <Concentration share={tr.top3Share} /> : null}
        >
          {tr.top3Share !== null ? <CountUp value={tr.top3Share * 100} format={(v) => `${v.toFixed(0)}%`} /> : '—'}
          <span className="text-sm font-medium text-neutral-500"> of gross profit</span>
        </Stat>
      </div>
    </GlassCard>
  );
}
