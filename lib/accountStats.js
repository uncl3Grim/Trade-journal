import { format } from 'date-fns';

const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? 0 : Number(v));
const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;
const timeOf = (t) => new Date(t.exit_time || t.entry_time).getTime();

export function computeAccountStats(trades, startingBalance = null) {
  const closed = (trades || []).filter(isClosed).sort((a, b) => timeOf(a) - timeOf(b));
  const n = closed.length;
  if (!n) return null;

  const pnls = closed.map((t) => num(t.pnl));
  const wins = closed.filter((t) => num(t.pnl) > 0);
  const losses = closed.filter((t) => num(t.pnl) < 0);
  const totalPnl = pnls.reduce((s, v) => s + v, 0);
  const grossWin = wins.reduce((s, t) => s + num(t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + num(t.pnl), 0));

  // Pairs
  const bySymbol = new Map();
  for (const t of closed) {
    const key = (t.symbol || 'Unknown').toUpperCase();
    const s = bySymbol.get(key) || { symbol: key, pnl: 0, n: 0, wins: 0 };
    s.pnl += num(t.pnl);
    s.n += 1;
    if (num(t.pnl) > 0) s.wins += 1;
    bySymbol.set(key, s);
  }
  const pairs = Array.from(bySymbol.values()).map((p) => ({ ...p, winRate: (p.wins / p.n) * 100 }));
  const byPnl = [...pairs].sort((a, b) => b.pnl - a.pnl);
  const bestPair = byPnl[0];
  const worstPair = byPnl.length > 1 ? byPnl[byPnl.length - 1] : null;
  const mostTraded = [...pairs].sort((a, b) => b.n - a.n)[0];

  // Days
  const byDay = new Map();
  for (const t of closed) {
    const key = format(new Date(timeOf(t)), 'yyyy-MM-dd');
    byDay.set(key, (byDay.get(key) || 0) + num(t.pnl));
  }
  const days = Array.from(byDay.entries()).map(([date, pnl]) => ({ date, pnl }));
  const bestDay = [...days].sort((a, b) => b.pnl - a.pnl)[0];
  const worstDay = [...days].sort((a, b) => a.pnl - b.pnl)[0];

  // Streaks
  let maxWin = 0;
  let maxLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const v of pnls) {
    if (v > 0) {
      curWin += 1;
      curLoss = 0;
    } else if (v < 0) {
      curLoss += 1;
      curWin = 0;
    } else {
      curWin = 0;
      curLoss = 0;
    }
    maxWin = Math.max(maxWin, curWin);
    maxLoss = Math.max(maxLoss, curLoss);
  }

  // Long vs short
  const side = (dir) => {
    const list = closed.filter((t) => t.direction === dir);
    return {
      n: list.length,
      pnl: list.reduce((s, t) => s + num(t.pnl), 0),
      winRate: list.length ? (list.filter((t) => num(t.pnl) > 0).length / list.length) * 100 : 0,
    };
  };

  // Average hold time
  const holds = closed
    .map((t) => (t.entry_time && t.exit_time ? new Date(t.exit_time) - new Date(t.entry_time) : null))
    .filter((v) => v !== null && v >= 0 && !isNaN(v));
  const avgHoldMs = holds.length ? holds.reduce((s, v) => s + v, 0) / holds.length : null;

  const fees = closed.reduce((s, t) => s + num(t.commission) + num(t.swap), 0);
  const hasFees = closed.some((t) => num(t.commission) !== 0 || num(t.swap) !== 0);

  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;

  return {
    n,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length / n) * 100,
    totalPnl,
    calcBalance: startingBalance !== null && startingBalance !== undefined ? Number(startingBalance) + totalPnl : null,
    returnPct: startingBalance ? (totalPnl / Number(startingBalance)) * 100 : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    avgWin,
    avgLoss,
    expectancy: totalPnl / n,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    bestPair,
    worstPair,
    mostTraded,
    pairCount: pairs.length,
    bestDay,
    worstDay,
    tradingDays: days.length,
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    long: side('long'),
    short: side('short'),
    avgHoldMs,
    fees,
    hasFees,
  };
}

export function formatHold(ms) {
  if (ms === null || ms === undefined) return '—';
  const min = ms / 60000;
  if (min < 1) return '<1m';
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}
