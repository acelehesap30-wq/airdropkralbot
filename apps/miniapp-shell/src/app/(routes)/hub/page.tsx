'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const SceneHost = dynamic(() => import('@/components/scene/SceneHost').then(m => ({ default: m.SceneHost })), { ssr: false });

/* Blueprint: Hub — Game Command Center
   Features: 3D scene, greeting, currency dashboard,
   quick actions, active anomaly, tier progress,
   streak tracker, next best move engine */

function getGreeting(isTr: boolean): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return isTr ? 'Gunaydin' : 'Good morning';
  if (h >= 12 && h < 18) return isTr ? 'Iyi gunler' : 'Good afternoon';
  if (h >= 18 && h < 22) return isTr ? 'Iyi aksamlar' : 'Good evening';
  return isTr ? 'Gece kusu' : 'Night owl';
}

export default function HubPage() {
  const { locale, user } = useTelegram();
  const { balances, kingdomTier, passActive, username, progression } = useAppStore();
  const isTr = locale === 'tr';
  const greeting = getGreeting(isTr);
  const displayName = username || user?.first_name || (isTr ? 'Kasif' : 'Explorer');

  const {
    streak_days, streak_multiplier,
    daily_tasks_completed, daily_tasks_total,
    season_day, season_days_left, season_points, season_rank,
    tier_progress_pct, next_tier,
    active_anomaly, next_best_moves,
  } = progression;

  const QUICK_ACTIONS = [
    { href: '/missions', icon: 'M', label_tr: 'Gorevler', label_en: 'Missions', glow: '#00d2ff', badge: `${daily_tasks_completed}/${daily_tasks_total}` },
    { href: '/arena', icon: 'A', label_tr: 'PvP Arena', label_en: 'PvP Arena', glow: '#ff4444', badge: null },
    { href: '/forge', icon: 'F', label_tr: 'Forge', label_en: 'Forge', glow: '#ffd700', badge: null },
    { href: '/exchange', icon: 'E', label_tr: 'Borsa', label_en: 'Exchange', glow: '#e040fb', badge: null },
    { href: '/vault', icon: 'V', label_tr: 'Vault', label_en: 'Vault', glow: '#00ff88', badge: null },
    { href: '/season', icon: 'S', label_tr: 'Sezon', label_en: 'Season', glow: '#ffd700', badge: `D${season_day}` },
  ];

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 3D Scene */}
      <div style={{ borderRadius: 12, overflow: 'hidden', height: 200, position: 'relative' }}>
        <SceneHost />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(10,10,26,0.9) 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16,
        }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{greeting}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {displayName}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span className="neon-badge accent">T{kingdomTier}</span>
            {passActive && <span className="neon-badge" style={{ background: 'rgba(224,64,251,0.15)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.3)' }}>Pass</span>}
            {streak_days > 0 && (
              <span className="neon-badge" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)' }}>
                {streak_days} {isTr ? 'gun' : 'days'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Currency Dashboard */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, textAlign: 'center' }}>
          {[
            { key: 'SC', value: balances.sc, color: 'var(--color-sc, #00ff88)' },
            { key: 'HC', value: balances.hc, color: 'var(--color-hc, #00d2ff)' },
            { key: 'RC', value: balances.rc, color: 'var(--color-premium, #e040fb)' },
            { key: 'NXT', value: balances.nxt, color: '#ffd700' },
            { key: 'BTC', value: balances.payout_available, color: '#ff8800' },
          ].map(c => (
            <div key={c.key}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{c.key}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.color, fontFamily: 'var(--font-mono)' }}>
                {typeof c.value === 'number' ? (c.value > 1000 ? `${(c.value / 1000).toFixed(1)}k` : c.value) : c.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Anomaly Ticker */}
      {active_anomaly && (
        <div className="glass-card" style={{ padding: 10, borderColor: 'rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4444' }}>
                {isTr ? active_anomaly.title_tr : active_anomaly.title_en}
              </div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                {isTr ? active_anomaly.description_tr : active_anomaly.description_en}
              </div>
            </div>
            <Link href="/events" style={{ fontSize: 10, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
              {isTr ? 'Detay' : 'Details'} &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <div className="section-header">
          <span className="section-title">{isTr ? 'Hizli Erisim' : 'Quick Actions'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="glass-card" style={{
                padding: '12px 8px', textAlign: 'center', cursor: 'pointer',
                border: `1px solid ${action.glow}22`,
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: action.glow }}>{action.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {isTr ? action.label_tr : action.label_en}
                </div>
                {action.badge && (
                  <span className="neon-badge" style={{ marginTop: 4, display: 'inline-block', fontSize: 9 }}>
                    {action.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tier & Streak Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="glass-card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            {isTr ? 'Tier Ilerlemesi' : 'Tier Progress'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>T{kingdomTier}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{tier_progress_pct}%</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>T{next_tier}</span>
          </div>
          <div className="neon-progress" style={{ height: 6 }}>
            <div className="neon-progress-bar" style={{ width: `${tier_progress_pct}%` }} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            {isTr ? 'Streak Carpani' : 'Streak Multiplier'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-premium)', textAlign: 'center' }}>
            x{streak_multiplier.toFixed(2)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {streak_days} {isTr ? 'gun ust uste' : 'consecutive days'}
          </div>
        </div>
      </div>

      {/* Season Summary */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            {isTr ? 'Sezon Durumu' : 'Season Status'}
          </div>
          <span className="neon-badge" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.2)' }}>
            {season_days_left} {isTr ? 'gun kaldi' : 'days left'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Puan' : 'Points'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>{season_points.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Siralama' : 'Rank'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>
              {season_rank !== null ? `#${season_rank}` : '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Gun' : 'Day'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-premium)' }}>D{season_day}</div>
          </div>
        </div>
      </div>

      {/* Next Best Move — Discovery Engine */}
      {next_best_moves && next_best_moves.length > 0 && (
        <div className="glass-card" style={{ padding: 12, borderColor: 'rgba(0,210,255,0.2)' }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            {isTr ? 'Sonraki En Iyi Hamle' : 'Next Best Move'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {next_best_moves.map((move, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{isTr ? move.label_tr : move.label_en}</div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? move.detail_tr : move.detail_en}</div>
                </div>
                <Link href={`/${move.route}`} style={{ fontSize: 10, color: 'var(--color-accent)', textDecoration: 'none' }}>&rarr;</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
