'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { rMultiple } from '../lib/tradeMath';

const EMOTIONS = ['disciplined', 'confident', 'hesitant', 'fomo', 'revenge', 'bored', 'anxious'];

const emptyForm = {
  symbol: '',
  direction: 'long',
  entry_price: '',
  exit_price: '',
  size: '',
  entry_time: '',
  exit_time: '',
  pnl: '',
  stop_loss: '',
  take_profit: '',
  tags: '',
  emotion: '',
  notes: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function DayPanel({ date, trades, userId, onChanged, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!date) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-gray-500 text-sm">
        Select a day on the calendar to view or log trades.
      </div>
    );
  }

  function startEdit(trade) {
    setEditingId(trade.id);
    setForm({
      symbol: trade.symbol,
      direction: trade.direction,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price ?? '',
      size: trade.size,
      entry_time: trade.entry_time ? trade.entry_time.slice(0, 16) : '',
      exit_time: trade.exit_time ? trade.exit_time.slice(0, 16) : '',
      pnl: trade.pnl,
      stop_loss: trade.stop_loss ?? '',
      take_profit: trade.take_profit ?? '',
      tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : '',
      emotion: trade.emotion ?? '',
      notes: trade.notes ?? '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, entry_time: `${format(date, 'yyyy-MM-dd')}T09:30` });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      user_id: userId,
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price === '' ? null : parseFloat(form.exit_price),
      size: parseFloat(form.size),
      entry_time: form.entry_time ? new Date(form.entry_time).toISOString() : null,
      exit_time: form.exit_time ? new Date(form.exit_time).toISOString() : null,
      pnl: form.pnl === '' ? 0 : parseFloat(form.pnl),
      stop_loss: form.stop_loss === '' ? null : parseFloat(form.stop_loss),
      take_profit: form.take_profit === '' ? null : parseFloat(form.take_profit),
      tags: tagsArray.length ? tagsArray : null,
      emotion: form.emotion || null,
      notes: form.notes,
    };

    let res;
    if (editingId) {
      res = await supabase.from('trades').update(payload).eq('id', editingId);
    } else {
      res = await supabase.from('trades').insert(payload);
    }

    setSaving(false);
    if (res.error) {
      setError(res.error.message);
    } else {
      resetForm();
      onChanged();
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this trade?')) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error) onChanged();
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{format(date, 'EEEE, MMM d, yyyy')}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">
          Close
        </button>
      </div>

      {trades.length > 0 && (
        <div className="space-y-2 mb-5">
          {trades.map((t) => {
            const r = rMultiple(t);
            return (
              <div key={t.id} className="bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{t.symbol}</span>{' '}
                    <span className="text-gray-500">{t.direction}</span>
                  </div>
                  <div className={`font-semibold ${t.pnl > 0 ? 'text-green-400' : t.pnl < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {t.pnl > 0 ? '+' : ''}
                    {Number(t.pnl).toFixed(2)}
                    {r !== null && <span className="text-gray-500 font-normal ml-1">({r >= 0 ? '+' : ''}{r.toFixed(2)}R)</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(t)} className="text-blue-400 hover:text-blue-300 text-xs">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 text-xs">
                      Delete
                    </button>
                  </div>
                </div>
                {(t.tags?.length > 0 || t.emotion) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.emotion && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300">
                        {t.emotion}
                      </span>
                    )}
                    {t.tags?.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Symbol">
            <input
              placeholder="e.g. EURUSD"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Direction">
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry price">
            <input
              type="number"
              step="any"
              value={form.entry_price}
              onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Exit price">
            <input
              type="number"
              step="any"
              value={form.exit_price}
              onChange={(e) => setForm({ ...form, exit_price: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stop loss">
            <input
              type="number"
              step="any"
              value={form.stop_loss}
              onChange={(e) => setForm({ ...form, stop_loss: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Take profit">
            <input
              type="number"
              step="any"
              value={form.take_profit}
              onChange={(e) => setForm({ ...form, take_profit: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Size / lots">
            <input
              type="number"
              step="any"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="P&L">
            <input
              type="number"
              step="any"
              value={form.pnl}
              onChange={(e) => setForm({ ...form, pnl: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry time">
            <input
              type="datetime-local"
              value={form.entry_time}
              onChange={(e) => setForm({ ...form, entry_time: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Exit time">
            <input
              type="datetime-local"
              value={form.exit_time}
              onChange={(e) => setForm({ ...form, exit_time: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Field label="Emotion / mindset">
          <select
            value={form.emotion}
            onChange={(e) => setForm({ ...form, emotion: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— none —</option>
            {EMOTIONS.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags (comma separated)">
          <input
            placeholder="e.g. breakout, trend-following"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        <Field label="Notes / lessons learned">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2 text-sm font-medium"
          >
            {saving ? 'Saving...' : editingId ? 'Update Trade' : 'Add Trade'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 rounded-lg border border-gray-700 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
