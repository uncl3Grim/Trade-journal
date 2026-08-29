'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle({ compact = false }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tj_theme');
      const isDark = saved === 'dark';
      setDark(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } catch {}
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('tj_theme', next ? 'dark' : 'light');
    } catch {}
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 flex items-center justify-center text-sm"
        title="Toggle theme"
      >
        {dark ? '☀️' : '🌙'}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
    >
      {dark ? '☀️ Light mode' : '🌙 Dark mode'}
    </button>
  );
}
