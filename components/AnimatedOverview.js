'use client';

import { computeDrawdown } from '../lib/drawdown';
import AnimatedDrawdownTank from './AnimatedDrawdownTank';
import AnimatedWinRateRing from './AnimatedWinRateRing';

export default function AnimatedOverview({ trades, account, startingBalance, ddMode = 'trailing' }) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const dd = computeDrawdown(trades, ddMode);

  // Current drawdown as % of the account's starting balance
  const currentDdPctOfBalance =
    startingBalance && startingBalance > 0 ? (dd.currentDrawdown / startingBalance) * 100 : null;

  const maxLossLimitPct = account?.max_loss_limit_pct || null;

  // Prefer showing against the prop firm's actual limit when one is set.
  // Falls back to "current vs. this account's own historical max drawdown"
  // when there's no prop firm rule (manual accounts, non-funded accounts).
  const usingLimit = !!(maxLossLimitPct && currentDdPctOfBalance !== null);
  const ddPercent = usingLimit
    ? Math.min(100, (currentDdPctOfBalance / maxLossLimitPct) * 100)
    : dd.maxDrawdown > 0
    ? (dd.currentDrawdown / dd.maxDrawdown) * 100
    : 0;

  const tankLabel = usingLimit ? 'of max loss limit' : 'of max drawdown';

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-center">
        <AnimatedDrawdownTank percent={ddPercent} label={tankLabel} />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-center">
        <AnimatedWinRateRing percent={winRate} />
      </div>
    </div>
  );
}
