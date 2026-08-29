'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { formatMoney } from '../../../lib/format';
import EquityCurve from '../../../components/EquityCurve';

export default function VerifyPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_public_report', { p_token: params.token }).then(({ data, error }) => {
      if (error || data?.error) {
        setError(data?.error || error?.message || 'Report not found');
      } else {
        setReport(data);
      }
      setLoading(false);
    });
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7fb] text-gray-400 text-sm">
        Loading report...
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7fb] text-red-500 text-sm">
        {error}
      </div>
    );
  }

  const trades = report.trades || [];
  const closed = trades.filter((t) => t.exit_price !== null && t.exit_price !== undefined);
  const totalPnl = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const grossProfit = closed.filter((t) => Number(t.pnl) > 0).reduce((s, t) => s + Number(t.pnl), 0);
  const grossLoss = Math.abs(closed.filter((t) => Number(t.pnl) < 0).reduce((s, t) => s + Number(t.pnl), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? '∞' : '—';

  return (
    <div className="min-h-screen bg-[#f7f7fb] px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {report.label || report.account_name || 'Verified Track Record'}
            </h1>
            <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700">
              ✓ Read-only verified view
            </span>
          </div>
          <p className="text-xs text-gray-400">Generated {format(new Date(report.created_at), 'MMM d, yyyy')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
            <div className="text-xs text-gray-400 mb-1">Total P&L</div>
            <div className={`text-lg font-semibold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatMoney(totalPnl)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-lg font-semibold text-gray-900">{winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
            <div className="text-xs text-gray-400 mb-1">Trades</div>
            <div className="text-lg font-semibold text-gray-900">{closed.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
            <div className="text-xs text-gray-400 mb-1">Profit Factor</div>
            <div className="text-lg font-semibold text-gray-900">
              {typeof profitFactor === 'number' ? profitFactor.toFixed(2) : profitFactor}
            </div>
          </div>
        </div>

        <EquityCurve trades={trades} />

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 font-medium">Entry</th>
                <th className="px-4 py-3 font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">P&L</th>
                <th className="px-4 py-3 font-medium">Screenshot</th>
              </tr>
            </thead>
            <tbody>
              {trades
                .slice()
                .reverse()
                .map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-700">{format(new Date(t.entry_time), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          t.direction === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.entry_price}</td>
                    <td className="px-4 py-3 text-gray-600">{t.exit_price ?? '—'}</td>
                    <td className={`px-4 py-3 font-medium ${Number(t.pnl) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatMoney(Number(t.pnl))}
                    </td>
                    <td className="px-4 py-3">
                      {t.screenshot_urls?.length > 0 ? (
                        <div className="flex gap-1">
                          {t.screenshot_urls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="Trade screenshot" className="h-10 w-10 object-cover rounded border border-gray-200" />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6">Powered by Trade Journal — read-only shared report</p>
      </div>
    </div>
  );
}
