'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { rMultiple } from '../lib/tradeMath';
import { formatMoney } from '../lib/format';
import TradeScreenshot from './TradeScreenshot';
import TradeSummaryCard from './TradeSummaryCard';

const EMOTIONS = ['disciplined', 'confident', 'hesitant', 'fomo', 'revenge', 'bored', 'anxious'];
const RULE_OPTIONS = [
  { value: '', label: '— none —' },
  { value: 'followed_plan', label: 'Followed plan' },
  { value: 'impulse_entry', label: 'Impulse entry' },
  { value: 'moved_stop', label: 'Moved stop' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'other', label: 'Other deviation' },
];

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
  risk_amount: '',
  tags: '',
  emotion: '',
  notes: '',
  account_id: '',
  rule_adherence: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function DayPanel({ date, trades, userId, accounts = [], defaultRiskAmount, activeAccountId = null, onChanged, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewingTrade, setViewingTrade] = useState(null);

  const [dailyNote, setDailyNote] = useState('');
  const [dailyNoteId, setDailyNoteId] = useState(null);
  const [dailyNotePinned, setDailyNotePinned] = useState(false);
  const [dailyEmotion, setDailyEmotion] = useState('');
  const [savingDaily, setSavingDaily] = useState(false);

  useEffect(() => {
    if (date) {
      setEditingId(null);
      setForm({ ...emptyForm, entry_time: `${format(date, 'yyyy-MM-dd')}T09:30` });
      setError('');

      const dateStr = format(date, 'yyyy-MM-dd');
      let query = supabase.from('daily_notes').select('*').eq('user_id', userId).eq('note_date', dateStr);
      query = activeAccountId ? query.eq('broker_connection_id', activeAccountId) : query.is('broker_connection_id', null);

      query.maybeSingle().then(({ data }) => {
        setDailyNote(data?.content || '');
        setDailyNoteId(data?.id || null);
        setDailyNotePinned(data?.pinned || false);
        setDailyEmotion(data?.emotion || '');
      });
    }
  }, [date, userId, activeAccountId]);

  if (!date) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-gray-400 text-sm">
        Select a day on the calendar to view or log trades.
      </div>
    );
  }

  async function handleSaveDailyNote() {
    setSavingDaily(true);
    const dateStr = format(date, 'yyyy-MM-dd');

    if (dailyNoteId) {
      const { error } = await supabase
        .from('daily_notes')
        .update({
          content: dailyNote,
          pinned: dailyNotePinned,
          emotion: dailyEmotion || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dailyNoteId);
      if (error) setError(error.message);
    } else {
      const { data, error } = await supabase
        .from('daily_notes')
        .insert({
          user_id: userId,
          note_date: dateStr,
          content: dailyNote,
          pinned: dailyNotePinned,
          emotion: dailyEmotion || null,
          broker_connection_id: activeAccountId,
        })
        .select()
        .single();
      if (error) setError(error.message);
      else if (data) setDailyNoteId(data.id);
    }
    setSavingDaily(false);
  }

  async function toggleDailyNotePin() {
    const next = !dailyNotePinned;
    setDailyNotePinned(next);
    if (dailyNoteId) {
      await supabase.from('daily_notes').update({ pinned: next }).eq('id', dailyNoteId);
    }
  }

  async function toggleTradePin(trade) {
    await supabase.from('trades').update({ pinned: !trade.pinned }).eq('id', trade.id);
    onChanged();
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
      risk_amount: trade.risk_amount ?? '',
      tags: Array.isArray(trade.tags) ? trade.tags.join(', ') : '',
      emotion: trade.emotion ?? '',
      notes: trade.notes ?? '',
      account_id: trade.broker_connection_id ?? '',
      rule_adherence: trade.rule_adherence ?? '',
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, entry_time: `${format(date, 'yyyy-MM-dd')}T09:30`, account_id: activeAccountId || '' });
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
      risk_amount: form.risk_amount === '' ? null : parseFloat(form.risk_amount),
      tags: tagsArray.length ? tagsArray : null,
      emotion: form.emotion || null,
      notes: form.notes,
      broker_connection_id: form.account_id || null,
      rule_adherence: form.rule_adherence || null,
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
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{format(date, 'EEEE, MMM d, yyyy')}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">
          Close
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-purple-700">
            Daily Note {activeAccountId ? '' : '(general)'}
          </span>
          <button
            onClick={toggleDailyNotePin}
            className={`text-lg ${dailyNotePinned ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
            title={dailyNotePinned ? 'Unpin' : 'Pin'}
          >
            {dailyNotePinned ? '★' : '☆'}
          </button>
        </div>

        <label className="block text-[10px] text-purple-500 mb-1">How did you feel today overall?</label>
        <select
          value={dailyEmotion}
          onChange={(e) => setDailyEmotion(e.target.value)}
          className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-900 mb-2"
        >
          <option value="">— none —</option>
          {EMOTIONS.map((em) => (
            <option key={em} value={em}>
              {em}
            </option>
          ))}
        </select>

        <textarea
          value={dailyNote}
          onChange={(e) => setDailyNote(e.target.value)}
          placeholder="How did the day feel overall? Market context, mindset, lessons..."
          rows={3}
          className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-900 mb-2"
        />
        <button
          onClick={handleSaveDailyNote}
          disabled={savingDaily}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          {savingDaily ? 'Saving...' : 'Save Daily Note'}
        </button>
      </div>

      {trades.length > 0 && (
        <div className="space-y-2 mb-5">
          {trades.map((t) => {
            const r = rMultiple(t, defaultRiskAmount);
            return (
              <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="cursor-pointer" onClick={() => setViewingTrade(t)}>
                    <span className="font-medium text-gray-900">{t.symbol}</span>{' '}
                    <span className="text-gray-400">{t.direction}</span>
                  </div>
                  <div className={`font-semibold ${t.pnl > 0 ? 'text-green-600' : t.pnl < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {formatMoney(Number(t.pnl))}
                    {r !== null && <span className="text-gray-400 font-normal ml-1">({r >= 0 ? '+' : ''}{r.toFixed(2)}R)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTradePin(t)}
                      className={`text-base ${t.pinned ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
                      title={t.pinned ? 'Unpin' : 'Pin'}
                    >
                      {t.pinned ? '★' : '☆'}
                    </button>
                    <button onClick={() => startEdit(t)} className="text-indigo-600 hover:text-indigo-500 text-xs">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-400 text-xs">
                      Delete
                    </button>
                  </div>
                </div>
                {(t.tags?.length > 0 || t.emotion || t.rule_adherence) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {t.emotion && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {t.emotion}
                      </span>
                    )}
                    {t.rule_adherence && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          t.rule_adherence === 'followed_plan' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {RULE_OPTIONS.find((o) => o.value === t.rule_adherence)?.label || t.rule_adherence}
                      </span>
                    )}
                    {t.tags?.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {t.notes && <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{t.notes}</p>}
                <TradeScreenshot trade={t} userId={userId} onUpdated={onChanged} />
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {accounts.length > 0 && (
          <Field label="Account">
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Manual (no account)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.broker_server} ({a.mt5_login})
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Symbol">
            <input
              placeholder="e.g. EURUSD"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
          <Field label="Direction">
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
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
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
          <Field label="Exit price">
            <input
              type="number"
              step="any"
              value={form.exit_price}
              onChange={(e) => setForm({ ...form, exit_price: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
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
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
          <Field label="Take profit">
            <input
              type="number"
              step="any"
              value={form.take_profit}
              onChange={(e) => setForm({ ...form, take_profit: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
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
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
          <Field label="P&L">
            <input
              type="number"
              step="any"
              value={form.pnl}
              onChange={(e) => setForm({ ...form, pnl: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
        </div>

        <Field label={`Risk amount ($) — optional, overrides default${defaultRiskAmount ? ` ($${defaultRiskAmount})` : ''} and price-based calc`}>
          <input
            type="number"
            step="any"
            placeholder={defaultRiskAmount ? `Using default: ${defaultRiskAmount}` : 'e.g. 20'}
            value={form.risk_amount}
            onChange={(e) => setForm({ ...form, risk_amount: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry time">
            <input
              type="datetime-local"
              value={form.entry_time}
              onChange={(e) => setForm({ ...form, entry_time: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
          <Field label="Exit time">
            <input
              type="datetime-local"
              value={form.exit_time}
              onChange={(e) => setForm({ ...form, exit_time: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
            />
          </Field>
        </div>

        <Field label="Rule adherence — did you follow your plan?">
          <select
            value={form.rule_adherence}
            onChange={(e) => setForm({ ...form, rule_adherence: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          >
            {RULE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Trade emotion / mindset (optional, separate from the day's overall mood above)">
          <select
            value={form.emotion}
            onChange={(e) => setForm({ ...form, emotion: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
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
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          />
        </Field>

        <Field label="Trade note">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="What was your setup, reasoning, execution?"
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900"
          />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium"
          >
            {saving ? 'Saving...' : editingId ? 'Update Trade' : 'Add Trade'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 rounded-xl border border-gray-300 text-sm text-gray-600">
              Cancel
            </button>
          )}
        </div>
      </form>

      <TradeSummaryCard trade={viewingTrade} defaultRiskAmount={defaultRiskAmount} onClose={() => setViewingTrade(null)} />
    </div>
  );
}
