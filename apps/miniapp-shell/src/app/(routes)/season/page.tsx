'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: season -> season_hall district
 * Season stats, rank, leaderboard
 */
export default function SeasonPage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '🏆 Sezon Salonu' : '🏆 Season Hall'}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
        {locale === 'tr'
          ? 'Sezon puanı, sıralama ve ödül hedefleri.'
          : 'Season points, ranking and reward targets.'}
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
        {locale === 'tr' ? 'Sezon verileri yükleniyor...' : 'Loading season data...'}
      </div>
    </div>
  );
}
