'use client';

import { format } from 'date-fns';
import { computePropFirmCompliance } from '../lib/propFirmRules';
import { formatMoney } from '../lib/format';
import BatteryCellIcon from './BatteryCellIcon';

function Bar({ value, limit, dangerAt = 90 }) {
  if (!limit) return null;
  const pct = Math.min(100, (value / limit) * 100);
  const color = pct >= dangerAt ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PropFirmTracker({ trades, account }) {
  if (!account?.starting_balance) return null;

  const hasAnyRule = account.daily_loss_limit_pct || account.max_loss_limit_pct || account.profit_target_pct;
  if (!hasAnyRule) return null;

  const compliance = computePropFirmCompliance(trades, account.starting_balance, {
    dailyLossLimitPct: account.daily_loss_limit_pct,
    maxLossLimitPct: account.max_loss_limit_pct,
    profitTargetPct: account.profit_target_pct,
  });

  if (!compliance) return null;

  const breached = compliance.maxDdBreached || compliance.dailyBreaches.length > 0;
  const statusLabel = breached ? 'RULE BREACHED' : compliance.profitTargetHit ? 'TARGET HIT' : 'IN PROGRESS';
  const statusColor = breached ? 'bg-red-100 text-red-700' : compliance.profitTargetHit ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

  const currentDdOfLimitPct = account.max_loss_limit_pct
    ? Math.min(100, (compliance.currentDrawdownPct / account.max_loss_limit_pct) * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">Prop Firm Rules — {account.broker_server}</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {account.daily_loss_limit_pct && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Worst daily loss</span>
              <span>
                {compliance.worstDailyLossPct.toFixed(2)}% / {account.daily_loss_limit_pct}%
              </span>
            </div>
            <Bar value={compliance.worstDailyLossPct} limit={account.daily_loss_limit_pct} />
          </div>
        )}

        {account.max_loss_limit_pct && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center text-center">
            <div className="text-xs text-gray-500 mb-1">Current drawdown</div>
            <BatteryCellIcon percent={currentDdOfLimitPct} size={36} color={currentDdOfLimitPct >= 90 ? 'red' : 'indigo'} />
            <div className="text-[10px] text-gray-400 mt-1">
              {compliance.currentDrawdownPct.toFixed(2)}% / {account.max_loss_limit_pct}% limit
            </div>
          </div>
        )}

        {account.max_loss_limit_pct && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Max drawdown</span>
              <span>
                {compliance.maxDrawdownPct.toFixed(2)}% / {account.max_loss_limit_pct}%
              </span>
            </div>
            <Bar value={compliance.maxDrawdownPct} limit={account.max_loss_limit_pct} />
          </div>
        )}

        {account.profit_target_pct && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Profit target</span>
              <span>
                {compliance.profitPct.toFixed(2)}% / {account.profit_target_pct}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, (compliance.profitPct / account.profit_target_pct) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {compliance.dailyBreaches.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3">
          <div className="text-xs font-medium text-red-600 mb-1">
            Daily loss limit breached on {compliance.dailyBreaches.length} day{compliance.dailyBreaches.length !== 1 ? 's' : ''}:
          </div>
          {compliance.dailyBreaches.map((b) => (
            <div key={b.day} className="text-xs text-gray-600">
              {format(new Date(b.day), 'MMM d, yyyy')}: {formatMoney(b.dayPnl)} ({b.dayLossPct.toFixed(2)}% loss)
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-gray-400 mt-3">
        Current balance: {formatMoney(compliance.currentBalance - account.starting_balance)} P&L · {formatMoney(compliance.currentBalance)} total
      </div>
    </div>
  );
}
