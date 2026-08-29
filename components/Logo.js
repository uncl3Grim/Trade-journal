'use client';

export default function Logo({ size = 'default' }) {
  const isSmall = size === 'small';
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${isSmall ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'} rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0`}
      >
        E
      </div>
      {!isSmall && <span className="font-heading font-bold text-lg text-gray-900 dark:text-gray-100">Edgewise</span>}
    </div>
  );
}
