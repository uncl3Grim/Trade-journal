'use client';

import { useState } from 'react';
import { computeDrawdown } from '../lib/drawdown';
import { rMultiple } from '../lib/tradeMath';

export default function DrawdownStats({ trades, defaultRiskAmount }) {
  const [mode, setMode] = useState('trailing');

  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalR = closed
    .map((t) => rMultiple(t, defaultRiskAmount))
    .filter((r) => r !== null)
    .reduce((sum, r) => sum + r, 0);

  const dd = computeDrawdown(trades, mode);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Drawdown & Total R</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode('static')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              mode === 'static' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Static
          </button>
          <button
            onClick={() => setMode('trailing')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              mode === 'trailing' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}
          >
            Trailing
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Total R</div>
          <div className={`text-lg font-semibold ${totalR >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {totalR >= 0 ? '+' : ''}
            {totalR.toFixed(2)}R
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Current Drawdown</div>
          <div className="text-lg font-semibold text-red-500">-{dd.currentDrawdown.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
          <div className="text-lg font-semibold text-red-500">-{dd.maxDrawdown.toFixed(2)}</div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        {mode === 'trailing'
          ? 'Trailing: measured from your highest-ever account balance (matches most prop firm rules).'
          : 'Static: measured from your starting balance only.'}
      </p>
    </div>
  );
}
