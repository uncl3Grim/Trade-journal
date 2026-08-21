'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { applyAccountFilter } from '../lib/accountFilter';

function accountLabel(accounts, id) {
  if (!id) return 'Manual';
  const a = accounts.find((acc) => acc.id === id);
  return a ? a.broker_server : 'Unknown account';
}

function NoteCard({ item, accounts, onTogglePin }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        item.pinned ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              item.type === 'trade' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
            }`}
          >
            {item.type === 'trade' ? item.title : 'Daily note'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {accountLabel(accounts, item.accountId)}
          </span>
          <span className="text-xs text-gray-400">{format(new Date(item.date), 'MMM d, yyyy')}</span>
        </div>
        <button
          onClick={onTogglePin}
          className={`text-lg leading-none ${item.pinned ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
          title={item.pinned ? 'Unpin' : 'Pin'}
        >
          {item.pinned ? '★' : '☆'}
        </button>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.content}</p>
    </div>
  );
}

export default function NotesView({ userId, accountFilter, accounts = [] }) {
  const [tradeNotes, setTradeNotes] = useState([]);
  const [dailyNotes, setDailyNotes] = useState([]);
  const [pinnedTradeNotes, setPinnedTradeNotes] = useState([]);
  const [pinnedDailyNotes, setPinnedDailyNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let tradesQuery = supabase
      .from('trades')
      .select('id, symbol, entry_time, notes, pinned, broker_connection_id')
      .not('notes', 'is', null)
      .neq('notes', '')
      .eq('pinned', false)
      .order('entry_time', { ascending: false });
    let dailyQuery = supabase
      .from('daily_notes')
      .select('*')
      .eq('pinned', false)
      .order('note_date', { ascending: false });

    if (accountFilter) {
      tradesQuery = applyAccountFilter(tradesQuery, accountFilter);
      dailyQuery = applyAccountFilter(dailyQuery, accountFilter);
    }

    // Pinned notes always show regardless of the current account filter.
    const pinnedTradesQuery = supabase
      .from('trades')
      .select('id, symbol, entry_time, notes, pinned, broker_connection_id')
      .not('notes', 'is', null)
      .neq('notes', '')
      .eq('pinned', true)
      .order('entry_time', { ascending: false });
    const pinnedDailyQuery = supabase
      .from('daily_notes')
      .select('*')
      .eq('pinned', true)
      .order('note_date', { ascending: false });

    const [tradesRes, dailyRes, pinnedTradesRes, pinnedDailyRes] = await Promise.all([
      tradesQuery,
      dailyQuery,
      pinnedTradesQuery,
      pinnedDailyQuery,
    ]);

    setTradeNotes(tradesRes.data || []);
    setDailyNotes(dailyRes.data || []);
    setPinnedTradeNotes(pinnedTradesRes.data || []);
    setPinnedDailyNotes(pinnedDailyRes.data || []);
    setLoading(false);
  }, [userId, accountFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleTradePin(id, current) {
    await supabase.from('trades').update({ pinned: !current }).eq('id', id);
    load();
  }

  async function toggleDailyPin(id, current) {
    await supabase.from('daily_notes').update({ pinned: !current }).eq('id', id);
    load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading notes...</p>;

  function toItems(tradeList, dailyList) {
    return [
      ...tradeList.map((t) => ({
        type: 'trade',
        id: t.id,
        date: t.entry_time,
        pinned: t.pinned,
        title: t.symbol,
        content: t.notes,
        accountId: t.broker_connection_id,
      })),
      ...dailyList
        .filter((d) => d.content)
        .map((d) => ({
          type: 'daily',
          id: d.id,
          date: d.note_date,
          pinned: d.pinned,
          title: 'Daily note',
          content: d.content,
          accountId: d.broker_connection_id,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const pinned = toItems(pinnedTradeNotes, pinnedDailyNotes);
  const rest = toItems(tradeNotes, dailyNotes);

  if (pinned.length === 0 && rest.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
        <div className="text-3xl mb-2">📝</div>
        <p className="text-gray-400 text-sm">No notes yet — add one from the Calendar tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pinned.length > 0 && (
        <div>
          <div className="sticky top-0 z-10 bg-[#f7f7fb] py-2 flex items-center gap-2 mb-2">
            <span className="text-yellow-500">★</span>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pinned (all accounts)
            </h3>
          </div>
          <div className="space-y-3">
            {pinned.map((item) => (
              <NoteCard
                key={`${item.type}-${item.id}`}
                item={item}
                accounts={accounts}
                onTogglePin={() =>
                  item.type === 'trade' ? toggleTradePin(item.id, item.pinned) : toggleDailyPin(item.id, item.pinned)
                }
              />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              All notes (current account selection)
            </h3>
          )}
          <div className="space-y-3">
            {rest.map((item) => (
              <NoteCard
                key={`${item.type}-${item.id}`}
                item={item}
                accounts={accounts}
                onTogglePin={() =>
                  item.type === 'trade' ? toggleTradePin(item.id, item.pinned) : toggleDailyPin(item.id, item.pinned)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
