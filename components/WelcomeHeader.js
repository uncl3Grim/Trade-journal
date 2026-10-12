'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ProfileAvatar from './profile/ProfileAvatar';

const SUBLINES = [
  'Small edges compound.',
  'Process over outcome.',
  'Log it while it’s fresh.',
  'Protect your capital first.',
  'Let’s see how the week is shaping up.',
  'Patience pays. Wait for your setup.',
];

function timeGreeting(hour) {
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function pickHeading(name, hour) {
  const options = [
    `Welcome back, ${name}`,
    `${timeGreeting(hour)}, ${name}`,
    `Good to see you, ${name}`,
    `Ready when you are, ${name}`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}

export default function WelcomeHeader() {
  const [profile, setProfile] = useState(null);
  const [heading, setHeading] = useState('');
  const [line, setLine] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || cancelled) return;
      const email = session.user.email || '';
      let row = null;
      try {
        const res = await supabase
          .from('profiles')
          .select('username, display_name, avatar_icon, avatar_gradient')
          .eq('user_id', session.user.id)
          .maybeSingle();
        row = res.data;
      } catch {}
      if (cancelled) return;
      const fallback = email.split('@')[0] || 'trader';
      const name = row?.display_name || row?.username || fallback;
      setProfile({ name, icon: row?.avatar_icon || 'bull', gradient: row?.avatar_gradient || 'aurora' });
      setHeading(pickHeading(name, new Date().getHours()));
      setLine(Math.floor(Math.random() * SUBLINES.length));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLine((i) => (i + 1) % SUBLINES.length), 7000);
    return () => clearInterval(t);
  }, []);

  if (!profile) return <div className="min-h-[56px]" />;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <ProfileAvatar icon={profile.icon} gradient={profile.gradient} size={48} ring className="flex-shrink-0" />
      <div className="min-w-0">
        <h1 className="font-heading text-xl sm:text-2xl font-semibold text-neutral-50 leading-tight truncate">
          {heading.split(' ').map((w, i) => (
            <span key={i} className="pf-word" style={{ animationDelay: `${i * 70}ms` }}>
              {w}&nbsp;
            </span>
          ))}
        </h1>
        <p key={line} className="pf-fade text-sm text-neutral-300 mt-0.5 truncate">
          {SUBLINES[line]}
        </p>
      </div>
    </div>
  );
}
