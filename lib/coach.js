import { format, startOfWeek, subWeeks, endOfWeek, isWithinInterval } from 'date-fns';
import { computeDayLimitStatus } from './dailyLimit';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;
const dayKey = (d) => format(d instanceof Date ? d : new Date(d), 'yyyy-MM-dd');
const when = (t) => new Date(t.exit_time || t.entry_time || 0).getTime();
const entryWhen = (t) => new Date(t.entry_time || 0).getTime();
const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function closedSorted(trades) {
  return trades.filter((t) => isClosed(t) && t.entry_time).slice().sort((a, b) => entryWhen(a) - entryWhen(b));
}

// What the trader risked on a trade, in money. null when it can't be known.
export function riskOf(t) {
  if (num(t.risk_amount) > 0) return num(t.risk_amount);
  const e = num(t.entry_price);
  const s = num(t.stop_loss);
  const z = num(t.size);
  if (e && s && z && e !== s) return Math.abs(e - s) * z;
  return null;
}

// ---------------------------------------------------------------------------
// Mistakes. Stored in the existing `tags` column as "mistake:<key>", and also
// inferred from fields traders already fill in (rule adherence + emotion).
// ---------------------------------------------------------------------------
export const MISTAKE_PREFIX = 'mistake:';

export const MISTAKES = [
  { key: 'moved-stop', label: 'Moved stop' },
  { key: 'oversized', label: 'Oversized' },
  { key: 'fomo', label: 'FOMO entry' },
  { key: 'no-setup', label: 'No setup' },
  { key: 'revenge', label: 'Revenge trade' },
  { key: 'overtraded', label: 'Overtraded' },
  { key: 'early-exit', label: 'Exited early' },
  { key: 'broke-limit', label: 'Broke a limit' },
  { key: 'impulse-entry', label: 'Impulse entry' },
];

const RULE_TO_MISTAKE = { moved_stop: 'moved-stop', oversized: 'oversized', impulse_entry: 'impulse-entry' };
const EMOTION_TO_MISTAKE = { fomo: 'fomo', revenge: 'revenge' };

export function mistakesOf(t) {
  const keys = new Set();
  for (const tag of Array.isArray(t.tags) ? t.tags : []) {
    if (typeof tag === 'string' && tag.startsWith(MISTAKE_PREFIX)) keys.add(tag.slice(MISTAKE_PREFIX.length));
  }
  if (RULE_TO_MISTAKE[t.rule_adherence]) keys.add(RULE_TO_MISTAKE[t.rule_adherence]);
  if (EMOTION_TO_MISTAKE[t.emotion]) keys.add(EMOTION_TO_MISTAKE[t.emotion]);
  return [...keys];
}

export function mistakeCosts(trades) {
  const map = {};
  for (const t of trades.filter(isClosed)) {
    for (const key of mistakesOf(t)) {
      if (!map[key]) map[key] = { key, label: (MISTAKES.find((m) => m.key === key) || { label: key }).label, count: 0, pnl: 0, cost: 0, losses: 0 };
      const p = num(t.pnl);
      map[key].count += 1;
      map[key].pnl += p;
      if (p < 0) {
        map[key].cost += Math.abs(p);
        map[key].losses += 1;
      }
    }
  }
  return Object.values(map).sort((a, b) => b.cost - a.cost);
}

// ---------------------------------------------------------------------------
// Process score: did the trade follow the trader's own process? 0–100, or null
// when nothing about the process was recorded for it.
// ---------------------------------------------------------------------------
const isQuick = (t) => !t.entry_price || Number(t.entry_price) === 0;

export function tradeProcess(t) {
  const parts = [];
  if (Array.isArray(t.checklist) && t.checklist.length > 0) {
    parts.push(t.checklist.filter((c) => c.d).length / t.checklist.length);
  }
  if (t.rule_adherence) parts.push(t.rule_adherence === 'followed_plan' ? 1 : 0);
  if (mistakesOf(t).length > 0) parts.push(0);
  if (!isQuick(t)) parts.push(num(t.stop_loss) ? 1 : 0);
  if (parts.length === 0) return null;
  return (avg(parts) || 0) * 100;
}

// Map of yyyy-MM-dd → { score|null, count, tracked } for the process calendar.
export function processDays(trades) {
  const map = {};
  for (const t of trades) {
    if (!t.entry_time) continue;
    const k = dayKey(t.entry_time);
    if (!map[k]) map[k] = { scores: [], count: 0 };
    map[k].count += 1;
    const s = tradeProcess(t);
    if (s !== null) map[k].scores.push(s);
  }
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = { score: v.scores.length ? avg(v.scores) : null, count: v.count, tracked: v.scores.length };
  }
  return out;
}

