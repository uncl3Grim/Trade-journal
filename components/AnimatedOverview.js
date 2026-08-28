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
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-center">
        <AnimatedDrawdownTank percent={ddPercent} />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-center justify-center">
        <AnimatedWinRateRing percent={winRate} />
      </div>
    </div>
  );
}
