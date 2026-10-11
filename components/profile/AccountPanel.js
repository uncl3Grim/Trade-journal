'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  GRADIENTS, TRADING_STYLES, validateUsername, randomUsername, suggestAlternatives,
} from '../../lib/profile';
import ProfileAvatar from './ProfileAvatar';
import { AVATAR_ICONS, CheckGlyph, CrossGlyph, DiceGlyph } from './ProfileIcons';
import { Card, Label, inputCls, PrimaryButton, GhostButton } from './ui';

export default function AccountPanel({ userId, email, profileState, notify }) {
  const { saved, draft, patch, save, reset, dirty, status } = profileState;
  const [check, setCheck] = useState({ state: 'idle', msg: '' });
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const name = draft.username.trim().toLowerCase();
    setSuggestions([]);
    if (!name) return setCheck({ state: 'idle', msg: '' });
    if (name === saved.username) return setCheck({ state: 'same', msg: 'This is your current username.' });
    const problem = validateUsername(name);
    if (problem) return setCheck({ state: 'invalid', msg: problem });

    setCheck({ state: 'checking', msg: 'Checking…' });
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', name)
        .neq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) return setCheck({ state: 'invalid', msg: "Couldn't check right now." });
      if (data) {
        setCheck({ state: 'taken', msg: 'Already taken.' });
        setSuggestions(suggestAlternatives(name));
      } else {
        setCheck({ state: 'ok', msg: 'Available!' });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft.username, saved.username, userId]);

  const blocked = ['invalid', 'taken', 'checking'].includes(check.state);

  async function handleSave() {
    setSaving(true);
    const { error } = await save();
    setSaving(false);
    if (!error) return notify('Profile saved');
    if (error.code === '23505') {
      setCheck({ state: 'taken', msg: 'Someone just took that name.' });
      setSuggestions(suggestAlternatives(draft.username));
      return notify('That username was just taken', 'error');
    }
    notify(error.message || "Couldn't save", 'error');
  }

  if (status === 'loading') {
    return <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="skeleton h-40 !bg-white/5" />)}</div>;
  }
  if (status === 'missing-table') {
    return (
      <Card title="One-time setup needed">
        <p className="text-sm text-neutral-300 leading-relaxed">
          Profiles need a small database table. Open the Supabase SQL editor and run the contents of{' '}
          <code className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-100">supabase/profiles.sql</code>, then refresh
          this page.
        </p>
      </Card>
    );
  }

  const statusColor =
    check.state === 'ok' ? 'text-emerald-400' : check.state === 'taken' || check.state === 'invalid' ? 'text-red-400' : 'text-neutral-500';

  return (
    <div className="pf-stagger space-y-4 pb-24">
      <Card title="Username" hint="Your unique handle. Letters, numbers and underscores, 3–20 characters.">
        <Label
          right={
            <button
              type="button"
              onClick={() => patch({ username: randomUsername() })}
              className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200"
            >
              <DiceGlyph size={14} className="pf-dice" /> Surprise me
            </button>
          }
        >
          Handle
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm select-none">@</span>
          <input
            value={draft.username}
            onChange={(e) => patch({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) })}
            placeholder="your_handle"
            maxLength={20}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`${inputCls} pl-7 pr-10 ${check.state === 'ok' ? '!border-emerald-500/50' : check.state === 'taken' || check.state === 'invalid' ? '!border-red-500/50' : ''}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
            {check.state === 'checking' && <span className="pf-spinner" />}
            {check.state === 'ok' && <CheckGlyph size={18} className="pf-pop text-emerald-400" />}
            {(check.state === 'taken' || check.state === 'invalid') && <CrossGlyph size={16} className="pf-pop text-red-400" />}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5 min-h-[1.25rem]">
          <p key={check.state + check.msg} className={`pf-fade text-xs ${statusColor}`}>{check.msg}</p>
          <span className="text-[10px] text-neutral-600 tabular-nums">{draft.username.length}/20</span>
        </div>
        {suggestions.length > 0 && (
          <div className="pf-fade flex flex-wrap gap-2 mt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ username: s })}
                className="text-xs rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-neutral-300"
              >
                @{s}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Avatar" hint="Pick an icon and a colour. Shows up on your profile and shared reports.">
        <div className="flex items-center gap-5 mb-5">
          <ProfileAvatar icon={draft.avatar_icon} gradient={draft.avatar_gradient} size={84} ring />
          <div className="min-w-0">
            <div className="text-neutral-100 font-medium truncate">@{draft.username || 'your_handle'}</div>
            <div className="text-xs text-neutral-500 mt-0.5">Live preview</div>
          </div>
        </div>

        <Label>Icon</Label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-5">
          {AVATAR_ICONS.map((ic) => {
            const active = draft.avatar_icon === ic.key;
            return (
              <button
                key={ic.key}
                type="button"
                title={ic.label}
                aria-label={ic.label}
                aria-pressed={active}
                onClick={() => patch({ avatar_icon: ic.key })}
                className={`pf-icon-tile aspect-square rounded-xl border flex items-center justify-center ${
                  active
                    ? 'is-active border-indigo-400/70 bg-indigo-500/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-100 hover:bg-white/10'
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">{ic.node}</svg>
              </button>
            );
          })}
        </div>

        <Label>Colour</Label>
        <div className="flex flex-wrap gap-2.5">
          {GRADIENTS.map((g) => {
            const active = draft.avatar_gradient === g.key;
            return (
              <button
                key={g.key}
                type="button"
                title={g.label}
                aria-label={g.label}
                aria-pressed={active}
                onClick={() => patch({ avatar_gradient: g.key })}
                className={`pf-swatch w-9 h-9 rounded-full ${active ? 'is-active' : ''}`}
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
              />
            );
          })}
        </div>
      </Card>

      <Card title="About you">
        <div className="space-y-4">
          <div>
            <Label>Display name</Label>
            <input
              value={draft.display_name}
              onChange={(e) => patch({ display_name: e.target.value.slice(0, 32) })}
              placeholder="Optional — shown next to your handle"
              className={inputCls}
            />
          </div>
          <div>
            <Label right={<span className="text-[10px] text-neutral-600 tabular-nums">{draft.bio.length}/140</span>}>Bio</Label>
            <textarea
              value={draft.bio}
              onChange={(e) => patch({ bio: e.target.value.slice(0, 140) })}
              rows={3}
              placeholder="Your edge in one line…"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <Label>Trading style</Label>
            <div className="flex flex-wrap gap-2">
              {TRADING_STYLES.map((s) => {
                const active = draft.trading_style === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ trading_style: active ? '' : s })}
                    className={`pf-chip rounded-full border px-3.5 py-1.5 text-xs ${
                      active ? 'is-active border-indigo-400/60 bg-indigo-500/15 text-indigo-100' : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <div className={`${inputCls} !text-neutral-500 select-all`}>{email}</div>
          </div>
        </div>
      </Card>

      <div className={`pf-savebar ${dirty ? 'is-visible' : ''}`} aria-hidden={!dirty}>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-xl px-4 py-3 shadow-2xl">
          <span className="text-sm text-neutral-300">Unsaved changes</span>
          <div className="flex gap-2">
            <GhostButton onClick={reset} disabled={saving} tabIndex={dirty ? 0 : -1}>Discard</GhostButton>
            <PrimaryButton onClick={handleSave} disabled={saving || blocked} tabIndex={dirty ? 0 : -1}>
              {saving ? 'Saving…' : 'Save changes'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
