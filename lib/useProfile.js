'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { isMissingTable } from './profile';

export const EMPTY_PROFILE = {
  username: '',
  display_name: '',
  bio: '',
  trading_style: '',
  avatar_icon: 'bull',
  avatar_gradient: 'aurora',
};

function normalise(row) {
  return {
    username: row?.username || '',
    display_name: row?.display_name || '',
    bio: row?.bio || '',
    trading_style: row?.trading_style || '',
    avatar_icon: row?.avatar_icon || 'bull',
    avatar_gradient: row?.avatar_gradient || 'aurora',
  };
}

export function useProfile(userId) {
  const [saved, setSaved] = useState(EMPTY_PROFILE);
  const [draft, setDraft] = useState(EMPTY_PROFILE);
  const [status, setStatus] = useState('loading'); // loading | ready | missing-table | error

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (isMissingTable(error)) return setStatus('missing-table');
        if (error) return setStatus('error');
        const p = normalise(data);
        setSaved(p);
        setDraft(p);
        setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const patch = useCallback((changes) => setDraft((d) => ({ ...d, ...changes })), []);

  const save = useCallback(async () => {
    const row = {
      user_id: userId,
      username: draft.username.trim().toLowerCase() || null,
      display_name: draft.display_name.trim() || null,
      bio: draft.bio.trim() || null,
      trading_style: draft.trading_style || null,
      avatar_icon: draft.avatar_icon,
      avatar_gradient: draft.avatar_gradient,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('profiles').upsert(row);
    if (error) return { error };
    const p = normalise(row);
    setSaved(p);
    setDraft(p);
    return { error: null };
  }, [userId, draft]);

  const reset = useCallback(() => setDraft(saved), [saved]);

  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  return { saved, draft, patch, save, reset, dirty, status };
}
