'use client';

import { useEffect, useState } from 'react';

export default function AnimatedDrawdownTank({ percent }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplay(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-10 h-20 border-2 border-gray-300 rounded-full overflow-hidden bg-gray-50">
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-red-400 transition-all duration-[1200ms] ease-out"
          style={{ height: `${Math.min(100, display)}%` }}
        />
      </div>
      <div className="text-lg font-bold text-red-500 mt-2">{percent.toFixed(0)}%</div>
      <div className="text-[10px] text-gray-400">of max drawdown</div>
    </div>
  );
}
