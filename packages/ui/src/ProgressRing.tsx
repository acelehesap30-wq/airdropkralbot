import type { CSSProperties } from 'react';

interface ProgressRingProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Diameter of the ring in px (default 64) */
  size?: number;
  /** Stroke color (default var(--color-accent)) */
  color?: string;
  /** Center label text */
  label?: string;
}

/**
 * SVG circular progress indicator.
 * Renders a track ring with a colored arc representing value/max.
 */
export function ProgressRing({
  value,
  max,
  size = 64,
  color = 'var(--color-accent)',
  label,
}: ProgressRingProps) {
  const strokeWidth = Math.max(3, Math.round(size / 14));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), max);
  const ratio = max > 0 ? clamped / max : 0;
  const offset = circumference * (1 - ratio);

  const center = size / 2;

  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    fontSize: Math.max(9, Math.round(size / 5)),
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-primary)',
    textAlign: 'center',
    lineHeight: 1.2,
    maxWidth: radius * 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          opacity={0.4}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      </svg>
      {label != null && <span style={labelStyle}>{label}</span>}
    </div>
  );
}
