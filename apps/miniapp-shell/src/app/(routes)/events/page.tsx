'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from '@/lib/telegram';
import { useAppStore } from '@/store/useAppStore';
import { apiFetch } from '@/lib/api';

interface GameEvent {
  id: string;
  type: 'anomaly' | 'tournament' | 'war' | 'flash' | 'campaign';
  title_tr: string;
  title_en: string;
  desc_tr: string;
  desc_en: string;
  status: 'active' | 'upcoming' | 'ended';
  ends_at: string | null;
  reward: string;
}

const TYPE_COLORS: Record<string, string> = {
  anomaly: '#e040fb',
  tournament: 'var(--color-accent)',
  war: 'var(--color-danger)',
  flash: 'var(--color-premium)',
  campaign: '#ffd700',
};

const TYPE_LABELS: Record<string, { tr: string; en: string }> = {
  anomaly: { tr: 'Anomali', en: 'Anomaly' },
  tournament: { tr: 'Turnuva', en: 'Tournament' },
  war: { tr: 'Savas', en: 'War' },
  flash: { tr: 'Flash', en: 'Flash' },
  campaign: { tr: 'Kampanya', en: 'Campaign' },
};

function formatTimeLeft(endsAt: string | null): string {
  if (!endsAt) return '';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export default function EventsPage() {
  const { locale } = useTelegram();
  const { progression, session } = useAppStore();
  const isTr = locale === 'tr';

  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Build anomaly event from progression data
  useEffect(() => {
    const anomalyEvent: GameEvent | null = progression.active_anomaly
      ? {
          id: 'anomaly_active',
          type: 'anomaly',
          title_tr: progression.active_anomaly.title_tr,
          title_en: progression.active_anomaly.title_en,
          desc_tr: progression.active_anomaly.description_tr,
          desc_en: progression.active_anomaly.description_en,
          status: 'active',
          ends_at: progression.active_anomaly.expires_at,
          reward: 'Bonus Active',
        }
      : null;

    // Fetch events from API
    if (session?.uid) {
      apiFetch<{ data: { events: GameEvent[] } }>(
        `/v2/events?uid=${session.uid}&ts=${session.ts}&sig=${session.sig}`,
      )
        .then((res) => {
          const apiEvents = res.data.events || [];
          setEvents(anomalyEvent ? [anomalyEvent, ...apiEvents] : apiEvents);
        })
        .catch(() => {
          // Fallback: show anomaly + static events
          const fallback: GameEvent[] = [
            ...(anomalyEvent ? [anomalyEvent] : []),
            {
              id: 'e_tournament',
              type: 'tournament',
              title_tr: 'Arena Turnuvasi',
              title_en: 'Arena Tournament',
              desc_tr: 'PvP turnuvasinda ilk 10 siraya gir, ozel HC odulu kazan.',
              desc_en: 'Reach top 10 in PvP tournament, earn special HC rewards.',
              status: 'active',
              ends_at: null,
              reward: '500 HC + Badge',
            },
            {
              id: 'e_war',
              type: 'war',
              title_tr: 'Krallik Savasi',
              title_en: 'Kingdom War',
              desc_tr: 'Takimini sec ve topluluk havuzuna katki yap.',
              desc_en: 'Pick your team and contribute to the community pool.',
              status: 'upcoming',
              ends_at: null,
              reward: '3x Pool Share',
            },
          ];
          setEvents(fallback);
        })
        .finally(() => setLoading(false));
    } else {
      if (anomalyEvent) setEvents([anomalyEvent]);
      setLoading(false);
    }
  }, [session, progression.active_anomaly]);

  const activeEvents = events.filter((e) => e.status === 'active');
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');
  const endedEvents = events.filter((e) => e.status === 'ended');

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hero-banner">
        <h1 className="hero-title">{isTr ? 'Canli Etkinlikler' : 'Live Events'}</h1>
        <p className="hero-desc">
          {isTr
            ? 'Anomaliler, turnuvalar, savaslar ve flash droplar.'
            : 'Anomalies, tournaments, wars and flash drops.'}
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <span className="neon-badge success">{activeEvents.length} {isTr ? 'aktif' : 'active'}</span>
          {upcomingEvents.length > 0 && (
            <span className="neon-badge warning">{upcomingEvents.length} {isTr ? 'yaklasan' : 'upcoming'}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {isTr ? 'Yukleniyor...' : 'Loading...'}
          </div>
        </div>
      )}

      {/* Active events */}
      {activeEvents.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? 'Aktif' : 'Active'}</span>
          </div>
          {activeEvents.map((event) => (
            <EventCard key={event.id} event={event} isTr={isTr} />
          ))}
        </div>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? 'Yaklasan' : 'Upcoming'}</span>
          </div>
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} isTr={isTr} />
          ))}
        </div>
      )}

      {/* Ended events */}
      {endedEvents.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">{isTr ? 'Biten' : 'Ended'}</span>
          </div>
          {endedEvents.map((event) => (
            <EventCard key={event.id} event={event} isTr={isTr} />
          ))}
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="glass-card" style={{ padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            {isTr ? 'Su an aktif etkinlik yok.' : 'No active events right now.'}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, isTr }: { event: GameEvent; isTr: boolean }) {
  const color = TYPE_COLORS[event.type] || 'var(--color-accent)';
  const isActive = event.status === 'active';
  const isEnded = event.status === 'ended';
  const typeLabel = TYPE_LABELS[event.type] || { tr: event.type, en: event.type };
  const timeLeft = formatTimeLeft(event.ends_at);

  return (
    <div className="glass-card" style={{
      padding: 16, marginBottom: 8,
      opacity: isEnded ? 0.5 : 1,
      borderColor: isActive ? `${color}33` : undefined,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${color}15`, border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color,
          flexShrink: 0,
        }}>
          {isTr ? typeLabel.tr.slice(0, 3).toUpperCase() : typeLabel.en.slice(0, 3).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {isTr ? event.title_tr : event.title_en}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <span className={`neon-badge ${isActive ? 'success' : isEnded ? 'danger' : 'warning'}`} style={{ fontSize: 8 }}>
              {isActive ? 'LIVE' : isEnded ? 'ENDED' : 'SOON'}
            </span>
            <span className="neon-badge" style={{ background: `${color}15`, color, border: `1px solid ${color}33`, fontSize: 8 }}>
              {isTr ? typeLabel.tr.toUpperCase() : typeLabel.en.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {isTr ? event.desc_tr : event.desc_en}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>{event.reward}</span>
            {!isEnded && timeLeft && (
              <span className="timer-display" style={{ fontSize: 10, padding: '2px 8px' }}>
                {timeLeft}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
