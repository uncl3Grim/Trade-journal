'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { computeHourStats, hourLabel, MIN_CELL_TRADES, MIN_HOUR_TRADES, MIN_TOTAL } from '../lib/hourStats';

const moneyAbs = (v) => formatMoney(Math.abs(v)).replace(/^[+-]/, '');
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${moneyAbs(v)}`;

// Short number for inside a small cell: +45, -1.2k.
function compact(v) {
  const abs = Math.abs(v);
  const body = abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `${Math.round(abs)}`;
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${body}`;
}

// Green for hours that made money on average, red for hours that lost, stronger = bigger average.
function tint(avg, max, faded) {
  if (!avg) return 'rgba(255,255,255,0.05)';
  const strength = max ? Math.min(1, Math.abs(avg) / max) : 0.4;
  const alpha = (0.14 + 0.56 * strength) * (faded ? 0.55 : 1);
  return avg > 0 ? `rgba(52,211,153,${alpha.toFixed(3)})` : `rgba(251,113,133,${alpha.toFixed(3)})`;
}

function rangeLabel(hours) {
  return hours.map((h) => hourLabel(h.hour)).join(', ');
}

export default function HourHeatmapCard({ trades }) {
  const stats = useMemo(() => computeHourStats(trades), [trades]);
  const [sel, setSel] = useState(null); // { dow: number | null, hour }

  const rows = [];
  if (stats.firstHour !== null) for (let h = stats.firstHour; h <= stats.lastHour; h++) rows.push(h);
  const cols = stats.shownDays;
  const gridStyle = { gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr)) minmax(0, 1.15fr)` };

  let detail = null;
  if (sel) {
    const c = sel.dow === null ? stats.hours[sel.hour] : stats.cellAt(sel.dow, sel.hour);
    const dayLabel = sel.dow === null ? 'All days' : (cols.find((d) => d.dow === sel.dow) || {}).label;
    detail = { label: `${dayLabel} · ${hourLabel(sel.hour)}–${hourLabel((sel.hour + 1) % 24)}`, ...c };
  }

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">Your best and worst hours</h3>
      <p className="text-xs text-neutral-500 mb-4">
        When you open trades, and what they made or lost. Times are in your device&apos;s local time, by the hour each trade was opened.
      </p>

      {stats.total === 0 ? (
        <p className="text-xs text-neutral-500 leading-relaxed">No closed trades yet. Once you log some, this shows which hours of the day pay you and which ones cost you.</p>
      ) : (
        <>
          {!stats.enough && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-neutral-300 leading-relaxed">
              You have {stats.total} closed trades. Patterns like this start to mean something around {MIN_TOTAL}, so treat what you see as a first look.
            </div>
          )}

          {stats.enough && (stats.bestSummary || stats.worstSummary) && (
            <div className="mb-4 space-y-2">
              {stats.bestSummary && (
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100 leading-relaxed">
                  <b>Best hours: {rangeLabel(stats.best)}.</b> Average {signed(stats.bestSummary.avg)} per trade over {stats.bestSummary.n} trades.
                </div>
              )}
              {stats.worstSummary && (
                <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-100 leading-relaxed">
                  <b>Weakest hours: {rangeLabel(stats.worst)}.</b> Average {signed(stats.worstSummary.avg)} per trade over {stats.worstSummary.n} trades, {moneyAbs(stats.worstSummary.pnl)} lost in total.
                  A rule like “no new trades at these hours” would have kept that money. Past results don&apos;t promise the same ahead, so test it for a few weeks.
                </div>
              )}
              {!stats.worstSummary && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-neutral-300 leading-relaxed">
                  None of your hours with {MIN_HOUR_TRADES}+ trades is losing money on average. Keep an eye on this as you add more trades.
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto -mx-1 px-1">
            <div className="min-w-[300px]">
              <div className="grid gap-1 mb-1" style={gridStyle}>
                <div />
                {cols.map((d) => (
                  <div key={d.dow} className="text-center text-[10px] uppercase tracking-wide text-neutral-500">
                    {d.label}
                  </div>
                ))}
                <div className="text-center text-[10px] uppercase tracking-wide text-neutral-400">All</div>
              </div>

              <div className="space-y-1">
                {rows.map((h) => {
                  const all = stats.hours[h];
                  const allSel = sel && sel.dow === null && sel.hour === h;
                  return (
                    <div key={h} className="grid gap-1 items-center" style={gridStyle}>
                      <div className="text-[10px] tabular-nums text-neutral-500">{hourLabel(h)}</div>
                      {cols.map((d) => {
                        const c = stats.cellAt(d.dow, h);
                        const isSel = sel && sel.dow === d.dow && sel.hour === h;
                        if (!c.n) return <div key={d.dow} className="h-7 rounded-md border border-white/[0.04]" />;
                        return (
                          <button
                            key={d.dow}
                            type="button"
                            aria-label={`${d.label} ${hourLabel(h)}: ${c.n} trades, ${signed(c.pnl)}`}
                            onClick={() => setSel({ dow: d.dow, hour: h })}
                            className={`h-7 rounded-md text-[9px] font-medium tabular-nums text-white/90 ${isSel ? 'ring-1 ring-white/70' : ''}`}
                            style={{ background: tint(c.avg, stats.maxCellAvg, c.n < MIN_CELL_TRADES) }}
                          >
                            {compact(c.pnl)}
                          </button>
                        );
                      })}
                      {all.n ? (
                        <button
                          type="button"
                          aria-label={`All days ${hourLabel(h)}: ${all.n} trades, ${signed(all.pnl)}`}
                          onClick={() => setSel({ dow: null, hour: h })}
                          className={`h-7 rounded-md text-[10px] font-semibold tabular-nums text-white ${allSel ? 'ring-1 ring-white/70' : ''}`}
                          style={{ background: tint(all.avg, stats.maxHourAvg, all.n < MIN_HOUR_TRADES) }}
                        >
                          {compact(all.pnl)}
                        </button>
                      ) : (
                        <div className="h-7 rounded-md border border-white/[0.04]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-[2.5rem] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
            {detail ? (
              detail.n ? (
                <>
                  <div className="text-neutral-200 font-medium">{detail.label}</div>
                  <div className="text-neutral-400 tabular-nums mt-0.5">
                    {detail.n} trade{detail.n !== 1 ? 's' : ''} · {detail.winRate.toFixed(0)}% win ·{' '}
                    <span className={detail.pnl > 0 ? 'text-emerald-400' : detail.pnl < 0 ? 'text-rose-400' : ''}>{signed(detail.pnl)}</span> total ·{' '}
                    {signed(detail.avg)} per trade
                  </div>
                </>
              ) : (
                <div className="text-neutral-500">No trades in that hour.</div>
              )
            ) : (
              <div className="text-neutral-500">Tap a square to see the numbers behind it.</div>
            )}
          </div>

          <p className="mt-2 text-[10px] text-neutral-600 leading-relaxed">
            Each square shows total profit or loss, coloured by the average per trade. Faded squares have fewer than {MIN_CELL_TRADES} trades, and the “All” column ranks hours only once they have {MIN_HOUR_TRADES}+.
          </p>
        </>
      )}
    </div>
  );
}
