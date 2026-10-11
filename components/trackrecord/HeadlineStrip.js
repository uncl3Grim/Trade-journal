'use client';

import { CountUp, Reveal } from './ui';
import { useInView, useProgress } from '../../lib/useMotion';
import { fmtMoneyShort, fmtNum, fmtPct } from '../../lib/trackRecord';

function Meter({ value, tone }) {
  const [ref, inView] = useInView(0.3);
  const p = useProgress(inView, 1300, 250);
  return (
    <div ref={ref} className="mt-3 h-1 rounded-full bg-neutral-800 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(1, value)) * p * 100}%` }} />
    </div>
  );
}

function Tile({ label, value, format, sub, color, meter, meterTone, delay }) {
  return (
    <Reveal delay={delay}>
      <div className="hover-lift h-full bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</div>
        <div className={`font-heading text-2xl sm:text-3xl font-bold mt-1 tabular-nums ${color}`}>
          <CountUp value={value} format={format} delay={delay} />
        </div>
        <div className="text-[11px] text-neutral-500 mt-1 leading-snug">{sub}</div>
        {meter !== undefined && <Meter value={meter} tone={meterTone} />}
      </div>
    </Reveal>
  );
}

export default function HeadlineStrip({ tr }) {
  const hasBalance = tr.returnPct !== null;
  const up = tr.totalPnl >= 0;
  const expR = tr.expectancyR !== null;

  const tiles = [
    hasBalance
      ? {
          label: 'Return',
          value: tr.returnPct * 100,
          format: (v) => fmtPct(v / 100, 1),
          sub: tr.annualReturn !== null ? `${fmtPct(tr.annualReturn, 1)} annualised` : `${fmtMoneyShort(tr.totalPnl)} net`,
          color: up ? 'text-emerald-400' : 'text-rose-400',
        }
      : {
          label: 'Net P&L',
          value: tr.totalPnl,
          format: (v) => `${v > 0 ? '+' : ''}${fmtMoneyShort(v)}`,
          sub: 'Starting balance not shared',
          color: up ? 'text-emerald-400' : 'text-rose-400',
        },
    hasBalance
      ? {
          label: 'Max drawdown',
          value: -tr.maxDdPct * 100,
          format: (v) => `${v.toFixed(1)}%`,
          sub: `${fmtMoneyShort(-tr.maxDdAbs)} peak to trough`,
          color: 'text-rose-400',
        }
      : {
          label: 'Max drawdown',
          value: -tr.maxDdAbs,
          format: (v) => fmtMoneyShort(v),
          sub: 'Peak to trough',
          color: 'text-rose-400',
        },
    {
      label: 'Profit factor',
      value: tr.profitFactor,
      format: (v) => fmtNum(v, 2),
      sub: 'Gross profit ÷ gross loss',
      color: tr.profitFactor === null || tr.profitFactor >= 1 ? 'text-neutral-50' : 'text-rose-400',
      meter: tr.profitFactor === Infinity ? 1 : (tr.profitFactor || 0) / 3,
      meterTone: 'bg-indigo-400',
    },
    {
      label: 'Expectancy',
      value: expR ? tr.expectancyR : tr.expectancyMoney,
      format: expR ? (v) => `${fmtNum(v, 2, true)}R` : (v) => `${v > 0 ? '+' : ''}${fmtMoneyShort(v)}`,
      sub: expR ? 'Average R per trade' : 'Average $ per trade',
      color: (expR ? tr.expectancyR : tr.expectancyMoney) >= 0 ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      label: 'Win rate',
      value: tr.winRate,
      format: (v) => `${v.toFixed(0)}%`,
      sub: `${tr.winCount} wins · ${tr.n - tr.winCount} other`,
      color: 'text-neutral-50',
      meter: tr.winRate / 100,
      meterTone: 'bg-emerald-400',
    },
    {
      label: 'Payoff ratio',
      value: tr.payoff,
      format: (v) => fmtNum(v, 2),
      sub: 'Avg win ÷ avg loss',
      color: 'text-neutral-50',
      meter: (tr.payoff || 0) / 3,
      meterTone: 'bg-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {tiles.map((t, i) => (
        <Tile key={t.label} {...t} delay={i * 70} />
      ))}
    </div>
  );
}
