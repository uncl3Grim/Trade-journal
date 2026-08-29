'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const MAX_SCREENSHOTS = 3;

export default function TradeScreenshot({ trade, userId, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const urls = trade.screenshot_urls || (trade.screenshot_url ? [trade.screenshot_url] : []);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (urls.length >= MAX_SCREENSHOTS) {
      setError(`Max ${MAX_SCREENSHOTS} screenshots per trade.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${trade.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('trade-screenshots').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('trade-screenshots').getPublicUrl(path);
      const nextUrls = [...urls, data.publicUrl];
      const { error: updateError } = await supabase
        .from('trades')
        .update({ screenshot_urls: nextUrls })
        .eq('id', trade.id);
      if (updateError) throw updateError;
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
    e.target.value = '';
  }

  async function handleRemove(urlToRemove) {
    const nextUrls = urls.filter((u) => u !== urlToRemove);
    await supabase.from('trades').update({ screenshot_urls: nextUrls }).eq('id', trade.id);
    onUpdated?.();
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2 mb-1">
        {urls.map((url) => (
          <div key={url} className="relative inline-block">
            <img src={url} alt="Trade screenshot" className="rounded-lg h-20 w-20 object-cover border border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => handleRemove(url)}
              className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full w-5 h-5 text-xs text-red-500 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        {urls.length < MAX_SCREENSHOTS && (
          <label className="cursor-pointer flex items-center justify-center h-20 w-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-xs text-center px-1">
            {uploading ? '...' : `📷 Add\n(${urls.length}/${MAX_SCREENSHOTS})`}
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
          </label>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
