'use client';

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabaseClient';
import { Alert } from './Notice';
import { MethodIntro, fieldClass, labelClass, primaryBtn, ghostBtn } from './broker/ui';
import {
  detectFormat,
  convertOrderLevelRows,
  convertMyfxbookStatementRows,
  convertRMultipleModelRows,
} from '../lib/csvFormats';

// Postgres returns timestamps in a different string format than what we
// send in (e.g. "+00:00" vs ".000Z") — same instant, different text. Compare
// by parsed value, not raw string, or existing rows won't be recognized.
function timeKey(value) {
  const t = new Date(value).getTime();
  return isNaN(t) ? String(value) : t;
}

function toISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Formats where entry_time/exit_time are already full ISO strings produced
// by the converter itself (so they should NOT be re-parsed with toISO).
const RAW_DATE_FORMATS = ['order_level', 'myfxbook_statement', 'r_multiple_model'];

export default function ImportCSV({ userId, onImported }) {
  const [status, setStatus] = useState(null); // { type: 'info' | 'success' | 'error', text }
  const [busy, setBusy] = useState(false);
  const [csvAccounts, setCsvAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  // Set only for formats that need extra input (currently: R-multiple model
  // backtests, which have no dollar values at all) before we can actually
  // build and save trades.
  const [pendingRMultiple, setPendingRMultiple] = useState(null); // { rawRows, accountId, sampleR }
  const [dollarPerR, setDollarPerR] = useState('');

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

  // Shared save path: takes already-normalized rows (fields: symbol,
  // direction, entry_price, exit_price, size, entry_time, exit_time, pnl,
  // stop_loss, take_profit, risk_amount, notes, ticket) and does the
  // validate -> lookup-existing -> insert/update dance, then reports status.
  async function finalizeImport(normalizedRows, usesRawDates, accountId, detected) {
    let skipped = 0;
    const trades = [];

    for (const r of normalizedRows) {
      if (!r.symbol || !r.entry_price) {
        skipped++;
        continue;
      }
      const entryTime = usesRawDates ? r.entry_time : toISO(r.entry_time) || new Date().toISOString();
      const exitTime = usesRawDates ? r.exit_time || null : r.exit_time ? toISO(r.exit_time) : null;

      const entryPrice = parseFloat(r.entry_price);
      if (isNaN(entryPrice) || !entryTime) {
        skipped++;
        continue;
      }

      trades.push({
        user_id: userId,
        symbol: String(r.symbol).toUpperCase().trim(),
        direction: (r.direction || 'long').toString().toLowerCase().trim() === 'short' ? 'short' : 'long',
        entry_price: entryPrice,
        exit_price: r.exit_price !== '' && r.exit_price !== null && r.exit_price !== undefined ? parseFloat(r.exit_price) : null,
        size: parseFloat(r.size || 0) || 0,
        entry_time: entryTime,
        exit_time: exitTime,
        pnl: r.pnl ? parseFloat(r.pnl) : 0,
        stop_loss: r.stop_loss ? parseFloat(r.stop_loss) : null,
        take_profit: r.take_profit ? parseFloat(r.take_profit) : null,
        ...(r.risk_amount ? { risk_amount: parseFloat(r.risk_amount) } : {}),
        ...(r.notes ? { notes: r.notes } : {}),
        ...(r.ticket ? { broker_ticket: String(r.ticket) } : {}),
        source: 'csv_import',
        broker_connection_id: accountId,
      });
    }

    if (trades.length === 0) {
      setStatus({
        type: 'error',
        text: `No valid rows found (${skipped} skipped, detected format: ${detected}). Check your CSV matches the template or a supported broker export.`,
      });
      setBusy(false);
      return;
    }

    // A trade's own broker ticket is the true identity when present;
    // otherwise symbol+time is the identity. The table enforces BOTH
    // as separate unique constraints, so we can't resolve conflicts
    // with a single ON CONFLICT target — a ticketed row can silently
    // collide with an existing ticket-less row (or vice versa) on the
    // OTHER constraint, which ON CONFLICT can't catch. Instead, look
    // up existing matches first and split into explicit insert/update.
    let existingQuery = supabase
      .from('trades')
      .select('id, symbol, entry_time, broker_ticket')
      .eq('user_id', userId);
    existingQuery = accountId
      ? existingQuery.eq('broker_connection_id', accountId)
      : existingQuery.is('broker_connection_id', null);
    const { data: existingRows, error: lookupError } = await existingQuery;
    if (lookupError) {
      setStatus({ type: 'error', text: `Error saving to database: ${lookupError.message}` });
      setBusy(false);
      return;
    }

    const byTicket = new Map();
    const bySymbolTime = new Map();
    for (const row of existingRows || []) {
      if (row.broker_ticket) byTicket.set(row.broker_ticket, row.id);
      bySymbolTime.set(`${row.symbol}||${timeKey(row.entry_time)}`, row.id);
    }

    // Collapse exact duplicates within the file itself (same resolved
    // identity), keeping the last occurrence — a row can only be
    // inserted/updated once per statement.
    const seen = new Map();
    for (const t of trades) {
      const existingId =
        (t.broker_ticket && byTicket.get(t.broker_ticket)) ||
        bySymbolTime.get(`${t.symbol}||${timeKey(t.entry_time)}`) ||
        null;
      const key = existingId ? `id:${existingId}` : `new:${t.broker_ticket || `${t.symbol}||${timeKey(t.entry_time)}`}`;
      seen.set(key, existingId ? { ...t, id: existingId } : t);
    }
    const finalTrades = Array.from(seen.values());
    const collapsedCount = trades.length - finalTrades.length;

    const toInsert = finalTrades.filter((t) => !t.id);
    const toUpdate = finalTrades.filter((t) => t.id);

    let affectedCount = 0;
    let dbError = null;

    if (toInsert.length) {
      const { error, data } = await supabase.from('trades').insert(toInsert).select();
      if (error) dbError = error;
      else affectedCount += data?.length ?? toInsert.length;
    }

    if (!dbError && toUpdate.length) {
      const { error, data } = await supabase
        .from('trades')
        .upsert(toUpdate, { onConflict: 'id' })
        .select();
      if (error) dbError = error;
      else affectedCount += data?.length ?? toUpdate.length;
    }

    setBusy(false);
    if (dbError) {
      setStatus({ type: 'error', text: `Error saving to database: ${dbError.message}` });
    } else {
      const formatLabel = detected !== 'template' ? ` (auto-converted, format: ${detected})` : '';
      setStatus({
        type: 'success',
        text: `${affectedCount} trade(s) imported or updated${formatLabel}.${
          collapsedCount > 0 ? ` ${collapsedCount} exact duplicate row(s) in the file were merged.` : ''
        }${skipped > 0 ? ` ${skipped} row(s) skipped for missing/invalid data.` : ''}`,
      });
      onImported?.();
    }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setStatus({ type: 'info', text: 'Parsing…' });
    setPendingRMultiple(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const accountId = await resolveAccountId();
          const rawRows = results.data;
          const headers = results.meta.fields || [];
          const detected = detectFormat(headers);

          // This format has no dollar values at all — pause and ask for a
          // $-per-1R value before we can build any trades from it.
          if (detected === 'r_multiple_model') {
            setBusy(false);
            setStatus({
              type: 'info',
              text: 'This file only has R-multiples, no dollar amounts — enter a $ value per 1R below to continue.',
            });
            setPendingRMultiple({ rawRows, accountId });
            e.target.value = '';
            return;
          }

          let normalizedRows;
          if (detected === 'order_level') {
            normalizedRows = convertOrderLevelRows(rawRows);
          } else if (detected === 'myfxbook_statement') {
            normalizedRows = convertMyfxbookStatementRows(rawRows);
          } else {
            normalizedRows = rawRows.map((r) => {
              const lower = {};
              for (const k in r) lower[k.trim().toLowerCase()] = r[k];
              return lower;
            });
          }

          const usesRawDates = RAW_DATE_FORMATS.includes(detected);
          await finalizeImport(normalizedRows, usesRawDates, accountId, detected);
        } catch (err) {
          setBusy(false);
          setStatus({ type: 'error', text: err.message });
        }
        e.target.value = '';
      },
      error: (err) => {
        setBusy(false);
        setStatus({ type: 'error', text: `Error parsing file: ${err.message}` });
      },
    });
  }

  async function confirmRMultipleImport() {
    if (!pendingRMultiple || !dollarPerR) return;
    setBusy(true);
    setStatus({ type: 'info', text: 'Importing…' });
    try {
      const normalizedRows = convertRMultipleModelRows(pendingRMultiple.rawRows, dollarPerR);
      await finalizeImport(normalizedRows, true, pendingRMultiple.accountId, 'r_multiple_model');
    } catch (err) {
      setBusy(false);
      setStatus({ type: 'error', text: err.message });
    }
    setPendingRMultiple(null);
    setDollarPerR('');
  }

  return (
    <div className="space-y-4">
      <MethodIntro
        title="Import a CSV"
        what="Upload a trade history file and we convert it for you. Importing the same file twice is safe: existing trades are updated, never duplicated."
        need="A CSV from our template, TradingView, Alchemy Markets, or a MyFXBook statement. The format is detected automatically."
      />

      <div>
        <label className={labelClass} htmlFor="csv-account">Import into</label>
        {!creatingNew ? (
          <select
            id="csv-account"
            value={selectedAccountId}
            onChange={(e) => {
              if (e.target.value === '__new__') setCreatingNew(true);
              else setSelectedAccountId(e.target.value);
            }}
            className={fieldClass}
          >
            <option value="">No account (unassigned)</option>
            {csvAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.broker_server}</option>
            ))}
            <option value="__new__">+ New CSV account…</option>
          </select>
        ) : (
          <div className="flex gap-2 bk-swap">
            <input
              autoFocus
              aria-label="New account name"
              placeholder="e.g. Prop firm challenge 1"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              className={`flex-1 ${fieldClass}`}
            />
            <button
              onClick={() => {
                setCreatingNew(false);
                setNewAccountName('');
              }}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`cursor-pointer inline-flex items-center gap-2 ${primaryBtn} ${busy ? 'opacity-40 pointer-events-none' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" />
          </svg>
          {busy ? 'Working…' : 'Choose CSV file'}
          <input
            type="file"
            accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain"
            onChange={handleFile}
            disabled={busy}
            className="hidden"
          />
        </label>
        <button onClick={downloadTemplate} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">
          Download the template
        </button>
      </div>

      {pendingRMultiple && (
        <div className="bk-swap bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
          <label className="block text-sm text-indigo-200 font-medium mb-1" htmlFor="csv-r">
            What is 1R worth in dollars?
          </label>
          <p className="text-xs text-indigo-300/70 mb-3">
            This file only has R-multiples. We multiply each trade's R by this amount to get its dollar P&L.
          </p>
          <div className="flex gap-2">
            <input
              id="csv-r"
              type="number"
              step="any"
              autoFocus
              placeholder="e.g. 200"
              value={dollarPerR}
              onChange={(e) => setDollarPerR(e.target.value)}
              className={`flex-1 ${fieldClass}`}
            />
            <button onClick={confirmRMultipleImport} disabled={!dollarPerR || busy} className={primaryBtn}>
              {busy ? 'Importing…' : 'Import'}
            </button>
            <button
              onClick={() => {
                setPendingRMultiple(null);
                setDollarPerR('');
                setStatus(null);
              }}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status && <Alert type={status.type}>{status.text}</Alert>}
    </div>
  );
}
