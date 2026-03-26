import { useState, useCallback, useEffect } from "react";
import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data, WebAppAuth } from "../../types";
import { buildActionRequestId, postJson, getJson, withAuthQuery } from "../../api/common";

type EventsPanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  auth?: WebAppAuth | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

type EventItem = {
  id: string;
  type: "anomaly" | "tournament" | "war" | "flash" | "campaign";
  title_tr: string;
  title_en: string;
  desc_tr: string;
  desc_en: string;
  status: "active" | "upcoming" | "ended";
  reward: string;
  participants?: number;
  ends_at?: string;
  joined?: boolean;
};

const TYPE_COLORS: Record<string, string> = {
  anomaly: "#e040fb",
  tournament: "#00d2ff",
  war: "#ff4444",
  flash: "#ffd700",
  campaign: "#00ff88"
};

const TYPE_ICONS: Record<string, string> = {
  anomaly: "\ud83c\udf0c",
  tournament: "\u2694\ufe0f",
  war: "\ud83d\udee1\ufe0f",
  flash: "\u26a1",
  campaign: "\ud83c\udfaf"
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

function formatCountdown(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export function EventsPanel(props: EventsPanelProps) {
  const isTr = props.lang === "tr";
  const progression = (props.data as any)?.progression || {};
  const anomaly = progression?.active_anomaly || null;
  const liveOps = (props.data as any)?.live_ops || {};
  const campaigns = Array.isArray(liveOps?.campaigns) ? liveOps.campaigns : [];

  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [joinedEvents, setJoinedEvents] = useState<Set<string>>(new Set());
  const [countdownTick, setCountdownTick] = useState(0);

  // Tick countdown every 60s
  useEffect(() => {
    const interval = setInterval(() => setCountdownTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Build events from bootstrap data + fallback hardcoded
  const events: EventItem[] = [];

  // Active anomaly from progression
  if (anomaly) {
    events.push({
      id: "anomaly_active",
      type: "anomaly",
      title_tr: anomaly.title_tr || "Aktif Anomali",
      title_en: anomaly.title_en || "Active Anomaly",
      desc_tr: anomaly.description_tr || "Anomali bonusu aktif. T\u00fcm g\u00f6revlerde ekstra puan.",
      desc_en: anomaly.description_en || "Anomaly bonus active. Extra points on all tasks.",
      status: "active",
      reward: anomaly.reward_text || "x2 Bonus",
      participants: Number(anomaly.participants || 0),
      ends_at: anomaly.ends_at || "",
      joined: true
    });
  }

  // Real campaigns from live_ops
  campaigns.forEach((c: any) => {
    events.push({
      id: `campaign_${c.id || c.campaign_key}`,
      type: c.type || "campaign",
      title_tr: c.title_tr || c.title || "Kampanya",
      title_en: c.title_en || c.title || "Campaign",
      desc_tr: c.description_tr || c.description || "",
      desc_en: c.description_en || c.description || "",
      status: c.status === "active" ? "active" : c.status === "ended" ? "ended" : "upcoming",
      reward: c.reward_text || c.reward || "Bonus",
      participants: Number(c.participants || 0),
      ends_at: c.ends_at || "",
      joined: !!c.user_joined
    });
  });

  // Fallback events when no live data
  if (events.filter((e) => e.type === "tournament").length === 0) {
    events.push({
      id: "e_tournament",
      type: "tournament",
      title_tr: "Arena Turnuvas\u0131",
      title_en: "Arena Tournament",
      desc_tr: "PvP turnuvas\u0131nda ilk 10 s\u0131raya gir, \u00f6zel HC \u00f6d\u00fcl\u00fc kazan. Haftal\u0131k s\u0131f\u0131rlan\u0131r.",
      desc_en: "Reach top 10 in PvP tournament, earn special HC rewards. Resets weekly.",
      status: "active",
      reward: "500 HC + Badge",
      participants: 147
    });
  }

  if (events.filter((e) => e.type === "war").length === 0) {
    events.push({
      id: "e_war",
      type: "war",
      title_tr: "Kral\u0131k Sava\u015f\u0131",
      title_en: "Kingdom War",
      desc_tr: "Tak\u0131m\u0131n\u0131 se\u00e7 ve topluluk havuzuna katk\u0131 yap. En \u00e7ok katk\u0131 yapan tak\u0131m kazan\u0131r.",
      desc_en: "Pick your team and contribute to the community pool. Highest contribution wins.",
      status: "upcoming",
      reward: "3x Pool Share",
      participants: 0
    });
  }

  if (events.filter((e) => e.type === "flash").length === 0) {
    events.push({
      id: "e_flash",
      type: "flash",
      title_tr: "Flash Drop",
      title_en: "Flash Drop",
      desc_tr: "S\u0131n\u0131rl\u0131 s\u00fcreli \u00f6zel \u00f6d\u00fcl havuzu. \u0130lk gelenler kazan\u0131r.",
      desc_en: "Limited time special reward pool. First come, first served.",
      status: "upcoming",
      reward: "Mystery Box"
    });
  }

  const active = events.filter((e) => e.status === "active");
  const upcoming = events.filter((e) => e.status === "upcoming");
  const ended = events.filter((e) => e.status === "ended");

  const handleJoin = useCallback(async (eventId: string, eventType: string) => {
    if (joiningId) return;
    setJoiningId(eventId);
    setJoinResult(null);

    try {
      const auth = authFields(props.auth);
      const resp = await postJson<any>("/webapp/api/v2/player/action", {
        ...auth,
        action_key: `event_join_${eventType}`,
        action_request_id: buildActionRequestId(`event_join`),
        payload: { event_id: eventId }
      });

      if (resp.success) {
        setJoinResult({ msg: isTr ? "Etkinli\u011fe kat\u0131ld\u0131n!" : "Joined event!", ok: true });
        setJoinedEvents((prev) => new Set([...prev, eventId]));
      } else {
        setJoinResult({ msg: resp.error || (isTr ? "Kat\u0131l\u0131m ba\u015far\u0131s\u0131z" : "Join failed"), ok: false });
      }
    } catch (_) {
      setJoinResult({ msg: isTr ? "Ba\u011flant\u0131 hatas\u0131" : "Connection error", ok: false });
    } finally {
      setJoiningId(null);
    }
  }, [joiningId, props.auth, isTr]);

  return (
    <section className="akrPanelSection">
      {/* Header */}
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{isTr ? "Canl\u0131 Etkinlikler" : "Live Events"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? "Anomaliler, turnuvalar, sava\u015flar ve flash droplar. Kat\u0131l ve \u00f6d\u00fcl kazan."
            : "Anomalies, tournaments, wars and flash drops. Join and earn rewards."}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <span className="akrBadge" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", fontSize: 10 }}>
            {active.length} {isTr ? "aktif" : "active"}
          </span>
          {upcoming.length > 0 && (
            <span className="akrBadge" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700", fontSize: 10 }}>
              {upcoming.length} {isTr ? "yakla\u015fan" : "upcoming"}
            </span>
          )}
          {ended.length > 0 && (
            <span className="akrBadge" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
              {ended.length} {isTr ? "biten" : "ended"}
            </span>
          )}
        </div>
      </div>

      {/* Join result flash */}
      {joinResult && (
        <div className="akrCard" style={{
          borderColor: joinResult.ok ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: joinResult.ok ? "#00ff88" : "#ff6644",
            fontFamily: "var(--font-mono, monospace)",
            padding: "6px 0"
          }}>
            {joinResult.ok ? "\u2713 " : "\u2717 "}{joinResult.msg}
          </div>
        </div>
      )}

      {/* Active events */}
      {active.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: "uppercase", padding: "8px 0 4px" }}>
            {isTr ? "Aktif" : "Active"}
          </div>
          {active.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isTr={isTr}
              joining={joiningId === event.id}
              joined={event.joined || joinedEvents.has(event.id)}
              onJoin={() => handleJoin(event.id, event.type)}
              countdownTick={countdownTick}
            />
          ))}
        </>
      )}

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: "uppercase", padding: "8px 0 4px" }}>
            {isTr ? "Yakla\u015fan" : "Upcoming"}
          </div>
          {upcoming.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isTr={isTr}
              joining={joiningId === event.id}
              joined={joinedEvents.has(event.id)}
              onJoin={() => handleJoin(event.id, event.type)}
              countdownTick={countdownTick}
            />
          ))}
        </>
      )}

      {/* Event stats summary */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Etkinlik \u00d6zeti" : "Event Summary"}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "8px 0" }}>
          {[
            { label: isTr ? "Kat\u0131l\u0131nan" : "Joined", value: joinedEvents.size + events.filter((e) => e.joined).length, color: "#00ff88" },
            { label: isTr ? "Toplam" : "Total", value: events.length, color: "#00d2ff" },
            { label: isTr ? "Canl\u0131" : "Live", value: active.length, color: "#e040fb" }
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono, monospace)" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventCard({ event, isTr, joining, joined, onJoin, countdownTick }: {
  event: EventItem;
  isTr: boolean;
  joining: boolean;
  joined: boolean;
  onJoin: () => void;
  countdownTick: number;
}) {
  const color = TYPE_COLORS[event.type] || "#00d2ff";
  const icon = TYPE_ICONS[event.type] || "\ud83d\udccc";
  const isActive = event.status === "active";
  const isUpcoming = event.status === "upcoming";

  return (
    <div className="akrCard" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${color}12`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {isTr ? event.title_tr : event.title_en}
            </div>
            {event.ends_at && isActive && (
              <span style={{
                fontSize: 9, fontFamily: "var(--font-mono, monospace)",
                color: "#ffd700", opacity: 0.8
              }}>
                {formatCountdown(event.ends_at)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, margin: "4px 0" }}>
            <span className="akrBadge" style={{
              background: isActive ? "rgba(0,255,136,0.1)" : isUpcoming ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)",
              color: isActive ? "#00ff88" : isUpcoming ? "#ffd700" : "rgba(255,255,255,0.4)",
              fontSize: 8
            }}>
              {isActive ? "LIVE" : isUpcoming ? "SOON" : "ENDED"}
            </span>
            <span className="akrBadge" style={{
              background: `${color}10`, color, fontSize: 8
            }}>
              {event.type.toUpperCase()}
            </span>
            {event.participants != null && event.participants > 0 && (
              <span className="akrBadge" style={{
                background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", fontSize: 8
              }}>
                {event.participants} {isTr ? "ki\u015fi" : "players"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>
            {isTr ? event.desc_tr : event.desc_en}
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "var(--font-mono, monospace)" }}>
              {event.reward}
            </div>
            {(isActive || isUpcoming) && !joined && (
              <button
                className="akrBtn akrBtnSm"
                style={{ fontSize: 10, minWidth: 64 }}
                disabled={joining}
                onClick={onJoin}
              >
                {joining
                  ? (isTr ? "\u0130\u015fleniyor..." : "Joining...")
                  : (isTr ? "Kat\u0131l" : "Join")}
              </button>
            )}
            {joined && (
              <span style={{
                fontSize: 10, color: "#00ff88", fontFamily: "var(--font-mono, monospace)",
                display: "flex", alignItems: "center", gap: 4
              }}>
                \u2713 {isTr ? "Kat\u0131ld\u0131n" : "Joined"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
