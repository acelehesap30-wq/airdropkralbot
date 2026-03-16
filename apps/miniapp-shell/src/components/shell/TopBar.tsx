'use client';

import { useTelegram } from '@/lib/telegram';
import { useTonConnectUI } from '@tonconnect/ui-react';

/**
 * Blueprint: TopBar — status + wallet indicator
 * Shows user identity, wallet connection state, and locale
 */
export function TopBar() {
  const { user, locale } = useTelegram();
  const [tonConnectUI] = useTonConnectUI();
  const connected = tonConnectUI?.connected ?? false;

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          ⚡ {user?.first_name ?? 'Nexus'}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          {locale}
        </span>
      </div>
      <button
        onClick={() => {
          if (connected) {
            tonConnectUI.disconnect();
          } else {
            tonConnectUI.openModal();
          }
        }}
        style={{
          background: connected
            ? 'var(--color-accent-glow)'
            : 'var(--color-surface-elevated)',
          color: connected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          border: `1px solid ${connected ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {connected ? '◆ TON' : '○ Connect'}
      </button>
    </header>
  );
}
