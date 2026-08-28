'use client';

import { useState } from 'react';
import { computeDrawdown } from '../lib/drawdown';
import { rMultiple } from '../lib/tradeMath';
import { formatMoney } from '../lib/format';

export default function DrawdownStats({ trades, defaultRiskAmount, startingBalance, balanceApplicable }) {
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

  const items = [];
  if (currentBalance !== null) {
    items.push({
      label: 'Account Balance',
      value: `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: 'text-gray-900',
    });
  }
  items.push({ label: 'Total R', value: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, color: totalR >= 0 ? 'text-green-600' : 'text-red-500' });
  items.push({ label: 'Current Drawdown', value: `-${formatMoney(dd.currentDrawdown).replace(/^[+-]/, '')}`, color: 'text-red-500' });
  items.push({ label: 'Max Drawdown', value: `-${formatMoney(dd.maxDrawdown).replace(/^[+-]/, '')}`, color: 'text-red-500' });

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
        {items.map((it) => (
          <div key={it.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">{it.label}</div>
            <div className={`text-lg font-semibold ${it.color}`}>{it.value}</div>
          </div>
        ))}
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
