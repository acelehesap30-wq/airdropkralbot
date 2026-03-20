'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch } from '@/lib/api';

interface AlertFamily {
  key: string;
  tr: string;
  en: string;
}

const ALERT_FAMILIES: AlertFamily[] = [
  { key: 'payout_status', tr: 'Odeme Durumu', en: 'Payout Status' },
  { key: 'quest_complete', tr: 'Gorev Tamamlama', en: 'Quest Complete' },
  { key: 'pvp_result', tr: 'PvP Sonuclari', en: 'PvP Results' },
  { key: 'season_milestone', tr: 'Sezon Hedefleri', en: 'Season Milestones' },
  { key: 'chest_rare_drop', tr: 'Nadir Kasa Droplari', en: 'Rare Chest Drops' },
  { key: 'daily_reminder', tr: 'Gunluk Hatirlatma', en: 'Daily Reminder' },
  { key: 'referral_bonus', tr: 'Davet Bonusu', en: 'Referral Bonus' },
  { key: 'token_price_alert', tr: 'Token Fiyat Uyarisi', en: 'Token Price Alert' },
  { key: 'chest_ready', tr: 'Kasa Hazir', en: 'Chest Ready' },
  { key: 'mission_refresh', tr: 'Gorev Yenileme', en: 'Mission Refresh' },
  { key: 'event_countdown', tr: 'Etkinlik Geri Sayimi', en: 'Event Countdown' },
  { key: 'kingdom_war', tr: 'Krallik Savasi', en: 'Kingdom War' },
  { key: 'streak_risk', tr: 'Seri Riski', en: 'Streak Risk' },
  { key: 'comeback_offer', tr: 'Geri Donus Teklifi', en: 'Comeback Offer' },
];

export default function SettingsPage() {
  const { locale, user } = useTelegram();
  const { setLocale, telegramId, session } = useAppStore();
  const isTr = locale === 'tr';

  const [notifPrefs, setNotifPrefs] = useState<Record<string, { enabled: boolean }>>({});
  const [saving, setSaving] = useState(false);

  // Fetch notification preferences
  useEffect(() => {
    if (!session?.uid) return;
    const ctrl = new AbortController();
    apiFetch<{ data: { notification_preferences: Record<string, { enabled: boolean }> } }>(
      `/v2/notification/preferences?uid=${session.uid}&ts=${session.ts}&sig=${session.sig}`,
      { signal: ctrl.signal },
    )
      .then((res) => setNotifPrefs(res.data.notification_preferences ?? {}))
      .catch(() => {/* offline */});
    return () => ctrl.abort();
  }, [session]);

  const toggleAlert = useCallback(async (key: string, enabled: boolean) => {
    // Optimistic update
    setNotifPrefs((prev) => ({ ...prev, [key]: { enabled } }));
    setSaving(true);
    try {
      await apiFetch('/v2/notification/preferences', {
        method: 'POST',
        body: {
          uid: session?.uid,
          ts: session?.ts,
          sig: session?.sig,
          notification_preferences: { [key]: { enabled } },
        },
      });
    } catch {
      // Revert on failure
      setNotifPrefs((prev) => ({ ...prev, [key]: { enabled: !enabled } }));
    } finally {
      setSaving(false);
    }
  }, [session]);

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hero-banner">
        <h1 className="hero-title">{isTr ? 'Ayarlar' : 'Settings'}</h1>
        <p className="hero-desc">
          {isTr ? 'Dil, bildirim ve hesap ayarlarini yonet.' : 'Manage language, notifications and account settings.'}
        </p>
      </div>

      {/* Profile */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>{isTr ? 'Profil' : 'Profile'}</div>
        <SettingRow label={isTr ? 'Kullanici Adi' : 'Username'} value={user?.username ? `@${user.username}` : '\u2014'} />
        <SettingRow label="Telegram ID" value={String(telegramId || user?.id || '\u2014')} />
        <SettingRow label={isTr ? 'Platform' : 'Platform'} value="Telegram Mini App" isLast />
      </div>

      {/* Language */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>{isTr ? 'Dil Tercihi' : 'Language'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <button
            className="neon-btn"
            onClick={() => setLocale('tr')}
            style={{
              background: locale === 'tr' ? 'var(--color-accent-glow-strong)' : 'transparent',
              borderColor: locale === 'tr' ? 'var(--color-accent)' : 'var(--color-border)',
              color: locale === 'tr' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            TR Turkce
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
            EN English
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-title">{isTr ? 'Bildirim Tercihleri' : 'Notification Preferences'}</div>
          {saving && <span className="neon-badge accent" style={{ fontSize: 10 }}>{isTr ? 'Kaydediliyor...' : 'Saving...'}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ALERT_FAMILIES.map((alert) => {
            const isEnabled = notifPrefs[alert.key]?.enabled !== false;
            return (
              <div
                key={alert.key}
                role="button"
                tabIndex={0}
                onClick={() => toggleAlert(alert.key, !isEnabled)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleAlert(alert.key, !isEnabled); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', cursor: 'pointer',
                  borderBottom: '1px solid rgba(42,42,62,0.15)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {isTr ? alert.tr : alert.en}
                </span>
                <span className={`neon-badge ${isEnabled ? 'success' : ''}`} style={{ fontSize: 10, minWidth: 36, textAlign: 'center' }}>
                  {isEnabled ? (isTr ? 'Acik' : 'On') : (isTr ? 'Kapali' : 'Off')}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
          {isTr
            ? 'Sistem ve admin bildirimleri her zaman acik kalir.'
            : 'System and admin notifications are always enabled.'}
        </div>
      </div>

      {/* App info */}
      <div className="glass-card" style={{ padding: 16 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>{isTr ? 'Uygulama Bilgisi' : 'App Info'}</div>
        <SettingRow label="Version" value="3.2.0" />
        <SettingRow label="API" value="v2" />
        <SettingRow label={isTr ? 'Tema' : 'Theme'} value="Neon Arena (Dark)" />
        <SettingRow label="Build" value="Nexus 2026" isLast />
      </div>

      {/* Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="https://t.me/airdropkral_2026_bot" target="_blank" rel="noopener" className="action-card">
          <div className="action-icon">Bot</div>
          <div style={{ flex: 1 }}>
            <div className="action-title">Bot Panel</div>
            <div className="action-subtitle">{isTr ? 'Telegram bot komutlarina don' : 'Return to bot commands'}</div>
          </div>
        </a>
        <a href="https://t.me/airdropkral_community" target="_blank" rel="noopener" className="action-card">
          <div className="action-icon">Chat</div>
          <div style={{ flex: 1 }}>
            <div className="action-title">{isTr ? 'Topluluk' : 'Community'}</div>
            <div className="action-subtitle">{isTr ? 'Telegram topluluk grubuna katil' : 'Join Telegram community group'}</div>
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
