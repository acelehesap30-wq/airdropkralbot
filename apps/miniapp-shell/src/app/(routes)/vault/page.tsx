'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: vault -> exchange_district
 * Payout eligibility, lock status, drip limit, withdrawal
 * Blueprint: Value is shown before wallet connect
 */
export default function VaultPage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '🔐 Vault' : '🔐 Vault'}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
        {locale === 'tr'
          ? 'Payout uygunluğu, çekim durumu ve bakiye özeti.'
          : 'Payout eligibility, withdrawal status and balance summary.'}
      </p>

      {/* Payout status card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          {locale === 'tr' ? 'Çekilebilir Bakiye' : 'Withdrawable Balance'}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          — BTC
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {locale === 'tr'
            ? 'Market cap gate: $20,000,000 gerekli'
            : 'Market cap gate: $20,000,000 required'}
        </div>
      </div>

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
        {locale === 'tr' ? 'Payout verileri yükleniyor...' : 'Loading payout data...'}
      </div>
    </div>
  );
}
