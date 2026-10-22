// Risk planner maths. It uses the trader's OWN results (win rate and average win vs average loss),
// treats an average loss as 1R, and shows how deep a bad run can get at different risk sizes.
// It is an estimate from past results, not a forecast.

export const MIN_TRADES = 10; // below this we do not estimate anything
export const SMALL_SAMPLE = 30; // below this we warn that the numbers are rough
export const RISKS = [0.25, 0.5, 1, 1.5, 2, 3, 5]; // % of the account risked per trade
export const LIMITS = [10, 20, 30]; // drawdown the trader says they can live with, in %
export const HORIZON = 100; // trades to look ahead
export const TARGET = 0.05; // the chance of breaching the limit we call acceptable (1 in 20)

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isClosed = (t) => t.exit_price !== null && t.exit_price !== undefined;

// Win rate, loss rate, payoff ratio and expectancy (in R) from closed trades.
export function tradeStats(trades) {
  const closed = trades.filter(isClosed);
  const n = closed.length;
  const wins = closed.filter((t) => num(t.pnl) > 0);
  const losses = closed.filter((t) => num(t.pnl) < 0);
  const base = { n, wins: wins.length, losses: losses.length };

  if (n < MIN_TRADES) return { ...base, reason: 'few' };
  if (losses.length === 0) return { ...base, reason: 'no-losses' };

  const avgWin = wins.length ? wins.reduce((s, t) => s + num(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.reduce((s, t) => s + Math.abs(num(t.pnl)), 0) / losses.length;
  const pw = wins.length / n;
  const pl = losses.length / n;
  const b = avgWin / avgLoss; // payoff: R won per R lost
  return {
    ...base,
    reason: null,
    pw,
    pl,
    pb: 1 - pw - pl,
    avgWin,
    avgLoss,
    b,
    expectancyR: pw * b - pl,
    small: n < SMALL_SAMPLE,
  };
}

// Chance of at least one run of k or more losses somewhere in n trades, each losing with probability q.
export function streakOdds(q, n, k) {
  if (k <= 0) return 1;
  if (q <= 0) return 0;
  let dist = new Array(k).fill(0); // dist[r] = chance the current losing run is exactly r
  dist[0] = 1;
  let hit = 0;
  for (let i = 0; i < n; i++) {
    const next = new Array(k).fill(0);
    for (let r = 0; r < k; r++) {
      const p = dist[r];
      if (!p) continue;
      next[0] += p * (1 - q);
      if (r + 1 === k) hit += p * q;
      else next[r + 1] += p * q;
    }
    dist = next;
  }
  return hit;
}

// Small seeded random generator, so the same stats always give the same numbers on screen.
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

// Plays the next `horizon` trades many times at each risk size (same random trades for every size,
// so a bigger size can only ever look worse or equal). Compounds on the current balance.
export function simulate(stats, { paths = 3000, horizon = HORIZON, risks = RISKS, limits = [10, 20, 30, 50], seed = 20260101 } = {}) {
  const { pw, pl, b } = stats;
  const rnd = mulberry32(seed);
  const outcomes = new Int8Array(paths * horizon);
  for (let i = 0; i < outcomes.length; i++) {
    const r = rnd();
    outcomes[i] = r < pw ? 1 : r < pw + pl ? -1 : 0;
  }

  return risks.map((risk) => {
    const f = risk / 100;
    const up = 1 + f * b;
    const down = 1 - f;
    const dds = new Float64Array(paths);
    const finals = new Float64Array(paths);
    for (let p = 0; p < paths; p++) {
      let eq = 1;
      let peak = 1;
      let maxDd = 0;
      const off = p * horizon;
      for (let t = 0; t < horizon; t++) {
        const o = outcomes[off + t];
        if (o === 1) eq *= up;
        else if (o === -1) eq *= down;
        if (eq > peak) peak = eq;
        else {
          const dd = 1 - eq / peak;
          if (dd > maxDd) maxDd = dd;
        }
      }
      dds[p] = maxDd;
      finals[p] = eq;
    }
    const sortedDd = Float64Array.from(dds).sort();
    const sortedFinal = Float64Array.from(finals).sort();
    const exceed = {};
    for (const L of limits) {
      let c = 0;
      for (let p = 0; p < paths; p++) if (dds[p] >= L / 100) c++;
      exceed[L] = c / paths;
    }
    return {
      risk,
      exceed,
      median: quantile(sortedDd, 0.5) * 100, // the typical worst drawdown, in %
      p95: quantile(sortedDd, 0.95) * 100, // the worst 1 in 20, in %
      medianReturn: (quantile(sortedFinal, 0.5) - 1) * 100,
    };
  });
}

// Largest risk size whose chance of breaching `limit` stays within the target. null if even the smallest fails.
export function largestSafeRisk(rows, limit, target = TARGET) {
  let best = null;
  for (const r of rows) if (r.exceed[limit] <= target) best = r.risk;
  return best;
}

// Gain needed to get back to even after losing `lossPct` percent.
export const recoveryNeeded = (lossPct) => (lossPct >= 100 ? Infinity : (lossPct / (100 - lossPct)) * 100);

// Percent of the account lost after k losses in a row at risk% per trade.
export const streakCost = (risk, k) => (1 - Math.pow(1 - risk / 100, k)) * 100;
