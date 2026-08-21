'use client';

import { computeAdvancedStats, computeDrawdownToProfitRatio } from '../lib/advancedStats';
import { computeDrawdown } from '../lib/drawdown';

export default function AdvancedStats({ trades }) {
  const { profitFactor, sharpe, tradeCount } = computeAdvancedStats(trades);
  const dd = computeDrawdown(trades, 'trailing');
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const ddToProfit = computeDrawdownToProfitRatio(dd.maxDrawdown, totalPnl);

  function fmtRatio(v, suffix = '') {
    if (v === null || v === undefined) return '—';
    if (v === Infinity) return '∞';
    return `${v.toFixed(2)}${suffix}`;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">Advanced Stats</h3>
      <p className="text-xs text-gray-400 mb-4">
        Based on {tradeCount} closed trade{tradeCount !== 1 ? 's' : ''}.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Profit Factor</div>
          <div className="text-lg font-semibold text-gray-900">{fmtRatio(profitFactor)}</div>
          <div className="text-[10px] text-gray-400">Gross profit ÷ gross loss</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Sharpe Ratio</div>
          <div className="text-lg font-semibold text-gray-900">{fmtRatio(sharpe)}</div>
          <div className="text-[10px] text-gray-400">Per-trade, not annualized</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Drawdown/Profit</div>
          <div className="text-lg font-semibold text-gray-900">{fmtRatio(ddToProfit)}</div>
          <div className="text-[10px] text-gray-400">Lower is better</div>
        </div>
      </div>
    </div>
  );
}