export function disciplineScore(trades) {
  const closed = trades.filter(isClosed);
  const parts = [];

  const withList = closed.filter((t) => Array.isArray(t.checklist) && t.checklist.length > 0);
  parts.push({
    key: 'checklist',
    label: 'Checklist completed',
    value: withList.length ? avg(withList.map((t) => t.checklist.filter((c) => c.d).length / t.checklist.length)) * 100 : null,
    detail: withList.length ? `${withList.length} trades with a checklist` : 'No trades with a checklist yet',
  });

  const withRule = closed.filter((t) => t.rule_adherence);
  parts.push({
    key: 'plan',
    label: 'Followed the plan',
    value: withRule.length ? (withRule.filter((t) => t.rule_adherence === 'followed_plan').length / withRule.length) * 100 : null,
    detail: withRule.length ? `${withRule.length} trades rated` : 'Rate trades as followed plan / deviated',
  });

  const nonQuick = closed.filter((t) => !isQuick(t));
  parts.push({
    key: 'stops',
    label: 'Stop loss set',
    value: nonQuick.length ? (nonQuick.filter((t) => num(t.stop_loss)).length / nonQuick.length) * 100 : null,
    detail: nonQuick.length ? `${nonQuick.length} trades with entry prices` : 'No full-detail trades yet',
  });

  const risks = closed.map(riskOf).filter((r) => r !== null);
  let consistency = null;
  if (risks.length >= 5) {
    const m = avg(risks);
    const sd = Math.sqrt(avg(risks.map((r) => (r - m) ** 2)));
    consistency = Math.max(0, Math.min(1, 1 - (m ? sd / m : 1))) * 100;
  }
  parts.push({
    key: 'risk',
    label: 'Consistent risk size',
    value: consistency,
    detail: risks.length >= 5 ? 'How steady your risk per trade is' : 'Needs 5+ trades with risk or stop recorded',
  });

  const tracked = closed.filter((t) => tradeProcess(t) !== null);
  parts.push({
    key: 'clean',
    label: 'Trades without a mistake',
    value: tracked.length ? (tracked.filter((t) => mistakesOf(t).length === 0).length / tracked.length) * 100 : null,
    detail: tracked.length ? `${tracked.length} trades with process data` : 'Tag mistakes to track this',
  });

  const known = parts.filter((p) => p.value !== null);
  return { overall: known.length ? avg(known.map((p) => p.value)) : null, parts, tracked: tracked.length };
}

// ---------------------------------------------------------------------------
// Live guards
// ---------------------------------------------------------------------------

// Consecutive losses at the end of the (closed) trade list.
function lossStreakOf(sorted) {
  let n = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (num(sorted[i].pnl) < 0) n += 1;
    else break;
  }
  return n;
}

export function tiltState(trades, now = new Date(), { trigger = 2, cooldownMin = 15 } = {}) {
  const sorted = trades.filter((t) => isClosed(t) && t.entry_time).slice().sort((a, b) => when(a) - when(b));
  const streak = lossStreakOf(sorted);
  const last = sorted[sorted.length - 1];
  if (!last || streak < trigger || dayKey(new Date(when(last))) !== dayKey(now)) {
    return { active: false, minutesLeft: 0, streak, until: null };
  }
  const until = new Date(when(last) + cooldownMin * 60000);
  // Capped, so an odd timestamp (clock skew, a future-dated import) can never show a huge countdown.
  const minutesLeft = Math.min(cooldownMin, (until.getTime() - now.getTime()) / 60000);
  return { active: minutesLeft > 0, minutesLeft: Math.max(0, minutesLeft), streak, until };
}

