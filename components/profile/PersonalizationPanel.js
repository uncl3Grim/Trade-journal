'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card } from './ui';
import { ImageGlyph } from './ProfileIcons';
import WallpaperEditor, { WALLPAPER_KINDS } from './WallpaperEditor';

const ORDER = ['app', 'weekly', 'daily'];

export default function PersonalizationPanel({ userId, notify }) {
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState('app');
  const [data, setData] = useState(() =>
    Object.fromEntries(ORDER.map((k) => [k, { url: null, value: WALLPAPER_KINDS[k].defaultValue }]))
  );

  useEffect(() => {
    if (!userId) return;
    const cols = ORDER.flatMap((k) => [WALLPAPER_KINDS[k].urlCol, WALLPAPER_KINDS[k].valCol]).join(', ');
    supabase
      .from('user_settings')
      .select(cols)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data: row }) => {
        setData(
          Object.fromEntries(
            ORDER.map((k) => {
              const c = WALLPAPER_KINDS[k];
              return [k, { url: row?.[c.urlCol] || null, value: row?.[c.valCol] ?? c.defaultValue }];
            })
          )
        );
        setLoaded(true);
      });
  }, [userId]);

  function update(kind, changes) {
    setData((d) => ({ ...d, [kind]: { ...d[kind], ...changes } }));
  }

  if (!loaded) return <div className="skeleton h-72 !bg-white/5" />;

  return (
    <div className="pf-stagger space-y-4">
      <Card title="Wallpapers" hint="Choose where the image goes, then upload and tune it. Changes apply instantly.">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {ORDER.map((k) => {
            const c = WALLPAPER_KINDS[k];
            const sel = active === k;
            const url = data[k].url;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setActive(k)}
                aria-pressed={sel}
                className={`pf-tile group text-left rounded-xl border overflow-hidden ${sel ? 'is-active border-indigo-400/70' : 'border-white/10 hover:border-white/25'}`}
              >
                <div className="relative aspect-[16/10] bg-black/40">
                  {url ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url(${url})` }} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-700">
                      <ImageGlyph size={22} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${url ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                </div>
                <div className="px-2.5 py-2 bg-white/[0.03]">
                  <div className="text-xs font-medium text-neutral-100 truncate">{c.label}</div>
                  <div className="text-[10px] text-neutral-500">{url ? 'Custom' : 'Default'}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div key={active} className="pf-swap">
          <WallpaperEditor
            userId={userId}
            kind={active}
            url={data[active].url}
            value={data[active].value}
            onChange={(c) => update(active, c)}
            notify={notify}
          />
        </div>
      </Card>
    </div>
  );
}
