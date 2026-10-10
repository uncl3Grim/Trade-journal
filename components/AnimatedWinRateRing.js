'use client';

import { useEffect, useState } from 'react';

export default function AnimatedWinRateRing({ percent }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplay(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} className="stroke-neutral-800" strokeWidth="8" fill="none" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="#818cf8"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 1200ms ease-out' }}
        />
        <text
          x="48"
          y="54"
          textAnchor="middle"
          fontSize="18"
          fontWeight="700"
          className="fill-neutral-100"
        >
          {percent.toFixed(0)}%
        </text>
      </svg>
      <div className="text-[10px] text-neutral-500 mt-1">Win rate</div>
    </div>
  );
}