export function todayStatus({ trades, account, now = new Date(), ddMode = 'trailing' }) {
  const today = dayKey(now);
  const todayTrades = trades.filter((t) => t.entry_time && dayKey(t.entry_time) === today);
  const closedToday = todayTrades.filter(isClosed);
  const pnl = closedToday.reduce((s, t) => s + num(t.pnl), 0);

  const sorted = closedSorted(trades);
  const streak = lossStreakOf(sorted);

  const maxTrades = account && num(account.max_trades_per_day) > 0 ? num(account.max_trades_per_day) : null;
  const maxStreak = account && num(account.max_loss_streak) > 0 ? num(account.max_loss_streak) : null;

  const limits = account ? computeDayLimitStatus({ trades, account, dateStr: today, ddMode }) : null;
  const daily = limits?.daily || null;

  const reasons = [];
  if (daily) {
    if (daily.level === 'breach') reasons.push({ level: 'stop', text: 'Daily loss limit reached. You are done for today.' });
    else if (daily.level === 'danger') reasons.push({ level: 'caution', text: `${daily.usedPct.toFixed(0)}% of your daily loss limit is used.` });
    else if (daily.level === 'warn') reasons.push({ level: 'caution', text: `${daily.usedPct.toFixed(0)}% of your daily loss limit is used.` });
  }
  if (limits?.max && (limits.max.level === 'breach' || limits.max.level === 'danger')) {
    reasons.push({
      level: limits.max.level === 'breach' ? 'stop' : 'caution',
      text: limits.max.level === 'breach' ? 'Max drawdown limit reached.' : `${limits.max.usedPct.toFixed(0)}% of your max drawdown is used.`,
    });
  }
  if (maxTrades) {
    if (todayTrades.length >= maxTrades) reasons.push({ level: 'stop', text: `You have taken ${todayTrades.length} of ${maxTrades} allowed trades today.` });
    else if (todayTrades.length === maxTrades - 1) reasons.push({ level: 'caution', text: 'One trade left for today.' });
  }
  if (maxStreak) {
    if (streak >= maxStreak) reasons.push({ level: 'stop', text: `${streak} losses in a row. Your limit is ${maxStreak}.` });
    else if (streak === maxStreak - 1) reasons.push({ level: 'caution', text: `${streak} losses in a row. One more hits your limit.` });
  }

  const status = reasons.some((r) => r.level === 'stop') ? 'stop' : reasons.length ? 'caution' : 'go';
  return {
    status,
    reasons,
    tradesToday: todayTrades.length,
    pnl,
    streak,
    maxTrades,
    maxStreak,
    dailyLeft: daily ? daily.remaining : null,
    dailyUsedPct: daily ? daily.usedPct : null,
    hasLimits: !!(daily || maxTrades || maxStreak),
  };
}

// Is recent risk per trade creeping above the trader's normal?
export function sizeCreep(trades, { recentN = 8, baseN = 30, minRatio = 1.3 } = {}) {
  const withRisk = closedSorted(trades)
    .map((t) => ({ t, r: riskOf(t) }))
    .filter((x) => x.r !== null);
  if (withRisk.length < recentN + 10) return { flag: false };
  const recent = withRisk.slice(-recentN);
  const base = withRisk.slice(-(recentN + baseN), -recentN);
  const recentAvg = avg(recent.map((x) => x.r));
  const baseAvg = avg(base.map((x) => x.r));
  if (!baseAvg) return { flag: false };
  const ratio = recentAvg / baseAvg;
  const recentPnl = recent.reduce((s, x) => s + num(x.t.pnl), 0);
  return { flag: ratio >= minRatio, ratio, recentAvg, baseAvg, afterWins: recentPnl > 0 };
}

// Has the trader handed back a big part of the profit they were up today / this week?
export function giveBack(trades, now = new Date(), scope = 'day') {
  const start = scope === 'week' ? startOfWeek(now, { weekStartsOn: 1 }).getTime() : new Date(dayKey(now) + 'T00:00:00').getTime();
  const list = trades
    .filter((t) => isClosed(t) && t.entry_time && when(t) >= start)
    .slice()
    .sort((a, b) => when(a) - when(b));
  if (list.length < 2) return { flag: false };
  let run = 0;
  let peak = 0;
  for (const t of list) {
    run += num(t.pnl);
    if (run > peak) peak = run;
  }
  const current = run;
  const given = peak - current;
  const pct = peak > 0 ? (given / peak) * 100 : 0;
  return { flag: peak > 0 && pct >= 50 && current < peak, peak, current, given, pct, scope };
}

// Is the setup's recent expectancy well below its long-run average?
export function edgeDecay(trades, { recentN = 30, minTotal = 50 } = {}) {
  const list = closedSorted(trades);
  if (list.length < minTotal) return null;
  const recent = list.slice(-recentN);
  const prior = list.slice(0, -recentN);
  const stat = (xs) => ({
    n: xs.length,
    exp: avg(xs.map((t) => num(t.pnl))),
    winRate: (xs.filter((t) => num(t.pnl) > 0).length / xs.length) * 100,
  });
  const r = stat(recent);
  const p = stat(prior);
  const flag = p.exp > 0 && (r.exp < 0 || r.exp < p.exp * 0.5);
  return { flag, recent: r, prior: p };
}

