'use client';

import { useEffect, useRef, useState } from 'react';

// Respect the OS "reduce motion" setting: JS-driven animations jump straight
// to their final state instead of playing.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

// Flips to true (once) when the element first scrolls into view.
export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// 0 -> 1 with ease-out-cubic once `active` turns true.
export function useProgress(active, duration = 1400, delay = 0) {
  const reduced = usePrefersReducedMotion();
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setP(1);
      return;
    }
    let raf;
    let start;
    const timer = setTimeout(() => {
      const tick = (ts) => {
        if (start === undefined) start = ts;
        const x = Math.min(1, (ts - start) / duration);
        setP(1 - Math.pow(1 - x, 3));
        if (x < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [active, reduced, duration, delay]);
  return p;
}
