import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";

type EventsPanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
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
};

const TYPE_COLORS: Record<string, string> = {
  anomaly: "#e040fb",
  tournament: "#00d2ff",
  war: "#ff4444",
  flash: "#ffd700",
  campaign: "#00ff88"
};

export function EventsPanel(props: EventsPanelProps) {
  const isTr = props.lang === "tr";
  const progression = (props.data as any)?.progression || {};
  const anomaly = progression?.active_anomaly || null;

  const events: EventItem[] = [];

  if (anomaly) {
    events.push({
      id: "anomaly_active",
      type: "anomaly",
      title_tr: anomaly.title_tr || "Aktif Anomali",
      title_en: anomaly.title_en || "Active Anomaly",
      desc_tr: anomaly.description_tr || "Anomali bonusu aktif.",
      desc_en: anomaly.description_en || "Anomaly bonus is active.",
      status: "active",
      reward: "Bonus Active"
    });
  }

  events.push(
    {
      id: "e_tournament",
      type: "tournament",
      title_tr: "Arena Turnuvasi",
      title_en: "Arena Tournament",
      desc_tr: "PvP turnuvasinda ilk 10 siraya gir, ozel HC odulu kazan.",
      desc_en: "Reach top 10 in PvP tournament, earn special HC rewards.",
      status: "active",
      reward: "500 HC + Badge"
    },
    {
      id: "e_war",
      type: "war",
      title_tr: "Krallik Savasi",
      title_en: "Kingdom War",
      desc_tr: "Takimini sec ve topluluk havuzuna katki yap.",
      desc_en: "Pick your team and contribute to the community pool.",
      status: "upcoming",
      reward: "3x Pool Share"
    },
    {
      id: "e_flash",
      type: "flash",
      title_tr: "Flash Drop",
      title_en: "Flash Drop",
      desc_tr: "Sinirli sureli ozel odul havuzu.",
      desc_en: "Limited time special reward pool.",
      status: "upcoming",
      reward: "Mystery Box"
    }
  );

  const active = events.filter((e) => e.status === "active");
  const upcoming = events.filter((e) => e.status === "upcoming");

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{isTr ? "Canli Etkinlikler" : "Live Events"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? "Anomaliler, turnuvalar, savaslar ve flash droplar."
            : "Anomalies, tournaments, wars and flash drops."}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <span className="akrBadge" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", fontSize: 10 }}>
            {active.length} {isTr ? "aktif" : "active"}
          </span>
          {upcoming.length > 0 && (
            <span className="akrBadge" style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700", fontSize: 10 }}>
              {upcoming.length} {isTr ? "yaklasan" : "upcoming"}
            </span>
          )}
        </div>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: "uppercase", padding: "8px 0 4px" }}>
            {isTr ? "Aktif" : "Active"}
          </div>
          {active.map((event) => (
            <EventCard key={event.id} event={event} isTr={isTr} />
          ))}
        </>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: "uppercase", padding: "8px 0 4px" }}>
            {isTr ? "Yaklasan" : "Upcoming"}
          </div>
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} isTr={isTr} />
          ))}
        </>
      )}
    </section>
  );
}

function EventCard({ event, isTr }: { event: EventItem; isTr: boolean }) {
  const color = TYPE_COLORS[event.type] || "#00d2ff";
  const isActive = event.status === "active";

  return (
    <div className="akrCard" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: `${color}12`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color, flexShrink: 0
        }}>
          {event.type.slice(0, 3).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {isTr ? event.title_tr : event.title_en}
          </div>
          <div style={{ display: "flex", gap: 6, margin: "4px 0" }}>
            <span className="akrBadge" style={{
              background: isActive ? "rgba(0,255,136,0.1)" : "rgba(255,215,0,0.1)",
              color: isActive ? "#00ff88" : "#ffd700",
              fontSize: 8
            }}>
              {isActive ? "LIVE" : "SOON"}
            </span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>
            {isTr ? event.desc_tr : event.desc_en}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color, marginTop: 6, fontFamily: "var(--font-mono, monospace)" }}>
            {event.reward}
          </div>
        </div>
      </div>
    </div>
  );
}
