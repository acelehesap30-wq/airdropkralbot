'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

export function TopBar() {
  const { user, locale } = useTelegram();
  const { balances, bootstrapped, kingdomTier } = useAppStore();

  const tierEmojis = ['🌑', '🌒', '🌓', '🌔', '🌕', '⭐', '💫', '✨', '👑', '🏆'];
  const tierEmoji = tierEmojis[Math.min(kingdomTier, tierEmojis.length - 1)] || '🌑';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(8, 8, 14, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* Brand + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-accent), #0066cc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 0 12px rgba(0, 212, 255, 0.3)',
          }}
        >
          {user?.first_name?.[0]?.toUpperCase() || 'N'}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.2px' }}>
            {user?.first_name ?? 'Nexus Pilot'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{tierEmoji}</span>
            <span>Tier {kingdomTier}</span>
            <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
            <span style={{ textTransform: 'uppercase' }}>{locale}</span>
          </div>
        </div>
      </div>

      {/* SC balance */}
      {bootstrapped && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: 'rgba(0, 229, 255, 0.06)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-sc)',
              boxShadow: '0 0 6px var(--color-sc)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-sc)',
            }}
          >
            {balances.sc.toLocaleString()}
          </span>
        </div>
      )}
    </header>
  );
}
