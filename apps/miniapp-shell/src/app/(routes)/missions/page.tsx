'use client';

import Link from 'next/link';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

const MISSIONS = [
  { id: 'm1', icon: '🎯', tier: 'daily', reward: 50, currency: 'SC', title_tr: 'Günlük Keşif Görevi', title_en: 'Daily Recon Mission', desc_tr: 'Arena\'da 3 maç tamamla ve puanını artır. Her maç SC ödülü verir.', desc_en: 'Complete 3 arena matches and boost your score. Each match gives SC rewards.', progress: 2, target: 3, xp: 120, time_left: '18:42:11' },
  { id: 'm2', icon: '⚔️', tier: 'weekly', reward: 200, currency: 'SC', title_tr: 'Haftalık PvP Turnuvası', title_en: 'Weekly PvP Tournament', desc_tr: '10 PvP raid tamamla. Kontrat bonusu x2 aktif. En yüksek ELO +45.', desc_en: 'Complete 10 PvP raids. Contract bonus x2 active. Highest ELO +45.', progress: 6, target: 10, xp: 500, time_left: '5d 12:30:00' },
  { id: 'm3', icon: '🏰', tier: 'epic', reward: 15, currency: 'HC', title_tr: 'Kingdom Savunması', title_en: 'Kingdom Defense', desc_tr: 'Topluluk savaşında tier havuzuna katkı yap. 5000+ puan = HC ödülü.', desc_en: 'Contribute to community war tier pool. 5000+ points = HC reward.', progress: 3200, target: 5000, xp: 800, time_left: '2d 06:15:00' },
  { id: 'm4', icon: '💰', tier: 'premium', reward: 0.0001, currency: 'BTC', title_tr: 'Mega Payout Hedefi', title_en: 'Mega Payout Target', desc_tr: 'Toplam 10000 SC biriktir ve vault\'a aktar. BTC çekim hakkı kazanırsın.', desc_en: 'Accumulate 10000 SC total and transfer to vault. Earn BTC withdrawal rights.', progress: 7500, target: 10000, xp: 2000, time_left: '6d 23:59:59' },
  { id: 'm5', icon: '🔗', tier: 'daily', reward: 30, currency: 'SC', title_tr: 'Cüzdan Bağlantısı', title_en: 'Wallet Connection', desc_tr: 'TON cüzdanını bağla ve ilk işlemini yap. Güvenlik bonusu dahil.', desc_en: 'Connect your TON wallet and make first transaction. Security bonus included.', progress: 0, target: 1, xp: 80, time_left: '23:59:59' },
  { id: 'm6', icon: '🌟', tier: 'streak', reward: 75, currency: 'SC', title_tr: '7 Gün Serisi', title_en: '7 Day Streak', desc_tr: 'Kesintisiz 7 gün giriş yap. Her gün artan ödül çarpanı.', desc_en: 'Log in for 7 consecutive days. Increasing reward multiplier each day.', progress: 4, target: 7, xp: 350, time_left: '3d 00:00:00' },
];

const TIER_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  daily: { bg: 'rgba(0, 212, 255, 0.06)', border: 'rgba(0, 212, 255, 0.2)', color: 'var(--color-accent)' },
  weekly: { bg: 'rgba(0, 255, 136, 0.06)', border: 'rgba(0, 255, 136, 0.2)', color: 'var(--color-success)' },
  epic: { bg: 'rgba(224, 64, 251, 0.06)', border: 'rgba(224, 64, 251, 0.2)', color: '#e040fb' },
  premium: { bg: 'rgba(255, 215, 0, 0.06)', border: 'rgba(255, 215, 0, 0.2)', color: 'var(--color-premium)' },
  streak: { bg: 'rgba(255, 170, 0, 0.06)', border: 'rgba(255, 170, 0, 0.2)', color: 'var(--color-warning)' },
};

export default function MissionsPage() {
  const { locale } = useTelegram();
  const { balances } = useAppStore();
  const isTr = locale === 'tr';

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">⚔️ {isTr ? 'Görev Merkezi' : 'Mission Center'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'Günlük, haftalık ve özel görevleri tamamla. Her görev SC, HC veya BTC ödülü kazandırır.'
            : 'Complete daily, weekly, and special missions. Each mission earns SC, HC, or BTC rewards.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <span className="neon-badge accent">
            📋 {MISSIONS.length} {isTr ? 'aktif' : 'active'}
          </span>
          <span className="neon-badge success">
            ✅ {MISSIONS.filter(m => m.progress >= m.target).length} {isTr ? 'tamamlandı' : 'completed'}
          </span>
        </div>
      </div>

      {/* Mission list */}
      {MISSIONS.map((mission, idx) => {
        const tier = TIER_STYLES[mission.tier] || TIER_STYLES.daily;
        const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
        const completed = mission.progress >= mission.target;

        return (
          <div
            key={mission.id}
            className="glass-card"
            style={{
              padding: '16px',
              borderColor: completed ? 'rgba(0,255,136,0.3)' : tier.border,
              opacity: completed ? 0.75 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--radius-md)',
                  background: tier.bg, border: `1px solid ${tier.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {mission.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {isTr ? mission.title_tr : mission.title_en}
                  </div>
                  <span className="neon-badge" style={{
                    background: tier.bg, color: tier.color,
                    border: `1px solid ${tier.border}`, fontSize: 9, marginTop: 2,
                  }}>
                    {mission.tier.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: tier.color, fontFamily: 'var(--font-mono)' }}>
                  +{mission.reward} {mission.currency}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+{mission.xp} XP</div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
              {isTr ? mission.desc_tr : mission.desc_en}
            </p>

            {/* Progress */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {mission.progress.toLocaleString()} / {mission.target.toLocaleString()}
              </span>
              <span className="timer-display" style={{ padding: '2px 8px', fontSize: 10 }}>
                ⏱ {mission.time_left}
              </span>
            </div>
            <div className="neon-progress">
              <div
                className="neon-progress-bar"
                style={{
                  width: `${pct}%`,
                  background: completed
                    ? 'linear-gradient(90deg, var(--color-success), #00cc66)'
                    : `linear-gradient(90deg, ${tier.color}, ${tier.color}88)`,
                  boxShadow: `0 0 8px ${tier.color}66`,
                }}
              />
            </div>

            {completed && (
              <button className="neon-btn success" style={{ width: '100%', marginTop: 10 }}>
                🎁 {isTr ? 'Ödülü Topla' : 'Claim Reward'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
