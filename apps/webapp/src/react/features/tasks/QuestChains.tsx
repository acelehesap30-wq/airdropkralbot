import { useState, useCallback, useEffect, useRef } from "react";
import { postJson, getJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";

type QuestStep = {
  id: string;
  description_tr: string;
  description_en: string;
  requirement: { type: string; value: number };
  reward: { sc: number; hc: number; seasonPts: number };
};

type QuestChain = {
  id: string;
  name_tr: string;
  name_en: string;
  totalSteps: number;
  currentStepIndex: number;
  completed: boolean;
  currentStep: QuestStep | null;
  claimed_steps: number[];
};

type QuestChainsProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const CHAIN_COLORS: Record<string, string> = {
  nexus_awakening: "#e040fb",
  arena_warrior:   "#ff4444",
  vault_master:    "#00ff88",
  social_pioneer:  "#00d2ff",
  treasure_hunter: "#ffd700",
};

const CHAIN_ICONS: Record<string, string> = {
  nexus_awakening: "🌌",
  arena_warrior:   "⚔️",
  vault_master:    "💎",
  social_pioneer:  "🤝",
  treasure_hunter: "🏆",
};

export function QuestChains({ lang, auth }: QuestChainsProps) {
  const isTr = lang === "tr";
  const [chains, setChains] = useState<QuestChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = authFields(auth);
      const resp = await getJson<{ success: boolean; data: { chains: QuestChain[] } }>(
        `/webapp/api/v2/player/quests?${new URLSearchParams({ uid: a.uid, ts: a.ts, sig: a.sig })}`
      );
      if (resp.success && resp.data?.chains) {
        setChains(resp.data.chains);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { load(); }, [load]);

  const claimStep = useCallback(async (chainId: string, stepIndex: number) => {
    const key = `${chainId}:${stepIndex}`;
    setClaiming(key);
    setClaimResult(null);
    try {
      const a = authFields(auth);
      const resp = await postJson<{ success: boolean; data: { reward_granted?: { sc: number; hc: number } }; error?: string }>(
        "/webapp/api/v2/player/quests/advance",
        { ...a, chain_id: chainId, step_index: stepIndex }
      );
      if (resp.success) {
        const r = resp.data?.reward_granted;
        const parts: string[] = [];
        if (r?.sc) parts.push(`+${r.sc} SC`);
        if (r?.hc) parts.push(`+${r.hc} HC`);
        setClaimResult({ ok: true, msg: parts.join(" · ") || (isTr ? "Ödül alındı!" : "Reward claimed!") });
        await load();
      } else {
        const errMap: Record<string, string> = {
          step_not_ready:  isTr ? "Bu adım henüz hazır değil" : "Step not ready yet",
          already_claimed: isTr ? "Zaten alındı" : "Already claimed",
          chain_not_found: isTr ? "Görev zinciri bulunamadı" : "Chain not found",
        };
        setClaimResult({ ok: false, msg: errMap[resp.error || ""] || (isTr ? "Hata oluştu" : "Error occurred") });
      }
    } catch {
      setClaimResult({ ok: false, msg: isTr ? "Bağlantı hatası" : "Connection error" });
    } finally {
      setClaiming(null);
    }
  }, [auth, isTr, load]);

  if (loading) {
    return (
      <div className="akrCard" style={{ padding: "12px", textAlign: "center", opacity: 0.5 }}>
        <div style={{ fontSize: 12 }}>{isTr ? "Görevler yükleniyor..." : "Loading quests..."}</div>
      </div>
    );
  }

  const done   = chains.filter(c => c.completed).length;
  const total  = chains.length;

  return (
    <div>
      {/* section header */}
      <div className="akrCard" style={{ marginBottom: 6, padding: "8px 12px", borderLeft: "3px solid #e040fb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e040fb" }}>
              🔗 {isTr ? "Görev Zincirleri" : "Quest Chains"}
            </div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>
              {isTr ? "Tamamla · SC/HC kazan · Sezon puanı biriktir" : "Complete · Earn SC/HC · Gain season pts"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e040fb", fontFamily: "monospace" }}>
              {done}/{total}
            </div>
            <div style={{ fontSize: 9, opacity: 0.4 }}>{isTr ? "tamamlanan" : "complete"}</div>
          </div>
        </div>
        {/* overall progress bar */}
        <div style={{ marginTop: 6, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${total > 0 ? (done / total) * 100 : 0}%`, background: "#e040fb", borderRadius: 2, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* chain cards */}
      {chains.map(chain => {
        const color     = CHAIN_COLORS[chain.id] || "#e040fb";
        const icon      = CHAIN_ICONS[chain.id] || "📋";
        const pct       = chain.totalSteps > 0 ? Math.round((chain.currentStepIndex / chain.totalSteps) * 100) : 0;
        const isExpanded = expanded === chain.id;
        const canClaim  = !chain.completed && chain.currentStep !== null;
        const isClaiming = claiming === `${chain.id}:${chain.currentStepIndex}`;

        return (
          <div key={chain.id} className="akrCard" style={{ borderLeft: `3px solid ${color}`, marginBottom: 6, padding: 0, overflow: "hidden" }}>
            {/* chain header row */}
            <div
              style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              onClick={() => setExpanded(isExpanded ? null : chain.id)}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isTr ? chain.name_tr : chain.name_en}
                </div>
                <div style={{ fontSize: 9, opacity: 0.45, marginTop: 1 }}>
                  {chain.completed
                    ? (isTr ? "✅ Tamamlandı" : "✅ Complete")
                    : `${chain.currentStepIndex}/${chain.totalSteps} ${isTr ? "adım" : "steps"}`}
                </div>
              </div>
              {/* mini progress bar */}
              <div style={{ width: 52, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: chain.completed ? "#00ff88" : color, borderRadius: 2, transition: "width 0.4s" }} />
              </div>
              <span style={{ fontSize: 10, color, fontFamily: "monospace", flexShrink: 0 }}>{pct}%</span>
              <span style={{ fontSize: 10, opacity: 0.4 }}>{isExpanded ? "▲" : "▼"}</span>
            </div>

            {/* expanded: current step + claim */}
            {isExpanded && !chain.completed && chain.currentStep && (
              <div style={{ padding: "0 12px 10px", borderTop: `1px solid ${color}22` }}>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8, marginBottom: 6, lineHeight: 1.4 }}>
                  <span style={{ color, fontWeight: 700 }}>
                    {isTr ? `Adım ${chain.currentStepIndex + 1}` : `Step ${chain.currentStepIndex + 1}`}:
                  </span>{" "}
                  {isTr ? chain.currentStep.description_tr : chain.currentStep.description_en}
                </div>
                {/* reward preview */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  {chain.currentStep.reward.sc > 0 && (
                    <span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 6, color: "#ffd700" }}>
                      +{chain.currentStep.reward.sc} SC
                    </span>
                  )}
                  {chain.currentStep.reward.hc > 0 && (
                    <span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(0,210,255,0.1)", border: "1px solid rgba(0,210,255,0.25)", borderRadius: 6, color: "#00d2ff" }}>
                      +{chain.currentStep.reward.hc} HC
                    </span>
                  )}
                  {chain.currentStep.reward.seasonPts > 0 && (
                    <span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(224,64,251,0.1)", border: "1px solid rgba(224,64,251,0.25)", borderRadius: 6, color }}>
                      +{chain.currentStep.reward.seasonPts} pts
                    </span>
                  )}
                </div>
                <button
                  className="akrBtn akrBtnAccent"
                  onClick={() => claimStep(chain.id, chain.currentStepIndex)}
                  disabled={!canClaim || !!isClaiming}
                  style={{ width: "100%", fontSize: 12, opacity: (!canClaim || isClaiming) ? 0.4 : 1 }}
                >
                  {isClaiming ? (isTr ? "İşleniyor..." : "Processing...") : (isTr ? "Ödülü Al" : "Claim Reward")}
                </button>
              </div>
            )}

            {isExpanded && chain.completed && (
              <div style={{ padding: "8px 12px 10px", borderTop: `1px solid ${color}22`, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#00ff88", fontWeight: 700 }}>
                  🏆 {isTr ? "Zincir tamamlandı!" : "Chain complete!"}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* claim result toast */}
      {claimResult && (
        <div style={{
          margin: "4px 0 8px",
          padding: "8px 12px",
          borderRadius: 10,
          background: claimResult.ok ? "rgba(0,255,136,0.12)" : "rgba(255,68,68,0.12)",
          border: `1px solid ${claimResult.ok ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
          fontSize: 12,
          color: claimResult.ok ? "#00ff88" : "#ff4444",
          fontWeight: 600,
        }}>
          {claimResult.ok ? "✅" : "❌"} {claimResult.msg}
        </div>
      )}
    </div>
  );
}
