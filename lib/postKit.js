import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInCalendarDays, addDays, addWeeks } from 'date-fns';
import { tradeProcess, mistakeCosts } from './coach';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;
const closeMs = (t) => new Date(t.exit_time || t.entry_time || 0).getTime();

export const TEMPLATES = {
  daily: { label: 'Daily result', scope: 'day', slides: ['summary', 'bestworst', 'equity'] },
  weekly: { label: 'Weekly recap', scope: 'week', slides: ['summary', 'equity', 'bestworst'] },
  process: { label: 'Process over P&L', scope: 'week', slides: ['process', 'summary'] },
  mistakes: { label: 'Mistake breakdown', scope: 'week', slides: ['mistakes', 'process'] },
};

export function closedTrades(trades) {
  return (trades || []).filter((t) => isClosed(t) && (t.exit_time || t.entry_time)).sort((a, b) => closeMs(a) - closeMs(b));
}
export function latestTradeDate(trades) {
  const c = closedTrades(trades);
  return c.length ? new Date(closeMs(c[c.length - 1])) : new Date();
}
export function firstTradeDate(trades) {
  const c = closedTrades(trades);
  return c.length ? startOfDay(new Date(closeMs(c[0]))) : startOfDay(new Date());
}

const weekOpts = { weekStartsOn: 1 };
export const shiftAnchor = (anchor, scope, dir) => (scope === 'day' ? addDays(anchor, dir) : addWeeks(anchor, dir));
export function canGoNext(anchor, scope, now = new Date()) {
  const next = shiftAnchor(anchor, scope, 1);
  const startOfNext = scope === 'day' ? startOfDay(next) : startOfWeek(next, weekOpts);
  return startOfNext <= now;
}
export function periodLabel(anchor, scope) {
  if (scope === 'day') return format(anchor, 'EEE, MMM d');
  return `${format(startOfWeek(anchor, weekOpts), 'MMM d')} – ${format(endOfWeek(anchor, weekOpts), 'MMM d')}`;
}

