'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

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
      supabase
        .from('daily_notes')
        .select('*')
        .order('note_date', { ascending: false }),
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
  ].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.date) - new Date(a.date);
  });

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm">No notes yet — add one from the Calendar tab.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.type}-${item.id}`} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${item.type === 'trade' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                {item.type === 'trade' ? item.title : 'Daily note'}
              </span>
              <span className="text-xs text-gray-400">{format(new Date(item.date), 'MMM d, yyyy')}</span>
            </div>
            <button
              onClick={() =>
                item.type === 'trade' ? toggleTradePin(item.id, item.pinned) : toggleDailyPin(item.id, item.pinned)
              }
              className={`text-lg ${item.pinned ? 'text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
              title={item.pinned ? 'Unpin' : 'Pin'}
            >
              {item.pinned ? '★' : '☆'}
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
        </div>
      ))}
    </div>
  );
}
