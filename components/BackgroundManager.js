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
  }, []);

  if (!bgUrl) return null;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center"
      style={{ backgroundImage: `url(${bgUrl})`, opacity }}
    />
  );
}
