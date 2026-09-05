'use client';

import { useCallback, useState } from 'react';

const STYLES = {
  success: {
    wrap: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.415l-7.396 7.396a1 1 0 01-1.415 0L3.296 9.503a1 1 0 111.415-1.414l3.889 3.889 6.69-6.689a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    wrap: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
        <path
          fillRule="evenodd"
          d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zM9 8v3a1 1 0 002 0V8a1 1 0 10-2 0zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    wrap: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
        <path
          fillRule="evenodd"
          d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zM9 9v5a1 1 0 002 0V9a1 1 0 10-2 0zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

// Inline banner used underneath a form/section for messages tied to that
// specific action (e.g. "Connected!" right under the connect form).
export function Alert({ type = 'info', children }) {
  if (!children) return null;
  const s = STYLES[type] || STYLES.info;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${s.wrap}`}>
      {s.icon}
      <span className="leading-snug">{children}</span>
    </div>
  );
}

// Page-level toast stack for actions that don't have an obvious inline
// spot to report back to (sync, delete, rename, save, ...).
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((type, message, duration = 5000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, notify, dismiss };
}

export function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => {
        const s = STYLES[t.type] || STYLES.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${s.wrap}`}
          >
            {s.icon}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="opacity-50 hover:opacity-100 leading-none text-base"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