function downsample(points, max = 80) {
  if (points.length <= max) return points;
  const out = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

// Everything the slides and caption need, for one day or one week.
export function buildKitData(trades, { anchor, scope, startingBalance, day1 }) {
  const closed = closedTrades(trades);
  const rangeStart = scope === 'day' ? startOfDay(anchor) : startOfWeek(anchor, weekOpts);
  const rangeEnd = scope === 'day' ? endOfDay(anchor) : endOfWeek(anchor, weekOpts);
  const upTo = closed.filter((t) => closeMs(t) <= rangeEnd.getTime());
  const before = upTo.filter((t) => closeMs(t) < rangeStart.getTime());
  const inRange = upTo.filter((t) => closeMs(t) >= rangeStart.getTime());
  const sum = (arr) => arr.reduce((s, t) => s + num(t.pnl), 0);

  const start = Number(startingBalance) > 0 ? Number(startingBalance) : null;
  const totalPnl = sum(upTo);
  const rangePnl = sum(inRange);
  const balanceStart = start !== null ? start + sum(before) : null;
  const balanceNow = start !== null ? start + totalPnl : null;

  const wins = inRange.filter((t) => num(t.pnl) > 0).length;
  const losses = inRange.filter((t) => num(t.pnl) < 0).length;
  const ranked = [...inRange].sort((a, b) => num(b.pnl) - num(a.pnl));
  const tradingDays = new Set(inRange.map((t) => format(new Date(closeMs(t)), 'yyyy-MM-dd'))).size;

  // Process
  const scores = inRange.map(tradeProcess).filter((v) => v !== null);
  const rated = inRange.filter((t) => t.rule_adherence);
  const followed = rated.filter((t) => t.rule_adherence === 'followed_plan').length;
  const process = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

  // Mistakes
  const mistakes = mistakeCosts(inRange).slice(0, 3);
  const mistakeFree = inRange.filter((t) => mistakeCosts([t]).length === 0).length;

  // Equity curve (cumulative P&L), starting from 0 at Day 1
  let run = 0;
  const curve = [{ i: 0, v: 0 }];
  upTo.forEach((t, idx) => {
    run += num(t.pnl);
    curve.push({ i: idx + 1, v: run });
  });

  // Symbols
  const bySymbol = new Map();
  for (const t of upTo) {
    const k = (t.symbol || '').toUpperCase();
    if (k) bySymbol.set(k, (bySymbol.get(k) || 0) + 1);
  }
  const topSymbol = [...bySymbol.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const d1 = day1 ? startOfDay(day1) : firstTradeDate(trades);
  const dayN = Math.max(1, differenceInCalendarDays(scope === 'day' ? anchor : rangeEnd > new Date() ? new Date() : rangeEnd, d1) + 1);

  return {
    scope,
    rangeStart,
    rangeEnd,
    periodLabel: periodLabel(anchor, scope),
    dayN,
    hasStart: start !== null,
    start,
    balanceStart,
    balanceNow,
    totalPnl,
    totalPct: start !== null ? (totalPnl / start) * 100 : null,
    rangePnl,
    rangePct: balanceStart ? (rangePnl / balanceStart) * 100 : null,
    n: inRange.length,
    wins,
    losses,
    winRate: inRange.length ? Math.round((wins / inRange.length) * 100) : null,
    best: ranked[0] || null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    tradingDays,
    process,
    ratedCount: rated.length,
    followed,
    mistakes,
    mistakeFree,
    curve: downsample(curve),
    topSymbol,
  };
}

// P&L shown either as money or, when balances are hidden, as a percentage.
export function makeFormatters(d, showBalances) {
  const showMoney = showBalances || !d.hasStart;
  const money = (v) => {
    const a = Math.abs(v);
    const text = a.toLocaleString('en-US', { minimumFractionDigits: a >= 1000 ? 0 : 2, maximumFractionDigits: a >= 1000 ? 0 : 2 });
    return `${v < 0 ? '-' : v > 0 ? '+' : ''}$${text}`;
  };
  const plainMoney = (v) => `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const pct = (v, dec = 1) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(dec)}%`;
  return {
    showMoney,
    money,
    plainMoney,
    pct,
    // P&L over the period (percent of the balance at the start of the period)
    range: (v) => (showMoney ? money(v) : pct((v / d.balanceStart) * 100)),
    // P&L since Day 1 (percent of the starting balance)
    total: (v) => (showMoney ? money(v) : pct((v / d.start) * 100)),
  };
}

// ---------------------------------------------------------------------------
// Captions
// ---------------------------------------------------------------------------
const pick = (list, i) => list[Math.abs(i) % list.length];

// "VOLATILITY 10 INDEX" -> "VIX10"; other long names lose a trailing "INDEX" and are shortened.
export function shortSymbol(symbol) {
  if (!symbol) return '';
  const vol = /^volatility\s+(\d+)\s+index$/i.exec(symbol.trim());
  if (vol) return `VIX${vol[1]}`;
  const s = symbol.trim().replace(/\s+index$/i, '');
  return s.length > 20 ? `${s.slice(0, 19)}…` : s;
}

function symbolTag(symbol) {
  if (!symbol) return null;
  if (/volatility\s*10\b/i.test(symbol)) return 'vix10';
  const t = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  return t && t.length <= 18 ? t : null;
}

export function buildCaption(templateKey, d, f, { series = '', variant = 0 } = {}) {
  const tpl = TEMPLATES[templateKey];
  const seriesClean = (series || '').trim();
  const seriesLower = seriesClean.toLowerCase();
  // With no series name set, nothing about a series is written anywhere.
  const lead = seriesClean ? `${seriesClean}, day ${d.dayN}` : `Day ${d.dayN}`;
  const period = tpl.scope === 'day' ? 'today' : 'this week';
  const pnl = f.range(d.rangePnl);
  const green = d.rangePnl > 0;
  const topMistake = d.mistakes[0];
  const proc = d.process;

  let hooks;
  if (d.n === 0) {
    hooks = [`No trades ${period}. Sitting out is a position too.`, `${lead}: I stayed out ${period}.`];
  } else if (templateKey === 'daily') {
    hooks = green
      ? [`Green day: ${pnl}. Here's what I did right.`, `${pnl} today. The process mattered more than the number.`, `${lead}: ${pnl}.`]
      : [`Red day: ${pnl}. Here's what I'm changing.`, `Day ${d.dayN}: a red day, and I'm posting it anyway.`, `${pnl} today. The honest breakdown.`];
  } else if (templateKey === 'weekly') {
    hooks = [
      `Week recap: ${pnl} across ${d.n} trades.`,
      green ? `Green week. Here's the full picture, not just the P&L.` : `Red week. Here's what the data says.`,
      `${lead}: the weekly numbers.`,
    ];
  } else if (templateKey === 'process') {
    hooks =
      proc === null
        ? [`P&L isn't the whole story. I'm tracking process now.`]
        : [
            `My P&L says ${pnl}. My process score says ${proc}%.`,
            green && proc < 80 ? `Green week, but my process slipped. The number can lie.` : `Process over P&L: ${proc}% this week.`,
            `${proc}% process score. Here's what that means.`,
          ];
  } else {
    hooks = topMistake
      ? [
          `My most expensive mistake ${period}: ${topMistake.label.toLowerCase()}.`,
          `${d.mistakes.reduce((s, m) => s + m.count, 0)} rule slips ${period}. Here's the cost.`,
          `I tracked every mistake ${period}. Here's the breakdown.`,
        ]
      : [`No mistakes tagged ${period}. Here's how I tracked it.`];
  }
  const hook = pick(hooks, variant);

  const facts = [];
  if (d.n > 0) {
    facts.push(`${d.n} trade${d.n === 1 ? '' : 's'}${d.winRate !== null ? ` · ${d.winRate}% win rate` : ''}${proc !== null ? ` · ${proc}% process` : ''}`);
  }
  const balanceLine = f.showMoney && d.hasStart ? `${f.plainMoney(d.start)} → ${f.plainMoney(d.balanceNow)}` : d.totalPct !== null ? `${f.pct(d.totalPct)} since day 1` : null;
  if (balanceLine) facts.push(balanceLine);

  const sym = d.topSymbol ? shortSymbol(d.topSymbol) : null;
  const searchLine = seriesClean ? `${sym ? `${sym} ` : ''}${seriesLower} results, day ${d.dayN}` : `${sym || 'Trading'} results, day ${d.dayN}`;

  const ctas = {
    daily: [`What would you have done differently?`, `Day ${d.dayN + 1} tomorrow.`, `Follow along, I post every trading day.`],
    weekly: [`What should I focus on next week?`, `Follow along for the next week.`],
    process: [`Do you track process or just P&L?`, `Which would you rather have: green and sloppy, or red and clean?`],
    mistakes: [`What's your most expensive mistake?`, `Comment your biggest rule slip.`],
  };
  const cta = pick(d.n === 0 ? [`Do you trade every day, or wait for the setup?`, `Day ${d.dayN + 1} tomorrow.`] : ctas[templateKey], variant);

  const tags = ['#tradingjournal'];
  const seriesTag = seriesClean.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (seriesTag && seriesTag.length <= 20) tags.push(`#${seriesTag}`);
  const st = symbolTag(d.topSymbol);
  if (st) tags.push(`#${st}`);
  tags.push('#daytrading', '#tradingtok', '#tradingresults');

  return [hook, '', ...facts, searchLine, '', cta, '', 'Not financial advice. Documenting my own results.', '', [...new Set(tags)].slice(0, 5).join(' ')].join('\n');
}
