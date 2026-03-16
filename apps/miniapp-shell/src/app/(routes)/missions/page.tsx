'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: missions -> mission_quarter district
 * accept or resume mission -> forge -> reveal
 */
export default function MissionsPage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '⚔️ Görev Merkezi' : '⚔️ Mission Quarter'}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
        {locale === 'tr'
          ? 'Günlük görev havuzundan bir görev kabul et. Bitir, aç, kazan.'
          : 'Accept a task from the daily pool. Finish, reveal, earn.'}
      </p>

      {/* Task cards will be populated from /v2/bootstrap */}
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
        {locale === 'tr' ? 'Görevler yükleniyor...' : 'Loading missions...'}
      </div>
    </div>
  );
}
