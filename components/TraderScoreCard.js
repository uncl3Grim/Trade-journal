'use client';

import { format } from 'date-fns';
import { rMultiple } from '../lib/tradeMath';
import { formatMoney } from '../lib/format';

function computeDuration(entryTime, exitTime) {
  if (!entryTime || !exitTime) return null;
  const ms = new Date(exitTime) - new Date(entryTime);
  if (ms < 0) return null;
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

function computeRiskAmount(trade, defaultRiskAmount) {
  if (trade.risk_amount) return Number(trade.risk_amount);
  if (defaultRiskAmount) return Number(defaultRiskAmount);
  const entry = Number(trade.entry_price);
  const stop = Number(trade.stop_loss);
  if (!entry || !stop || entry === stop) return null;
  const size = Number(trade.size) || 1;
  return Math.abs(entry - stop) * size;
}

export default function TradeSummaryCard({ trade, defaultRiskAmount, onClose }) {
  if (!trade) return null;

  const pnl = Number(trade.pnl || 0);
  const isWin = pnl >= 0;
  const r = rMultiple(trade, defaultRiskAmount);
  const riskAmount = computeRiskAmount(trade, defaultRiskAmount);
  const duration = computeDuration(trade.entry_time, trade.exit_time);
  const points =
    trade.exit_price && trade.entry_price ? Math.abs(Number(trade.exit_price) - Number(trade.entry_price)) : null;

  const screenshots = (trade.screenshot_urls?.length > 0 ? trade.screenshot_urls : trade.screenshot_url ? [trade.screenshot_url] : []).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl ${
          isWin
            ? 'bg-gradient-to-br from-green-950 via-emerald-900 to-gray-950'
            : 'bg-gradient-to-br from-red-950 via-rose-900 to-gray-950'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg tracking-tight">📓 Trade Journal</div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                trade.direction === 'long' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}
            >
              ↗ {trade.direction === 'long' ? 'LONG' : 'SHORT'}
            </span>
          </div>

          <div className="text-xs uppercase tracking-wide text-white/50 mb-1">
            {format(new Date(trade.entry_time), 'MMM d, yyyy')} · {trade.symbol}
          </div>

          <div className={`text-5xl font-black mb-2 ${isWin ? 'text-green-400' : 'text-red-400'}`}>
            {formatMoney(pnl)}
          </div>

          {r !== null && (
            <div className="inline-flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-xs font-semibold text-white/80 mb-6">
              ○ {r >= 0 ? '+' : ''}
              {r.toFixed(2)}R
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-white/5 rounded-2xl p-3">
              <div className="text-[10px] uppercase text-white/40 mb-2">Trade Detail</div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/50">Entry</span>
                <span className="font-semibold">{trade.entry_price}</span>
              </div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/50">Exit</span>
                <span className="font-semibold">{trade.exit_price ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Size</span>
                <span className="font-semibold">{trade.size}</span>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <div className="text-[10px] uppercase text-white/40 mb-2">Stats</div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/50">Risk</span>
                <span className="font-semibold">{riskAmount !== null ? formatMoney(riskAmount).replace(/^[+-]/, '') : '—'}</span>
              </div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/50">Result</span>
                <span className={`font-semibold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                  {points !== null ? `${points.toFixed(2)} pts` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Duration</span>
                <span className="font-semibold">{duration || '—'}</span>
              </div>
            </div>
          </div>

          {screenshots.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {screenshots.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="Trade screenshot" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                </a>
              ))}
            </div>
          )}

          {(trade.tags?.length > 0 || trade.emotion) && (
            <div className="flex flex-wrap gap-1 mt-4">
              {trade.emotion && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70 capitalize">
                  {trade.emotion}
                </span>
              )}
              {trade.tags?.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-6 bg-white/10 hover:bg-white/20 rounded-xl py-2 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
