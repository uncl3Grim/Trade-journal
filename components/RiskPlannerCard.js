'use client';

import { useMemo, useState } from 'react';
import {
  HORIZON,
  LIMITS,
  RISKS,
  TARGET,
  largestSafeRisk,
  recoveryNeeded,
  simulate,
  streakCost,
  streakOdds,
  tradeStats,
} from '../lib/riskSim';

const pct1 = (v) => `${v.toFixed(1)}%`;
const chance = (p) => (p < 0.005 ? '<1%' : p > 0.995 ? '>99%' : `${Math.round(p * 100)}%`);
const sizeLabel = (r) => `${r}%`;

function Tile({ label, value, sub, tone = 'text-neutral-100' }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 truncate">{label}</div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums truncate ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 truncate">{sub}</div>}
    </div>
  );
}

export default function RiskPlannerCard({ trades }) {
  const stats = useMemo(() => tradeStats(trades), [trades]);
  const [limit, setLimit] = useState(20);
  const [risk, setRisk] = useState(1);

  // Only re-run the simulation when the numbers behind it change.
  const key = stats.reason ? null : `${stats.pw.toFixed(6)}|${stats.pl.toFixed(6)}|${stats.b.toFixed(6)}`;
  const rows = useMemo(() => (stats.reason ? null : simulate(stats)), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <>
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">Risk planner</h3>
      <p className="text-xs text-neutral-500 mb-4">
        Uses your own win rate and your average win against your average loss to show how deep a bad run can get at different risk sizes. It is an estimate from past results, not a forecast.
      </p>
    </>
  );

  const shell = (children) => <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">{header}{children}</div>;

  if (stats.reason === 'few') {
    return shell(
      <p className="text-xs text-neutral-500 leading-relaxed">
        You have {stats.n} closed trade{stats.n !== 1 ? 's' : ''}. This needs at least 10 to estimate anything, and about 30 to be worth leaning on.
      </p>
    );
  }
  if (stats.reason === 'no-losses') {
    return shell(
      <p className="text-xs text-neutral-500 leading-relaxed">
        None of your {stats.n} closed trades lost money, so there is no average loss to measure risk against yet. Once you have a few losing trades this will work.
      </p>
    );
  }

  const selected = rows.find((r) => r.risk === risk) || rows[0];
  const safe = stats.expectancyR > 0 ? largestSafeRisk(rows, limit) : null;
  const maxSize = RISKS[RISKS.length - 1];
  const losingEdge = stats.expectancyR <= 0;

  return shell(
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Tile label="Win rate" value={`${(stats.pw * 100).toFixed(0)}%`} sub={`${stats.wins}W · ${stats.losses}L`} />
        <Tile label="Win vs loss" value={`${stats.b.toFixed(2)} : 1`} sub="avg win ÷ avg loss" />
        <Tile
          label="Edge per trade"
          value={`${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(2)}R`}
          sub="expectancy"
          tone={stats.expectancyR > 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <Tile label="Based on" value={`${stats.n} trades`} sub="all closed trades" />
      </div>

      {stats.small && (
        <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-neutral-300 leading-relaxed">
          Only {stats.n} trades so far, so these numbers are rough. A few more weeks of data will make them far more trustworthy.
        </div>
      )}

      {losingEdge && (
        <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-100 leading-relaxed">
          At your current numbers, each trade loses about {Math.abs(stats.expectancyR).toFixed(2)}R on average. A smaller size only makes you lose more slowly, so no size is “safe” here.
          Work on the edge first: check What your mistakes cost, and cut the trades and hours that lose.
        </div>
      )}

      <div className="mb-3">
        <div className="text-[11px] text-neutral-400 mb-1.5">The biggest drop in your account you can live with</div>
        <div className="flex gap-2">
          {LIMITS.map((L) => (
            <button
              key={L}
              type="button"
              onClick={() => setLimit(L)}
              aria-pressed={limit === L}
              className={`pf-chip rounded-full border px-3.5 py-1.5 text-xs ${
                limit === L ? 'is-active border-indigo-400/60 bg-indigo-500/15 text-indigo-100' : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {L}%
            </button>
          ))}
        </div>
      </div>

      {!losingEdge && (
        <div
          className={`mb-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
            safe === null ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {safe === null ? (
            <>Even risking {sizeLabel(RISKS[0])} per trade, there is more than a 1 in 20 chance of a {limit}% drop within {HORIZON} trades. Your results are swingy, so keep size small until they settle.</>
          ) : safe === maxSize ? (
            <>
              Every size shown keeps the chance of a {limit}% drop within {HORIZON} trades under 1 in 20. That does not mean {maxSize}% is wise. Scale up in small steps and watch the real results.
            </>
          ) : (
            <>
              <b>Largest size that keeps a {limit}% drop under a 1 in 20 chance: {sizeLabel(safe)} per trade.</b> Over the next {HORIZON} trades, anything bigger makes that drop more likely than that.
            </>
          )}
        </div>
      )}

      <div className="text-[11px] text-neutral-400 mb-1.5">Tap a size to see more. Chance of a {limit}% drop within {HORIZON} trades:</div>
      <div className="rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
        <div className="grid grid-cols-[3.5rem_1fr_4rem_4rem] gap-2 px-3 py-1.5 text-[9px] uppercase tracking-wide text-neutral-500 bg-black/20">
          <span>Risk</span>
          <span>Chance</span>
          <span className="text-right">Typical</span>
          <span className="text-right">Bad case</span>
        </div>
        {rows.map((r) => {
          const p = r.exceed[limit];
          const bar = p <= TARGET ? 'bg-emerald-400' : p <= 0.2 ? 'bg-amber-400' : 'bg-rose-400';
          const isSel = r.risk === risk;
          return (
            <button
              key={r.risk}
              type="button"
              onClick={() => setRisk(r.risk)}
              aria-pressed={isSel}
              className={`grid w-full grid-cols-[3.5rem_1fr_4rem_4rem] items-center gap-2 px-3 py-2.5 text-left ${isSel ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <span className="text-xs font-semibold text-neutral-100 tabular-nums">
                {sizeLabel(r.risk)}
                {!losingEdge && safe === r.risk && <span className="ml-1 text-[9px] font-medium text-emerald-300">max</span>}
              </span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                  <span className={`block h-full rounded-full ${bar}`} style={{ width: `${Math.max(2, Math.min(100, p * 100))}%` }} />
                </span>
                <span className="w-9 text-right text-[11px] tabular-nums text-neutral-300">{chance(p)}</span>
              </span>
              <span className="text-right text-[11px] tabular-nums text-neutral-400">-{pct1(r.median)}</span>
              <span className="text-right text-[11px] tabular-nums text-neutral-400">-{pct1(r.p95)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] text-neutral-600 leading-relaxed">
        Typical = the usual worst drop from a peak over {HORIZON} trades. Bad case = the worst 1 in 20.
      </p>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3 space-y-2.5 text-xs text-neutral-300 leading-relaxed">
        <div className="text-neutral-100 font-medium">If you risk {sizeLabel(risk)} per trade</div>
        <div>
          Eight losses in a row would cost about <b className="text-rose-300">{pct1(streakCost(risk, 8))}</b> of your account.
        </div>
        <div>
          A bad run (the worst 1 in 20) takes you about <b className="text-rose-300">{pct1(selected.p95)}</b> down from a peak, and you would then need{' '}
          <b className="text-amber-200">+{recoveryNeeded(selected.p95).toFixed(1)}%</b> to get back to it.
        </div>
        <div>
          <div className="mb-1.5 text-neutral-400">Chance of a losing run this long somewhere in your next {HORIZON} trades (at your loss rate of {(stats.pl * 100).toFixed(0)}%):</div>
          <div className="grid grid-cols-3 gap-2">
            {[5, 8, 10].map((k) => (
              <div key={k} className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 text-center">
                <div className="text-[10px] text-neutral-500">{k}+ losses</div>
                <div className="text-sm font-semibold tabular-nums text-neutral-100">{chance(streakOdds(stats.pl, HORIZON, k))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-neutral-600 leading-relaxed">
        How it works: it treats your average loss as 1R and your average win as {stats.b.toFixed(2)}R, plays the next {HORIZON} trades 3,000 times at each size, and assumes each trade is independent and your edge stays the same.
        Real markets change, so use this to set limits, not to predict.
      </p>
    </>
  );
}
