'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function TradeScreenshot({ trade, userId, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${trade.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('trade-screenshots').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('trades')
        .update({ screenshot_url: data.publicUrl })
        .eq('id', trade.id);
      if (updateError) throw updateError;
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleRemove() {
    await supabase.from('trades').update({ screenshot_url: null }).eq('id', trade.id);
    onUpdated?.();
  }

  return (
    <div className="mt-2">
      {trade.screenshot_url ? (
        <div className="relative inline-block">
          <img
            src={trade.screenshot_url}
            alt="Trade screenshot"
            className="rounded-lg max-h-32 border border-gray-200"
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full w-5 h-5 text-xs text-red-500 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="cursor-pointer text-[10px] text-indigo-500 hover:text-indigo-400">
          {uploading ? 'Uploading...' : '📷 Add screenshot'}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      )}
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
