import { getTradeSession } from './session';

export function computeSessionBreakdown(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time);
  const map = {};
  for (const t of closed) {
    const key = getTradeSession(t.entry_time);
    if (!key) continue;
    if (!map[key]) map[key] = { label: key, count: 0, pnl: 0, wins: 0 };
    map[key].count += 1;
    map[key].pnl += Number(t.pnl || 0);
    if (Number(t.pnl) > 0) map[key].wins += 1;
  }
  return Object.values(map)
    .map((r) => ({ ...r, winRate: r.count ? (r.wins / r.count) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl);
}
