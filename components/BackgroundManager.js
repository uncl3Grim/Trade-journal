'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function BackgroundManager() {
  const [bgUrl, setBgUrl] = useState(null);
  const [opacity, setOpacity] = useState(0.15);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from('user_settings')
        .select('background_image_url, background_opacity')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data?.background_image_url) setBgUrl(data.background_image_url);
      if (data?.background_opacity !== null && data?.background_opacity !== undefined) {
        setOpacity(data.background_opacity);
      }
    });

    function onChange(e) {
      const { url, opacity: op } = e.detail || {};
      if (url !== undefined) setBgUrl(url);
      if (op !== undefined) setOpacity(op);
    }
    window.addEventListener('tj:background', onChange);
    return () => window.removeEventListener('tj:background', onChange);
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
        opacity: bgUrl ? opacity : 0,
        width: '100vw',
        height: '100lvh',
        left: 0,
        top: 0,
        transition: 'opacity 600ms ease',
      }}
    />
  );
}
