'use client';

import { Card, GhostButton, Label, PrimaryButton, inputCls } from '../profile/ui';
import { ChipGroup, emotionOptions } from './dayShared';

export default function NoteTab({ dayNote, hasAccount }) {
  const { note, setNote, dirty, loading, saving, save, togglePin, discard } = dayNote;

  if (loading) return <div className="skeleton h-72 !bg-white/5" />;

  return (
    <div className="pf-stagger space-y-4">
      <Card
        title="Daily note"
        hint={hasAccount ? 'Saved for the account you have selected.' : 'A general note, not tied to a single account.'}
        action={
          <div className="flex items-center gap-2">
            {dirty && <span className="pf-fade text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-full px-2.5 py-1">Unsaved</span>}
            <button
              type="button"
              onClick={togglePin}
              aria-pressed={note.pinned}
              title={note.pinned ? 'Unpin note' : 'Pin note'}
              className={`w-9 h-9 rounded-xl border border-white/10 hover:bg-white/10 text-lg leading-none ${note.pinned ? 'text-amber-300' : 'text-neutral-500'}`}
            >
              {note.pinned ? '★' : '☆'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <Label>How did you feel today overall?</Label>
            <ChipGroup options={emotionOptions} value={note.emotion} onChange={(v) => setNote((n) => ({ ...n, emotion: v }))} />
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              value={note.content}
              onChange={(e) => setNote((n) => ({ ...n, content: e.target.value }))}
              rows={7}
              placeholder="How did the day feel overall? Market context, mindset, lessons…"
              className={`${inputCls} resize-y`}
            />
          </div>

          <div className="flex gap-2">
            <PrimaryButton type="button" onClick={save} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save daily note'}
            </PrimaryButton>
            {dirty && (
              <GhostButton type="button" onClick={discard} disabled={saving}>
                Discard
              </GhostButton>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
