'use client';

import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const SceneHost = dynamic(() => import('@/components/scene/SceneHost').then(m => ({ default: m.SceneHost })), { ssr: false });

/* ═══════════════════════════════════════
   Blueprint: Hub — Game Command Center
   Features: 3D scene, greeting, currency dashboard,
   quick actions, active anomaly, tier progress,
   streak tracker, next best move engine
   ═══════════════════════════════════════ */

function getGreeting(isTr: boolean): { text: string; icon: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: isTr ? 'Günaydın' : 'Good morning', icon: '☀️' };
  if (h >= 12 && h < 18) return { text: isTr ? 'İyi günler' : 'Good afternoon', icon: '🌤️' };
  if (h >= 18 && h < 22) return { text: isTr ? 'İyi akşamlar' : 'Good evening', icon: '🌆' };
  return { text: isTr ? 'Gece kuşu' : 'Night owl', icon: '🌙' };
}

export default function HubPage() {
  const { locale, user } = useTelegram();
  const { balances, kingdomTier, passActive, bootstrapped, username } = useAppStore();
  const isTr = locale === 'tr';
  const greeting = getGreeting(isTr);
  const displayName = username || user?.first_name || (isTr ? 'Kaşif' : 'Explorer');

  // Simulated game state
  const streakDays = 7;
  const streakMultiplier = 1 + streakDays * 0.05;
  const dailyTasksCompleted = 3;
  const dailyTasksTotal = 5;
  const seasonDay = 14;
  const seasonDaysLeft = 16;
  const seasonPoints = 2450;
  const tierProgress = 65; // out of 100

  const QUICK_ACTIONS = [
    { href: '/missions', icon: '🎯', label_tr: 'Görevler', label_en: 'Missions', glow: '#00d2ff', badge: `${dailyTasksCompleted}/${dailyTasksTotal}` },
    { href: '/arena', icon: '⚔️', label_tr: 'PvP Arena', label_en: 'PvP Arena', glow: '#ff4444', badge: '3/5' },
    { href: '/forge', icon: '🔥', label_tr: 'Forge', label_en: 'Forge', glow: '#ffd700', badge: '2 📦' },
    { href: '/exchange', icon: '💱', label_tr: 'Borsa', label_en: 'Exchange', glow: '#e040fb', badge: null },
    { href: '/vault', icon: '🏦', label_tr: 'Vault', label_en: 'Vault', glow: '#00ff88', badge: null },
    { href: '/season', icon: '🏆', label_tr: 'Sezon', label_en: 'Season', glow: '#ffd700', badge: `D${seasonDay}` },
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
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{greeting.icon} {greeting.text}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {displayName}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <span className="neon-badge accent">T{kingdomTier}</span>
            {passActive && <span className="neon-badge" style={{ background: 'rgba(224,64,251,0.15)', color: '#e040fb', border: '1px solid rgba(224,64,251,0.3)' }}>⭐ Pass</span>}
            <span className="neon-badge" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)' }}>🔥 {streakDays} {isTr ? 'gün' : 'days'}</span>
          </div>
        </div>
      </div>

      {/* Currency Dashboard */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, textAlign: 'center' }}>
          {[
            { key: 'SC', value: balances.sc, color: 'var(--color-sc, #00ff88)', icon: '💰' },
            { key: 'HC', value: balances.hc, color: 'var(--color-hc, #00d2ff)', icon: '💎' },
            { key: 'RC', value: balances.rc, color: 'var(--color-premium, #e040fb)', icon: '🌀' },
            { key: 'NXT', value: balances.nxt, color: '#ffd700', icon: '🪙' },
            { key: 'BTC', value: balances.payout_available, color: '#ff8800', icon: '₿' },
          ].map(c => (
            <div key={c.key}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{c.icon} {c.key}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.color, fontFamily: 'var(--font-mono)' }}>
                {typeof c.value === 'number' ? (c.value > 1000 ? `${(c.value / 1000).toFixed(1)}k` : c.value) : c.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Anomaly Ticker */}
      <div className="glass-card" style={{ padding: 10, borderColor: 'rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4444' }}>
              {isTr ? 'AKTİF ANOMALİ: Çift SC Haftası' : 'ACTIVE ANOMALY: Double SC Week'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
              {isTr ? 'Tüm görevlerden 2x SC → 4 gün 12 saat kaldı' : 'All tasks earn 2x SC → 4d 12h left'}
            </div>
          </div>
          <Link href="/events" style={{ fontSize: 10, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
            {isTr ? 'Detay →' : 'Details →'}
          </Link>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <div className="section-header">
          <span className="section-title">⚡ {isTr ? 'Hızlı Erişim' : 'Quick Actions'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="glass-card" style={{
                padding: '12px 8px', textAlign: 'center', cursor: 'pointer',
                border: `1px solid ${action.glow}22`,
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{action.icon}</div>
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
            🏰 {isTr ? 'Tier İlerlemesi' : 'Tier Progress'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent)' }}>T{kingdomTier}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{tierProgress}%</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>T{kingdomTier + 1}</span>
          </div>
          <div className="neon-progress" style={{ height: 6 }}>
            <div className="neon-progress-bar" style={{ width: `${tierProgress}%` }} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            🔥 {isTr ? 'Streak Çarpanı' : 'Streak Multiplier'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-premium)', textAlign: 'center' }}>
            x{streakMultiplier.toFixed(2)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {streakDays} {isTr ? 'gün üst üste' : 'consecutive days'}
          </div>
        </div>
      </div>

      {/* Season Summary */}
      <div className="glass-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            🏆 {isTr ? 'Sezon Durumu' : 'Season Status'}
          </div>
          <span className="neon-badge" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.2)' }}>
            {seasonDaysLeft} {isTr ? 'gün kaldı' : 'days left'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Puan' : 'Points'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>{seasonPoints}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Sıralama' : 'Rank'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>#47</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Sonraki Ödül' : 'Next Reward'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-premium)' }}>500 pts</div>
          </div>
        </div>
        <div className="neon-progress" style={{ height: 4, marginTop: 8 }}>
          <div className="neon-progress-bar" style={{ width: '62%', background: 'linear-gradient(90deg, #ffd700, #ff8800)' }} />
        </div>
      </div>

      {/* Next Best Move — Discovery Engine */}
      <div className="glass-card" style={{ padding: 12, borderColor: 'rgba(0,210,255,0.2)' }}>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
          🧭 {isTr ? 'Sonraki En İyi Hamle' : 'Next Best Move'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{isTr ? '2 kalan günlük görev' : '2 remaining daily tasks'}</div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? '+80-160 SC kazanabilirsin' : '+80-160 SC potential'}</div>
            </div>
            <Link href="/missions" style={{ fontSize: 10, color: 'var(--color-accent)', textDecoration: 'none' }}>→</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>📦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{isTr ? '2 kutu açılmayı bekliyor' : '2 boxes await opening'}</div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? 'Pity: 7/10 — epik+ garantili' : 'Pity: 7/10 — epic+ guaranteed'}</div>
            </div>
            <Link href="/forge" style={{ fontSize: 10, color: 'var(--color-accent)', textDecoration: 'none' }}>→</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚔️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{isTr ? 'PvP combo zinciri aktif' : 'PvP combo chain active'}</div>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{isTr ? '3 zafer serisi — x1.15 bonus' : '3 win streak — x1.15 bonus'}</div>
            </div>
            <Link href="/arena" style={{ fontSize: 10, color: 'var(--color-accent)', textDecoration: 'none' }}>→</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
