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
      <p className="text-xs text-gray-400">
        Uses your investor (read-only) password. Requires a small paid MetaApi balance to stay
        deployed.
      </p>
      <input
        placeholder="Broker server (e.g. ICMarkets-Live05)"
        value={server}
        onChange={(e) => setServer(e.target.value)}
        required
        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
      />
      <input
        placeholder="MT5 login number"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        required
        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
      />
      <input
        placeholder="Investor password"
        type="password"
        value={investorPassword}
        onChange={(e) => setInvestorPassword(e.target.value)}
        required
        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium"
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
  const [accountChoices, setAccountChoices] = useState(null);
  const [chosenAccountId, setChosenAccountId] = useState('');

  async function submitConnect(accountId) {
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
        body: JSON.stringify({ email, password, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      if (data.needsSelection) {
        setAccountChoices(data.accounts);
        setLoading(false);
        return;
      }

      setSuccess(`Connected to ${data.accountName || 'MyFXBook'}! Tap Sync Now to pull trades.`);
      setAccountChoices(null);
      setChosenAccountId('');
      onConnected?.();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitConnect(undefined);
  }

  function handleChooseAccount() {
    if (!chosenAccountId) return;
    submitConnect(chosenAccountId);
  }

  if (accountChoices) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          This MyFXBook login has multiple accounts. Pick which one to connect — you can repeat
          this to add the other one too.
        </p>
        {accountChoices.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl cursor-pointer"
          >
            <input
              type="radio"
              name="account"
              value={a.id}
              checked={chosenAccountId === String(a.id)}
              onChange={() => setChosenAccountId(String(a.id))}
            />
            <span className="text-sm text-gray-700">
              {a.name} — {a.server}
            </span>
          </label>
        ))}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleChooseAccount}
            disabled={loading || !chosenAccountId}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium"
          >
            {loading ? 'Connecting...' : 'Connect This Account'}
          </button>
          <button
            onClick={() => setAccountChoices(null)}
            className="px-4 rounded-xl border border-gray-300 text-sm text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-400">
        Free alternative to MetaApi — uses your MyFXBook.com login (not your MT5 password). Make
        sure your MT5 account is already added and syncing on myfxbook.com first. If you have
        multiple MT5 accounts under one MyFXBook login, connect them one at a time.
      </p>
      <input
        placeholder="MyFXBook email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
      />
      <input
        placeholder="MyFXBook password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium"
      >
        {loading ? 'Connecting...' : 'Connect Account'}
      </button>
    </form>
  );
}

export default function BrokerConnect({ onConnected }) {
  const [tab, setTab] = useState('myfxbook');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
      <h2 className="font-semibold mb-3 text-gray-900">Connect Broker</h2>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('myfxbook')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
            tab === 'myfxbook' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          MyFXBook (free)
        </button>
        <button
          onClick={() => setTab('mt5')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
            tab === 'mt5' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
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
