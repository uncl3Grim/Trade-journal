// Pure computation for the public track-record page. Takes the report object
// returned by the get_public_report RPC and derives everything the page shows.
//
// Every metric degrades gracefully: when the report doesn't carry the field
// a metric needs (e.g. no starting balance, no stop-loss data), the metric is
// returned as null / flagged instead of being guessed, and the UI shows "—".
import { getTradeSession } from './session';

const SYNC_SOURCES = ['mt5_sync', 'myfxbook_sync'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86400000;

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const sum = (a) => a.reduce((s, v) => s + v, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
function stdev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1));
}
const exitOrEntry = (t) => new Date(t.exit_time || t.entry_time);
const dayKey = (d) => d.toISOString().slice(0, 10);

function groupStats(label, list) {
  const pnls = list.map((t) => Number(t.pnl || 0));
  const wins = pnls.filter((p) => p > 0);
  const gp = sum(wins);
  const gl = Math.abs(sum(pnls.filter((p) => p < 0)));
  return {
    label,
    count: list.length,
    winRate: list.length ? (wins.length / list.length) * 100 : 0,
    pnl: sum(pnls),
    profitFactor: gl > 0 ? gp / gl : gp > 0 ? Infinity : null,
  };
}

function groupBy(list, keyFn) {
  const map = new Map();
  for (const t of list) {
    const k = keyFn(t);
    if (k === null || k === undefined) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  return [...map.entries()].map(([k, v]) => groupStats(k, v));
}

export function computeTrackRecord(report) {
  const startingBalance = num(report.starting_balance) > 0 ? num(report.starting_balance) : null;
  const closed = (report.trades || [])
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && (t.exit_time || t.entry_time))
    .slice()
    .sort((a, b) => exitOrEntry(a) - exitOrEntry(b));

  const n = closed.length;
  const pnls = closed.map((t) => Number(t.pnl || 0));
  const totalPnl = sum(pnls);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossProfit = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;
  const avgWin = mean(wins);
  const avgLoss = Math.abs(mean(losses));
  const payoff = avgLoss > 0 ? avgWin / avgLoss : null;
  const winRate = n ? (wins.length / n) * 100 : 0;

  // ---- R multiples (only from trades that carry an explicit risk amount) ----
  const withRisk = closed.filter((t) => num(t.risk_amount) > 0);
  const rCoverage = n ? withRisk.length / n : 0;
  const rValues = withRisk.map((t) => Number(t.pnl || 0) / Number(t.risk_amount));
  const expectancyR = rCoverage >= 0.5 ? mean(rValues) : null;
  const expectancyMoney = n ? totalPnl / n : 0;

  // ---- Equity curve, high-water mark and drawdown ----
  const base = startingBalance ?? 0;
  let eq = base;
  let peak = base;
  let maxDdAbs = 0;
  let maxDdPct = 0;
  let maxDdPeakIdx = 0;
  let maxDdTroughIdx = 0;
  let curPeakIdx = 0;
  const curve = [{ t: closed.length ? exitOrEntry(closed[0]).getTime() - DAY_MS : 0, equity: base, peak: base, dd: 0, ddPct: 0, label: 'Start' }];
  closed.forEach((t, i) => {
    eq += Number(t.pnl || 0);
    if (eq > peak) {
      peak = eq;
      curPeakIdx = i + 1;
    }
    const dd = eq - peak; // <= 0
    const ddPct = peak > 0 ? dd / peak : 0;
    if (-dd > maxDdAbs) {
      maxDdAbs = -dd;
      maxDdPeakIdx = curPeakIdx;
      maxDdTroughIdx = i + 1;
    }
    if (startingBalance && -ddPct > maxDdPct) maxDdPct = -ddPct;
    curve.push({ t: exitOrEntry(t).getTime(), equity: eq, peak, dd, ddPct });
  });

  const firstTime = n ? exitOrEntry(closed[0]) : null;
  const lastTime = n ? exitOrEntry(closed[n - 1]) : null;
  const spanDays = n ? Math.max(1, (lastTime - firstTime) / DAY_MS) : 0;
  const returnPct = startingBalance ? totalPnl / startingBalance : null;

  // ---- Monthly returns (year x month) ----
  const monthMap = new Map();
  let runEq = base;
  for (const t of closed) {
    const d = exitOrEntry(t);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { year: d.getUTCFullYear(), month: d.getUTCMonth(), pnl: 0, trades: 0, startEquity: runEq });
    }
    const m = monthMap.get(key);
    const p = Number(t.pnl || 0);
    m.pnl += p;
    m.trades += 1;
    runEq += p;
  }
  const monthly = [...monthMap.values()].map((m) => ({
    ...m,
    pct: startingBalance && m.startEquity > 0 ? m.pnl / m.startEquity : null,
  }));
  const years = [...new Set(monthly.map((m) => m.year))].sort();
  const monthlyByYear = years.map((y) => {
    const row = Array(12).fill(null);
    let yPnl = 0;
    let compounded = 1;
    let any = false;
    monthly
      .filter((m) => m.year === y)
      .forEach((m) => {
        row[m.month] = m;
        yPnl += m.pnl;
        if (m.pct !== null) compounded *= 1 + m.pct;
        any = true;
      });
    return { year: y, months: row, pnl: yPnl, pct: startingBalance && any ? compounded - 1 : null };
  });
  const bestMonth = monthly.length ? monthly.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;
  const worstMonth = monthly.length ? monthly.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null;
  const positiveMonths = monthly.filter((m) => m.pnl > 0).length;

  // ---- Daily return series -> Sharpe / Sortino / Calmar (needs a starting balance) ----
  let sharpe = null;
  let sortino = null;
  let calmar = null;
  let annualReturn = null;
  if (startingBalance && n >= 2) {
    const byDay = new Map();
    for (const t of closed) {
      const k = dayKey(exitOrEntry(t));
      byDay.set(k, (byDay.get(k) || 0) + Number(t.pnl || 0));
    }
    const rets = [];
    let e = startingBalance;
    const start = Date.UTC(firstTime.getUTCFullYear(), firstTime.getUTCMonth(), firstTime.getUTCDate());
    const end = Date.UTC(lastTime.getUTCFullYear(), lastTime.getUTCMonth(), lastTime.getUTCDate());
    for (let ts = start; ts <= end; ts += DAY_MS) {
      const d = new Date(ts);
      const k = dayKey(d);
      const wd = d.getUTCDay();
      const traded = byDay.has(k);
      if ((wd === 0 || wd === 6) && !traded) continue; // skip empty weekends
      const p = byDay.get(k) || 0;
      rets.push(e > 0 ? p / e : 0);
      e += p;
    }
    const m = mean(rets);
    const sd = stdev(rets);
    const downside = Math.sqrt(mean(rets.map((r) => Math.min(r, 0) ** 2)));
    if (rets.length >= 20) {
      sharpe = sd > 0 ? (m / sd) * Math.sqrt(252) : null;
      sortino = downside > 0 ? (m / downside) * Math.sqrt(252) : null;
    }
    const years_ = spanDays / 365.25;
    if (years_ >= 0.25 && startingBalance + totalPnl > 0) {
      annualReturn = Math.pow((startingBalance + totalPnl) / startingBalance, 1 / years_) - 1;
      calmar = maxDdPct > 0 ? annualReturn / maxDdPct : null;
    }
  }

  // ---- Streaks, risk, concentration ----
  let maxLoseStreak = 0;
  let run = 0;
  for (const p of pnls) {
    run = p < 0 ? run + 1 : 0;
    if (run > maxLoseStreak) maxLoseStreak = run;
  }
  let maxWinStreak = 0;
  run = 0;
  for (const p of pnls) {
    run = p > 0 ? run + 1 : 0;
    if (run > maxWinStreak) maxWinStreak = run;
  }

  let avgRiskAmount = null;
  let avgRiskPct = null;
  if (withRisk.length) {
    avgRiskAmount = mean(withRisk.map((t) => Number(t.risk_amount)));
    if (startingBalance) {
      let e2 = startingBalance;
      const pcts = [];
      for (const t of closed) {
        if (num(t.risk_amount) > 0 && e2 > 0) pcts.push(Number(t.risk_amount) / e2);
        e2 += Number(t.pnl || 0);
      }
      avgRiskPct = pcts.length ? mean(pcts) : null;
    }
  }

  const sortedWins = wins.slice().sort((a, b) => b - a);
  const top3 = sum(sortedWins.slice(0, 3));
  const top3Share = grossProfit > 0 ? top3 / grossProfit : null;
  const pnlExTop3 = totalPnl - top3;

  // ---- Breakdowns ----
  const bySymbol = groupBy(closed, (t) => t.symbol || 'Unknown').sort((a, b) => b.count - a.count).slice(0, 10);
  const bySession = groupBy(closed, (t) => getTradeSession(t.entry_time));
  const sessionOrder = ['Tokyo', 'Sydney', 'London', 'London/New York Overlap', 'New York', 'Other'];
  bySession.sort((a, b) => sessionOrder.indexOf(a.label) - sessionOrder.indexOf(b.label));
  const byDay = groupBy(closed.filter((t) => t.entry_time), (t) => WEEKDAYS[(new Date(t.entry_time).getUTCDay() + 6) % 7]);
  byDay.sort((a, b) => WEEKDAYS.indexOf(a.label) - WEEKDAYS.indexOf(b.label));
  const bySide = groupBy(closed, (t) => (t.direction === 'short' ? 'Short' : 'Long'));
  const taggedSetups = closed.filter((t) => t.setup_type);
  const bySetup = taggedSetups.length
    ? groupBy(taggedSetups, (t) => t.setup_type).sort((a, b) => b.pnl - a.pnl)
    : [];

  const breakdowns = [
    { key: 'instrument', label: 'Instrument', rows: bySymbol },
    { key: 'session', label: 'Session', rows: bySession },
    { key: 'day', label: 'Day', rows: byDay },
    ...(bySetup.length ? [{ key: 'setup', label: 'Setup', rows: bySetup }] : []),
    { key: 'side', label: 'Long / Short', rows: bySide },
  ];

  // ---- Provenance (only from fields actually present) ----
  const hasSource = closed.some((t) => t.source);
  const synced = closed.filter((t) => SYNC_SOURCES.includes(t.source)).length;
  const syncedShare = hasSource && n ? synced / n : null;

  // ---- Header meta ----
  const lastSynced = report.last_synced_at ? new Date(report.last_synced_at) : null;
  const isLive = !!lastSynced && Date.now() - lastSynced.getTime() < 2 * DAY_MS;
  const provenance =
    syncedShare === null ? 'Read-only report' : syncedShare >= 0.9 ? 'Broker-synced' : syncedShare > 0 ? 'Partly broker-synced' : 'Self-reported';
  const verified = syncedShare === null ? true : syncedShare >= 0.9;

  return {
    n,
    winCount: wins.length,
    startingBalance,
    totalPnl,
    returnPct,
    annualReturn,
    maxDdAbs,
    maxDdPct: startingBalance ? maxDdPct : null,
    maxDdPeakIdx,
    maxDdTroughIdx,
    profitFactor,
    expectancyR,
    expectancyMoney,
    rCoverage,
    winRate,
    payoff,
    avgWin,
    avgLoss,
    sharpe,
    sortino,
    calmar,
    maxLoseStreak,
    maxWinStreak,
    avgRiskAmount,
    avgRiskPct,
    top3Share,
    top3,
    pnlExTop3,
    grossProfit,
    curve,
    monthlyByYear,
    bestMonth,
    worstMonth,
    positiveMonths,
    monthCount: monthly.length,
    breakdowns,
    firstTime,
    lastTime,
    spanDays,
    isLive,
    provenance,
    verified,
    costsIncluded: report.costs_included === true,
    updatedAt: lastSynced || (report.created_at ? new Date(report.created_at) : lastTime),
    trades: closed,
  };
}

export const MONTH_LABELS = MONTHS;

export function fmtPct(v, digits = 1, signed = true) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  const p = v * 100;
  return `${signed && p > 0 ? '+' : ''}${p.toFixed(digits)}%`;
}
export function fmtNum(v, digits = 2, signed = false) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v === Infinity) return '∞';
  return `${signed && v > 0 ? '+' : ''}${v.toFixed(digits)}`;
}
export function fmtMoneyShort(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(1)}k`;
  return `${s}$${a.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
