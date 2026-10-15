'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftGlyph, ChevronRightGlyph, CloseGlyph } from './DayIcons';

// Full-screen screenshot viewer. Rendered in a portal so it sits above the
// bottom nav and everything else. Swipe, arrow keys, thumbnails and Esc all work.
// items: [{ url, caption?, sub? }]
export default function Lightbox({ items, index, onIndex, onClose }) {
  const touchX = useRef(null);
  const count = items.length;
  const current = items[index];

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && count > 1) onIndex((index + 1) % count);
      else if (e.key === 'ArrowLeft' && count > 1) onIndex((index - 1 + count) % count);
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, count, onIndex, onClose]);

  if (!current || typeof document === 'undefined') return null;

  const go = (dir) => count > 1 && onIndex((index + dir + count) % count);

  return createPortal(
    <div
      className="pf-fade fixed inset-0 z-[90] flex flex-col bg-black/90 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Trade screenshot"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          {current.caption && <div className="text-sm font-medium text-neutral-100 truncate">{current.caption}</div>}
          {current.sub && <div className="text-xs text-neutral-400">{current.sub}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {count > 1 && <span className="text-xs tabular-nums text-neutral-400">{index + 1} / {count}</span>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-100 flex items-center justify-center"
          >
            <CloseGlyph size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16">
        {count > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous screenshot"
            className="hidden sm:flex absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-neutral-100 items-center justify-center"
          >
            <ChevronLeftGlyph size={20} />
          </button>
        )}
        <img
          key={current.url}
          src={current.url}
          alt={current.caption || 'Trade screenshot'}
          onClick={(e) => e.stopPropagation()}
          className="pf-pop max-h-full max-w-full object-contain rounded-xl shadow-2xl"
        />
        {count > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next screenshot"
            className="hidden sm:flex absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-neutral-100 items-center justify-center"
          >
            <ChevronRightGlyph size={20} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 overflow-x-auto">
          {count > 1 &&
            items.map((it, i) => (
              <button
                key={it.url}
                onClick={() => onIndex(i)}
                aria-label={`Show screenshot ${i + 1}`}
                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  i === index ? 'border-indigo-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={it.url} alt="" className="h-12 w-12 object-cover" />
              </button>
            ))}
        </div>
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-xs font-medium text-indigo-300 hover:text-indigo-200"
        >
          Open original ↗
        </a>
      </div>
    </div>,
    document.body
  );
}
