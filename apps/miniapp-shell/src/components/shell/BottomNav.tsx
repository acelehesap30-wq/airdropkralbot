'use client';

import Link from 'next/link';

const NAV_ITEMS = [
  { key: 'hub', label: 'Hub', icon: '⚡', href: '/hub' },
  { key: 'missions', label: 'Görevler', icon: '🎯', href: '/missions' },
  { key: 'arena', label: 'Arena', icon: '⚔️', href: '/arena' },
  { key: 'forge', label: 'Forge', icon: '🔥', href: '/forge' },
  { key: 'vault', label: 'Vault', icon: '🔐', href: '/vault' },
] as const;

interface BottomNavProps {
  currentPath: string;
}

export function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 4px 10px',
        background: 'rgba(8, 8, 14, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* Scan line effect at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
          opacity: 0.4,
        }}
      />

      {NAV_ITEMS.map((item) => {
        const active = currentPath.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textDecoration: 'none',
              color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.3px',
              transition: 'all 0.15s ease',
              padding: '4px 10px',
              position: 'relative',
            }}
          >
            {/* Active indicator dot */}
            {active && (
              <div
                style={{
                  position: 'absolute',
                  top: -8,
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  background: 'var(--color-accent)',
                  boxShadow: '0 0 8px var(--color-accent)',
                }}
              />
            )}
            <span style={{ fontSize: 20, filter: active ? 'drop-shadow(0 0 6px rgba(0,212,255,0.5))' : 'none' }}>
              {item.icon}
            </span>
            <span style={{ textTransform: 'uppercase' }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
