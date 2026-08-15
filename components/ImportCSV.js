'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';

export default function ImportCSV({ userId, onImported }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

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
        const rows = results.data;
        const trades = rows
          .filter((r) => r.symbol && r.entry_price)
          .map((r) => ({
            user_id: userId,
            symbol: String(r.symbol).toUpperCase(),
            direction: (r.direction || 'long').toLowerCase() === 'short' ? 'short' : 'long',
            entry_price: parseFloat(r.entry_price),
            exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
            size: parseFloat(r.size || 0),
            entry_time: r.entry_time ? new Date(r.entry_time).toISOString() : new Date().toISOString(),
            exit_time: r.exit_time ? new Date(r.exit_time).toISOString() : null,
            pnl: r.pnl ? parseFloat(r.pnl) : 0,
            notes: r.notes || '',
            source: 'csv_import',
          }));

        if (trades.length === 0) {
          setStatus('No valid rows found. Check your CSV matches the template.');
          setBusy(false);
          return;
        }

        const { error } = await supabase.from('trades').insert(trades);
        setBusy(false);
        if (error) {
          setStatus(`Error: ${error.message}`);
        } else {
          setStatus(`Imported ${trades.length} trade(s).`);
          onImported();
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
        Upload a CSV of your trades (works with an MT5 history export reformatted to the template below).
      </p>
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
