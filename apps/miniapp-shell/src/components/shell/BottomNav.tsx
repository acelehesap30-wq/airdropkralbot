'use client';

import Link from 'next/link';
import { useCallback, useRef, useEffect, useState } from 'react';

const NAV_ITEMS = [
  { key: 'hub', label: 'Hub', icon: '\u26A1', href: '/hub' },
  { key: 'missions', label: 'G\u00F6revler', icon: '\uD83C\uDFAF', href: '/missions' },
  { key: 'arena', label: 'Arena', icon: '\u2694\uFE0F', href: '/arena' },
  { key: 'forge', label: 'Forge', icon: '\uD83D\uDD25', href: '/forge' },
  { key: 'vault', label: 'Vault', icon: '\uD83D\uDD10', href: '/vault' },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]['key'];

interface BottomNavProps {
  currentPath: string;
  badges?: Partial<Record<NavKey, number>>;
}

function triggerHaptic() {
  try {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  } catch {
    /* silently ignore when unavailable */
  }
}

export function BottomNav({ currentPath, badges }: BottomNavProps) {
  const prevActiveRef = useRef<string | null>(null);
  const [activatingKey, setActivatingKey] = useState<string | null>(null);

  /* Track which tab just became active for the scale animation */
  useEffect(() => {
    const activeKey = NAV_ITEMS.find((item) => currentPath.startsWith(item.href))?.key ?? null;
    if (activeKey && activeKey !== prevActiveRef.current) {
      setActivatingKey(activeKey);
      const timer = setTimeout(() => setActivatingKey(null), 300);
      prevActiveRef.current = activeKey;
      return () => clearTimeout(timer);
    }
    prevActiveRef.current = activeKey;
  }, [currentPath]);

  const handleTabClick = useCallback(() => {
    triggerHaptic();
  }, []);

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
        const isActivating = activatingKey === item.key;
        const badgeCount = badges?.[item.key];

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={handleTabClick}
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
              transition: 'color 0.2s ease, transform 0.15s ease',
              padding: '4px 10px',
              position: 'relative',
              transform: isActivating ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {/* Active indicator bar */}
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

            {/* Icon with optional badge */}
            <span
              style={{
                fontSize: 20,
                filter: active ? 'drop-shadow(0 0 6px rgba(0,212,255,0.5))' : 'none',
                transition: 'filter 0.2s ease, transform 0.2s ease',
                position: 'relative',
                display: 'inline-flex',
              }}
            >
              {item.icon}
              {/* Notification badge */}
              {badgeCount != null && badgeCount > 0 && (
                <span className="nav-badge">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </span>

            {/* Label */}
            <span
              style={{
                textTransform: 'uppercase',
                transition: 'color 0.2s ease',
              }}
            >
              {item.label}
            </span>

            {/* Active glow underlay */}
            {active && (
              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(0, 212, 255, 0.08)',
                  filter: 'blur(10px)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
