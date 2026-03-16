'use client';

import { useTelegram } from '@/lib/telegram';

const EVENTS = [
  { id: 'e1', icon: '🔥', title_tr: 'Nexus Anomaly: Çift SC Haftası', title_en: 'Nexus Anomaly: Double SC Week', desc_tr: 'Tüm görevlerden 2x SC kazan. 7 gün boyunca geçerli.', desc_en: 'Earn 2x SC from all missions. Valid for 7 days.', status: 'active', ends: '5d 12:00:00', reward: '2x SC', type: 'anomaly' },
  { id: 'e2', icon: '⚔️', title_tr: 'Arena Turnuvası: Mart Fury', title_en: 'Arena Tournament: March Fury', desc_tr: 'PvP turnuvasında ilk 10 sıraya gir, özel HC ödülü kazan.', desc_en: 'Reach top 10 in PvP tournament, earn special HC rewards.', status: 'active', ends: '12d 06:00:00', reward: '500 HC + Badge', type: 'tournament' },
  { id: 'e3', icon: '🏰', title_tr: 'Kingdom Savaşı: Buz vs Ateş', title_en: 'Kingdom War: Ice vs Fire', desc_tr: 'Takımını seç ve topluluk havuzuna katkı yap. Kazanan takım 3x puan alır.', desc_en: 'Pick your team and contribute to the community pool. Winning team gets 3x points.', status: 'upcoming', ends: '2d 00:00:00', reward: '3x Pool Share', type: 'war' },
  { id: 'e4', icon: '💎', title_tr: 'Flash Drop: Gizli Loot', title_en: 'Flash Drop: Hidden Loot', desc_tr: 'Sınırlı süre — 30 dakika içinde forge\'da özel kutu aç.', desc_en: 'Limited time — open special box in forge within 30 minutes.', status: 'ended', ends: 'Ended', reward: 'Legendary Item', type: 'flash' },
];

const TYPE_COLORS: Record<string, string> = {
  anomaly: '#e040fb',
  tournament: 'var(--color-accent)',
  war: 'var(--color-danger)',
  flash: 'var(--color-premium)',
};

export default function EventsPage() {
  const { locale } = useTelegram();
  const isTr = locale === 'tr';

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hero-banner">
        <h1 className="hero-title">🎪 {isTr ? 'Canlı Etkinlikler' : 'Live Events'}</h1>
        <p className="hero-desc">
          {isTr ? 'Anomaliler, turnuvalar, savaşlar ve flash drop\'lar. Hiçbirini kaçırma!' : 'Anomalies, tournaments, wars and flash drops. Don\'t miss any!'}
        </p>
      </div>

      {EVENTS.map((event) => {
        const color = TYPE_COLORS[event.type] || 'var(--color-accent)';
        const isActive = event.status === 'active';
        const isEnded = event.status === 'ended';

        return (
          <div key={event.id} className="glass-card" style={{ padding: 16, opacity: isEnded ? 0.5 : 1, borderColor: isActive ? `${color}33` : undefined }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: `${color}15`, border: `1px solid ${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                flexShrink: 0,
              }}>
                {event.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{isTr ? event.title_tr : event.title_en}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <span className={`neon-badge ${isActive ? 'success' : isEnded ? 'danger' : 'warning'}`} style={{ fontSize: 8 }}>
                    {isActive ? '🟢 LIVE' : isEnded ? '⬛ ENDED' : '🟡 SOON'}
                  </span>
                  <span className="neon-badge" style={{ background: `${color}15`, color, border: `1px solid ${color}33`, fontSize: 8 }}>
                    {event.type.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {isTr ? event.desc_tr : event.desc_en}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>🎁 {event.reward}</span>
                  {!isEnded && (
                    <span className="timer-display" style={{ fontSize: 10, padding: '2px 8px' }}>
                      ⏱ {event.ends}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
