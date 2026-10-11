'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fieldClass, primaryBtn } from './broker/ui';

export default function ShareReport({ connection }) {
  const [reports, setReports] = useState([]);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
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
    });
    setCreating(false);
    setLabel('');
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

      {active.length === 0 ? (
        <p className="text-xs text-neutral-500 mt-3">No active links. Create one to share a read-only view of this account's results.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {active.map((r) => (
            <li key={r.id} className="bk-swap flex items-center justify-between gap-3 bg-white/[0.03] border border-neutral-800/60 rounded-xl px-3 py-2">
              <span className="text-sm text-neutral-200 truncate">{r.label || 'Untitled link'}</span>
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
