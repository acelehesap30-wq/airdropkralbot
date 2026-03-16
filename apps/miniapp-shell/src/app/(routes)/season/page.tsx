'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';

export default function SeasonPage() {
  const { locale } = useTelegram();
  const { kingdomTier } = useAppStore();
  const isTr = locale === 'tr';

  const seasonData = {
    name: 'Season 3: Neon Uprising',
    days_left: 42,
    points: 12500,
    target: 50000,
    rank: 127,
    total_players: 4892,
    rewards: [
      { tier: 1, points: 5000, reward: '500 SC', claimed: true },
      { tier: 2, points: 15000, reward: '10 HC + Neon Frame', claimed: false },
      { tier: 3, points: 30000, reward: '50 HC + Exclusive Badge', claimed: false },
      { tier: 4, points: 50000, reward: '0.001 BTC + Legendary Title', claimed: false },
    ],
    leaderboard: [
      { rank: 1, name: 'CryptoNinja', points: 48200, tier: 8 },
      { rank: 2, name: 'ArenaKing', points: 45100, tier: 7 },
      { rank: 3, name: 'NexusPilot', points: 41800, tier: 7 },
      { rank: 127, name: 'You', points: 12500, tier: kingdomTier, isYou: true },
    ],
  };

  const seasonProgress = Math.min(100, Math.round((seasonData.points / seasonData.target) * 100));

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">🏆 {seasonData.name}</h1>
        <p className="hero-desc">
          {isTr ? `${seasonData.days_left} gün kaldı • Sıralama #${seasonData.rank}` : `${seasonData.days_left} days left • Rank #${seasonData.rank}`}
        </p>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{seasonData.points.toLocaleString()} / {seasonData.target.toLocaleString()}</span>
            <span style={{ fontSize: 12, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{seasonProgress}%</span>
          </div>
          <div className="neon-progress" style={{ height: 8 }}>
            <div className="neon-progress-bar" style={{ width: `${seasonProgress}%`, background: 'linear-gradient(90deg, #00d4ff, #ffd700)' }} />
          </div>
        </div>
      </div>

      {/* Season rewards track */}
      <div>
        <div className="section-header">
          <span className="section-title">🎁 {isTr ? 'Sezon Ödülleri' : 'Season Rewards'}</span>
        </div>
        {seasonData.rewards.map((r, i) => {
          const reached = seasonData.points >= r.points;
          return (
            <div key={i} className="glass-card" style={{ padding: 14, marginBottom: 8, borderColor: reached ? 'rgba(0,255,136,0.2)' : undefined, opacity: r.claimed ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: reached ? 'rgba(0,255,136,0.1)' : 'var(--color-surface-elevated)',
                    border: `2px solid ${reached ? 'var(--color-success)' : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: reached ? 'var(--color-success)' : 'var(--color-text-muted)',
                  }}>
                    {r.claimed ? '✅' : r.tier}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.reward}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.points.toLocaleString()} pts</div>
                  </div>
                </div>
                {reached && !r.claimed && (
                  <button className="neon-btn success" style={{ fontSize: 10, padding: '4px 12px' }}>
                    {isTr ? 'Topla' : 'Claim'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div>
        <div className="section-header">
          <span className="section-title">📊 {isTr ? 'Sıralama' : 'Leaderboard'}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{seasonData.total_players.toLocaleString()} {isTr ? 'oyuncu' : 'players'}</span>
        </div>
        <div className="glass-card" style={{ padding: '0 14px' }}>
          {seasonData.leaderboard.map((player, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: player.isYou ? '12px 14px' : '12px 0',
              borderBottom: i < seasonData.leaderboard.length - 1 ? '1px solid rgba(42,42,62,0.2)' : 'none',
              background: player.isYou ? 'rgba(0,212,255,0.04)' : 'transparent',
              margin: player.isYou ? '0 -14px' : '0',
              borderRadius: player.isYou ? 'var(--radius-sm)' : '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, width: 28,
                  color: player.rank <= 3 ? 'var(--color-premium)' : 'var(--color-text-muted)',
                }}>
                  #{player.rank}
                </span>
                <span style={{ fontSize: 13, fontWeight: player.isYou ? 700 : 500, color: player.isYou ? 'var(--color-accent)' : 'inherit' }}>
                  {player.name}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                {player.points.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
