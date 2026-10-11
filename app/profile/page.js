'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useProfile } from '../../lib/useProfile';
import { gradientFor } from '../../lib/profile';
import AppShell from '../../components/AppShell';
import ProfileAvatar from '../../components/profile/ProfileAvatar';
import AccountPanel from '../../components/profile/AccountPanel';
import PersonalizationPanel from '../../components/profile/PersonalizationPanel';
import TradingPanel from '../../components/profile/TradingPanel';
import DataPanel from '../../components/profile/DataPanel';
import SecurityPanel from '../../components/profile/SecurityPanel';
import { useToast } from '../../components/profile/ui';
import { UserGlyph, PaletteGlyph, SlidersGlyph, DatabaseGlyph, LockGlyph } from '../../components/profile/ProfileIcons';

const CATEGORIES = [
  { key: 'account', label: 'Account', blurb: 'Your handle, avatar and public details.', icon: UserGlyph },
  { key: 'personalization', label: 'Personalization', blurb: 'Wallpapers for the app and your recap cards.', icon: PaletteGlyph },
  { key: 'trading', label: 'Trading', blurb: 'Risk defaults and how your numbers are shown.', icon: SlidersGlyph },
  { key: 'data', label: 'Data', blurb: 'Take your journal with you.', icon: DatabaseGlyph },
  { key: 'security', label: 'Security', blurb: 'Password and signed-in devices.', icon: LockGlyph },
];
const SWAP_MS = 170;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const profileState = useProfile(user?.id);
  const [notify, toastNode] = useToast();

  const [shown, setShown] = useState('account');
  const [phase, setPhase] = useState('in');
  const [dir, setDir] = useState('fwd');
  const swapTimer = useRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login');
      else setUser(session.user);
    });
  }, [router]);

  useEffect(() => {
    const h = window.location.hash.replace('#', '');
    if (CATEGORIES.some((c) => c.key === h)) setShown(h);
    return () => clearTimeout(swapTimer.current);
  }, []);

  const select = useCallback(
    (key) => {
      if (key === shown) return;
      const from = CATEGORIES.findIndex((c) => c.key === shown);
      const to = CATEGORIES.findIndex((c) => c.key === key);
      setDir(to > from ? 'fwd' : 'back');
      setPhase('out');
      clearTimeout(swapTimer.current);
      swapTimer.current = setTimeout(() => {
        setShown(key);
        setPhase('in');
        try {
          history.replaceState(null, '', `#${key}`);
        } catch {}
      }, SWAP_MS);
    },
    [shown]
  );

  const navRef = useRef(null);
  const btnRefs = useRef({});
  const [pill, setPill] = useState(null);
  const measure = useCallback(() => {
    const el = btnRefs.current[shown];
    if (!el) return;
    setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    el.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [shown]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const { draft } = profileState;
  const g = gradientFor(draft.avatar_gradient);
  const active = CATEGORIES.find((c) => c.key === shown);
  const email = user?.email || '';
  const since = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';

  function renderPanel() {
    switch (shown) {
      case 'account':
        return <AccountPanel userId={user.id} email={email} profileState={profileState} notify={notify} />;
      case 'personalization':
        return <PersonalizationPanel userId={user.id} notify={notify} />;
      case 'trading':
        return <TradingPanel userId={user.id} notify={notify} />;
      case 'data':
        return <DataPanel userId={user.id} notify={notify} />;
      case 'security':
        return <SecurityPanel email={email} notify={notify} />;
      default:
        return null;
    }
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="pf-hero relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 mb-6">
          <div className="pf-glow absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: g.from }} />
          <div className="pf-glow pf-glow-b absolute -bottom-28 right-0 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: g.to }} />
          <div className="relative flex items-center gap-5">
            <ProfileAvatar icon={draft.avatar_icon} gradient={draft.avatar_gradient} size={92} ring />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-50 truncate">
                {draft.display_name || (draft.username ? `@${draft.username}` : 'Welcome, trader')}
              </h1>
              {draft.display_name && draft.username && <div className="text-sm text-neutral-400">@{draft.username}</div>}
              {!draft.username && profileState.status === 'ready' && (
                <button onClick={() => select('account')} className="text-xs text-indigo-300 hover:text-indigo-200 mt-1">
                  Claim your username →
                </button>
              )}
              {draft.bio && <p className="text-sm text-neutral-400 mt-2 max-w-md">{draft.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {draft.trading_style && <span className="pf-pill">{draft.trading_style}</span>}
                {since && <span className="pf-pill">Member since {since}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-8">
          <nav
            ref={navRef}
            aria-label="Profile sections"
            className="pf-nav relative flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 mb-5 md:mb-0 md:sticky md:top-6 md:self-start"
          >
            {pill && (
              <span
                className="pf-pill-bg absolute rounded-xl bg-white/10 border border-white/10 pointer-events-none"
                style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
              />
            )}
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const on = shown === c.key;
              return (
                <button
                  key={c.key}
                  ref={(el) => (btnRefs.current[c.key] = el)}
                  onClick={() => select(c.key)}
                  aria-current={on ? 'page' : undefined}
                  className={`pf-navitem relative z-10 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap flex-shrink-0 ${
                    on ? 'text-neutral-50' : 'text-neutral-500 hover:text-neutral-200'
                  }`}
                >
                  <Icon size={18} className={`pf-navicon ${on ? 'is-on' : ''}`} />
                  {c.label}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            <div className={phase === 'out' ? `pf-out-${dir}` : `pf-in-${dir}`}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-100">{active.label}</h2>
                <p className="text-sm text-neutral-500">{active.blurb}</p>
              </div>
              {user ? renderPanel() : <div className="skeleton h-48 !bg-white/5" />}
            </div>
          </div>
        </div>
      </div>
      {toastNode}
    </AppShell>
  );
}
