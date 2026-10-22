// Which hours of the day (and days of the week) make or lose money.
// Everything uses the viewer's local time and the time each trade was OPENED.

export const MIN_TOTAL = 30; // closed trades before the pattern means much
export const MIN_HOUR_TRADES = 5; // trades an hour needs before it is ranked
export const MIN_CELL_TRADES = 3; // trades a grid cell needs before it is shown at full strength

// Monday first. `dow` is JavaScript's getDay(): 0 = Sunday.
export const DAYS = [
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;

export const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

const blank = () => ({ n: 0, pnl: 0, wins: 0 });
const finish = (c) => ({ ...c, avg: c.n ? c.pnl / c.n : 0, winRate: c.n ? (c.wins / c.n) * 100 : null });

function combine(list) {
  const c = list.reduce((s, h) => ({ n: s.n + h.n, pnl: s.pnl + h.pnl, wins: s.wins + h.wins }), blank());
  return finish(c);
}

export function computeHourStats(trades) {
  const closed = trades.filter((t) => isClosed(t) && t.entry_time && !Number.isNaN(new Date(t.entry_time).getTime()));

  const cells = {}; // "dow-hour" -> counts
  const hours = Array.from({ length: 24 }, () => blank());
  const dows = {};

  for (const t of closed) {
    const d = new Date(t.entry_time);
    const h = d.getHours();
    const dow = d.getDay();
    const p = num(t.pnl);
    const key = `${dow}-${h}`;
    const win = p > 0 ? 1 : 0;
    for (const c of [cells[key] || (cells[key] = blank()), hours[h], dows[dow] || (dows[dow] = blank())]) {
      c.n += 1;
      c.pnl += p;
      c.wins += win;
    }
  }

  const hourRows = hours.map((c, hour) => ({ hour, ...finish(c) }));
  const used = hourRows.filter((h) => h.n > 0);
  const firstHour = used.length ? used[0].hour : null;
  const lastHour = used.length ? used[used.length - 1].hour : null;

  // Mon–Fri always; the weekend only when something was traded on it.
  const shownDays = DAYS.filter((d) => (d.dow >= 1 && d.dow <= 5) || (dows[d.dow] && dows[d.dow].n > 0));

  const cellAt = (dow, hour) => {
    const c = cells[`${dow}-${hour}`];
    return c ? finish(c) : { n: 0, pnl: 0, wins: 0, avg: 0, winRate: null };
  };

  // Colour scales: the biggest average (win or loss) among cells/hours with enough trades.
  let maxCellAvg = 0;
  for (const key of Object.keys(cells)) {
    const c = finish(cells[key]);
    if (c.n >= MIN_CELL_TRADES) maxCellAvg = Math.max(maxCellAvg, Math.abs(c.avg));
  }
  const maxHourAvg = Math.max(0, ...used.filter((h) => h.n >= MIN_HOUR_TRADES).map((h) => Math.abs(h.avg)));

  // Ranked by average result per trade, so a busy hour does not win just by having more trades.
  const ranked = hourRows.filter((h) => h.n >= MIN_HOUR_TRADES).sort((a, b) => b.avg - a.avg);
  const best = ranked.filter((h) => h.avg > 0).slice(0, 3);
  const worst = ranked.filter((h) => h.avg < 0).slice(-3).reverse(); // worst first

  return {
    total: closed.length,
    enough: closed.length >= MIN_TOTAL,
    hours: hourRows,
    firstHour,
    lastHour,
    shownDays,
    cellAt,
    maxCellAvg,
    maxHourAvg,
    best,
    worst,
    bestSummary: best.length ? combine(best) : null,
    worstSummary: worst.length ? combine(worst) : null,
  };
}
