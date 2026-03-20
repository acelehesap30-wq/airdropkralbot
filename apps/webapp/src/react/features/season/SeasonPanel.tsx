import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";

type SeasonPanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

export function SeasonPanel(props: SeasonPanelProps) {
  const isTr = props.lang === "tr";
  const season = props.data?.season || {};
  const profile = props.data?.profile || {};
  const daily = props.data?.daily || {};

  const seasonId = Number((season as any)?.season_id || 1);
  const daysLeft = Number((season as any)?.days_left || 30);
  const points = Number((season as any)?.points || 0);
  const rank = Number((season as any)?.rank || 0);
  const streak = Number((profile as any)?.current_streak || 0);
  const tier = Number((profile as any)?.kingdom_tier || 0);
  const tasksDone = Number((daily as any)?.tasks_done || 0);
  const dailyCap = Number((daily as any)?.daily_cap || 5);

  const TARGET = 50000;
  const pct = Math.min(100, Math.round((points / TARGET) * 100));

  const TIERS = [
    { tier: 1, pts: 5000, reward: "500 SC", color: "#00ff88" },
    { tier: 2, pts: 15000, reward: "10 HC + Neon Frame", color: "#00d2ff" },
    { tier: 3, pts: 30000, reward: "50 HC + Badge", color: "#e040fb" },
    { tier: 4, pts: 50000, reward: "0.001 BTC + Title", color: "#ffd700" }
  ];

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">
            {isTr ? "Sezon" : "Season"} #{seasonId}
          </h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? `${daysLeft} gun kaldi \u2022 Siralama ${rank > 0 ? "#" + rank : "-"}`
            : `${daysLeft} days left \u2022 Rank ${rank > 0 ? "#" + rank : "-"}`}
        </p>
        {/* Progress bar */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}>
              {points.toLocaleString()} / {TARGET.toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: "#00d2ff", fontFamily: "var(--font-mono, monospace)" }}>{pct}%</span>
          </div>
          <div style={{
            height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden"
          }}>
            <div style={{
              height: "100%", width: `${pct}%`, borderRadius: 4,
              background: "linear-gradient(90deg, #00d4ff, #ffd700)",
              transition: "width 0.5s ease"
            }} />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { label: isTr ? "Gun" : "Day", value: `D${daysLeft > 0 ? 30 - daysLeft + 1 : 1}`, color: "#00d2ff" },
          { label: isTr ? "Seri" : "Streak", value: `${streak}d`, color: "#ff4444" },
          { label: isTr ? "Gorev" : "Tasks", value: `${tasksDone}/${dailyCap}`, color: "#00ff88" },
          { label: "Tier", value: `T${tier}`, color: "#ffd700" }
        ].map((s) => (
          <div key={s.label} className="akrCard" style={{ textAlign: "center", padding: "8px 4px" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono, monospace)" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Reward tiers */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Sezon Odulleri" : "Season Rewards"}
          </h3>
        </div>
        {TIERS.map((tier) => {
          const reached = points >= tier.pts;
          return (
            <div key={tier.tier} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
              opacity: reached ? 1 : 0.5
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: reached ? `${tier.color}15` : "rgba(255,255,255,0.03)",
                  border: `2px solid ${reached ? tier.color : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: reached ? tier.color : "rgba(255,255,255,0.3)"
                }}>
                  {reached ? "\u2713" : tier.tier}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{tier.reward}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, fontFamily: "var(--font-mono, monospace)" }}>
                    {tier.pts.toLocaleString()} pts
                  </div>
                </div>
              </div>
              {reached && (
                <button className="akrBtn akrBtnSm" style={{ fontSize: 10 }}>
                  {isTr ? "Topla" : "Claim"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
