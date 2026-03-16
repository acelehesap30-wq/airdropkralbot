'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: events -> live_event_overlay district
 * Active events, countdowns, participation
 */
export default function EventsPage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '🎪 Etkinlikler' : '🎪 Events'}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
        {locale === 'tr'
          ? 'Aktif etkinlikler, geri sayımlar ve katılım.'
          : 'Active events, countdowns and participation.'}
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
        {locale === 'tr' ? 'Etkinlik verileri yükleniyor...' : 'Loading event data...'}
      </div>
    </div>
  );
}
