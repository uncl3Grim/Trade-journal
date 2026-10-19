import { rMultiple } from './tradeMath';
import { edgeDecay } from './coach';

export const MIN_SAMPLE = 10; // closed trades before we trust the numbers

export const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function summarize(list) {
  const wins = list.filter((t) => num(t.pnl) > 0).length;
  return {
    count: list.length,
    wins,
    winRate: list.length ? (wins / list.length) * 100 : null,
    pnl: list.reduce((s, t) => s + num(t.pnl), 0),
    avg: list.length ? list.reduce((s, t) => s + num(t.pnl), 0) / list.length : null,
  };
}

function byTime(a, b) {
  const ta = a.entry_time ? new Date(a.entry_time).getTime() : 0;
  const tb = b.entry_time ? new Date(b.entry_time).getTime() : 0;
  return ta - tb;
}

// Everything the strategy card shows about how a playbook performs.
export function strategyStats(tagged, defaultRisk) {
  const closed = tagged.filter(isClosed).slice().sort(byTime);
  const open = tagged.length - closed.length;
  const wins = closed.filter((t) => num(t.pnl) > 0);
  const losses = closed.filter((t) => num(t.pnl) < 0);
  const grossProfit = wins.reduce((s, t) => s + num(t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + num(t.pnl), 0));
  const pnl = closed.reduce((s, t) => s + num(t.pnl), 0);

  const rs = closed
    .map((t) => rMultiple(t, defaultRisk))
    .filter((r) => r !== null && Number.isFinite(r));

  let run = 0;
  const curve = closed.map((t) => (run += num(t.pnl)));

  let worstStreak = 0;
  let streak = 0;
  for (const t of closed) {
    if (num(t.pnl) < 0) {
      streak += 1;
      worstStreak = Math.max(worstStreak, streak);
    } else streak = 0;
  }

  return {
    total: tagged.length,
    closed: closed.length,
    open,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    pnl,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    avgWin: wins.length ? grossProfit / wins.length : null,
    avgLoss: losses.length ? -grossLoss / losses.length : null,
    expectancy: closed.length ? pnl / closed.length : null,
    avgR: rs.length ? rs.reduce((s, r) => s + r, 0) / rs.length : null,
    best: closed.length ? Math.max(...closed.map((t) => num(t.pnl))) : null,
    worst: closed.length ? Math.min(...closed.map((t) => num(t.pnl))) : null,
    worstStreak,
    curve,
    enough: closed.length >= MIN_SAMPLE,
    decay: edgeDecay(closed, { recentN: 20, minTotal: 30 }),
  };
}

// Did the trader tick every rule before taking the trade?
export function disciplineSplit(tagged) {
  const withList = tagged.filter((t) => isClosed(t) && Array.isArray(t.checklist) && t.checklist.length > 0);
  const full = withList.filter((t) => t.checklist.every((c) => c.d));
  const missed = withList.filter((t) => !t.checklist.every((c) => c.d));
  const completion = withList.length
    ? (withList.reduce((s, t) => s + t.checklist.filter((c) => c.d).length / t.checklist.length, 0) / withList.length) * 100
    : null;
  return { count: withList.length, full: summarize(full), missed: summarize(missed), completion };
}

// Per-rule: how often it was ticked, and what happened when it was skipped.
export function ruleStats(rules, tagged) {
  const closed = tagged.filter((t) => isClosed(t) && Array.isArray(t.checklist));
  return rules.map((text) => {
    const ticked = [];
    const skipped = [];
    for (const t of closed) {
      const item = t.checklist.find((c) => c.t === text);
      if (!item) continue;
      (item.d ? ticked : skipped).push(t);
    }
    const seen = ticked.length + skipped.length;
    const a = summarize(ticked);
    const b = summarize(skipped);
    const edge = a.count >= 3 && b.count >= 3 ? a.avg - b.avg : null; // $ per trade gained by following it
    return { text, seen, followedPct: seen ? (ticked.length / seen) * 100 : null, ticked: a, skipped: b, edge };
  });
}

// One plain-English line of coaching for the top of a card.
export function insightLine(rules, discipline, fmt) {
  const leaks = rules.filter((r) => r.edge !== null && r.edge > 0).sort((x, y) => y.edge - x.edge);
  if (leaks.length) {
    const r = leaks[0];
    return {
      tone: 'warn',
      text: `Skipping “${r.text}” costs you about ${fmt(r.edge)} per trade (${r.skipped.count} skipped vs ${r.ticked.count} followed).`,
    };
  }
  if (discipline.count >= 5 && discipline.full.count >= 3 && discipline.missed.count >= 3) {
    const diff = discipline.full.avg - discipline.missed.avg;
    if (diff > 0) {
      return { tone: 'warn', text: `Trades with every rule ticked average ${fmt(diff)} more than trades where you skipped one.` };
    }
  }
  if (discipline.count === 0) {
    return { tone: 'info', text: 'Tick the checklist when you log trades to see which rules actually pay.' };
  }
  return { tone: 'good', text: 'No rule is clearly costing you money yet. Keep ticking the checklist.' };
}
