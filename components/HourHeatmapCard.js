'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '../lib/format';
import { computeHourStats, hourLabel, MIN_CELL_TRADES, MIN_HOUR_TRADES, MIN_TOTAL } from '../lib/hourStats';

const moneyAbs = (v) => formatMoney(Math.abs(v)).replace(/^[+-]/, '');
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${moneyAbs(v)}`;
const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;
const slot = (h) => `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`;

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

function Swatch({ color, dashed }) {
  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-[4px] align-[-2px] ${dashed ? 'border border-white/20' : ''}`}
      style={dashed ? undefined : { background: color }}
    />
  );
}

// One hour as a plain sentence-style row.
function HourRow({ h, tone }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <span className="font-semibold tabular-nums whitespace-nowrap">{slot(h.hour)}</span>
      <span className={`tabular-nums sm:text-right ${tone}`}>
        {plural(h.n, 'trade')} · {h.winRate.toFixed(0)}% won · {signed(h.avg)} per trade
      </span>
    </div>
  );
}

export default function HourHeatmapCard({ trades }) {
  const stats = useMemo(() => computeHourStats(trades), [trades]);
  const [sel, setSel] = useState(null); // { dow: number | null, hour }
  const [showList, setShowList] = useState(false);

  const rows = [];
  if (stats.firstHour !== null) for (let h = stats.firstHour; h <= stats.lastHour; h++) rows.push(h);
  const cols = stats.shownDays;
  const gridStyle = { gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr)) minmax(0, 1.15fr)` };

  let detail = null;
  if (sel) {
    const isAll = sel.dow === null;
    const c = isAll ? stats.hours[sel.hour] : stats.cellAt(sel.dow, sel.hour);
    const dayLabel = isAll ? 'All days' : (cols.find((d) => d.dow === sel.dow) || {}).label;
    const need = isAll ? MIN_HOUR_TRADES : MIN_CELL_TRADES;
    let verdict = '';
    if (c.n) {
      if (c.n < need) verdict = `Only ${plural(c.n, 'trade')} here, which is too few to say anything yet.`;
      else if (c.avg > 0) verdict = 'On average, trades opened in this slot made you money.';
      else if (c.avg < 0) verdict = 'On average, trades opened in this slot lost you money.';
      else verdict = 'This slot broke even on average.';
    }
    detail = { label: `${dayLabel} · ${slot(sel.hour)}`, verdict, ...c };
  }

  const listHours = stats.hours.filter((h) => h.n > 0);

  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-5 mb-4">
      <h3 className="font-semibold text-neutral-100 mb-1 text-sm">Your best and worst hours</h3>
      <p className="text-xs text-neutral-500 mb-2 leading-relaxed">
        This shows which times of day your trades make money and which ones lose it. Each trade is counted in the hour you opened it, using your device&apos;s local time.
      </p>
      <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
        Why it matters: most traders have a few hours where they trade well and a few where they trade tired, bored or chasing. Finding yours lets you trade more at your best times and skip your worst ones.
      </p>

      {stats.total === 0 ? (
        <p className="text-xs text-neutral-500 leading-relaxed">No closed trades yet. Once you log some, this shows which hours of the day pay you and which ones cost you.</p>
      ) : (
        <>
          {!stats.enough && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-neutral-300 leading-relaxed">
              You have {stats.total} closed trades. Patterns like this start to mean something around {MIN_TOTAL}, so treat what you see as a first look. A few good or bad trades in one hour can be luck.
            </div>
          )}

          {stats.enough && (stats.bestSummary || stats.worstSummary) && (
            <div className="mb-4 space-y-2">
              {stats.bestSummary && (
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-100 leading-relaxed">
                  <div className="font-semibold mb-1">Where you make money</div>
                  <div className="divide-y divide-emerald-400/10">
                    {stats.best.map((h) => (
                      <HourRow key={h.hour} h={h} tone="text-emerald-200" />
                    ))}
                  </div>
                  <p className="mt-2 text-emerald-100/80">
                    Together these hours averaged {signed(stats.bestSummary.avg)} per trade over {plural(stats.bestSummary.n, 'trade')}. These are the hours worth protecting: be rested, be set up, and take your best trades here.
                  </p>
                </div>
              )}
              {stats.worstSummary && (
                <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-3 text-xs text-rose-100 leading-relaxed">
                  <div className="font-semibold mb-1">Where you lose money</div>
                  <div className="divide-y divide-rose-400/10">
                    {stats.worst.map((h) => (
                      <HourRow key={h.hour} h={h} tone="text-rose-200" />
                    ))}
                  </div>
                  <p className="mt-2 text-rose-100/80">
                    Together these hours lost {moneyAbs(stats.worstSummary.pnl)} over {plural(stats.worstSummary.n, 'trade')}. If you had sat them out, that is the money you would have kept (it does not count any effect on your other trades).
                  </p>
                  <p className="mt-1.5 text-rose-100/80">
                    Try this: for the next few weeks, skip new trades at these hours, or only take your very best setup. Then come back here and see if it helped. Past results don&apos;t promise the same ahead.
                  </p>
                </div>
              )}
              {!stats.worstSummary && (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-neutral-300 leading-relaxed">
                  None of your hours with {MIN_HOUR_TRADES}+ trades is losing money on average. Keep an eye on this as you add more trades.
                </div>
              )}
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                Hours are only ranked once they have {MIN_HOUR_TRADES}+ trades, and they are ranked by the average per trade, so a busy hour doesn&apos;t win just by having more trades.
              </p>
            </div>
          )}

          {/* how to read the grid */}
          <div className="mb-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-[11px] text-neutral-400 leading-relaxed">
            <div className="text-neutral-200 font-medium mb-1">How to read the grid</div>
            Each row is an hour of the day and each column is a weekday. The number is your total profit or loss from trades opened then. The last column, “All”, adds up every weekday for that hour.
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span><Swatch color="rgba(52,211,153,0.6)" /> Made money on average</span>
              <span><Swatch color="rgba(251,113,133,0.6)" /> Lost money on average</span>
              <span><Swatch color="rgba(52,211,153,0.25)" /> Faded: under {MIN_CELL_TRADES} trades, don&apos;t trust it yet</span>
              <span><Swatch dashed /> Empty: no trades</span>
            </div>
          </div>

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
                    {plural(detail.n, 'trade')} · {detail.winRate.toFixed(0)}% won ·{' '}
                    <span className={detail.pnl > 0 ? 'text-emerald-400' : detail.pnl < 0 ? 'text-rose-400' : ''}>{signed(detail.pnl)}</span> in total ·{' '}
                    {signed(detail.avg)} per trade
                  </div>
                  <div className="text-neutral-300 mt-1">{detail.verdict}</div>
                </>
              ) : (
                <div className="text-neutral-500">No trades in that hour.</div>
              )
            ) : (
              <div className="text-neutral-500">Tap any square to see the trades, win rate and what it means.</div>
            )}
          </div>

          {/* every hour, as a list */}
          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            aria-expanded={showList}
            className="mt-3 text-[11px] text-indigo-300 hover:text-indigo-200"
          >
            {showList ? 'Hide' : 'Show'} hour-by-hour numbers
          </button>
          {showList && (
            <div className="mt-2 rounded-xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-[1fr_3rem_3rem_4rem_4rem] gap-2 px-3 py-1.5 text-[9px] uppercase tracking-wide text-neutral-500 bg-black/20">
                <span>Opened at</span>
                <span className="text-right">Trades</span>
                <span className="text-right">Won</span>
                <span className="text-right">Each</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y divide-white/5">
                {listHours.map((h) => {
                  const few = h.n < MIN_HOUR_TRADES;
                  const tone = few ? 'text-neutral-500' : h.avg > 0 ? 'text-emerald-400' : h.avg < 0 ? 'text-rose-400' : 'text-neutral-300';
                  return (
                    <div key={h.hour} className="grid grid-cols-[1fr_3rem_3rem_4rem_4rem] gap-2 px-3 py-2 text-[11px] tabular-nums">
                      <span className="text-neutral-200 whitespace-nowrap">
                        {hourLabel(h.hour)}
                        {few && <span className="ml-1 text-[9px] text-neutral-500">few</span>}
                      </span>
                      <span className="text-right text-neutral-400">{h.n}</span>
                      <span className="text-right text-neutral-400">{h.winRate.toFixed(0)}%</span>
                      <span className={`text-right ${tone}`}>{signed(h.avg)}</span>
                      <span className={`text-right ${tone}`}>{signed(h.pnl)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="px-3 py-2 text-[10px] text-neutral-600 leading-relaxed bg-black/10">
                Won = share of trades that made money. Each = average profit or loss per trade. Total = everything made or lost in that hour. Hours marked “few” have under 5 trades and aren&apos;t ranked above. Each hour runs to the top of the next one (08:00 means 08:00–09:00).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
