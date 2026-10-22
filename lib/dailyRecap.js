import { format, isSameDay } from 'date-fns';
import { rMultiple } from './tradeMath';
import { tradeProcess, mistakesOf, MISTAKES } from './coach';

const mistakeLabel = (key) => (MISTAKES.find((m) => m.key === key) || { label: key }).label;

// "45m", "2h 10m", "1d 4h". null when the trade has no usable open/close times.
function durationLabel(t) {
  if (!t.entry_time || !t.exit_time) return null;
  const mins = Math.round((new Date(t.exit_time) - new Date(t.entry_time)) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return null;
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
  return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
}

// Manual / quick trades have no prices, so the recap only shows entry → exit when both exist.
const hasPrices = (t) => Number(t.entry_price) > 0 && Number(t.exit_price) > 0;

export function computeDailyRecap(trades, date, defaultRiskAmount, mode = 'dollar') {
  const closed = trades.filter((t) => t.entry_time && t.exit_price !== null && t.exit_price !== undefined);
  const dayTrades = closed
    .filter((t) => isSameDay(new Date(t.entry_time), date))
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  const tradeRows = dayTrades.map((t) => {
    const r = rMultiple(t, defaultRiskAmount);
    const pnl = Number(t.pnl || 0);
    const mistakes = mistakesOf(t).map(mistakeLabel);
    return {
      id: t.id,
      symbol: t.symbol || '—',
      direction: t.direction || null,
      time: format(new Date(t.entry_time), 'h:mm a'),
      duration: durationLabel(t),
      setup: t.setup_type || null,
      plan: t.rule_adherence ? (t.rule_adherence === 'followed_plan' ? 'followed' : 'deviated') : null,
      mistakes,
      priceLine: hasPrices(t) ? { entry: t.entry_price, exit: t.exit_price } : null,
      entryPrice: t.entry_price ?? null,
      exitPrice: t.exit_price ?? null,
      takeProfit: t.take_profit ?? null,
      stopLoss: t.stop_loss ?? null,
      size: t.size ?? null,
      pnl,
      r,
      score: tradeProcess(t),
    };
  });

  const totalTrades = dayTrades.length;
  const totalPnl = tradeRows.reduce((s, t) => s + t.pnl, 0);
  const rValues = tradeRows.map((t) => t.r).filter((r) => r !== null);
  const totalR = rValues.reduce((s, v) => s + v, 0);
  const wins = tradeRows.filter((t) => t.pnl > 0).length;
  const losses = tradeRows.filter((t) => t.pnl < 0).length;
  const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0;
  const avgR = rValues.length ? totalR / rValues.length : 0;

  const bestTrade = tradeRows.length
    ? tradeRows.reduce((best, t) => ((mode === 'r' ? t.r ?? -Infinity : t.pnl) > (mode === 'r' ? best.r ?? -Infinity : best.pnl) ? t : best))
    : null;

  // Running total through the day, starting from zero, for the little curve.
  let runP = 0;
  let runR = 0;
  const curve = [0, ...tradeRows.map((t) => (runP += t.pnl))];
  const curveR = [0, ...tradeRows.map((t) => (runR += t.r ?? 0))];

  // Process: how well the day followed the trader's own rules (null when nothing was recorded).
  const scores = tradeRows.map((t) => t.score).filter((s) => s !== null);
  const processScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
  const rated = tradeRows.filter((t) => t.plan);
  const mistakeTrades = tradeRows.filter((t) => t.mistakes.length > 0);
  const mistakeCost = mistakeTrades.reduce((s, t) => s + (t.pnl < 0 ? Math.abs(t.pnl) : 0), 0);

  let verdict = null;
  if (processScore !== null && totalPnl !== 0) {
    const clean = processScore >= 80;
    if (totalPnl > 0) verdict = clean ? 'Green day and the process held.' : 'Green day, but the rules slipped. Don’t count on repeating it.';
    else verdict = clean ? 'Red day with a clean process. That still counts as a good day.' : 'Red day and the rules slipped. Review before the next session.';
  }

  return {
    date,
    dateLabel: format(date, 'EEEE, MMM d, yyyy'),
    trades: tradeRows,
    totalTrades,
    totalPnl,
    totalR,
    winRate,
    avgR,
    bestTrade,
    wins,
    losses,
    curve,
    curveR,
    process: {
      score: processScore,
      tracked: scores.length,
      planRated: rated.length,
      planFollowed: rated.filter((t) => t.plan === 'followed').length,
      mistakeCount: mistakeTrades.length,
      mistakeCost,
    },
    verdict,
  };
}
