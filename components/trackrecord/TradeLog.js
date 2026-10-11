'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { GlassCard } from './ui';
import { formatMoney } from '../../lib/format';
import { validDate } from '../../lib/trackRecord';

export default function TradeLog({ trades }) {
  const [all, setAll] = useState(false);
  const rows = trades.slice().reverse();
  const shown = all ? rows : rows.slice(0, 15);

  return (
    <GlassCard title="Trade log" subtitle={`${rows.length} closed trades, newest first`}>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800/60">
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Symbol</th>
              <th className="px-2 py-2 font-medium">Side</th>
              <th className="px-2 py-2 font-medium">Entry</th>
              <th className="px-2 py-2 font-medium">Exit</th>
              <th className="px-2 py-2 font-medium text-right">P&L</th>
              <th className="px-2 py-2 font-medium">Proof</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => (
              <tr key={t.id || i} className="border-b border-neutral-800/30 last:border-0 hover:bg-white/[0.03]">
                <td className="px-2 py-2.5 text-neutral-400 whitespace-nowrap">{(() => { const d = validDate(t.entry_time) || validDate(t.exit_time); return d ? format(d, 'MMM d, yyyy') : '—'; })()}</td>
                <td className="px-2 py-2.5 font-medium text-neutral-100">{t.symbol}</td>
                <td className="px-2 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${t.direction === 'short' ? 'bg-rose-500/10 text-rose-300 border-rose-500/25' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'}`}>
                    {t.direction === 'short' ? 'short' : 'long'}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-neutral-400 tabular-nums">{t.entry_price}</td>
                <td className="px-2 py-2.5 text-neutral-400 tabular-nums">{t.exit_price ?? '—'}</td>
                <td className={`px-2 py-2.5 text-right font-medium tabular-nums ${Number(t.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatMoney(Number(t.pnl))}
                </td>
                <td className="px-2 py-2.5">
                  {t.screenshot_urls?.length > 0 ? (
                    <div className="flex gap-1">
                      {t.screenshot_urls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="Trade screenshot" className="h-9 w-9 object-cover rounded-md border border-neutral-700/70 hover:scale-110 transition-transform" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-700">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 15 && (
        <button
          onClick={() => setAll((v) => !v)}
          className="mt-3 w-full rounded-xl border border-neutral-800/60 bg-white/[0.03] py-2 text-xs text-neutral-300 hover:bg-white/[0.06]"
        >
          {all ? 'Show fewer' : `Show all ${rows.length} trades`}
        </button>
      )}
    </GlassCard>
  );
}
