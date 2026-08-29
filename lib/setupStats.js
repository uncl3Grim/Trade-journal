export function computeSetupBreakdown(trades) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.setup_type);
  const map = {};
  for (const t of closed) {
    const key = t.setup_type;
    if (!map[key]) map[key] = { label: key, count: 0, pnl: 0, wins: 0 };
    map[key].count += 1;
    map[key].pnl += Number(t.pnl || 0);
    if (Number(t.pnl) > 0) map[key].wins += 1;
  }
  return Object.values(map)
    .map((r) => ({ ...r, winRate: r.count ? (r.wins / r.count) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl);
}
