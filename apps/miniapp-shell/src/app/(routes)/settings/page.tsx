'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

export default function SettingsPage() {
  const { locale, user } = useTelegram();
  const { setLocale, bootstrapped, telegramId } = useAppStore();
  const isTr = locale === 'tr';

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hero-banner">
        <h1 className="hero-title">⚙️ {isTr ? 'Ayarlar' : 'Settings'}</h1>
        <p className="hero-desc">
          {isTr ? 'Dil, bildirim ve hesap ayarlarını yönet.' : 'Manage language, notifications and account settings.'}
        </p>
      </div>

      {/* Profile */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>👤 {isTr ? 'Profil' : 'Profile'}</div>
        <SettingRow label={isTr ? 'Kullanıcı Adı' : 'Username'} value={user?.username ? `@${user.username}` : '—'} />
        <SettingRow label="Telegram ID" value={String(telegramId || user?.id || '—')} />
        <SettingRow label={isTr ? 'Platform' : 'Platform'} value="Telegram Mini App" isLast />
      </div>

      {/* Language */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>🌐 {isTr ? 'Dil Tercihi' : 'Language'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <button
            className={`neon-btn ${locale === 'tr' ? '' : ''}`}
            onClick={() => setLocale('tr')}
            style={{
              background: locale === 'tr' ? 'var(--color-accent-glow-strong)' : 'transparent',
              borderColor: locale === 'tr' ? 'var(--color-accent)' : 'var(--color-border)',
              color: locale === 'tr' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            🇹🇷 Türkçe
          </button>
          <button
            className="neon-btn"
            onClick={() => setLocale('en')}
            style={{
              background: locale === 'en' ? 'var(--color-accent-glow-strong)' : 'transparent',
              borderColor: locale === 'en' ? 'var(--color-accent)' : 'var(--color-border)',
              color: locale === 'en' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      {/* App info */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>ℹ️ {isTr ? 'Uygulama Bilgisi' : 'App Info'}</div>
        <SettingRow label="Version" value="3.2.0" />
        <SettingRow label="API" value="v2" />
        <SettingRow label={isTr ? 'Tema' : 'Theme'} value="Neon Arena (Dark)" />
        <SettingRow label="Build" value="Nexus 2026" isLast />
      </div>

      {/* Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="https://t.me/airdropkral_2026_bot" target="_blank" rel="noopener" className="action-card">
          <div className="action-icon">🤖</div>
          <div style={{ flex: 1 }}>
            <div className="action-title">Bot Panel</div>
            <div className="action-subtitle">{isTr ? 'Telegram bot komutlarına dön' : 'Return to bot commands'}</div>
          </div>
        </a>
        <a href="https://t.me/airdropkral_community" target="_blank" rel="noopener" className="action-card">
          <div className="action-icon">💬</div>
          <div style={{ flex: 1 }}>
            <div className="action-title">{isTr ? 'Topluluk' : 'Community'}</div>
            <div className="action-subtitle">{isTr ? 'Telegram topluluk grubuna katıl' : 'Join Telegram community group'}</div>
          </div>
        </a>
      </div>
    </div>
  );
}

function SettingRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(42,42,62,0.2)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{value}</span>
    </div>
  );
}
