'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Same colour language as the Broker page, so an account looks the same everywhere.
const TYPE_STYLE = {
  myfxbook: { grad: 'from-sky-500 to-indigo-500' },
  csv: { grad: 'from-cyan-500 to-sky-500' },
  manual: { grad: 'from-emerald-500 to-teal-500' },
};
const MT5_STYLE = { grad: 'from-indigo-500 to-violet-500' };
const styleFor = (a) => TYPE_STYLE[a.broker_type] || MT5_STYLE;

// First visible character (safe for names that start with an emoji).
function initial(name) {
  const c = Array.from((name || '?').trim())[0];
  return (c || '?').toUpperCase();
}

// "5095814" -> "Login 5095814"; CSV / manual accounts say what they are.
function accountSubtitle(a) {
  if (a.broker_type === 'csv') return 'CSV import';
  if (a.broker_type === 'manual') return 'Manual account';
  const v = a.mt5_login;
  if (!v) return null;
  return /^\d+$/.test(String(v)) ? `Login ${v}` : String(v);
}

function SelectDot({ checked }) {
  return (
    <span
      className={`h-6 w-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ease-bouncy ${
        checked
          ? 'bg-gradient-to-br from-indigo-500 to-violet-500 border-transparent shadow-md shadow-indigo-500/40'
          : 'border-neutral-600 bg-white/[0.03]'
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className={`w-3.5 h-3.5 text-white transition-all duration-300 ease-bouncy ${checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
      >
        <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Tile({ grad, children }) {
  return (
    <span
      className={`h-10 w-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-inner`}
    >
      {children}
    </span>
  );
}

function PickRow({ checked, onClick, tile, title, subtitle, delay }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`w-full flex items-center gap-3 p-2.5 pr-3.5 rounded-2xl border text-left animate-fade-in-up transition-colors duration-200 ${
        checked ? 'bg-indigo-500/10 border-indigo-400/40' : 'bg-white/[0.03] border-transparent hover:bg-white/[0.06]'
      }`}
    >
      {tile}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-neutral-50 truncate">{title}</span>
        {subtitle && <span className="block text-xs text-neutral-500 truncate mt-0.5">{subtitle}</span>}
      </span>
      <SelectDot checked={checked} />
    </button>
  );
}

function SectionLabel({ title, count }) {
  return (
    <div className="flex items-center justify-between px-1 pt-4 pb-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</span>
      <span className="text-[11px] text-neutral-600">{count}</span>
    </div>
  );
}

export default function AccountSwitcher({ accounts, allSelected, selectedIds, includeManual, onChange }) {
  const router = useRouter();
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);
  const dragStartY = useRef(null);

  const [mounted, setMounted] = useState(false); // is the panel in the DOM
  const [shown, setShown] = useState(false); // is it animated in
  const [desktop, setDesktop] = useState(false);
  const [query, setQuery] = useState('');
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  function openPanel() {
    clearTimeout(closeTimer.current);
    setDesktop(typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches);
    setMounted(true);
    // two frames so the closed position is painted first and the slide actually animates
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }

  function closePanel() {
    setShown(false);
    setDragY(0);
    setDragging(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setQuery('');
    }, 280);
  }

  const closeRef = useRef(closePanel);
  closeRef.current = closePanel;

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!mounted) return;
    function onPointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) closeRef.current();
    }
    function onKey(e) {
      if (e.key === 'Escape') closeRef.current();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [mounted]);

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

  // ----- trigger label -----
  let label;
  if (allSelected) {
    label = 'All accounts';
  } else if (totalSelectedCount === 0) {
    label = 'No accounts';
  } else if (selectedIds.length === 1 && !includeManual) {
    const acc = accounts.find((a) => a.id === selectedIds[0]);
    label = acc ? acc.broker_server : '1 account';
  } else if (selectedIds.length === 0 && includeManual) {
    label = 'Manual entries';
  } else {
    label = `${totalSelectedCount} accounts`;
  }

  // ----- one-line summary under the sheet title -----
  let summary;
  if (allSelected) {
    summary = 'Showing every account together';
  } else if (totalSelectedCount === 0) {
    summary = 'Nothing selected. Pick at least one account.';
  } else {
    const names = [
      ...(includeManual ? ['Manual entries'] : []),
      ...selectedIds.map((id) => accounts.find((a) => a.id === id)?.broker_server).filter(Boolean),
    ];
    summary = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more` : names.join(', ');
  }

  // ----- grouping + search -----
  const q = query.trim().toLowerCase();
  const matches = (a) => !q || `${a.broker_server} ${a.mt5_login || ''}`.toLowerCase().includes(q);
  const broker = accounts.filter((a) => a.broker_type !== 'csv' && a.broker_type !== 'manual' && matches(a));
  const imported = accounts.filter((a) => a.broker_type === 'csv' && matches(a));
  const manualAccounts = accounts.filter((a) => a.broker_type === 'manual' && matches(a));
  const showManualEntries = !q || 'manual entries'.includes(q);
  const showAllCard = !q;
  const showSearch = accounts.length > 5;
  const nothingFound = q && !broker.length && !imported.length && !manualAccounts.length && !showManualEntries;

  let rowIndex = 0;
  const nextDelay = () => 30 + Math.min(rowIndex++, 10) * 26;

  // ----- swipe down on the header to close (phones) -----
  function onTouchStart(e) {
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }
  function onTouchMove(e) {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current));
  }
  function onTouchEnd() {
    dragStartY.current = null;
    if (dragY > 90) closePanel();
    else {
      setDragY(0);
      setDragging(false);
    }
  }

  const sheetStyle = desktop
    ? {
        transformOrigin: 'top right',
        transform: shown ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
        opacity: shown ? 1 : 0,
        transition: 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease',
      }
    : {
        transform: shown ? `translateY(${dragY}px)` : 'translateY(110%)',
        opacity: shown ? 1 : 0,
        transition: dragging ? 'none' : 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease',
      };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => (mounted && shown ? closePanel() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={shown}
        className={`max-w-[12rem] sm:max-w-[16rem] bg-white/[0.04] backdrop-blur-md border rounded-xl pl-2.5 pr-3 py-1.5 text-sm text-neutral-100 flex items-center gap-2 transition-colors duration-200 ${
          shown ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-neutral-800/60 hover:border-neutral-700'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-300 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />
        </svg>
        <span className="truncate">{label}</span>
        <span className={`text-neutral-500 text-xs transition-transform duration-300 ease-bouncy ${shown ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {mounted && (
        <>
          {/* Phones: dim the page behind the sheet. */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] sm:hidden transition-opacity duration-300"
            style={{ opacity: shown ? 1 : 0 }}
            onClick={closePanel}
          />

          <div
            role="dialog"
            aria-label="Choose accounts"
            style={sheetStyle}
            className="fixed inset-x-3 bottom-20 z-50 flex flex-col max-h-[min(78vh,40rem)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[30rem] overflow-hidden rounded-3xl sm:rounded-2xl border border-white/10 bg-neutral-950/90 backdrop-blur-2xl shadow-2xl shadow-black/60"
          >
            {/* soft top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-indigo-500/[0.12] to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* header (swipe down to close on phones) */}
            <div
              className="relative px-4 pt-2 pb-3 sm:pt-4 flex-shrink-0 touch-none sm:touch-auto"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-neutral-50 leading-tight">Accounts</h3>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">{summary}</p>
                </div>
                <span className="flex-shrink-0 text-[11px] font-medium text-indigo-200 bg-indigo-500/15 border border-indigo-400/25 rounded-full px-2.5 py-1">
                  {allSelected ? 'All' : `${totalSelectedCount} selected`}
                </span>
              </div>
            </div>

            {showSearch && (
              <div className="px-4 pb-2 flex-shrink-0">
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search accounts"
                    className="w-full bg-white/[0.05] border border-neutral-800/80 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-400/60"
                  />
                </div>
              </div>
            )}

            {/* scrolling list */}
            <div className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3">
              {showAllCard && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allSelected}
                  onClick={toggleAll}
                  className={`relative w-full flex items-center gap-3 p-3 rounded-2xl border text-left overflow-hidden transition-all duration-300 ${
                    allSelected
                      ? 'border-indigo-400/50 bg-gradient-to-br from-indigo-500/25 to-violet-500/10 shadow-lg shadow-indigo-500/10'
                      : 'border-neutral-800/80 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 text-indigo-200">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-50">All accounts</span>
                    <span className="block text-xs text-neutral-400 mt-0.5">Combine every account and manual entries</span>
                  </span>
                  <SelectDot checked={allSelected} />
                </button>
              )}

              {broker.length > 0 && (
                <>
                  <SectionLabel title="Broker accounts" count={broker.length} />
                  <div className="space-y-1.5">
                    {broker.map((a) => (
                      <PickRow
                        key={a.id}
                        delay={nextDelay()}
                        checked={!allSelected && selectedIds.includes(a.id)}
                        onClick={() => toggleAccount(a.id)}
                        tile={<Tile grad={styleFor(a).grad}>{initial(a.broker_server)}</Tile>}
                        title={a.broker_server}
                        subtitle={accountSubtitle(a)}
                      />
                    ))}
                  </div>
                </>
              )}

              {imported.length > 0 && (
                <>
                  <SectionLabel title="Imported" count={imported.length} />
                  <div className="space-y-1.5">
                    {imported.map((a) => (
                      <PickRow
                        key={a.id}
                        delay={nextDelay()}
                        checked={!allSelected && selectedIds.includes(a.id)}
                        onClick={() => toggleAccount(a.id)}
                        tile={<Tile grad={styleFor(a).grad}>{initial(a.broker_server)}</Tile>}
                        title={a.broker_server}
                        subtitle={accountSubtitle(a)}
                      />
                    ))}
                  </div>
                </>
              )}

              {(manualAccounts.length > 0 || showManualEntries) && (
                <>
                  <SectionLabel title="Manual" count={manualAccounts.length + (showManualEntries ? 1 : 0)} />
                  <div className="space-y-1.5">
                    {showManualEntries && (
                      <PickRow
                        delay={nextDelay()}
                        checked={!allSelected && includeManual}
                        onClick={toggleManual}
                        tile={
                          <span className="h-10 w-10 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center flex-shrink-0 text-neutral-300">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4z" />
                            </svg>
                          </span>
                        }
                        title="Manual entries"
                        subtitle="Trades logged without an account"
                      />
                    )}
                    {manualAccounts.map((a) => (
                      <PickRow
                        key={a.id}
                        delay={nextDelay()}
                        checked={!allSelected && selectedIds.includes(a.id)}
                        onClick={() => toggleAccount(a.id)}
                        tile={<Tile grad={styleFor(a).grad}>{initial(a.broker_server)}</Tile>}
                        title={a.broker_server}
                        subtitle={accountSubtitle(a)}
                      />
                    ))}
                  </div>
                </>
              )}

              {nothingFound && (
                <p className="text-center text-sm text-neutral-500 py-8">No accounts match “{query}”.</p>
              )}
            </div>

            {/* footer */}
            <div className="relative flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-white/10 bg-black/30">
              <button
                onClick={() => {
                  closePanel();
                  router.push('/broker');
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 4.3a1 1 0 011.4 0l.7.7a1 1 0 001 .3l1-.2a1 1 0 011.2.8l.2 1a1 1 0 00.7.8l1 .3a1 1 0 01.7 1.2l-.3 1a1 1 0 00.3 1l.7.7a1 1 0 010 1.4l-.7.7a1 1 0 00-.3 1l.3 1a1 1 0 01-.7 1.2l-1 .3a1 1 0 00-.7.8l-.2 1a1 1 0 01-1.2.8l-1-.2a1 1 0 00-1 .3l-.7.7a1 1 0 01-1.4 0l-.7-.7a1 1 0 00-1-.3l-1 .2a1 1 0 01-1.2-.8l-.2-1a1 1 0 00-.7-.8l-1-.3a1 1 0 01-.7-1.2l.3-1a1 1 0 00-.3-1l-.7-.7a1 1 0 010-1.4l.7-.7a1 1 0 00.3-1l-.3-1a1 1 0 01.7-1.2l1-.3a1 1 0 00.7-.8l.2-1a1 1 0 011.2-.8l1 .2a1 1 0 001-.3l.7-.7z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                Manage accounts
              </button>
              <button
                onClick={closePanel}
                className="text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-violet-600 hover:opacity-90 rounded-xl px-6 py-2 shadow-lg shadow-indigo-600/30"
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
