'use client';

import Link from 'next/link';
import { useTelegram } from '@/lib/telegram';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useAppStore } from '@/store/useAppStore';
import { useState, useEffect } from 'react';

export default function HubPage() {
  const { user, locale } = useTelegram();
  const { isLoading, isError, refetch } = useBootstrap();
  const { balances, bootstrapped, kingdomTier, passActive, bootstrapData } = useAppStore();
  const [streakDays, setStreakDays] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting(locale === 'tr' ? 'Gece kuşu' : 'Night owl');
    else if (hour < 12) setGreeting(locale === 'tr' ? 'Günaydın' : 'Good morning');
    else if (hour < 18) setGreeting(locale === 'tr' ? 'İyi günler' : 'Good afternoon');
    else setGreeting(locale === 'tr' ? 'İyi akşamlar' : 'Good evening');

    if (bootstrapData?.streak?.current_streak) {
      setStreakDays(bootstrapData.streak.current_streak);
    }
  }, [locale, bootstrapData]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div className="neon-spinner" />
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {locale === 'tr' ? 'Nexus yükleniyor...' : 'Loading Nexus...'}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title" style={{ color: 'var(--color-danger)' }}>
          {locale === 'tr' ? 'Bağlantı Hatası' : 'Connection Error'}
        </div>
        <div className="empty-state-desc">
          {locale === 'tr' 
            ? 'Sunucuya ulaşılamıyor. Lütfen tekrar dene.' 
            : 'Cannot reach server. Please try again.'}
        </div>
        <button className="neon-btn danger" onClick={() => refetch()}>
          {locale === 'tr' ? '🔄 Tekrar Dene' : '🔄 Retry'}
        </button>
      </div>
    );
  }

  const tierNames = ['Rookie', 'Scout', 'Warrior', 'Elite', 'Champion', 'Legend', 'Mythic', 'Nexus', 'Apex', 'Overlord'];
  const tierName = tierNames[Math.min(kingdomTier, tierNames.length - 1)] || 'Rookie';
  const tierProgress = Math.min(100, Math.round(((balances.sc || 0) / Math.max(1, (kingdomTier + 1) * 500)) * 100));

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="hero-banner" style={{ position: 'relative' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
          {greeting} 👋
        </div>
        <h1 className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user?.first_name ?? 'Pilot'}
          {passActive && (
            <span className="neon-badge premium" style={{ fontSize: 9 }}>
              👑 PREMIUM
            </span>
          )}
        </h1>
        <p className="hero-desc">
          {locale === 'tr'
            ? 'Nexus Arena seni bekliyor. Görevleri tamamla, ödüller kazan, tier atla.'
            : 'Nexus Arena awaits. Complete missions, earn rewards, level up.'}
        </p>

        {/* Streak indicator */}
        {streakDays > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span className="neon-badge success">
              🔥 {streakDays} {locale === 'tr' ? 'gün serisi' : 'day streak'}
            </span>
          </div>
        )}
      </div>

      {/* ── Tier Progress ────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{ padding: '14px 16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🏰</span>
            {tierName}
            <span className="neon-badge accent" style={{ fontSize: 9 }}>
              Tier {kingdomTier}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-accent)' }}>
            {tierProgress}%
          </span>
        </div>
        <div className="neon-progress">
          <div className="neon-progress-bar" style={{ width: `${tierProgress}%` }} />
        </div>
      </div>

      {/* ── Currency Grid ────────────────────────────────────── */}
      {bootstrapped && (
        <div className="currency-grid">
          <CurrencyCard label="SC" icon="💠" value={balances.sc} color="var(--color-sc)" />
          <CurrencyCard label="HC" icon="🪙" value={balances.hc} color="var(--color-hc)" />
          <CurrencyCard label="RC" icon="💎" value={balances.rc} color="var(--color-rc)" />
          <CurrencyCard
            label={locale === 'tr' ? 'ÇEKIM' : 'PAYOUT'}
            icon="💰"
            value={balances.payout_available ?? 0}
            color="var(--color-payout)"
          />
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div style={{ marginTop: 4 }}>
        <div className="section-header">
          <span className="section-title">
            {locale === 'tr' ? '⚡ Hızlı Erişim' : '⚡ Quick Actions'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ActionCard
            icon="⚔️"
            title={locale === 'tr' ? 'Görevler' : 'Missions'}
            subtitle={locale === 'tr' ? 'Günlük görev havuzu • Ödüller kazan' : 'Daily mission pool • Earn rewards'}
            href="/missions"
            accent
          />
          <ActionCard
            icon="🔮"
            title={locale === 'tr' ? 'Forge Atölyesi' : 'Forge Workshop'}
            subtitle={locale === 'tr' ? 'Loot kutuları • Ödül açılımı' : 'Loot boxes • Reward reveals'}
            href="/forge"
          />
          <ActionCard
            icon="💎"
            title={locale === 'tr' ? 'Token Borsası' : 'Token Exchange'}
            subtitle={locale === 'tr' ? 'Mint • Alım • Cüzdan işlemleri' : 'Mint • Buy • Wallet operations'}
            href="/exchange"
          />
          <ActionCard
            icon="🔐"
            title={locale === 'tr' ? 'Güvenli Kasa' : 'Secure Vault'}
            subtitle={locale === 'tr' ? 'BTC çekim • Payout durumu' : 'BTC withdrawal • Payout status'}
            href="/vault"
          />
        </div>
      </div>

      {/* ── Explore Grid ─────────────────────────────────────── */}
      <div style={{ marginTop: 4 }}>
        <div className="section-header">
          <span className="section-title">
            {locale === 'tr' ? '🧭 Keşfet' : '🧭 Explore'}
          </span>
        </div>

        <div className="mini-card-grid">
          <Link href="/events" className="mini-card">
            <span className="mini-card-icon">🎪</span>
            <span className="mini-card-label">Events</span>
          </Link>
          <Link href="/season" className="mini-card">
            <span className="mini-card-icon">🏆</span>
            <span className="mini-card-label">Season</span>
          </Link>
          <Link href="/settings" className="mini-card">
            <span className="mini-card-icon">⚙️</span>
            <span className="mini-card-label">{locale === 'tr' ? 'Ayarlar' : 'Settings'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function CurrencyCard({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  return (
    <div className="currency-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span className="currency-label">{label}</span>
      </div>
      <span className="currency-value" style={{ color }}>
        {value.toLocaleString('tr-TR')}
      </span>
    </div>
  );
}

function ActionCard({
  icon, title, subtitle, href, accent,
}: {
  icon: string; title: string; subtitle: string; href: string; accent?: boolean;
}) {
  return (
    <Link href={href} className={`action-card ${accent ? 'accent-border' : ''}`}>
      <div className="action-icon">{icon}</div>
      <div style={{ flex: 1 }}>
        <div className="action-title">{title}</div>
        <div className="action-subtitle">{subtitle}</div>
      </div>
    </Link>
  );
}
