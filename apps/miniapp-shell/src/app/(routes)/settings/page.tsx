'use client';

import { useTelegram } from '@/lib/telegram';

/**
 * Blueprint: settings -> central_hub district
 * Language, preferences, support, wallet management
 */
export default function SettingsPage() {
  const { locale } = useTelegram();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>
        {locale === 'tr' ? '⚙️ Ayarlar' : '⚙️ Settings'}
      </h2>

      <SettingsItem
        label={locale === 'tr' ? 'Dil' : 'Language'}
        value={locale === 'tr' ? 'Türkçe' : 'English'}
      />
      <SettingsItem
        label={locale === 'tr' ? 'Cüzdan' : 'Wallet'}
        value={locale === 'tr' ? 'Bağlı değil' : 'Not connected'}
      />
      <SettingsItem
        label={locale === 'tr' ? 'Bildirimler' : 'Notifications'}
        value={locale === 'tr' ? 'Açık' : 'Enabled'}
      />
      <SettingsItem
        label={locale === 'tr' ? 'Destek' : 'Support'}
        value="→"
      />
    </div>
  );
}

function SettingsItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}
