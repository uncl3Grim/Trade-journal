'use client';

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';

function toISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function ImportCSV({ userId, onImported }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [csvAccounts, setCsvAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  const loadCsvAccounts = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('broker_connections')
      .select('id, broker_server')
      .eq('broker_type', 'csv')
      .order('created_at', { ascending: true });
    setCsvAccounts(data || []);
  }, [userId]);

  useEffect(() => {
    loadCsvAccounts();
  }, [loadCsvAccounts]);

  function downloadTemplate() {
    const template =
      'symbol,direction,entry_price,exit_price,size,entry_time,exit_time,pnl,notes\n' +
      'EURUSD,long,1.0850,1.0872,0.5,2026-07-01T09:30,2026-07-01T10:15,110.00,Good trend entry\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade-journal-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function resolveAccountId() {
    if (creatingNew) {
      const name = newAccountName.trim();
      if (!name) throw new Error('Please enter a name for the new account.');
      const { data, error } = await supabase
        .from('broker_connections')
        .insert({
          user_id: userId,
          broker_type: 'csv',
          broker_server: name,
          mt5_login: 'CSV import',
          status: 'manual',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await loadCsvAccounts();
      setCreatingNew(false);
      setNewAccountName('');
      setSelectedAccountId(data.id);
      return data.id;
    }
    return selectedAccountId || null;
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setStatus('Parsing...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: async (results) => {
        try {
          const accountId = await resolveAccountId();

          const rows = results.data;
          let skipped = 0;
          const trades = [];

          for (const r of rows) {
            if (!r.symbol || !r.entry_price) {
              skipped++;
              continue;
            }
            const entryTime = toISO(r.entry_time) || new Date().toISOString();
            const exitTime = r.exit_time ? toISO(r.exit_time) : null;

            const entryPrice = parseFloat(r.entry_price);
            if (isNaN(entryPrice)) {
              skipped++;
              continue;
            }

            trades.push({
              user_id: userId,
              symbol: String(r.symbol).toUpperCase().trim(),
              direction: (r.direction || 'long').toLowerCase().trim() === 'short' ? 'short' : 'long',
              entry_price: entryPrice,
              exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
              size: parseFloat(r.size || 0) || 0,
              entry_time: entryTime,
              exit_time: exitTime,
              pnl: r.pnl ? parseFloat(r.pnl) : 0,
              notes: r.notes || '',
              source: 'csv_import',
              broker_connection_id: accountId,
            });
          }

          if (trades.length === 0) {
            setStatus(
              `No valid rows found (${skipped} skipped). Check your CSV matches the template — symbol and entry_price are required.`
            );
            setBusy(false);
            e.target.value = '';
            return;
          }

          const { error, data: inserted } = await supabase
            .from('trades')
            .upsert(trades, { onConflict: 'user_id,symbol,entry_time,broker_connection_id', ignoreDuplicates: true })
            .select();

          setBusy(false);
          if (error) {
            setStatus(`Error saving to database: ${error.message}`);
          } else {
            const addedCount = inserted?.length ?? trades.length;
            const dupeCount = trades.length - addedCount;
            setStatus(
              `${addedCount} new trade(s) added.${dupeCount > 0 ? ` ${dupeCount} already existed and were skipped.` : ''}${
                skipped > 0 ? ` ${skipped} row(s) skipped for missing/invalid data.` : ''
              }`
            );
            onImported?.();
          }
        } catch (err) {
          setBusy(false);
          setStatus(`Error: ${err.message}`);
        }
        e.target.value = '';
      },
      error: (err) => {
        setBusy(false);
        setStatus(`Error parsing file: ${err.message}`);
      },
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
      <h2 className="font-semibold mb-1 text-gray-900">Import trades</h2>
      <p className="text-xs text-gray-400 mb-3">
        Upload a CSV of your trades. Required columns: <code>symbol</code>, <code>entry_price</code>. Dates should
        look like <code>2026-07-01T09:30</code>. Re-importing the same file is safe — existing trades won't be
        duplicated. Import into a named account rather than leaving it unassigned for the safest deduping.
      </p>

      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Import into account</label>
        {!creatingNew ? (
          <select
            value={selectedAccountId}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setCreatingNew(true);
              } else {
                setSelectedAccountId(e.target.value);
              }
            }}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          >
            <option value="">No account (unassigned)</option>
            {csvAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.broker_server}
              </option>
            ))}
            <option value="__new__">+ Create new account...</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              placeholder="e.g. Prop Firm Challenge 1"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
            <button
              onClick={() => {
                setCreatingNew(false);
                setNewAccountName('');
              }}
              className="px-3 rounded-xl border border-gray-300 text-sm text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700">
          Choose CSV file
          <input type="file" accept=".csv" onChange={handleFile} disabled={busy} className="hidden" />
        </label>
        <button onClick={downloadTemplate} className="text-sm text-indigo-600 hover:text-indigo-500">
          Download template
        </button>
      </div>
      {status && <p className="text-sm text-gray-500 mt-2">{status}</p>}
    </div>
  );
}
