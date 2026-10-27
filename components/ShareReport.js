'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfYear } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { fieldClass, primaryBtn } from './broker/ui';

export default function ShareReport({ connection }) {
  const [reports, setReports] = useState([]);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('public_reports')
      .select('*')
      .eq('broker_connection_id', connection.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }, [connection.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function createReport() {
    setCreating(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('public_reports').insert({
      user_id: session.user.id,
      broker_connection_id: connection.id,
      label: label || connection.broker_server,
      start_date: startDate || null,
      show_balances: showBalances,
    });
    setCreating(false);
    setLabel('');
    setStartDate('');
    setShowBalances(true);
    load();
  }

  async function revoke(id) {
    await supabase.from('public_reports').update({ revoked: true }).eq('id', id);
    load();
  }

  async function copyLink(r) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/verify/${r.token}`);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {}
  }

  const active = reports.filter((r) => !r.revoked);
  const today = new Date();
  const ymd = (d) => format(d, 'yyyy-MM-dd');
  const quick = [
    { label: 'All time', value: '' },
    { label: 'Last 30 days', value: ymd(subDays(today, 30)) },
    { label: 'Last 90 days', value: ymd(subDays(today, 90)) },
    { label: 'This year', value: ymd(startOfYear(today)) },
  ];

  return (
    <div>
      <div className="flex gap-2">
        <input
          aria-label="Link name"
          placeholder="Link name (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={`flex-1 ${fieldClass}`}
        />
        <button onClick={createReport} disabled={creating} className={primaryBtn}>
          {creating ? 'Creating…' : 'Create link'}
        </button>
      </div>

      <div className="mt-3">
        <label htmlFor="share-start" className="block text-xs font-medium text-neutral-400 mb-1.5">
          Share results from
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="share-start"
            type="date"
            max={ymd(today)}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className={`${fieldClass} !w-auto`}
          />
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setStartDate(q.value)}
              className={`text-xs rounded-full px-3 py-1.5 border ${
                startDate === q.value
                  ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200'
                  : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 mt-1.5">
          {startDate
            ? 'Trades before this date stay hidden. The starting balance shown is your balance on this date.'
            : 'No date chosen: every trade on this account is shared.'}
        </p>

        <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showBalances}
            onChange={(e) => setShowBalances(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-indigo-500"
          />
          <span>
            <span className="block text-sm text-neutral-200">Show account balance</span>
            <span className="block text-[11px] text-neutral-500">
              {showBalances
                ? 'Starting and current balance and percentage returns are visible.'
                : 'Balances and percentage returns are hidden. Only dollar results are shown.'}
            </span>
          </span>
        </label>
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-neutral-500 mt-3">No active links. Create one to share a read-only view of this account's results.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {active.map((r) => (
            <li key={r.id} className="bk-swap flex items-center justify-between gap-3 bg-white/[0.03] border border-neutral-800/60 rounded-xl px-3 py-2">
              <span className="min-w-0">
                <span className="block text-sm text-neutral-200 truncate">{r.label || 'Untitled link'}</span>
                <span className="block text-[11px] text-neutral-500">
                  {[r.start_date ? `From ${format(new Date(`${r.start_date}T00:00:00`), 'MMM d, yyyy')}` : 'All trades', r.show_balances === false ? 'Balance hidden' : null].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="flex gap-3 flex-shrink-0 text-xs font-medium">
                <button onClick={() => copyLink(r)} className={copiedId === r.id ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}>
                  {copiedId === r.id ? 'Copied' : 'Copy link'}
                </button>
                <button onClick={() => revoke(r.id)} className="text-red-400 hover:text-red-300">Revoke</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
