'use client';

import { forwardRef } from 'react';
import { formatMoney } from '../lib/format';

function TradeCell({ trade, isBest, mode }) {
  const value = mode === 'r' ? trade.r : trade.pnl;
  const isWin = value !== null && value > 0;
  const isLoss = value !== null && value < 0;

  return (
    <div
      className={`group relative rounded-2xl px-3 py-3.5 flex flex-col items-center text-center gap-1.5 border backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.03] ${
        isBest
          ? 'border-emerald-300/40 bg-emerald-300/10 shadow-[0_0_0_1px_rgba(52,211,153,0.15)] hover:shadow-[0_8px_24px_-4px_rgba(52,211,153,0.35)]'
          : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12] hover:border-white/20 hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.25)]'
      }`}
    >
      <span className={`text-[10px] font-semibold tracking-wider uppercase truncate max-w-full ${isBest ? 'text-emerald-300/80' : 'text-slate-500'}`}>
        {trade.symbol}
      </span>

      <span
        className={`text-[15px] font-bold tabular-nums ${
          isWin ? 'text-emerald-300' : isLoss ? 'text-rose-300' : 'text-slate-300'
        }`}
      >
        {value === null ? '—' : mode === 'r' ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}R` : formatMoney(value)}
      </span>

      <span className="text-[9px] text-slate-500">{trade.time}</span>

      {isBest && (
        <div className="w-full mt-1 pt-1.5 border-t border-emerald-300/20">
          <span className="text-[9px] text-emerald-300/70 uppercase tracking-wide">Best trade</span>
        </div>
      )}
    </div>
  );
}

const DailyRecapCard = forwardRef(function DailyRecapCard({ recap, mode, appName = 'Edgewise' }, ref) {
  const total = mode === 'r' ? recap.totalR : recap.totalPnl;
  const isPositive = total >= 0;
  const suffix = mode === 'r' ? 'R' : '';
  const visibleTrades = recap.trades.slice(0, 6);
  const extraCount = recap.trades.length - visibleTrades.length;

  return (
    <div
      ref={ref}
      className="relative w-full max-w-[520px] mx-auto overflow-hidden rounded-[28px] p-7 sm:p-8"
      style={{
        background: 'linear-gradient(155deg, #0a0d1c 0%, #0f1129 45%, #150f28 100%)',
        fontFamily: 'inherit',
      }}
    >
      {/* decorative glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-violet-500/15 blur-[90px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs">
              {appName.charAt(0)}
            </div>
            <span className="text-white font-semibold text-[15px] tracking-tight">{appName}</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-200 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 backdrop-blur">
            Daily recap
          </span>
        </div>

        {/* date + trade count */}
        <div className="text-[11px] font-medium tracking-wide uppercase text-slate-400 mb-2">
          {recap.dateLabel} · {recap.totalTrades} trade{recap.totalTrades !== 1 ? 's' : ''}
        </div>

        {/* headline number */}
        <div
          className={`text-[42px] sm:text-[48px] font-extrabold tracking-tight mb-3 leading-none ${
            isPositive ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200' : 'text-rose-400'
          }`}
        >
          {isPositive ? '+' : ''}
          {mode === 'r' ? `${total.toFixed(2)}${suffix}` : formatMoney(total)}
        </div>

        {/* badges */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] font-semibold text-slate-200 bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-full px-3 py-1 transition-colors duration-300 hover:bg-white/[0.14]">
            {recap.winRate}% win rate
          </span>
          <span className="text-[11px] font-semibold text-slate-200 bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 transition-colors duration-300 hover:bg-white/[0.14]">
            <span className={`w-1.5 h-1.5 rounded-full ${recap.avgR >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {recap.avgR >= 0 ? '+' : ''}
            {recap.avgR.toFixed(2)}R avg
          </span>
        </div>

        {/* trade grid */}
        {visibleTrades.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {visibleTrades.map((trade) => (
              <TradeCell key={trade.id} trade={trade} mode={mode} isBest={recap.bestTrade && recap.bestTrade.id === trade.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-6 text-center text-[12px] text-slate-500 mb-2">
            No trades logged this day.
          </div>
        )}
        {extraCount > 0 && (
          <div className="text-[10px] text-slate-500 text-right mb-4">+{extraCount} more trade{extraCount !== 1 ? 's' : ''}</div>
        )}

        {/* footer stats */}
        <div className="grid grid-cols-4 gap-2 bg-white/[0.05] backdrop-blur-md border border-white/[0.08] rounded-2xl px-4 py-4 mb-5 mt-4">
          {[
            { label: 'Trades', value: recap.totalTrades },
            { label: 'Win rate', value: `${recap.winRate}%` },
            { label: 'Avg R', value: `${recap.avgR >= 0 ? '+' : ''}${recap.avgR.toFixed(2)}R` },
            { label: 'Best trade', value: recap.bestTrade ? recap.bestTrade.symbol : '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center rounded-xl transition-transform duration-300 hover:scale-[1.06]"
            >
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{stat.label}</div>
              <div className="text-[13px] font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* watermark */}
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Tracked and reviewed in {appName}
          </span>
        </div>
      </div>
    </div>
  );
});

export default DailyRecapCard;
