'use client';

import { useTelegram } from '@/lib/telegram';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useAppStore } from '@/store/useAppStore';

/**
 * Blueprint Section 3: First run — hub with panel=onboarding
 * Day 0 loop: hub -> missions -> forge -> exchange/vault
 * One next safe step, not a feature wall
 */
export default function HubPage() {
  const { user, locale } = useTelegram();
  const { isLoading, isError } = useBootstrap();
  const { balances, bootstrapped, kingdomTier } = useAppStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Loading / Error states */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-secondary)' }}>
          ⏳ {locale === 'tr' ? 'Yükleniyor...' : 'Loading...'}
        </div>
      )}

      {isError && (
        <div style={{ textAlign: 'center', padding: 20, color: '#ff6b6b', background: 'rgba(255,107,107,0.08)', borderRadius: 'var(--radius-md)' }}>
          ⚠️ {locale === 'tr' ? 'Bağlantı hatası. Tekrar dene.' : 'Connection error. Try again.'}
        </div>
      )}

      {/* Welcome card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {locale === 'tr' ? 'Hoş geldin' : 'Welcome'}, {user?.first_name ?? 'Pilot'} ⚡
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
          {locale === 'tr'
            ? 'Nexus Arena seni bekliyor. İlk görevini kabul et ve ödül yolunu aç.'
            : 'Nexus Arena awaits. Accept your first mission and unlock your reward path.'}
        </p>
      </div>

      {/* Blueprint: Unified currency display — SC, HC, RC, payout_available */}
      {bootstrapped && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
          }}
        >
          <CurrencyBadge label="SC" value={balances.sc} color="#00e5ff" />
          <CurrencyBadge label="HC" value={balances.hc} color="#ffd740" />
          <CurrencyBadge label="RC" value={balances.rc} color="#e040fb" />
          <CurrencyBadge label={locale === 'tr' ? 'Çekilebilir' : 'Payout'} value={balances.payout_available} color="#69f0ae" />
        </div>
      )}

      {/* Quick actions — Blueprint: one clear action per message */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ActionCard
          icon="⚔️"
          title={locale === 'tr' ? 'Görevler' : 'Missions'}
          subtitle={locale === 'tr' ? 'Günlük görev havuzunu aç' : 'Open daily mission pool'}
          href="/missions"
          accent
        />
        <ActionCard
          icon="🔮"
          title={locale === 'tr' ? 'Forge' : 'Forge'}
          subtitle={locale === 'tr' ? 'Ödülleri keşfet ve aç' : 'Discover and reveal rewards'}
          href="/forge"
        />
        <ActionCard
          icon="💱"
          title={locale === 'tr' ? 'Exchange' : 'Exchange'}
          subtitle={locale === 'tr' ? 'Token ve cüzdan işlemleri' : 'Token and wallet operations'}
          href="/exchange"
        />
        <ActionCard
          icon="🔐"
          title={locale === 'tr' ? 'Vault' : 'Vault'}
          subtitle={locale === 'tr' ? 'Payout durumu ve çekim' : 'Payout status and withdrawal'}
          href="/vault"
        />
      </div>
    </div>
  );
}

function CurrencyBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value.toLocaleString()}</span>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  href,
  accent,
}: {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: accent ? 'var(--color-accent-glow)' : 'var(--color-surface)',
        border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 24 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{subtitle}</div>
      </div>
    </a>
  );
}
