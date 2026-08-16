'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountSwitcher({ accounts, allSelected, selectedIds, includeManual, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const label = allSelected
    ? 'All accounts'
    : `${selectedIds.length + (includeManual ? 1 : 0)} account${selectedIds.length + (includeManual ? 1 : 0) !== 1 ? 's' : ''}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-sm text-gray-700 flex items-center gap-2"
      >
        {label}
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-20">
          <label className="flex items-center gap-2 py-1.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
            All accounts
          </label>

          <div className="border-t border-gray-100 my-1" />

          <label className="flex items-center gap-2 py-1.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!allSelected && includeManual}
              onChange={toggleManual}
              className="rounded"
            />
            Manual entries
          </label>

          {accounts.map((a) => (
            <label key={a.id} className="flex items-center gap-2 py-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!allSelected && selectedIds.includes(a.id)}
                onChange={() => toggleAccount(a.id)}
                className="rounded"
              />
              {a.broker_server} ({a.mt5_login})
            </label>
          ))}

          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              onClick={() => router.push('/broker')}
              className="text-xs text-indigo-600 hover:text-indigo-500"
            >
              Manage accounts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
