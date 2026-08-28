'use client';

import { useEffect, useState } from 'react';

export default function BatteryCellIcon({ percent, size = 44, color = 'red' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplay(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const fillColor = color === 'red' ? 'from-red-600 to-red-400' : color === 'green' ? 'from-green-600 to-green-400' : 'from-indigo-600 to-indigo-400';
  const textColor = color === 'red' ? 'text-red-500' : color === 'green' ? 'text-green-600' : 'text-indigo-600';
  const width = size * 0.55;
  const height = size;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center" style={{ width, height: height + 6 }}>
        <div className="bg-gray-300 rounded-t-sm" style={{ width: width * 0.4, height: 4 }} />
        <div
          className="relative border-2 border-gray-300 rounded-md overflow-hidden bg-gray-50"
          style={{ width, height }}
        >
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fillColor} transition-all duration-[1000ms] ease-out`}
            style={{ height: `${Math.min(100, display)}%` }}
          />
        </div>
      </div>
      <div className={`text-sm font-bold mt-1 ${textColor}`}>{percent.toFixed(0)}%</div>
    </div>
  );
}
