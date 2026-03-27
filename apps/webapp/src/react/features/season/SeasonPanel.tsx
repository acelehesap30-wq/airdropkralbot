import { useState, useCallback, useEffect } from "react";
import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data, WebAppAuth } from "../../types";
import { buildActionRequestId, postJson, getJson, withAuthQuery } from "../../api/common";
import { StreakChallenge } from "./StreakChallenge";
import { TournamentBracket } from "./TournamentBracket";

type SeasonPanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  auth?: WebAppAuth | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  tier: number;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

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
  const seasonDay = daysLeft > 0 ? 30 - daysLeft + 1 : 1;

  const [claimingTier, setClaimingTier] = useState<number | null>(null);
  const [claimResult, setClaimResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [claimedTiers, setClaimedTiers] = useState<Set<number>>(new Set());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  const TARGET = 50000;
  const pct = Math.min(100, Math.round((points / TARGET) * 100));

  const TIERS = [
    { tier: 1, pts: 5000, reward_tr: "500 SC", reward_en: "500 SC", mission_key: "season_tier_1", color: "#00ff88", icon: "\ud83c\udf1f" },
    { tier: 2, pts: 15000, reward_tr: "10 HC + Neon \u00c7er\u00e7eve", reward_en: "10 HC + Neon Frame", mission_key: "season_tier_2", color: "#00d2ff", icon: "\ud83d\udc8e" },
    { tier: 3, pts: 30000, reward_tr: "50 HC + \u00d6zel Badge", reward_en: "50 HC + Badge", mission_key: "season_tier_3", color: "#e040fb", icon: "\ud83d\udc51" },
    { tier: 4, pts: 50000, reward_tr: "0.001 BTC + Unvan", reward_en: "0.001 BTC + Title", mission_key: "season_tier_4", color: "#ffd700", icon: "\ud83c\udfc6" }
  ];

  // Fetch leaderboard on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchLb() {
      setLbLoading(true);
      try {
        const auth = authFields(props.auth);
        const query = withAuthQuery(auth as any, { limit: "10" });
        const resp = await getJson<any>(`/webapp/api/v2/pvp/leaderboard/live?${query}`);
        if (!cancelled && resp?.success && Array.isArray(resp?.data?.entries)) {
          setLeaderboard(resp.data.entries.slice(0, 10).map((e: any, i: number) => ({
            rank: e.rank || i + 1,
            name: e.display_name || e.username || `Player ${i + 1}`,
            points: Number(e.season_points || e.points || e.score || 0),
            tier: Number(e.kingdom_tier || e.tier || 0)
          })));
        }
      } catch (_) {}
      if (!cancelled) setLbLoading(false);
    }
    fetchLb();
    return () => { cancelled = true; };
  }, [props.auth]);

  const handleClaim = useCallback(async (tierNum: number, missionKey: string) => {
    if (claimingTier !== null) return;
    setClaimingTier(tierNum);
    setClaimResult(null);

    try {
      const auth = authFields(props.auth);
      const resp = await postJson<any>("/webapp/api/v2/actions/claim-mission", {
        ...auth,
        mission_key: missionKey,
        action_request_id: buildActionRequestId(`season_claim_t${tierNum}`)
      });

      if (resp.success) {
        const msg = isTr
          ? `Tier ${tierNum} \u00f6d\u00fcl\u00fc topland\u0131!`
          : `Tier ${tierNum} reward claimed!`;
        setClaimResult({ msg, ok: true });
        setClaimedTiers((prev) => new Set([...prev, tierNum]));
      } else {
        setClaimResult({ msg: resp.error || (isTr ? "Toplama ba\u015far\u0131s\u0131z" : "Claim failed"), ok: false });
      }
    } catch (_) {
      setClaimResult({ msg: isTr ? "Ba\u011flant\u0131 hatas\u0131" : "Connection error", ok: false });
    } finally {
      setClaimingTier(null);
    }
  }, [claimingTier, props.auth, isTr]);

  return (
    <section className="akrPanelSection">
      {/* Season header */}
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">
            {isTr ? "Sezon" : "Season"} #{seasonId}
          </h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? `${daysLeft} g\u00fcn kald\u0131 \u2022 S\u0131ralama ${rank > 0 ? "#" + rank : "-"} \u2022 G\u00fcn ${seasonDay}/30`
            : `${daysLeft} days left \u2022 Rank ${rank > 0 ? "#" + rank : "-"} \u2022 Day ${seasonDay}/30`}
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
          {/* Tier markers on progress */}
          <div style={{ position: "relative", height: 12, marginTop: 2 }}>
            {TIERS.map((t) => {
              const pos = Math.min(100, (t.pts / TARGET) * 100);
              return (
                <div key={t.tier} style={{
                  position: "absolute", left: `${pos}%`, transform: "translateX(-50%)",
                  fontSize: 8, color: points >= t.pts ? t.color : "rgba(255,255,255,0.3)",
                  fontWeight: 700
                }}>
                  T{t.tier}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[
          { label: isTr ? "G\u00fcn" : "Day", value: `D${seasonDay}`, color: "#00d2ff" },
          { label: isTr ? "Seri" : "Streak", value: `${streak}d`, color: "#ff4444" },
          { label: isTr ? "G\u00f6rev" : "Tasks", value: `${tasksDone}/${dailyCap}`, color: "#00ff88" },
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

      {/* Claim result flash */}
      {claimResult && (
        <div className="akrCard" style={{
          borderColor: claimResult.ok ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: claimResult.ok ? "#00ff88" : "#ff6644",
            fontFamily: "var(--font-mono, monospace)",
            padding: "6px 0"
          }}>
            {claimResult.ok ? "\u2713 " : "\u2717 "}{claimResult.msg}
          </div>
        </div>
      )}

      {/* Reward tiers */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Sezon \u00d6d\u00fclleri" : "Season Rewards"}
          </h3>
        </div>
        {TIERS.map((t) => {
          const reached = points >= t.pts;
          const claimed = claimedTiers.has(t.tier);
          return (
            <div key={t.tier} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
              opacity: reached ? 1 : 0.5
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: reached ? `${t.color}15` : "rgba(255,255,255,0.03)",
                  border: `2px solid ${reached ? t.color : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16
                }}>
                  {reached ? t.icon : <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{t.tier}</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: reached ? t.color : "inherit" }}>
                    {isTr ? t.reward_tr : t.reward_en}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5, fontFamily: "var(--font-mono, monospace)" }}>
                    {t.pts.toLocaleString()} {isTr ? "puan" : "pts"}
                    {reached && !claimed && (
                      <span style={{ color: "#00ff88", marginLeft: 6 }}>{isTr ? "\u2022 Haz\u0131r" : "\u2022 Ready"}</span>
                    )}
                    {claimed && (
                      <span style={{ color: "#ffd700", marginLeft: 6 }}>{isTr ? "\u2022 Topland\u0131" : "\u2022 Claimed"}</span>
                    )}
                  </div>
                </div>
              </div>
              {reached && !claimed && (
                <button
                  className="akrBtn akrBtnSm"
                  style={{ fontSize: 10, minWidth: 64 }}
                  disabled={claimingTier !== null}
                  onClick={() => handleClaim(t.tier, t.mission_key)}
                >
                  {claimingTier === t.tier
                    ? (isTr ? "\u0130\u015fleniyor..." : "Claiming...")
                    : (isTr ? "Topla" : "Claim")}
                </button>
              )}
              {claimed && (
                <span style={{ fontSize: 10, color: "#ffd700", fontFamily: "var(--font-mono, monospace)" }}>
                  \u2713
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Daily challenge mini-section */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "G\u00fcnl\u00fck \u0130lerleme" : "Daily Progress"}
          </h3>
        </div>
        <div style={{ padding: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              {isTr ? "G\u00f6revler" : "Tasks"}: {tasksDone}/{dailyCap}
            </span>
            <span style={{ fontSize: 11, color: tasksDone >= dailyCap ? "#00ff88" : "#00d2ff", fontFamily: "var(--font-mono, monospace)" }}>
              {tasksDone >= dailyCap ? (isTr ? "Tamamland\u0131!" : "Complete!") : `${Math.round((tasksDone / dailyCap) * 100)}%`}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, (tasksDone / dailyCap) * 100)}%`,
              borderRadius: 3, background: tasksDone >= dailyCap ? "#00ff88" : "#00d2ff",
              transition: "width 0.3s ease"
            }} />
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>
            {isTr
              ? `Streak ${streak} g\u00fcn \u2022 G\u00fcnl\u00fck g\u00f6rev tamamla ve sezon puan\u0131 kazan`
              : `Streak ${streak} days \u2022 Complete daily tasks to earn season points`}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "S\u0131ralama" : "Leaderboard"} — Top 10
          </h3>
        </div>
        {lbLoading ? (
          <div style={{ textAlign: "center", padding: 16, fontSize: 11, opacity: 0.5 }}>
            {isTr ? "Y\u00fckleniyor..." : "Loading..."}
          </div>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((entry, i) => {
            const isMe = rank > 0 && entry.rank === rank;
            const medalColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
            return (
              <div key={entry.rank} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: isMe ? "6px 8px" : "6px 0",
                borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: isMe ? "rgba(0,210,255,0.06)" : "transparent",
                borderRadius: isMe ? 4 : 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, width: 24, textAlign: "center",
                    color: i < 3 ? medalColors[i] : "rgba(255,255,255,0.4)"
                  }}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${entry.rank}`}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isMe ? 700 : 400 }}>
                    {entry.name}{isMe ? (isTr ? " (Sen)" : " (You)") : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, opacity: 0.5 }}>T{entry.tier}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono, monospace)", color: "#00d2ff" }}>
                    {entry.points.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: 16, fontSize: 11, opacity: 0.5 }}>
            {isTr ? "Hen\u00fcz s\u0131ralama verisi yok" : "No leaderboard data yet"}
          </div>
        )}
        {rank > 0 && rank > 10 && (
          <div style={{
            textAlign: "center", padding: "8px 0", fontSize: 11, opacity: 0.6,
            borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 4
          }}>
            {isTr ? `Senin s\u0131raman: #${rank}` : `Your rank: #${rank}`}
          </div>
        )}
      </div>

      <StreakChallenge lang={props.lang} />

      {/* Tournament Bracket — Blueprint §season_hall */}
      <TournamentBracket lang={props.lang} auth={props.auth} />
    </section>
  );
}
