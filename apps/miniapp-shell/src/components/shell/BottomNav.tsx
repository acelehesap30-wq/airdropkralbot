'use client';

import Link from 'next/link';

/**
 * Blueprint Section 7: fast travel anchors
 * Core player routes: hub, missions, forge, exchange, vault
 */
const NAV_ITEMS = [
  { key: 'hub', label: 'Hub', icon: '🏠', href: '/hub' },
  { key: 'missions', label: 'Missions', icon: '⚔️', href: '/missions' },
  { key: 'forge', label: 'Forge', icon: '🔮', href: '/forge' },
  { key: 'exchange', label: 'Exchange', icon: '💱', href: '/exchange' },
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
        padding: '6px 0',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        zIndex: 10,
      }}
    >
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
              gap: 2,
              textDecoration: 'none',
              color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              transition: 'color 0.15s',
              padding: '4px 8px',
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
