'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ShareReport({ connection }) {
  const [reports, setReports] = useState([]);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('public_reports')
      .select('*')
      .eq('broker_connection_id', connection.id)
      .order('created_at', { ascending: false });
    setReports(data || []);
  }, [connection.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function createReport() {
    setCreating(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
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

  function copyLink(token) {
    const url = `${window.location.origin}/verify/${token}`;
    navigator.clipboard.writeText(url);
    alert('Link copied!');
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-indigo-500 hover:text-indigo-400 mt-2 block">
        Share verified track record
      </button>
    );
  }

  const active = reports.filter((r) => !r.revoked);

  return (
    <div className="mt-2 bg-gray-50 rounded-xl p-3">
      <div className="text-xs font-medium text-gray-700 mb-2">
        Public share links for {connection.broker_server}
      </div>
      <div className="flex gap-2 mb-3">
        <input
          placeholder="Label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900"
        />
        <button
          onClick={createReport}
          disabled={creating}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-3 py-1 text-xs font-medium"
        >
          {creating ? '...' : '+ New link'}
        </button>
      </div>
      {active.length === 0 && <p className="text-[10px] text-gray-400">No active share links yet.</p>}
      <div className="space-y-1">
        {active.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 text-xs">
            <span className="text-gray-600">{r.label || 'Untitled'}</span>
            <div className="flex gap-2">
              <button onClick={() => copyLink(r.token)} className="text-indigo-500 hover:text-indigo-400">
                Copy link
              </button>
              <button onClick={() => revoke(r.id)} className="text-red-500 hover:text-red-400">
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
