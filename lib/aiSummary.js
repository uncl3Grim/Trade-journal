import { computeBreakdowns } from './breakdowns';
import { computeDrawdown } from './drawdown';
import { rMultiple } from './tradeMath';

export function buildTradeSummary(trades, defaultRiskAmount) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const totalR = closed
    .map((t) => rMultiple(t, defaultRiskAmount))
    .filter((r) => r !== null)
    .reduce((s, r) => s + r, 0);
  const dd = computeDrawdown(closed, 'trailing');
  const b = computeBreakdowns(trades);

  const tagStats = {};
  for (const t of closed) {
    for (const tag of t.tags || []) {
      if (!tagStats[tag]) tagStats[tag] = { count: 0, pnl: 0 };
      tagStats[tag].count += 1;
      tagStats[tag].pnl += Number(t.pnl || 0);
    }
  }

  const emotionStats = {};
  for (const t of closed) {
    if (!t.emotion) continue;
    if (!emotionStats[t.emotion]) emotionStats[t.emotion] = { count: 0, pnl: 0 };
    emotionStats[t.emotion].count += 1;
    emotionStats[t.emotion].pnl += Number(t.pnl || 0);
  }

  const lines = [];
  lines.push(
    `Total trades: ${closed.length}, Win rate: ${winRate.toFixed(1)}%, Total P&L: ${totalPnl.toFixed(2)}, Total R: ${totalR.toFixed(2)}R`
  );
  lines.push(`Max trailing drawdown: ${dd.maxDrawdown.toFixed(2)}, Current drawdown: ${dd.currentDrawdown.toFixed(2)}`);
  lines.push('By direction: ' + b.byDirection.map((r) => `${r.label} ${r.count} trades, ${r.pnl.toFixed(2)}`).join('; '));
  lines.push('By weekday: ' + b.byWeekday.map((r) => `${r.label} ${r.count} trades, ${r.pnl.toFixed(2)}`).join('; '));
  lines.push('By session: ' + b.bySession.map((r) => `${r.label} ${r.count} trades, ${r.pnl.toFixed(2)}`).join('; '));
  lines.push('By holding time: ' + b.byHoldingTime.map((r) => `${r.label} ${r.count} trades, ${r.pnl.toFixed(2)}`).join('; '));
  lines.push(
    'By trades per day: ' + b.byTradesPerDay.map((r) => `${r.label}: ${r.count} days, ${r.pnl.toFixed(2)}`).join('; ')
  );
  if (Object.keys(tagStats).length) {
    lines.push('By tag: ' + Object.entries(tagStats).map(([k, v]) => `${k} ${v.count} trades, ${v.pnl.toFixed(2)}`).join('; '));
  }
  if (Object.keys(emotionStats).length) {
    lines.push(
      'By emotion: ' + Object.entries(emotionStats).map(([k, v]) => `${k} ${v.count} trades, ${v.pnl.toFixed(2)}`).join('; ')
    );
  }

  return lines.join('\n');
}
