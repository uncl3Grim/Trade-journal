'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

function NoteCard({ item, onTogglePin }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition ${
        item.pinned ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              item.type === 'trade' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
            }`}
          >
            {item.type === 'trade' ? item.title : 'Daily note'}
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

export default function NotesView({ userId }) {
  const [tradeNotes, setTradeNotes] = useState([]);
  const [dailyNotes, setDailyNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [tradesRes, dailyRes] = await Promise.all([
      supabase
        .from('trades')
        .select('id, symbol, entry_time, notes, pinned')
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('entry_time', { ascending: false }),
      supabase.from('daily_notes').select('*').order('note_date', { ascending: false }),
    ]);

    setTradeNotes(tradesRes.data || []);
    setDailyNotes(dailyRes.data || []);
    setLoading(false);
  }, [userId]);

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

  const items = [
    ...tradeNotes.map((t) => ({
      type: 'trade',
      id: t.id,
      date: t.entry_time,
      pinned: t.pinned,
      title: t.symbol,
      content: t.notes,
    })),
    ...dailyNotes
      .filter((d) => d.content)
      .map((d) => ({
        type: 'daily',
        id: d.id,
        date: d.note_date,
        pinned: d.pinned,
        title: 'Daily note',
        content: d.content,
      })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const pinned = items.filter((i) => i.pinned);
  const rest = items.filter((i) => !i.pinned);

  if (items.length === 0) {
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
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pinned</h3>
          </div>
          <div className="space-y-3">
            {pinned.map((item) => (
              <NoteCard
                key={`${item.type}-${item.id}`}
                item={item}
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
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">All notes</h3>
          )}
          <div className="space-y-3">
            {rest.map((item) => (
              <NoteCard
                key={`${item.type}-${item.id}`}
                item={item}
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
