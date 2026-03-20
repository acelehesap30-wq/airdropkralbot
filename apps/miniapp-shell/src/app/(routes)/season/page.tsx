'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch } from '@/lib/api';

interface SeasonReward {
  tier: number;
  points: number;
  reward: string;
  claimed: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  tier: number;
  is_you?: boolean;
}

export default function SeasonPage() {
  const { locale } = useTelegram();
  const { kingdomTier, progression, session, username } = useAppStore();
  const isTr = locale === 'tr';

  const [rewards, setRewards] = useState<SeasonReward[]>([
    { tier: 1, points: 5000, reward: '500 SC', claimed: false },
    { tier: 2, points: 15000, reward: '10 HC + Neon Frame', claimed: false },
    { tier: 3, points: 30000, reward: '50 HC + Exclusive Badge', claimed: false },
    { tier: 4, points: 50000, reward: '0.001 BTC + Legendary Title', claimed: false },
  ]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Fetch leaderboard
  useEffect(() => {
    if (!session?.uid) return;
    const ctrl = new AbortController();
    apiFetch<{ data: { entries: LeaderboardEntry[]; total_players: number; rewards?: SeasonReward[] } }>(
      `/arena/leaderboard?uid=${session.uid}&ts=${session.ts}&sig=${session.sig}&season_id=${progression.season_id}`,
      { signal: ctrl.signal },
    )
      .then((res) => {
        if (res.data.entries) setLeaderboard(res.data.entries);
        if (res.data.total_players) setTotalPlayers(res.data.total_players);
        if (res.data.rewards) setRewards(res.data.rewards);
      })
      .catch(() => {
        // Fallback: show user's own entry
        setLeaderboard([{
          rank: progression.season_rank ?? 0,
          name: username || (isTr ? 'Sen' : 'You'),
          points: progression.season_points,
          tier: kingdomTier,
          is_you: true,
        }]);
      });
    return () => ctrl.abort();
  }, [session, progression.season_id]);

  const seasonTarget = 50000;
  const seasonProgress = Math.min(100, Math.round((progression.season_points / seasonTarget) * 100));

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="hero-banner">
        <h1 className="hero-title">{isTr ? 'Sezon' : 'Season'} #{progression.season_id}</h1>
        <p className="hero-desc">
          {isTr
            ? `${progression.season_days_left} gun kaldi \u2022 Siralama ${progression.season_rank ? '#' + progression.season_rank : '-'}`
            : `${progression.season_days_left} days left \u2022 Rank ${progression.season_rank ? '#' + progression.season_rank : '-'}`}
        </p>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {progression.season_points.toLocaleString()} / {seasonTarget.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{seasonProgress}%</span>
          </div>
          <div className="neon-progress" style={{ height: 8 }}>
            <div className="neon-progress-bar" style={{ width: `${seasonProgress}%`, background: 'linear-gradient(90deg, #00d4ff, #ffd700)' }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: isTr ? 'Gun' : 'Day', value: `D${progression.season_day}`, color: 'var(--color-accent)' },
          { label: isTr ? 'Seri' : 'Streak', value: `${progression.streak_days}d`, color: '#ff4444' },
          { label: isTr ? 'Carpan' : 'Mult', value: `x${progression.streak_multiplier.toFixed(2)}`, color: 'var(--color-premium)' },
          { label: 'Tier', value: `T${kingdomTier}`, color: '#ffd700' },
        ].map((s) => (
          <div key={s.label} className="glass-card" style={{ padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Season rewards track */}
      <div>
        <div className="section-header">
          <span className="section-title">{isTr ? 'Sezon Odulleri' : 'Season Rewards'}</span>
        </div>
        {rewards.map((r, i) => {
          const reached = progression.season_points >= r.points;
          return (
            <div key={i} className="glass-card" style={{
              padding: 14, marginBottom: 8,
              borderColor: reached ? 'rgba(0,255,136,0.2)' : undefined,
              opacity: r.claimed ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: reached ? 'rgba(0,255,136,0.1)' : 'var(--color-surface-elevated)',
                    border: `2px solid ${reached ? 'var(--color-success)' : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                    color: reached ? 'var(--color-success)' : 'var(--color-text-muted)',
                  }}>
                    {r.claimed ? '\u2705' : r.tier}
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
          <span className="section-title">{isTr ? 'Siralama' : 'Leaderboard'}</span>
          {totalPlayers > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {totalPlayers.toLocaleString()} {isTr ? 'oyuncu' : 'players'}
            </span>
          )}
        </div>
        <div className="glass-card" style={{ padding: '0 14px' }}>
          {leaderboard.map((player, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: player.is_you ? '12px 14px' : '12px 0',
              borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(42,42,62,0.2)' : 'none',
              background: player.is_you ? 'rgba(0,212,255,0.04)' : 'transparent',
              margin: player.is_you ? '0 -14px' : '0',
              borderRadius: player.is_you ? 'var(--radius-sm)' : '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, width: 28,
                  color: player.rank <= 3 ? 'var(--color-premium)' : 'var(--color-text-muted)',
                }}>
                  #{player.rank}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: player.is_you ? 700 : 500,
                  color: player.is_you ? 'var(--color-accent)' : 'inherit',
                }}>
                  {player.name}
                </span>
                <span className="neon-badge" style={{ fontSize: 8 }}>T{player.tier}</span>
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
