'use client';

import { useEffect, useState } from 'react';

export default function AnimatedDrawdownTank({ percent, label = 'of max drawdown' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplay(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-10 h-20 border-2 border-neutral-700 rounded-full overflow-hidden bg-white/[0.03]">
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-[1200ms] ease-out"
          style={{ height: `${Math.min(100, display)}%` }}
        />
      </div>
      <div className="text-lg font-bold text-rose-400 mt-2">{percent.toFixed(0)}%</div>
      <div className="text-[10px] text-neutral-500">{label}</div>
    </div>
  );
}
