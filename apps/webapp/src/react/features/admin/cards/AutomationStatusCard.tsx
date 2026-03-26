import { useState, useEffect } from "react";
import { t, type Lang } from "../../../i18n";
import type { WebAppAuth } from "../../../types";
import { getJson, withAuthQuery } from "../../../api/common";

type AutomationStatusCardProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
};

type ProcessorStats = {
  cycles?: number;
  processed?: number;
  approved?: number;
  escalated?: number;
  errors?: number;
  last_run?: string;
  running?: boolean;
  interval_ms?: number;
};

type SchedulerStats = {
  cycles?: number;
  dispatched?: number;
  expired?: number;
  events_generated?: number;
  anomalies_rotated?: number;
  errors?: number;
  last_run?: string;
  running?: boolean;
  scene_gate_state?: string;
};

type AutomationData = {
  queue_processor: ProcessorStats;
  live_ops_scheduler: SchedulerStats;
  generated_at: string;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return auth;
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

export function AutomationStatusCard(props: AutomationStatusCardProps) {
  const isTr = props.lang === "tr";
  const [data, setData] = useState<AutomationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const auth = authFields(props.auth);
        const query = withAuthQuery(auth as any);
        const resp = await getJson<any>(`/webapp/api/v2/admin/automation/status?${query}`);
        if (!cancelled && resp?.success) {
          setData(resp.data);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    }
    fetch();
    const interval = setInterval(fetch, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [props.auth]);

  const qp = data?.queue_processor || {};
  const ls = data?.live_ops_scheduler || {};

  const gateColor = ls.scene_gate_state === "clear" || ls.scene_gate_state === "no_data"
    ? "#00ff88"
    : ls.scene_gate_state === "watch"
      ? "#ffd700"
      : ls.scene_gate_state === "alert"
        ? "#ff4444"
        : "#666";

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #00ff88" }}>
      <div className="akrCardHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className="akrCardTitle" style={{ fontSize: 14 }}>
          {isTr ? "Otomasyon Durumu" : "Automation Status"}
        </h3>
        <div style={{ display: "flex", gap: 4 }}>
          <span className="akrBadge" style={{
            background: qp.running ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)",
            color: qp.running ? "#00ff88" : "#ff4444",
            fontSize: 8
          }}>
            QUEUE {qp.running ? "ON" : "OFF"}
          </span>
          <span className="akrBadge" style={{
            background: ls.running ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.1)",
            color: ls.running ? "#00ff88" : "#ff4444",
            fontSize: 8
          }}>
            SCHEDULER {ls.running ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 12, textAlign: "center", fontSize: 11, opacity: 0.5 }}>
          {isTr ? "Y\u00fckleniyor..." : "Loading..."}
        </div>
      ) : (
        <>
          {/* Queue processor */}
          <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
              {isTr ? "Kuyruk \u0130\u015flemcisi" : "Queue Processor"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[
                { label: isTr ? "D\u00f6ng\u00fc" : "Cycles", value: qp.cycles || 0, color: "#00d2ff" },
                { label: isTr ? "\u0130\u015flenen" : "Processed", value: qp.processed || 0, color: "#00ff88" },
                { label: isTr ? "Onayl\u0131" : "Approved", value: qp.approved || 0, color: "#ffd700" },
                { label: isTr ? "Hata" : "Errors", value: qp.errors || 0, color: qp.errors ? "#ff4444" : "#666" }
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, opacity: 0.5, textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono, monospace)" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live ops scheduler */}
          <div style={{ padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                {isTr ? "Canl\u0131 Ops Zamanlayıcı" : "Live Ops Scheduler"}
              </div>
              <span className="akrBadge" style={{
                background: `${gateColor}15`,
                color: gateColor,
                fontSize: 8
              }}>
                GATE: {(ls.scene_gate_state || "unknown").toUpperCase()}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[
                { label: isTr ? "G\u00f6nderim" : "Dispatched", value: ls.dispatched || 0, color: "#00ff88" },
                { label: isTr ? "Etkinlik" : "Events", value: ls.events_generated || 0, color: "#e040fb" },
                { label: isTr ? "Anomali" : "Anomalies", value: ls.anomalies_rotated || 0, color: "#ffd700" },
                { label: isTr ? "S\u00fcresi Dolan" : "Expired", value: ls.expired || 0, color: "#00d2ff" }
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 8, opacity: 0.5, textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono, monospace)" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last run timestamp */}
          {(qp.last_run || ls.last_run) && (
            <div style={{ fontSize: 9, opacity: 0.4, textAlign: "right", paddingTop: 4 }}>
              {isTr ? "Son \u00e7al\u0131\u015fma" : "Last run"}: {new Date(ls.last_run || qp.last_run || "").toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
