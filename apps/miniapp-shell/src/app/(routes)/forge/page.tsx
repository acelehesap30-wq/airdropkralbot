'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: forge -> loot_forge district
 * Reveal or inspect rewards, chest opening
 */
export default function ForgePage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '🔮 Loot Forge' : '🔮 Loot Forge'}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
        {locale === 'tr'
          ? 'Tamamlanan görevlerin ödüllerini burada aç ve keşfet.'
          : 'Reveal and discover rewards from completed missions here.'}
      </p>

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
        {locale === 'tr' ? 'Ödüller yükleniyor...' : 'Loading rewards...'}
      </div>
    </div>
  );
}
