import { useState, useCallback, useEffect } from "react";
import { getJson } from "../../api/common";
import type { WebAppAuth } from "../../types";
import type { Lang } from "../../i18n";

type InviteData = {
  invite_code: string;
  invite_url: string;
  referral_count: number;
  rewarded_count: number;
  tier: number;
  max_referrals: number;
};

type InviteWidgetProps = {
  lang: Lang;
  auth?: WebAppAuth | null;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

const TIER_REWARDS: Record<number, { sc: number; hc?: number }> = {
  1: { sc: 100 },
  2: { sc: 200, hc: 1 },
  3: { sc: 500, hc: 2 },
  4: { sc: 1000, hc: 4 },
  5: { sc: 2000, hc: 8 },
  6: { sc: 4000, hc: 16 },
  7: { sc: 8000, hc: 32 },
  8: { sc: 16000, hc: 64 },
};

export function InviteWidget({ lang, auth }: InviteWidgetProps) {
  const isTr = lang === "tr";
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showTiers, setShowTiers] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = authFields(auth);
      const resp = await getJson<{ success: boolean; data: InviteData }>(
        `/webapp/api/v2/player/invite?${new URLSearchParams({ uid: a.uid, ts: a.ts, sig: a.sig })}`
      );
      if (resp.success && resp.data) setData(resp.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { load(); }, [load]);

  const copyCode = useCallback(async () => {
    if (!data) return;
    const text = data.invite_url || data.invite_code;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback: create input, select, copy
      const el = document.createElement("input");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [data]);

  const shareLink = useCallback(() => {
    if (!data) return;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(data.invite_url)}&text=${encodeURIComponent(
      isTr
        ? "🎮 Nexus Arena'ya katıl! Görev tamamla, PvP'de savaş, BTC kazan. Davet linkim:"
        : "🎮 Join Nexus Arena! Complete tasks, fight in PvP, earn BTC. My invite:"
    )}`;
    // Try Telegram WebApp share first
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.openTelegramLink) {
      (window as any).Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, "_blank");
    }
  }, [data, isTr]);

  if (loading) {
    return (
      <div className="akrCard" style={{ padding: "12px", opacity: 0.4 }}>
        <div style={{ fontSize: 11 }}>{isTr ? "Davet yükleniyor..." : "Loading invite..."}</div>
      </div>
    );
  }

  if (!data) return null;

  const nextTierAt = data.tier < 8 ? data.tier * 5 : null;
  const tierReward = TIER_REWARDS[data.tier] || TIER_REWARDS[1];
  const pctToNext  = nextTierAt ? Math.min(100, Math.round((data.referral_count / nextTierAt) * 100)) : 100;

  return (
    <div className="akrCard" style={{ borderLeft: "3px solid #00d2ff", padding: 0, overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "10px 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00d2ff" }}>
            🤝 {isTr ? "Arkadaşını Davet Et" : "Invite Friends"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>
            {isTr ? "Her davet SC/HC kazan · Tier atla" : "Earn SC/HC per invite · Level up tier"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#ffd700", fontFamily: "monospace" }}>
            T{data.tier}
          </div>
          <div style={{ fontSize: 9, opacity: 0.4 }}>tier</div>
        </div>
      </div>

      {/* stats bar */}
      <div style={{ padding: "0 12px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, opacity: 0.6 }}>
            {data.referral_count} {isTr ? "davet" : "referrals"}
          </span>
          {nextTierAt && (
            <span style={{ fontSize: 10, opacity: 0.5 }}>
              {data.referral_count}/{nextTierAt} → T{data.tier + 1}
            </span>
          )}
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${pctToNext}%`, background: "linear-gradient(90deg,#00d2ff,#e040fb)", borderRadius: 2, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* invite code box */}
      <div style={{ margin: "0 12px 8px", background: "rgba(0,210,255,0.06)", border: "1px solid rgba(0,210,255,0.2)", borderRadius: 10, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, opacity: 0.4, marginBottom: 2 }}>{isTr ? "Davet kodu" : "Invite code"}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#00d2ff", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.invite_code}
          </div>
        </div>
        <button
          onClick={copyCode}
          style={{ background: copied ? "rgba(0,255,136,0.15)" : "rgba(0,210,255,0.12)", border: `1px solid ${copied ? "rgba(0,255,136,0.4)" : "rgba(0,210,255,0.35)"}`, borderRadius: 7, padding: "5px 10px", fontSize: 11, color: copied ? "#00ff88" : "#00d2ff", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
        >
          {copied ? (isTr ? "✅ Kopyalandı" : "✅ Copied") : (isTr ? "📋 Kopyala" : "📋 Copy")}
        </button>
      </div>

      {/* actions */}
      <div style={{ padding: "0 12px 10px", display: "flex", gap: 6 }}>
        <button
          className="akrBtn akrBtnAccent"
          onClick={shareLink}
          style={{ flex: 1, fontSize: 12, fontWeight: 700 }}
        >
          📤 {isTr ? "Telegram'da Paylaş" : "Share on Telegram"}
        </button>
        <button
          onClick={() => setShowTiers(s => !s)}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px", fontSize: 11, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}
        >
          {showTiers ? "▲" : "▼"} {isTr ? "Ödüller" : "Rewards"}
        </button>
      </div>

      {/* tier table */}
      {showTiers && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 12px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
            {isTr ? "Tier Ödülleri" : "Tier Rewards"}
          </div>
          {[1,2,3,4,5,6,7,8].map(t => {
            const r = TIER_REWARDS[t];
            const isCurrent = data.tier === t;
            return (
              <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: t < 8 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ fontSize: 10, color: isCurrent ? "#ffd700" : "rgba(255,255,255,0.35)", fontWeight: isCurrent ? 700 : 400 }}>
                  {isCurrent ? "▶" : "  "} T{t} ({(t-1)*5}–{t*5} {isTr ? "davet" : "referrals"})
                </span>
                <span style={{ fontSize: 10, color: isCurrent ? "#ffd700" : "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
                  {r.sc} SC{r.hc ? ` + ${r.hc} HC` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
