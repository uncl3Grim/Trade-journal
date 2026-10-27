'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import ShareReport from './ShareReport';

const money = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const TYPE_LABEL = { myfxbook: 'MyFXBook', csv: 'CSV import', manual: 'Manual' };

export default function TrackRecordTab({ accounts, defaultAccountId, onSetup }) {
  const [selectedId, setSelectedId] = useState(null);

  // Start on the account chosen in the journal's account switcher, else the first account.
  useEffect(() => {
    if (!accounts.length) return;
    setSelectedId((cur) => {
      if (cur && accounts.some((a) => a.id === cur)) return cur;
      return accounts.some((a) => a.id === defaultAccountId) ? defaultAccountId : accounts[0].id;
    });
  }, [accounts, defaultAccountId]);

  if (accounts.length === 0) {
    return (
      <div className="max-w-xl bg-white/[0.04] border border-neutral-800/60 rounded-2xl p-8 text-center">
        <p className="text-neutral-100 font-medium">No accounts yet</p>
        <p className="text-sm text-neutral-500 mt-1 mb-4">Add an account first, then come back to share its results.</p>
        <button
          onClick={onSetup}
          className="bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Go to Broker
        </button>
      </div>
    );
  }

  const c = accounts.find((a) => a.id === selectedId) || accounts[0];

  return (
    <div className="max-w-2xl">
      <div className="text-xs font-medium text-neutral-500 mb-2">Choose an account to share</div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {accounts.map((a) => {
          const active = a.id === c.id;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              aria-pressed={active}
              className={`flex-shrink-0 text-left rounded-xl border px-3.5 py-2 transition-all duration-300 ${
                active
                  ? 'bg-indigo-500/15 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                  : 'bg-white/[0.04] border-neutral-800/60 hover:border-neutral-700'
              }`}
            >
              <span className={`block text-sm font-medium truncate max-w-[180px] ${active ? 'text-indigo-100' : 'text-neutral-300'}`}>
                {a.broker_server || 'Account'}
              </span>
              <span className="block text-[11px] text-neutral-500">{TYPE_LABEL[a.broker_type] || 'MT5'}</span>
            </button>
          );
        })}
      </div>

      <section className="relative mt-4 bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <h2 className="font-heading text-lg font-semibold text-neutral-50 truncate">{c.broker_server || 'Account'}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Meta label="Type" value={TYPE_LABEL[c.broker_type] || 'MT5'} />
          <Meta label="Starting balance" value={c.starting_balance != null ? money(c.starting_balance) : '—'} />
          {c.mt5_login && <Meta label="Login" value={c.mt5_login} />}
          <Meta label="Last synced" value={c.last_synced_at ? format(new Date(c.last_synced_at), 'MMM d, h:mm a') : 'Never'} />
        </div>

        <div className="my-5 h-px bg-neutral-800/70" />

        <h3 className="font-heading text-sm font-semibold text-neutral-100">Share links</h3>
        <p className="text-xs text-neutral-500 mt-1 mb-3 leading-relaxed">
          A read-only page of this account&apos;s results. Visitors never see entry and exit prices, stop loss, take profit or your notes.
        </p>
        <ShareReport key={c.id} connection={c} />
      </section>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-neutral-800/60 px-3 py-2">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className="text-sm text-neutral-100 font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}
