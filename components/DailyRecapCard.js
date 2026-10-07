'use client';

import { forwardRef } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import { formatMoney } from '../lib/format';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

function fmtPrice(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
}

function TradeRow({ trade, isBest, mode }) {
  const value = mode === 'r' ? trade.r : trade.pnl;
  const isWin = value !== null && value > 0;
  const isLoss = value !== null && value < 0;
  const isLong = trade.direction === 'long';

  return (
    <tr className={`transition-colors duration-200 hover:bg-neutral-900/70 ${isBest ? 'bg-neutral-900/50' : ''}`}>
      <td className="py-2 pl-2.5 pr-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLong ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span className="text-[11px] font-medium text-neutral-100 truncate">{trade.symbol}</span>
        </div>
        {isBest && <span className="text-[8px] text-neutral-500 uppercase tracking-wide">Best trade</span>}
      </td>
      <td className="py-2 px-2 text-[10px] text-neutral-400 tabular-nums text-right">{fmtPrice(trade.entryPrice)}</td>
      <td className="py-2 px-2 text-[10px] text-neutral-400 tabular-nums text-right">{fmtPrice(trade.exitPrice)}</td>
      <td className="py-2 px-2 text-[10px] text-neutral-400 tabular-nums text-right">{fmtPrice(trade.takeProfit)}</td>
      <td className="py-2 px-2 text-[10px] tabular-nums text-right">
        {trade.r === null ? (
          <span className="text-neutral-600">—</span>
        ) : (
          <span className={trade.r >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {trade.r >= 0 ? '+' : ''}
            {trade.r.toFixed(1)}R
          </span>
        )}
      </td>
      <td className="py-2 pr-2.5 pl-2 text-[11px] font-semibold tabular-nums text-right">
        <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-neutral-400'}>
          {formatMoney(trade.pnl)}
        </span>
      </td>
    </tr>
  );
}

const DailyRecapCard = forwardRef(function DailyRecapCard(
  { recap, mode, appName = 'Trade Journal', backgroundUrl, backgroundDim = 0.6 },
  ref
) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const isPositive = total >= 0;
  const suffix = mode === 'r' ? 'R' : '';
  const visibleTrades = recap.trades.slice(0, 8);
  const extraCount = recap.trades.length - visibleTrades.length;

  return (
    <div
      ref={ref}
      className={`relative w-full max-w-[540px] mx-auto overflow-hidden rounded-2xl border border-neutral-800 p-6 sm:p-7 ${bricolage.className}`}
      style={
        backgroundUrl
          ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: '#0a0a0a' }
      }
    >
      {backgroundUrl && (
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: `rgba(10,10,10,${backgroundDim})` }} />
      )}

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 font-bold text-[10px]">
              {appName.charAt(0)}
            </div>
            <span className="text-neutral-100 font-medium text-sm tracking-tight">{appName}</span>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md px-2.5 py-1">
            Daily recap
          </span>
        </div>

        {/* date + trade count */}
        <div className="text-[11px] text-neutral-500 mb-1.5">
          {recap.dateLabel} · {recap.totalTrades} trade{recap.totalTrades !== 1 ? 's' : ''}
        </div>

        {/* headline number */}
        <div className={`text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-none ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {mode === 'r' ? `${isPositive ? '+' : ''}${total.toFixed(2)}${suffix}` : formatMoney(total)}
        </div>

        {/* stat row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Win rate', value: `${recap.winRate}%` },
            { label: 'Avg R', value: `${recap.avgR >= 0 ? '+' : ''}${recap.avgR.toFixed(2)}R` },
            { label: 'Best trade', value: recap.bestTrade ? recap.bestTrade.symbol : '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-neutral-800 bg-neutral-900/60 rounded-lg p-3 transition-all duration-200 hover:border-neutral-700 hover:-translate-y-0.5"
            >
              <div className="text-[9px] uppercase tracking-wide text-neutral-500 mb-1">{stat.label}</div>
              <div className="text-[13px] font-semibold text-neutral-100">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* trade table */}
        {visibleTrades.length > 0 ? (
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="py-2 pl-2.5 pr-2 text-left text-[9px] font-medium uppercase tracking-wide text-neutral-500">Symbol</th>
                  <th className="py-2 px-2 text-right text-[9px] font-medium uppercase tracking-wide text-neutral-500">Entry</th>
                  <th className="py-2 px-2 text-right text-[9px] font-medium uppercase tracking-wide text-neutral-500">Exit</th>
                  <th className="py-2 px-2 text-right text-[9px] font-medium uppercase tracking-wide text-neutral-500">TP</th>
                  <th className="py-2 px-2 text-right text-[9px] font-medium uppercase tracking-wide text-neutral-500">R</th>
                  <th className="py-2 pr-2.5 pl-2 text-right text-[9px] font-medium uppercase tracking-wide text-neutral-500">P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {visibleTrades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} mode={mode} isBest={recap.bestTrade && recap.bestTrade.id === trade.id} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-neutral-800 bg-neutral-900/40 rounded-lg px-4 py-6 text-center text-[12px] text-neutral-500">
            No trades logged this day.
          </div>
        )}
        {extraCount > 0 && <div className="text-[10px] text-neutral-600 text-right mt-1.5">+{extraCount} more trade{extraCount !== 1 ? 's' : ''}</div>}

        {/* watermark */}
        <div className="flex items-center gap-1.5 text-[9px] text-neutral-600 mt-5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Tracked and reviewed in {appName}
        </div>
      </div>
    </div>
  );
});

export default DailyRecapCard;
