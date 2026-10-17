'use client';

import { gradientFor } from '../../lib/profile';
import { avatarFor } from './ProfileIcons';

export default function ProfileAvatar({ icon, gradient, size = 64, ring = false, className = '' }) {
  const g = gradientFor(gradient);
  const a = avatarFor(icon);
  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={a.key}
      src={a.src}
      alt=""
      width={256}
      height={256}
      draggable={false}
      className="pf-avatar-inner pf-icon-pop block"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        objectFit: 'cover',
        boxShadow: `0 10px 30px -10px ${g.from}99`,
      }}
    />
  );
  if (!ring) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        {inner}
      </div>
    );
  }
  return (
    <div className={`pf-ring ${className}`} style={{ width: size, height: size, '--g1': g.from, '--g2': g.to }}>
      <div className="pf-ring-gap">{inner}</div>
    </div>
  );
}
