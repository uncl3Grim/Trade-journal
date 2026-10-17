'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID || 'local';
const RECHECK_MS = 5 * 60 * 1000; // while the tab stays open and visible
const DISMISS_KEY = 'tj_update_dismissed';

// Quietly checks whether a newer version of the app has been deployed since
// this tab was loaded (tabs and Home Screen copies can sit open for days) and
// offers a one-tap reload. Never reloads on its own, so nothing you're typing is lost.
export default function VersionGuard() {
  const [latest, setLatest] = useState(null); // id of the newer deployment, once seen
  const [dismissed, setDismissed] = useState(false);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (CURRENT === 'local' || busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { id } = await res.json();
      if (id && id !== 'local' && id !== CURRENT) {
        setLatest(id);
        try {
          setDismissed(sessionStorage.getItem(DISMISS_KEY) === id);
        } catch {}
      }
    } catch {
      // offline or a hiccup: just try again next time
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(check, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onPageShow = (e) => {
      if (e.persisted) check(); // restored from the back/forward cache
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', onPageShow);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') check();
    }, RECHECK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [check]);

  if (!latest || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, latest);
    } catch {}
  }

  return (
    <div
      role="status"
      className="pf-toast fixed left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm md:!bottom-6 -translate-x-1/2"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-400/30 bg-neutral-900/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/50">
        <span className="h-2 w-2 rounded-full bg-indigo-400 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-neutral-50">New version available</div>
          <div className="text-xs text-neutral-400">Reload to get the latest look and fixes.</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white"
        >
          Reload
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="flex-shrink-0 text-neutral-500 hover:text-neutral-200 text-base leading-none px-1">
          ×
        </button>
      </div>
    </div>
  );
}
