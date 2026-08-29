'use client';

import { useState } from 'react';
import { computeDrawdown } from '../lib/drawdown';
import { rMultiple } from '../lib/tradeMath';
import { formatMoney } from '../lib/format';
import { WalletGlyph, TargetGlyph } from './AnimeIcons';
import BatteryCellIcon from './BatteryCellIcon';

export default function DrawdownStats({ trades, defaultRiskAmount, startingBalance, balanceApplicable, account }) {
  const [mode, setMode] = useState('trailing');

  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalR = closed
    .map((t) => rMultiple(t, defaultRiskAmount))
    .filter((r) => r !== null)
    .reduce((sum, r) => sum + r, 0);

  const dd = computeDrawdown(trades, mode);
  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const currentBalance =
    balanceApplicable && startingBalance !== null && startingBalance !== undefined
      ? startingBalance + totalPnl
      : null;

  const ddOfMaxPct = dd.maxDrawdown > 0 ? (dd.currentDrawdown / dd.maxDrawdown) * 100 : 0;

  // Max drawdown as % of the account's starting balance, then compared against
  // the prop firm's allowed max-loss limit (if one is set on this account).
  const maxDrawdownPctOfBalance =
    startingBalance && startingBalance > 0 ? (dd.maxDrawdown / startingBalance) * 100 : null;

  const maxLossLimitPct = account?.max_loss_limit_pct || null;

  const maxDrawdownOfLimitPct =
    maxLossLimitPct && maxDrawdownPctOfBalance !== null
      ? Math.min(100, (maxDrawdownPctOfBalance / maxLossLimitPct) * 100)
      : 100; // fall back to old behavior if no limit is set on this account

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Account Overview</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('static')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${mode === 'static' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Static
          </button>
          <button
            onClick={() => setMode('trailing')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${mode === 'trailing' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Trailing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {currentBalance !== null && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center text-center">
            <WalletGlyph size={22} className="text-gray-500 mb-1" />
            <div className="text-xs text-gray-400 mb-1">Account Balance</div>
            <div className="text-base font-semibold text-gray-900">
              ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center text-center">
          <TargetGlyph size={22} className="text-indigo-500 mb-1" />
          <div className="text-xs text-gray-400 mb-1">Total R</div>
          <div className={`text-base font-semibold ${totalR >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalR >= 0 ? '+' : ''}
            {totalR.toFixed(2)}R
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center text-center">
          <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
          <BatteryCellIcon percent={ddOfMaxPct} size={40} color="red" />
          <div className="text-[10px] text-gray-400 mt-1">{formatMoney(dd.currentDrawdown).replace(/^\+/, '')}</div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center text-center">
          <div className="text-xs text-gray-400 mb-1">Current Drawdown</div>
          <BatteryCellIcon percent={maxDrawdownOfLimitPct} size={40} color="indigo" />
          <div className="text-[10px] text-gray-400 mt-1">
            {formatMoney(dd.maxDrawdown).replace(/^\+/, '')}
            {maxLossLimitPct && maxDrawdownPctOfBalance !== null && (
              <span className="block">
                {maxDrawdownPctOfBalance.toFixed(2)}% / {maxLossLimitPct}% limit
              </span>
            )}
          </div>
        </div>
      </div>

      {!balanceApplicable && (
        <p className="text-[10px] text-gray-400 mt-2">
          Select a single account above to see its balance — combining accounts with different starting balances/currencies isn't meaningful.
        </p>
      )}
      {balanceApplicable && currentBalance === null && (
        <p className="text-[10px] text-gray-400 mt-2">Set this account's starting balance on the Broker page to see its balance here.</p>
      )}
      <p className="text-[10px] text-gray-400 mt-2">
        {mode === 'trailing'
          ? 'Trailing: measured from your highest-ever account balance (matches most prop firm rules).'
          : 'Static: measured from your starting balance only.'}{' '}
        Note: balance is calculated only from trades this app has — brokers with an API history limit (like MyFXBook's free tier) may be missing older trades, causing a mismatch with your real account.
      </p>
    </div>
  );
}
