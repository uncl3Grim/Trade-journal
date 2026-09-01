export function computeCurrentStreak(trades) {
  const closed = trades
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time)
    .slice()
    .sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

  if (closed.length === 0) return { count: 0, type: null };

  const firstIsWin = Number(closed[0].pnl) > 0;
  let count = 0;
  for (const t of closed) {
    const isWin = Number(t.pnl) > 0;
    if (isWin !== firstIsWin) break;
    count++;
  }
  return { count, type: firstIsWin ? 'win' : 'loss' };
}

// Tracks discipline, not P&L: consecutive most-recent TAGGED trades where
// rule_adherence === 'followed_plan'. Untagged trades are skipped rather
// than breaking the streak, since most imported/synced trades start
// untagged — this rewards going back to tag trades instead of punishing
// the backlog. Only a trade tagged with an actual deviation breaks it.
export function computeProcessStreak(trades) {
  const tagged = trades
    .filter((t) => t.rule_adherence && t.entry_time)
    .slice()
    .sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

  const totalTagged = tagged.length;
  const totalTrades = trades.filter((t) => t.entry_time).length;

  if (totalTagged === 0) {
    return { count: 0, type: null, totalTagged, totalTrades };
  }

  const firstFollowed = tagged[0].rule_adherence === 'followed_plan';
  let count = 0;
  for (const t of tagged) {
    const followed = t.rule_adherence === 'followed_plan';
    if (followed !== firstFollowed) break;
    count++;
  }
  return { count, type: firstFollowed ? 'followed' : 'broken', totalTagged, totalTrades };
}
