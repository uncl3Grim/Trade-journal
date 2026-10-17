// Everything the Limits page shows is worked out here, from closed trades only.
// Trades are grouped by the day they were OPENED, in the viewer's local time.

const pad = (n) => String(n).padStart(2, '0');
export const dayKeyOf = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayNum = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
const dowOfDayNum = (dn) => (dn + 4) % 7; // 0 = Sunday
const weekStartNum = (dn) => dn - ((dn + 3) % 7); // Monday
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const isPlanBreak = (t) => !!t.rule_adherence && t.rule_adherence !== 'followed_plan';

export function levelOf(pct) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'none';
  if (pct >= 100) return 'breach';
  if (pct >= 90) return 'danger';
  if (pct >= 60) return 'warn';
  return 'ok';
}

const stat = (lv) => (lv === 'ok' ? 'ok' : lv === 'warn' ? 'warn' : lv === 'none' ? 'na' : 'bad');
const fmt = (n) => {
  const a = Math.abs(Number(n) || 0);
  return `${n < 0 ? '-' : ''}$${a.toLocaleString('en-US', { maximumFractionDigits: a >= 1000 ? 0 : 2 })}`;
};
const p0 = (n) => Math.round(n);
const plural = (n, one, many) => (n === 1 ? one : many);

export function computeLimitInsights(allTrades, account, ddMode = 'trailing', now = new Date()) {
  const start = num(account?.starting_balance);
  if (!start || start <= 0) return null;

  const cfg = {
    dailyPct: num(account.daily_loss_limit_pct),
    maxPct: num(account.max_loss_limit_pct),
    targetPct: num(account.profit_target_pct),
    consPct: num(account.consistency_limit_pct),
    weeklyPct: num(account.weekly_loss_limit_pct),
    riskPct: num(account.max_risk_per_trade_pct),
    maxTrades: num(account.max_trades_per_day),
    maxStreak: num(account.max_loss_streak),
    minDays: num(account.min_trading_days),
    challengeDays: num(account.challenge_days),
    isProp: !!account.is_prop_firm,
  };
  const trailing = ddMode === 'trailing';
  const maxLimit = cfg.maxPct ? (start * cfg.maxPct) / 100 : null;

  const todayKey = dayKeyOf(now);
  const todayNum = dayNum(todayKey);

  const closed = (allTrades || [])
    .filter((t) => t.exit_price !== null && t.exit_price !== undefined && t.entry_time)
    .slice()
    .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time));

  const byDay = new Map();
  for (const t of closed) {
    const k = dayKeyOf(t.entry_time);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(t);
  }
  const dayKeys = [...byDay.keys()].sort();

  let balance = start;
  let peak = start;
  let streak = 0;
  let maxStreakSeen = 0;
  let prev = null;
  const points = [{ bal: start, floor: maxLimit ? start - maxLimit : null, day: null }];
  const dayRows = [];
  const riskViolations = [];
  const quick = [];
  const weekend = [];
  const overTrades = [];

  for (const day of dayKeys) {
    const list = byDay.get(day);
    const dayStart = balance;
    let dayPnl = 0;
    let dayLow = 0;
    let ddPeak = 0;
    let broke = 0;

    for (const t of list) {
      const pnl = Number(t.pnl || 0);
      const before = balance;
      dayPnl += pnl;
      balance += pnl;
      if (dayPnl < dayLow) dayLow = dayPnl;
      if (balance > peak) peak = balance;
      const dd = trailing ? peak - balance : Math.max(0, start - balance);
      if (dd > ddPeak) ddPeak = dd;
      points.push({ bal: balance, floor: maxLimit ? (trailing ? peak : start) - maxLimit : null, day });
      if (isPlanBreak(t)) broke++;

      if (pnl < 0) {
        streak++;
        if (streak > maxStreakSeen) maxStreakSeen = streak;
      } else if (pnl > 0) {
        streak = 0;
      }

      const risk = num(t.risk_amount);
      if (cfg.riskPct && risk > 0 && before > 0 && (risk / before) * 100 > cfg.riskPct + 1e-9) {
        riskViolations.push({ day, pct: (risk / before) * 100, symbol: t.symbol });
      }

      if (prev && Number(prev.pnl) < 0 && prev.exit_time) {
        const gap = new Date(t.entry_time) - new Date(prev.exit_time);
        if (gap >= 0 && gap <= 15 * 60000) quick.push({ day, gapMin: Math.round(gap / 60000) });
      }
      prev = t;

      if (t.exit_time && new Date(t.exit_time) > new Date(t.entry_time)) {
        const a = dayNum(dayKeyOf(t.entry_time));
        const b = dayNum(dayKeyOf(t.exit_time));
        for (let d = a + 1; d <= Math.min(b, a + 14); d++) {
          const w = dowOfDayNum(d);
          if (w === 0 || w === 6) {
            weekend.push({ day });
            break;
          }
        }
      }
    }

    if (cfg.maxTrades && list.length > cfg.maxTrades) overTrades.push({ day, n: list.length });

    const dailyLimit = cfg.dailyPct ? (dayStart * cfg.dailyPct) / 100 : null;
    const lowLoss = Math.max(0, -dayLow);
    dayRows.push({
      day,
      trades: list.length,
      start: dayStart,
      end: balance,
      pnl: dayPnl,
      lowLoss,
      endLoss: Math.max(0, -dayPnl),
      dailyLimit,
      dailyUsed: dailyLimit ? (lowLoss / dailyLimit) * 100 : null,
      ddPeak,
      ddUsed: maxLimit ? (ddPeak / maxLimit) * 100 : null,
      broke,
    });
  }

  const profit = balance - start;
  const currentDD = trailing ? peak - balance : Math.max(0, start - balance);
  const floor = maxLimit ? (trailing ? peak : start) - maxLimit : null;
  const maxUsed = maxLimit ? (currentDD / maxLimit) * 100 : null;

  // ---- today
  const todayRow = dayRows.find((r) => r.day === todayKey);
  const todayStart = todayRow ? todayRow.start : balance;
  const todayLimit = cfg.dailyPct ? (todayStart * cfg.dailyPct) / 100 : null;
  const todayLow = todayRow ? todayRow.lowLoss : 0;
  const todayUsed = todayLimit ? (todayLow / todayLimit) * 100 : null;
  const losers = closed.filter((t) => Number(t.pnl) < 0).slice(-20);
  const avgLoss = losers.length ? losers.reduce((s, t) => s + Math.abs(Number(t.pnl)), 0) / losers.length : null;
  const todayLeft = todayLimit ? Math.max(0, todayLimit - todayLow) : null;
  const todayTrades = (allTrades || []).filter((t) => t.entry_time && dayKeyOf(t.entry_time) === todayKey).length;
  const today = {
    key: todayKey,
    start: todayStart,
    pnl: todayRow ? todayRow.pnl : 0,
    low: todayLow,
    limit: todayLimit,
    used: todayUsed,
    left: todayLeft,
    trades: todayTrades,
    buffer60: todayLimit ? todayLimit * 0.6 : null,
    avgLoss,
    lossesLeft: todayLeft !== null && avgLoss ? Math.floor(todayLeft / avgLoss) : null,
  };

  // ---- this week (Monday to today)
  let weekly = null;
  if (cfg.weeklyPct) {
    const ws = weekStartNum(todayNum);
    const rows = dayRows.filter((r) => dayNum(r.day) >= ws && dayNum(r.day) <= todayNum);
    const pnl = rows.reduce((s, r) => s + r.pnl, 0);
    const wStart = rows.length ? rows[0].start : balance;
    const limit = (wStart * cfg.weeklyPct) / 100;
    const loss = Math.max(0, -pnl);
    weekly = { pnl, loss, limit, used: limit ? (loss / limit) * 100 : 0, left: Math.max(0, limit - loss) };
  }

  // ---- profit target + consistency
  const target = cfg.targetPct
    ? (() => {
        const dollars = (start * cfg.targetPct) / 100;
        return { dollars, progress: Math.max(0, (profit / dollars) * 100), remaining: Math.max(0, dollars - profit), hit: profit >= dollars };
      })()
    : null;

  const bestRow = dayRows.reduce((b, r) => (!b || r.pnl > b.pnl ? r : b), null);
  const bestDay = bestRow && bestRow.pnl > 0 ? bestRow.pnl : 0;
  const bestPct = profit > 0 && bestDay > 0 ? (bestDay / profit) * 100 : null;
  const neededProfit = cfg.consPct && bestDay > 0 ? bestDay / (cfg.consPct / 100) : null;
  const consistency = {
    bestDay,
    bestDayKey: bestDay > 0 ? bestRow.day : null,
    bestPct,
    limit: cfg.consPct,
    compliant: cfg.consPct ? bestPct === null || bestPct <= cfg.consPct : null,
    neededProfit,
    moreNeeded: neededProfit ? Math.max(0, neededProfit - profit) : null,
    used: cfg.consPct && bestPct !== null ? (bestPct / cfg.consPct) * 100 : null,
  };

  // ---- time
  const firstDay = dayKeys[0] || null;
  const lastDay = dayKeys[dayKeys.length - 1] || null;
  const elapsed = firstDay ? todayNum - dayNum(firstDay) + 1 : 0;
  const time = {
    firstDay,
    lastDay,
    elapsed,
    challengeDays: cfg.challengeDays,
    daysLeft: cfg.challengeDays && firstDay ? cfg.challengeDays - elapsed : null,
    sinceLast: lastDay ? todayNum - dayNum(lastDay) : null,
  };

  // ---- close calls
  const dailyCalls = dayRows.filter((r) => r.dailyUsed !== null && r.dailyUsed >= 60).sort((a, b) => b.dailyUsed - a.dailyUsed);
  const ddCalls = maxLimit ? dayRows.filter((r) => r.ddUsed >= 60).sort((a, b) => b.ddUsed - a.ddUsed) : [];
  const worstOf = (r) => Math.max(r.dailyUsed ?? 0, r.ddUsed ?? 0);
  const breachDays = dayRows.filter((r) => worstOf(r) >= 100).length;
  const closeCallDays = dayRows.filter((r) => worstOf(r) >= 60 && worstOf(r) < 100).length;
  const cleanDays = dayRows.filter((r) => worstOf(r) < 30).length;
  const dailyBreaches = dailyCalls.filter((r) => r.dailyUsed >= 100).length;
  const heatBasis = cfg.dailyPct ? 'limit' : 'five';
  const strip = dayRows.slice(-60).map((r) => ({
    day: r.day,
    pnl: r.pnl,
    trades: r.trades,
    heat: cfg.dailyPct ? r.dailyUsed : r.pnl < 0 ? Math.min(100, ((r.endLoss / r.start) * 100 / 5) * 100) : 0,
  }));

  // ---- status
  const everBreached = dailyBreaches > 0 || (maxLimit ? dayRows.some((r) => r.ddUsed >= 100) : false);
  const worstNow = Math.max(todayUsed ?? 0, maxUsed ?? 0, weekly?.used ?? 0);
  let status = 'safe';
  if ((maxUsed ?? 0) >= 100 || (todayUsed ?? 0) >= 100 || (cfg.isProp && everBreached)) status = 'breached';
  else if (target?.hit) status = 'target';
  else if (worstNow >= 90) status = 'danger';
  else if (worstNow >= 60) status = 'caution';

  // ---- rule rows
  const rules = [];
  const sOf = (n, one, many) => `${n} ${plural(n, one, many)}`;
  if (cfg.dailyPct) {
    rules.push({ key: 'daily', group: 'Loss limits', label: 'Daily loss limit', status: stat(levelOf(todayUsed)), value: `${p0(todayUsed)}% used`, detail: `${fmt(todayLow)} of ${fmt(todayLimit)} today` });
    const callsOnly = dailyCalls.filter((r) => r.dailyUsed < 100).length;
    rules.push({
      key: 'dailyHist',
      group: 'Loss limits',
      label: 'Daily limit history',
      status: dailyBreaches ? (cfg.isProp ? 'bad' : 'warn') : callsOnly ? 'warn' : 'ok',
      value: dailyBreaches ? sOf(dailyBreaches, 'breach', 'breaches') : 'No breaches',
      detail: callsOnly ? `${sOf(callsOnly, 'close call', 'close calls')} (60%+ used)` : 'No close calls',
    });
  }
  if (cfg.maxPct) {
    rules.push({ key: 'maxdd', group: 'Loss limits', label: trailing ? 'Max drawdown (trailing)' : 'Max drawdown (static)', status: stat(levelOf(maxUsed)), value: `${p0(maxUsed)}% used`, detail: `Floor ${fmt(floor)} · ${fmt(Math.max(0, balance - floor))} of room` });
  }
  if (weekly) {
    rules.push({ key: 'weekly', group: 'Loss limits', label: 'Weekly loss limit', status: stat(levelOf(weekly.used)), value: `${p0(weekly.used)}% used`, detail: `${fmt(weekly.loss)} of ${fmt(weekly.limit)} this week` });
  }
  if (target) {
    rules.push({ key: 'target', group: 'Challenge', label: 'Profit target', status: target.hit ? 'ok' : 'info', value: `${p0(target.progress)}%`, detail: target.hit ? 'Target reached' : `${fmt(target.remaining)} to go` });
  }
  if (cfg.consPct) {
    rules.push({
      key: 'consistency',
      group: 'Challenge',
      label: 'Consistency (best day)',
      status: bestPct === null ? 'info' : consistency.compliant ? 'ok' : 'bad',
      value: bestPct === null ? 'No profit yet' : `${p0(bestPct)}% best day`,
      detail:
        bestPct === null
          ? `Cap is ${cfg.consPct}% of total profit`
          : consistency.compliant
          ? `Cap ${cfg.consPct}% · best day ${fmt(bestDay)}`
          : `Over the cap. Needs ${fmt(neededProfit)} total profit (${fmt(consistency.moreNeeded)} more)`,
    });
  }
  if (cfg.minDays) {
    const have = dayKeys.length;
    rules.push({ key: 'minDays', group: 'Challenge', label: 'Minimum trading days', status: have >= cfg.minDays ? 'ok' : 'info', value: `${have} of ${cfg.minDays}`, detail: have >= cfg.minDays ? 'Requirement met' : `${sOf(cfg.minDays - have, 'more day', 'more days')} to trade` });
  }
  if (cfg.challengeDays) {
    const dl = time.daysLeft;
    rules.push({
      key: 'time',
      group: 'Challenge',
      label: 'Time limit',
      status: dl === null ? 'info' : dl < 0 ? 'bad' : dl <= 3 ? 'warn' : 'info',
      value: dl === null ? 'Not started' : dl < 0 ? 'Time is up' : `${sOf(dl, 'day', 'days')} left`,
      detail: dl === null ? `${cfg.challengeDays} days from your first trade` : `Day ${elapsed} of ${cfg.challengeDays}`,
    });
  }
  if (cfg.isProp) {
    rules.push({ key: 'weekend', group: 'Challenge', label: 'Weekend holds', status: weekend.length ? 'warn' : 'ok', value: weekend.length ? `${weekend.length} held` : 'None', detail: 'Some firms ban holding trades over the weekend. Check yours.' });
    rules.push({
      key: 'inactive',
      group: 'Challenge',
      label: 'Inactivity',
      status: time.sinceLast === null ? 'na' : time.sinceLast >= 14 ? 'warn' : 'ok',
      value: time.sinceLast === null ? 'No trades' : time.sinceLast === 0 ? 'Traded today' : `${sOf(time.sinceLast, 'day', 'days')} ago`,
      detail: 'Last closed trade. Some firms close inactive accounts. Check yours.',
    });
  }
  if (cfg.riskPct) {
    const withRisk = closed.filter((t) => num(t.risk_amount) > 0).length;
    const worst = riskViolations.reduce((m, v) => Math.max(m, v.pct), 0);
    rules.push(
      withRisk === 0
        ? { key: 'risk', group: 'Discipline', label: 'Risk per trade', status: 'na', value: 'No data', detail: 'Log a risk amount on your trades to check this rule' }
        : { key: 'risk', group: 'Discipline', label: 'Risk per trade', status: riskViolations.length ? 'warn' : 'ok', value: riskViolations.length ? `${riskViolations.length} over` : 'Within limit', detail: `Cap ${cfg.riskPct}% of balance${worst ? ` · worst ${worst.toFixed(1)}%` : ''}` }
    );
  }
  if (cfg.maxTrades) {
    rules.push({ key: 'trades', group: 'Discipline', label: 'Trades per day', status: todayTrades > cfg.maxTrades ? 'bad' : todayTrades === cfg.maxTrades ? 'warn' : 'ok', value: `${todayTrades} of ${cfg.maxTrades} today`, detail: overTrades.length ? `${sOf(overTrades.length, 'day', 'days')} over the cap` : 'Never over the cap' });
  }
  if (cfg.maxStreak) {
    rules.push({ key: 'streak', group: 'Discipline', label: 'Losing streak stop', status: streak >= cfg.maxStreak ? 'bad' : cfg.maxStreak > 1 && streak === cfg.maxStreak - 1 ? 'warn' : 'ok', value: `${streak} in a row`, detail: `Stop after ${cfg.maxStreak} · longest run ${maxStreakSeen}` });
  }
  if (closed.length > 0) {
    rules.push({ key: 'revenge', group: 'Discipline', label: 'Quick re-entries after a loss', status: quick.length ? 'warn' : 'ok', value: quick.length ? sOf(quick.length, 'time', 'times') : 'None', detail: 'A trade opened within 15 min of a loss closing' });
  }

  const missing = [];
  if (!cfg.dailyPct) missing.push({ key: 'daily', label: 'Daily loss limit', hint: 'Prop firms use about 4-5%. Many personal traders cap at 2-3%.' });
  if (!cfg.maxPct) missing.push({ key: 'max', label: 'Max drawdown', hint: 'Prop firms use 8-12%. Keep your personal stop tighter.' });
  if (!cfg.weeklyPct) missing.push({ key: 'weekly', label: 'Weekly loss limit', hint: '5-10% is a common circuit breaker.' });
  if (!cfg.riskPct) missing.push({ key: 'risk', label: 'Max risk per trade', hint: '1-2% per trade is the usual ceiling.' });
  if (!cfg.maxTrades) missing.push({ key: 'trades', label: 'Max trades per day', hint: 'A hard cap stops overtrading.' });
  if (!cfg.maxStreak) missing.push({ key: 'streak', label: 'Stop after losses in a row', hint: 'Many traders stop after 3 straight losses.' });
  if (cfg.isProp) {
    if (!cfg.targetPct) missing.push({ key: 'target', label: 'Profit target', hint: 'Often 8-10% per phase.' });
    if (!cfg.consPct) missing.push({ key: 'cons', label: 'Consistency rule', hint: 'Often caps your best day at 30-50% of total profit.' });
    if (!cfg.minDays) missing.push({ key: 'min', label: 'Minimum trading days', hint: 'Commonly 3-7 days.' });
    if (!cfg.challengeDays) missing.push({ key: 'time', label: 'Time limit', hint: 'Some challenges give 30 days, others are unlimited.' });
  }

  // keep the chart light
  let chart = points;
  if (points.length > 140) {
    const step = Math.ceil(points.length / 140);
    chart = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }

  return {
    cfg,
    trailing,
    start,
    balance,
    peak,
    profit,
    profitPct: (profit / start) * 100,
    floor,
    maxLimit,
    currentDD,
    maxUsed,
    today,
    weekly,
    target,
    consistency,
    tradingDays: dayKeys.length,
    time,
    streak: { current: streak, max: maxStreakSeen },
    riskViolations,
    quick,
    weekend,
    overTrades,
    dailyCalls,
    ddCalls,
    breachDays,
    closeCallDays,
    cleanDays,
    callCount: breachDays + closeCallDays,
    heatBasis,
    strip,
    points: chart,
    rules,
    missing,
    status,
    closedCount: closed.length,
  };
}
