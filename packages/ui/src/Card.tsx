import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  accent?: boolean;
  style?: CSSProperties;
}

export function Card({ children, accent, style }: CardProps) {
  return (
    <div
      style={{
        background: accent ? 'var(--color-accent-glow)' : 'var(--color-surface)',
        border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
