'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: exchange -> exchange_district
 * Token wallet, mint, buy intent, wallet connect
 */
export default function ExchangePage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '💱 Exchange' : '💱 Exchange'}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
        {locale === 'tr'
          ? 'NXT token mint, alım ve cüzdan bağlantısı.'
          : 'NXT token mint, purchase and wallet connection.'}
      </p>

      {/* Token summary + wallet section */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: 13,
        }}
      >
        {locale === 'tr' ? 'Token verileri yükleniyor...' : 'Loading token data...'}
      </div>
    </div>
  );
}
