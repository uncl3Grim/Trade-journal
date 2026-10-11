'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { applyAccountFilter } from '../lib/accountFilter';

function accountLabel(accounts, id) {
  if (!id) return 'Manual';
  const a = accounts.find((acc) => acc.id === id);
  return a ? a.broker_server : 'Unknown account';
}

function safeDate(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

function NoteCard({ item, accounts, onTogglePin }) {
  const [open, setOpen] = useState(false);
  const long = (item.content || '').length > 260 || (item.content || '').split('\n').length > 4;
  const d = safeDate(item.date);
  const isTrade = item.type === 'trade';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl backdrop-blur-md border p-4 pl-5 transition hover-lift ${
        item.pinned ? 'bg-amber-400/[0.06] border-amber-400/25' : 'bg-white/[0.04] border-neutral-800/60'
      }`}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1 ${isTrade ? 'bg-indigo-400/70' : 'bg-violet-400/70'}`}
      />
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              isTrade
                ? 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20'
                : 'bg-violet-400/10 text-violet-300 border-violet-400/20'
            }`}
          >
            {isTrade ? item.title : 'Daily note'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-neutral-800/60 text-neutral-400">
            {accountLabel(accounts, item.accountId)}
          </span>
          <span className="text-xs text-neutral-500">{d ? format(d, 'MMM d, yyyy') : '—'}</span>
        </div>
        <button
          onClick={onTogglePin}
          className={`text-lg leading-none transition ${item.pinned ? 'text-amber-400' : 'text-neutral-600 hover:text-neutral-300'}`}
          title={item.pinned ? 'Unpin' : 'Pin'}
          aria-label={item.pinned ? 'Unpin note' : 'Pin note'}
        >
          {item.pinned ? '★' : '☆'}
        </button>
      </div>
      <p
        className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed"
        style={
          long && !open
            ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
            : undefined
        }
      >
        {item.content}
      </p>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1.5 text-xs text-indigo-300 hover:text-indigo-200">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

const GLASS = 'bg-white/[0.04] backdrop-blur-md border border-neutral-800/60';

export default function NotesView({ userId, accountFilter, accounts = [] }) {
  const [tradeNotes, setTradeNotes] = useState([]);
  const [dailyNotes, setDailyNotes] = useState([]);
  const [pinnedTradeNotes, setPinnedTradeNotes] = useState([]);
  const [pinnedDailyNotes, setPinnedDailyNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    let tradesQuery = supabase
      .from('trades')
      .select('id, symbol, entry_time, notes, pinned, broker_connection_id')
      .not('notes', 'is', null)
      .neq('notes', '')
      .eq('pinned', false)
      .order('entry_time', { ascending: false })
      .range(0, 49999);
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
      .order('entry_time', { ascending: false })
      .range(0, 49999);
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

  const pinned = useMemo(() => toItems(pinnedTradeNotes, pinnedDailyNotes), [pinnedTradeNotes, pinnedDailyNotes]);
  const rest = useMemo(() => toItems(tradeNotes, dailyNotes), [tradeNotes, dailyNotes]);

  const q = search.trim().toLowerCase();
  const keep = (item) =>
    (typeFilter === 'all' || item.type === typeFilter) &&
    (!q || `${item.content} ${item.title}`.toLowerCase().includes(q));
  const pinnedShown = pinned.filter(keep);
  const restShown = rest.filter(keep);

  if (loading) return <div className={`${GLASS} rounded-2xl p-10 text-center text-neutral-500 text-sm`}>Loading notes…</div>;

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

  if (pinned.length === 0 && rest.length === 0) {
    return (
      <div className={`${GLASS} rounded-2xl p-10 text-center`}>
        <div className="text-3xl mb-2">📝</div>
        <p className="text-neutral-500 text-sm">No notes yet — add one from the Calendar tab.</p>
      </div>
    );
  }

  const types = [
    { value: 'all', label: 'All' },
    { value: 'trade', label: 'Trade notes' },
    { value: 'daily', label: 'Daily notes' },
  ];

  const renderList = (list) => (
    <div className="space-y-3">
      {list.map((item) => (
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
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="text-sm px-3 py-1.5 w-full sm:w-64 bg-white/[0.04] border border-neutral-800/60 text-neutral-100 placeholder-neutral-600 rounded-xl focus:outline-none focus:border-indigo-500/60"
        />
        <div className={`inline-flex rounded-xl p-0.5 ${GLASS}`}>
          {types.map((o) => (
            <button
              key={o.value}
              onClick={() => setTypeFilter(o.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition ${
                typeFilter === o.value ? 'bg-indigo-500/90 text-white shadow' : 'text-neutral-400 hover:text-neutral-100'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-500 ml-auto">
          {pinnedShown.length + restShown.length} note{pinnedShown.length + restShown.length !== 1 ? 's' : ''}
        </span>
      </div>

      {pinnedShown.length === 0 && restShown.length === 0 && (
        <div className={`${GLASS} rounded-2xl p-10 text-center text-neutral-500 text-sm`}>No notes match your search.</div>
      )}

      {pinnedShown.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400">★</span>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Pinned (all accounts)</h3>
          </div>
          {renderList(pinnedShown)}
        </div>
      )}

      {restShown.length > 0 && (
        <div>
          {pinnedShown.length > 0 && (
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              All notes (current account selection)
            </h3>
          )}
          {renderList(restShown)}
        </div>
      )}
    </div>
  );
}
