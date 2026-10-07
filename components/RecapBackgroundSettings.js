'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// kind: 'weekly' | 'daily' — determines which user_settings columns this
// instance reads/writes, so Weekly and Daily recap backgrounds stay independent.
export default function RecapBackgroundSettings({ userId, kind, label }) {
  const urlColumn = kind === 'weekly' ? 'weekly_recap_bg_url' : 'daily_recap_bg_url';
  const dimColumn = kind === 'weekly' ? 'weekly_recap_bg_dim' : 'daily_recap_bg_dim';

  const [bgUrl, setBgUrl] = useState(null);
  const [dim, setDim] = useState(0.55);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_settings')
      .select(`${urlColumn}, ${dimColumn}`)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setBgUrl(data?.[urlColumn] || null);
        setDim(data?.[dimColumn] ?? 0.55);
      });
  }, [userId, urlColumn, dimColumn]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/recap-${kind}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('backgrounds').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('backgrounds').getPublicUrl(path);
      await supabase.from('user_settings').upsert({
        user_id: userId,
        [urlColumn]: data.publicUrl,
        [dimColumn]: dim,
        updated_at: new Date().toISOString(),
      });
      setBgUrl(data.publicUrl);
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function updateDim(val) {
    setDim(val);
    await supabase.from('user_settings').upsert({
      user_id: userId,
      [dimColumn]: val,
      updated_at: new Date().toISOString(),
    });
  }

  async function handleRemove() {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      [urlColumn]: null,
      updated_at: new Date().toISOString(),
    });
    setBgUrl(null);
  }

  return (
    <div className="bg-white dark:bg-[#15151b] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{label} Background</h3>
      <p className="text-xs text-gray-400 mb-3">
        A still image — under ~1600px on the long edge loads fastest. Video isn't supported here since the card
        exports as a static image.
      </p>

      {bgUrl && (
        <div className="mb-3">
          <img src={bgUrl} alt="Background preview" className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-800" />
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <label className="cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
          {uploading ? 'Uploading...' : bgUrl ? 'Change image' : 'Upload image'}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
        {bgUrl && (
          <button onClick={handleRemove} className="text-xs text-red-500 hover:text-red-400">
            Remove
          </button>
        )}
      </div>

      {bgUrl && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Overlay darkness: {(dim * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0.2"
            max="0.85"
            step="0.05"
            value={dim}
            onChange={(e) => updateDim(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-gray-400 mt-1">Higher keeps text readable over busy images.</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
