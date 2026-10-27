'use client';

import { format } from 'date-fns';
import ShareReport from './ShareReport';

const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const TYPE_LABEL = { myfxbook: 'MyFXBook', csv: 'CSV import', manual: 'Manual' };

export default function TrackRecordTab({ accounts, onSetup }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-neutral-400 leading-relaxed max-w-md">
        Share a read-only page of any account&apos;s results. Pick a start date, choose whether balances show, and revoke a link any time.
      </p>
      <p className="text-xs text-neutral-500 mt-2 max-w-md leading-relaxed">
        Visitors see trade results, stats and screenshots. Entry and exit prices, stop loss, take profit and your notes are never shared.
      </p>

      <div className="mt-5 space-y-4">
        {accounts.length === 0 && (
          <div className="bg-white/[0.04] border border-neutral-800/60 rounded-2xl p-8 text-center">
            <p className="text-neutral-100 font-medium">No accounts yet</p>
            <p className="text-sm text-neutral-500 mt-1 mb-4">Add an account first, then come back to share its results.</p>
            <button
              onClick={onSetup}
              className="bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Go to Broker
            </button>
          </div>
        )}

        {accounts.map((c) => (
          <section
            key={c.id}
            className="relative bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="mb-4">
              <h2 className="font-heading font-semibold text-neutral-100 truncate">{c.broker_server || 'Account'}</h2>
              <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap gap-x-2">
                <span>{TYPE_LABEL[c.broker_type] || 'MT5'}</span>
                {c.mt5_login && <span>Login {c.mt5_login}</span>}
                {c.starting_balance != null && <span>Started at {money(c.starting_balance)}</span>}
                {c.last_synced_at && <span>Synced {format(new Date(c.last_synced_at), 'MMM d, h:mm a')}</span>}
              </p>
            </div>
            <ShareReport connection={c} />
          </section>
        ))}
      </div>
    </div>
  );
}
