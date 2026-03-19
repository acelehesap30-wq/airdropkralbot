'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface CurrencyTickerProps {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Animation duration in ms (default 600) */
  duration?: number;
  style?: CSSProperties;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Rolling number animation for currency display.
 * Animates smoothly from the previous value to the new value.
 */
export function CurrencyTicker({
  value,
  prefix = '',
  suffix = '',
  duration = 600,
  style,
}: CurrencyTickerProps) {
  const [display, setDisplay] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    if (from === to) return;

    const startTime = performance.now();
    const diff = to - from;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = from + diff * eased;
      setDisplay(Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span
      className="count-up"
      key={value}
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