// Have the last few full weeks been green with the process followed?
export function scalingReadiness(trades, now = new Date(), { weeks = 4 } = {}) {
  const closed = closedSorted(trades);
  const results = [];
  for (let i = 1; i <= weeks; i++) {
    const ref = subWeeks(now, i);
    const interval = { start: startOfWeek(ref, { weekStartsOn: 1 }), end: endOfWeek(ref, { weekStartsOn: 1 }) };
    const wk = closed.filter((t) => isWithinInterval(new Date(t.entry_time), interval));
    results.push({ count: wk.length, pnl: wk.reduce((s, t) => s + num(t.pnl), 0), trades: wk });
  }
  const enoughTrades = results.every((r) => r.count >= 3);
  const green = results.filter((r) => r.pnl > 0).length;
  const scores = results.flatMap((r) => r.trades.map(tradeProcess)).filter((s) => s !== null);
  const processAvg = scores.length ? avg(scores) : null;
  const ready = enoughTrades && green === weeks && (processAvg === null || processAvg >= 75);
  return { ready, green, weeks, enoughTrades, processAvg };
}

// ---------------------------------------------------------------------------
// The short list of things worth telling the trader right now.
// ---------------------------------------------------------------------------
export function buildNudges({ trades, now = new Date(), fmt = (v) => `$${Math.abs(v).toFixed(2)}` }) {
  const out = [];

  const gbDay = giveBack(trades, now, 'day');
  if (gbDay.flag) {
    out.push({
      id: 'giveback-day',
      level: 'warn',
      title: 'Profit giveback',
      text: `You were up ${fmt(gbDay.peak)} today and are now at ${gbDay.current >= 0 ? '+' : '-'}${fmt(gbDay.current)}. Consider stopping while you are ahead.`,
    });
  } else {
    const gbWeek = giveBack(trades, now, 'week');
    if (gbWeek.flag) {
      out.push({
        id: 'giveback-week',
        level: 'warn',
        title: 'Weekly giveback',
        text: `This week peaked at ${fmt(gbWeek.peak)} and has handed back ${gbWeek.pct.toFixed(0)}% of it. Protect what you made.`,
      });
    }
  }

  const sc = sizeCreep(trades);
  if (sc.flag) {
    out.push({
      id: 'size-creep',
      level: 'warn',
      title: 'Risk is creeping up',
      text: `Your recent risk per trade is ${((sc.ratio - 1) * 100).toFixed(0)}% above your normal (${fmt(sc.recentAvg)} vs ${fmt(sc.baseAvg)})${sc.afterWins ? ', after a good run. This is how winning accounts get hurt' : ''}.`,
    });
  }

  const decay = edgeDecay(trades);
  if (decay?.flag) {
    out.push({
      id: 'edge-decay',
      level: 'warn',
      title: 'Your edge may be fading',
      text: `Your last ${decay.recent.n} trades average ${decay.recent.exp >= 0 ? '+' : '-'}${fmt(decay.recent.exp)} per trade, versus ${fmt(decay.prior.exp)} before. Review what changed.`,
    });
  }

  // Weakest weekday, shown only when today is that weekday.
  const byDay = {};
  for (const t of closedSorted(trades)) {
    const d = new Date(t.entry_time).getDay();
    if (!byDay[d]) byDay[d] = { pnl: 0, n: 0 };
    byDay[d].pnl += num(t.pnl);
    byDay[d].n += 1;
  }
  const todayIdx = now.getDay();
  const todayStat = byDay[todayIdx];
  if (todayStat && todayStat.n >= 8 && todayStat.pnl < 0) {
    const worst = Object.values(byDay).every((v) => v.pnl >= todayStat.pnl);
    if (worst) {
      out.push({
        id: 'weak-day',
        level: 'info',
        title: `${WEEKDAYS[todayIdx]}s are your weakest day`,
        text: `-${fmt(todayStat.pnl)} across ${todayStat.n} trades. Trade smaller or skip today unless the setup is perfect.`,
      });
    }
  }

  const scale = scalingReadiness(trades, now);
  if (scale.ready) {
    out.push({
      id: 'scale',
      level: 'good',
      title: 'Ready to scale up?',
      text: `${scale.weeks} green weeks in a row${scale.processAvg !== null ? ` with ${scale.processAvg.toFixed(0)}% process score` : ''}. If you raise risk, do it in one small step and keep the rules the same.`,
    });
  }

  return out;
}
