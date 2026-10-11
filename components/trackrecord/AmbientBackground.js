'use client';

// Plain near-black page background — the same dark as the calendar page.
export default function AmbientBackground() {
  return <div aria-hidden className="fixed inset-0 z-0 bg-[#0a0a0a] pointer-events-none no-print" />;
}
