'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ImageGlyph, UploadGlyph } from './ProfileIcons';
import { Slider, GhostButton } from './ui';

export const WALLPAPER_KINDS = {
  app: {
    label: 'App wallpaper',
    short: 'App',
    blurb: 'Sits behind every page of the app.',
    urlCol: 'background_image_url',
    valCol: 'background_opacity',
    defaultValue: 0.15,
    min: 0.05, max: 0.5, step: 0.05,
    sliderLabel: 'Wallpaper visibility',
    pathPrefix: 'background',
  },
  weekly: {
    label: 'Weekly Recap',
    short: 'Weekly',
    blurb: 'Backdrop for your shareable weekly recap card. Use a still image under ~1600px — the card exports as a picture.',
    urlCol: 'weekly_recap_bg_url',
    valCol: 'weekly_recap_bg_dim',
    defaultValue: 0.55,
    min: 0.2, max: 0.85, step: 0.05,
    sliderLabel: 'Overlay darkness',
    pathPrefix: 'recap-weekly',
  },
  daily: {
    label: 'Daily Recap',
    short: 'Daily',
    blurb: 'Backdrop for your shareable daily recap card. Use a still image under ~1600px — the card exports as a picture.',
    urlCol: 'daily_recap_bg_url',
    valCol: 'daily_recap_bg_dim',
    defaultValue: 0.55,
    min: 0.2, max: 0.85, step: 0.05,
    sliderLabel: 'Overlay darkness',
    pathPrefix: 'recap-daily',
  },
};

const MAX_MB = 8;

function broadcast(kind, detail) {
  if (kind === 'app') window.dispatchEvent(new CustomEvent('tj:background', { detail }));
}

export default function WallpaperEditor({ userId, kind, url, value, onChange, notify }) {
  const cfg = WALLPAPER_KINDS[kind];
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function persist(columns) {
    const { error: err } = await supabase.from('user_settings').upsert({
      user_id: userId,
      ...columns,
      updated_at: new Date().toISOString(),
    });
    if (err) {
      setError(err.message);
      notify?.("Couldn't save wallpaper", 'error');
      return false;
    }
    return true;
  }

  async function upload(file) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) return setError('That file is not an image.');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Image is over ${MAX_MB}MB — try a smaller one.`);
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${cfg.pathPrefix}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('backgrounds').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('backgrounds').getPublicUrl(path);
      const ok = await persist({ [cfg.urlCol]: data.publicUrl, [cfg.valCol]: value });
      if (ok) {
        onChange({ url: data.publicUrl });
        broadcast(kind, { url: data.publicUrl, opacity: value });
        notify?.(`${cfg.label} updated`);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  }

  async function remove() {
    setError('');
    const ok = await persist({ [cfg.urlCol]: null });
    if (ok) {
      onChange({ url: null });
      broadcast(kind, { url: null });
      notify?.(`${cfg.label} removed`);
    }
  }

  function changeValue(v) {
    onChange({ value: v });
    broadcast(kind, { opacity: v });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist({ [cfg.valCol]: v }), 400);
  }

  const isApp = kind === 'app';

  return (
    <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a]">
          {url ? (
            <>
              <div
                key={url}
                className="pf-fade absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${url})`, opacity: isApp ? value : 1, transition: 'opacity 200ms' }}
              />
              {!isApp && <div className="absolute inset-0 bg-black" style={{ opacity: value, transition: 'opacity 200ms' }} />}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-600">
              <ImageGlyph size={28} />
              <span className="text-xs">No image yet</span>
            </div>
          )}
          {isApp ? (
            <div className="absolute inset-0 p-3 flex gap-2">
              <div className="w-8 rounded-lg bg-white/10 backdrop-blur" />
              <div className="flex-1 grid grid-cols-3 gap-2 content-start">
                <div className="h-10 rounded-lg bg-white/10 backdrop-blur col-span-2" />
                <div className="h-10 rounded-lg bg-white/10 backdrop-blur" />
                <div className="h-16 rounded-lg bg-white/10 backdrop-blur col-span-3" />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 p-4 flex flex-col justify-end">
              <div className="text-[10px] uppercase tracking-widest text-white/60">{cfg.short} recap</div>
              <div className="text-2xl font-heading font-semibold text-emerald-300">+$1,240</div>
            </div>
          )}
          {uploading && <div className="skeleton absolute inset-0 !rounded-none opacity-70" />}
        </div>
        <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">{cfg.blurb}</p>
      </div>

      <div className="space-y-4">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]); }}
          className={`pf-drop flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 cursor-pointer text-center ${
            dragging ? 'is-drag border-indigo-400/70 bg-indigo-500/10' : 'border-white/15 bg-white/[0.02] hover:bg-white/5'
          }`}
        >
          <UploadGlyph size={22} className="text-neutral-400" />
          <span className="text-sm text-neutral-200">{uploading ? 'Uploading…' : url ? 'Replace image' : 'Upload an image'}</span>
          <span className="text-[11px] text-neutral-500">Drop a file or click · up to {MAX_MB}MB</span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>

        <div className={`pf-reveal ${url ? 'is-open' : ''}`}>
          <div className="pf-reveal-inner space-y-4">
            <Slider
              label={cfg.sliderLabel}
              value={value}
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              onChange={changeValue}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <GhostButton onClick={remove} className="w-full !text-red-300 hover:!bg-red-500/10 !border-red-500/20">
              Remove image
            </GhostButton>
          </div>
        </div>

        {error && <p className="pf-fade text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
