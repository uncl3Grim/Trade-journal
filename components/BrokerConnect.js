'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function BrokerConnect({ onConnected }) {
  const [server, setServer] = useState('');
  const [login, setLogin] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Not signed in');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/broker/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ server, login, investorPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      setSuccess('Connected! It may take a minute to come online before you can sync.');
      setServer('');
      setLogin('');
      setInvestorPassword('');
      onConnected?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h2 className="font-semibold mb-1">Connect MT5 Account</h2>
      <p className="text-xs text-gray-500 mb-4">
        Uses your investor (read-only) password — never your main trading password. Your account can
        only be viewed, not traded on.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Broker server (e.g. ICMarkets-Live05)"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="MT5 login number"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Investor password"
          type="password"
          value={investorPassword}
          onChange={(e) => setInvestorPassword(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2 text-sm font-medium"
        >
          {loading ? 'Connecting...' : 'Connect Account'}
        </button>
      </form>
    </div>
  );
}
