'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function Mt5Form({ onConnected }) {
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-500">
        Uses your investor (read-only) password. Requires a small paid MetaApi balance to stay
        deployed.
      </p>
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
  );
}

function MyfxbookForm({ onConnected }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await fetch('/api/broker/connect-myfxbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      setSuccess(`Connected to ${data.accountName || 'MyFXBook'}! Tap Sync Now to pull trades.`);
      setEmail('');
      setPassword('');
      onConnected?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-500">
        Free alternative to MetaApi — uses your MyFXBook.com login (not your MT5 password). Make
        sure your MT5 account is already added and syncing on myfxbook.com first.
      </p>
      <input
        placeholder="MyFXBook email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
      />
      <input
        placeholder="MyFXBook password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
  );
}

export default function BrokerConnect({ onConnected }) {
  const [tab, setTab] = useState('myfxbook');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
      <h2 className="font-semibold mb-3">Connect Broker</h2>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('myfxbook')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            tab === 'myfxbook' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          MyFXBook (free)
        </button>
        <button
          onClick={() => setTab('mt5')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            tab === 'mt5' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          MT5 direct (MetaApi)
        </button>
      </div>

      {tab === 'myfxbook' ? (
        <MyfxbookForm onConnected={onConnected} />
      ) : (
        <Mt5Form onConnected={onConnected} />
      )}
    </div>
  );
}
