'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const EMPTY = { id: null, content: '', emotion: '', pinned: false };

// The day's note (one per day, per account or "general"). Lives in the page so
// a half-written note survives switching tabs.
export function useDayNote({ userId, dateStr, accountId, notify }) {
  const [note, setNote] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !dateStr) return;
    let cancelled = false;
    setLoading(true);
    let query = supabase.from('daily_notes').select('*').eq('user_id', userId).eq('note_date', dateStr);
    query = accountId ? query.eq('broker_connection_id', accountId) : query.is('broker_connection_id', null);
    query.maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const next = {
        id: data?.id || null,
        content: data?.content || '',
        emotion: data?.emotion || '',
        pinned: data?.pinned || false,
      };
      setNote(next);
      setSaved(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, dateStr, accountId]);

  const dirty = note.content !== saved.content || note.emotion !== saved.emotion;

  const save = useCallback(async () => {
    setSaving(true);
    let id = note.id;
    let error = null;
    if (id) {
      ({ error } = await supabase
        .from('daily_notes')
        .update({
          content: note.content,
          pinned: note.pinned,
          emotion: note.emotion || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id));
    } else {
      const res = await supabase
        .from('daily_notes')
        .insert({
          user_id: userId,
          note_date: dateStr,
          content: note.content,
          pinned: note.pinned,
          emotion: note.emotion || null,
          broker_connection_id: accountId,
        })
        .select()
        .single();
      error = res.error;
      if (res.data) id = res.data.id;
    }
    setSaving(false);
    if (error) {
      notify(error.message, 'error');
      return;
    }
    const next = { ...note, id };
    setNote(next);
    setSaved(next);
    notify('Daily note saved');
  }, [note, userId, dateStr, accountId, notify]);

  const togglePin = useCallback(async () => {
    const nextPinned = !note.pinned;
    setNote((n) => ({ ...n, pinned: nextPinned }));
    if (note.id) {
      const { error } = await supabase.from('daily_notes').update({ pinned: nextPinned }).eq('id', note.id);
      if (error) {
        setNote((n) => ({ ...n, pinned: !nextPinned }));
        notify(error.message, 'error');
        return;
      }
      setSaved((s) => ({ ...s, pinned: nextPinned }));
    }
    notify(nextPinned ? 'Note pinned' : 'Note unpinned');
  }, [note.id, note.pinned, notify]);

  const discard = useCallback(() => setNote(saved), [saved]);

  return { note, setNote, dirty, loading, saving, save, togglePin, discard };
}
