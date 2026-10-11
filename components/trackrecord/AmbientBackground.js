'use client';

// Fixed, slow-drifting gradient orbs + faint grid behind the whole page.
// Pure CSS animation (see .tr-orb-* in globals.css); disabled for reduced motion.
export default function AmbientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a] pointer-events-none no-print">
      <div className="tr-orb tr-orb-a absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="tr-orb tr-orb-b absolute top-1/3 -right-40 h-[560px] w-[560px] rounded-full bg-emerald-500/15 blur-[130px]" />
      <div className="tr-orb tr-orb-c absolute -bottom-48 left-1/4 h-[480px] w-[480px] rounded-full bg-fuchsia-600/15 blur-[130px]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 20%, black 20%, transparent 75%)',
        }}
      />
    </div>
  );
}
