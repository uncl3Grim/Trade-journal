'use client';

import { computeDrawdown } from '../lib/drawdown';
import AnimatedDrawdownTank from './AnimatedDrawdownTank';
import AnimatedWinRateRing from './AnimatedWinRateRing';

export default function AnimatedOverview({ trades }) {
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

  const dd = computeDrawdown(trades, 'trailing');
  const ddPercent = dd.maxDrawdown > 0 ? (dd.currentDrawdown / dd.maxDrawdown) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6 flex items-center justify-around gap-6">
      <AnimatedDrawdownTank percent={ddPercent} />
      <AnimatedWinRateRing percent={winRate} />
    </div>
  );
}
