'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function Check({ checked }) {
  return (
    <span
      className={`h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
        checked ? 'bg-indigo-500 border-indigo-400' : 'border-neutral-600 bg-white/5'
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className={`w-3 h-3 text-white transition-transform duration-200 ease-bouncy ${checked ? 'scale-100' : 'scale-0'}`}
      >
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Row({ checked, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-200 ${
        checked ? 'bg-indigo-500/10' : 'hover:bg-white/[0.05]'
      }`}
    >
      <Check checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-neutral-100 truncate">{title}</span>
        {subtitle && <span className="block text-xs text-neutral-500 truncate">{subtitle}</span>}
      </span>
    </button>
  );
}

// "5095814" -> "Login 5095814"; "CSV import" / "Manual" are shown as-is.
function accountSubtitle(a) {
  const v = a.mt5_login;
  if (!v) return null;
  return /^\d+$/.test(String(v)) ? `Login ${v}` : String(v);
}

export default function AccountSwitcher({ accounts, allSelected, selectedIds, includeManual, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function handlePointer(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function toggleAll() {
    onChange({ allSelected: true, selectedIds: [], includeManual: false });
  }

  function toggleAccount(id) {
    if (allSelected) {
      onChange({ allSelected: false, selectedIds: [id], includeManual: false });
      return;
    }
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange({ allSelected: false, selectedIds: next, includeManual });
  }

  function toggleManual() {
    if (allSelected) {
      onChange({ allSelected: false, selectedIds: [], includeManual: true });
      return;
    }
    onChange({ allSelected: false, selectedIds, includeManual: !includeManual });
  }

  const totalSelectedCount = selectedIds.length + (includeManual ? 1 : 0);

  let label;
  if (allSelected) {
    label = 'All accounts';
  } else if (totalSelectedCount === 0) {
    label = 'No accounts';
  } else if (selectedIds.length === 1 && !includeManual) {
    // Exactly one real account selected — show its actual name instead of a generic count.
    const acc = accounts.find((a) => a.id === selectedIds[0]);
    label = acc ? acc.broker_server : '1 account';
  } else if (selectedIds.length === 0 && includeManual) {
    label = 'Manual entries';
  } else {
    label = `${totalSelectedCount} account${totalSelectedCount !== 1 ? 's' : ''}`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`max-w-[11rem] sm:max-w-[16rem] bg-white/[0.04] backdrop-blur-md border rounded-xl px-3 py-1.5 text-sm text-neutral-200 flex items-center gap-2 transition-colors duration-200 ${
          open ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-neutral-800/60 hover:border-neutral-700'
        }`}
      >
        <span className="truncate">{label}</span>
        <span className={`text-neutral-500 text-xs transition-transform duration-300 ease-bouncy ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <>
          {/* Phones: dim the page behind the picker. */}
          <div className="fixed inset-0 z-40 bg-black/60 sm:hidden animate-fade-in-up" onClick={() => setOpen(false)} />

          {/* Phones: a card floating above the bottom nav (never clipped by the screen edge).
              Larger screens: a normal dropdown under the button. */}
          <div
            role="dialog"
            aria-label="Choose accounts"
            className="fixed inset-x-3 bottom-20 z-50 sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-neutral-950/95 backdrop-blur-xl border border-neutral-800/60 rounded-2xl shadow-2xl shadow-black/50 p-2 animate-fade-in-up"
          >
            <div className="flex items-center justify-between px-3 pt-2 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Accounts</span>
              <span className="text-xs text-neutral-500">{allSelected ? 'All shown' : `${totalSelectedCount} selected`}</span>
            </div>

            <div className="max-h-[55vh] sm:max-h-80 overflow-y-auto pr-0.5">
              <Row checked={allSelected} onClick={toggleAll} title="All accounts" subtitle="Combine every account" />

              <div className="border-t border-neutral-800/60 my-1.5 mx-2" />

              <Row
                checked={!allSelected && includeManual}
                onClick={toggleManual}
                title="Manual entries"
                subtitle="Trades logged without an account"
              />

              {accounts.map((a) => (
                <Row
                  key={a.id}
                  checked={!allSelected && selectedIds.includes(a.id)}
                  onClick={() => toggleAccount(a.id)}
                  title={a.broker_server}
                  subtitle={accountSubtitle(a)}
                />
              ))}
            </div>

            <div className="border-t border-neutral-800/60 mt-1.5 pt-2 px-2 pb-1 flex items-center justify-between">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push('/broker');
                }}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Manage accounts
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 rounded-lg px-3.5 py-1.5 sm:hidden"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
