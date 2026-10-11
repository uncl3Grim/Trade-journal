'use client';

import { useInView, useProgress } from '../../lib/useMotion';

// Fades + lifts its children in the first time they scroll into view.
export function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView(0.08);
  return (
    <div
      ref={ref}
      className={`tr-reveal ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(16px)',
        transition: `opacity 700ms ease ${delay}ms, transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Glass card in the same style as the rest of the app, with a soft top highlight.
export function GlassCard({ title, subtitle, right, children, className = '', delay = 0 }) {
  return (
    <Reveal delay={delay} className={className}>
      <section className="relative h-full bg-white/[0.04] backdrop-blur-md border border-neutral-800/60 rounded-2xl p-4 sm:p-5 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {(title || right) && (
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-heading font-semibold text-neutral-100 text-sm sm:text-base">{title}</h2>
              {subtitle && <p className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</p>}
            </div>
            {right}
          </div>
        )}
        {children}
      </section>
    </Reveal>
  );
}

// Number that counts up from 0 when it scrolls into view.
export function CountUp({ value, format, duration = 1400, delay = 0 }) {
  const [ref, inView] = useInView(0.3);
  const p = useProgress(inView, duration, delay);
  const finite = value !== null && value !== undefined && isFinite(value);
  return <span ref={ref}>{finite ? format(value * p) : format(value)}</span>;
}
