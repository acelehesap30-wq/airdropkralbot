import { useState, useCallback } from "react";
import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data, WebAppAuth } from "../../types";
import { buildActionRequestId, postJson } from "../../api/common";
import { ResourceMerge } from "./ResourceMerge";
import { ChestReveal } from "./ChestReveal";

type ForgePanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  auth?: WebAppAuth | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

type CraftLog = {
  id: string;
  label: string;
  result: string;
  ts: number;
  ok: boolean;
};

function authFields(auth?: WebAppAuth | null) {
  if (auth) return { uid: auth.uid, ts: auth.ts, sig: auth.sig };
  const p = new URLSearchParams(window.location.search);
  return { uid: p.get("uid") || "", ts: p.get("ts") || String(Date.now()), sig: p.get("sig") || "" };
}

export function ForgePanel(props: ForgePanelProps) {
  const isTr = props.lang === "tr";
  const balances = props.data?.balances || {};
  const sc = Number(balances.sc || 0);
  const hc = Number(balances.hc || 0);
  const rc = Number(balances.rc || 0);
  const tier = Number(props.data?.profile?.kingdom_tier || 0);
  const streak = Number((props.data?.profile as any)?.current_streak || 0);

  const [craftingId, setCraftingId] = useState<string | null>(null);
  const [craftResult, setCraftResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [craftLog, setCraftLog] = useState<CraftLog[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [subView, setSubView] = useState<"play" | "craft" | "log">("play");

  const now = Date.now();

  const handleCraft = useCallback(async (recipeId: string, label: string) => {
    if (craftingId) return;
    const cd = cooldowns[recipeId];
    if (cd && cd > now) return;

    setCraftingId(recipeId);
    setCraftResult(null);

    try {
      const auth = authFields(props.auth);
      const resp = await postJson<any>("/webapp/api/v2/player/action", {
        ...auth,
        action_key: `forge_${recipeId}`,
        action_request_id: buildActionRequestId(`forge_${recipeId}`),
        payload: { recipe_id: recipeId }
      });

      if (resp.success) {
        const reward = resp.data?.reward_text || label;
        const msg = isTr ? `Craft basarili: ${reward}` : `Craft success: ${reward}`;
        setCraftResult({ msg, ok: true });
        setCraftLog((prev) => [{ id: recipeId, label, result: msg, ts: Date.now(), ok: true }, ...prev].slice(0, 10));
        // 60s cooldown per recipe
        setCooldowns((prev) => ({ ...prev, [recipeId]: Date.now() + 60_000 }));
      } else {
        const errMsg = resp.error || (isTr ? "Craft basarisiz" : "Craft failed");
        setCraftResult({ msg: errMsg, ok: false });
        setCraftLog((prev) => [{ id: recipeId, label, result: errMsg, ts: Date.now(), ok: false }, ...prev].slice(0, 10));
      }
    } catch (_) {
      const errMsg = isTr ? "Baglanti hatasi" : "Connection error";
      setCraftResult({ msg: errMsg, ok: false });
    } finally {
      setCraftingId(null);
    }
  }, [craftingId, cooldowns, now, props.auth, isTr]);

  const FORGE_RECIPES = [
    {
      id: "sc_to_hc",
      label_tr: "SC \u2192 HC D\u00f6n\u00fc\u015f\u00fcm",
      label_en: "SC \u2192 HC Convert",
      desc_tr: "1000 SC harcayarak 1 HC kazan. Temel d\u00f6viz \u00e7evrimi.",
      desc_en: "Spend 1000 SC to earn 1 HC. Basic currency conversion.",
      cost: "1000 SC",
      reward: "1 HC",
      available: sc >= 1000,
      color: "#00d2ff",
      icon: "\ud83d\udcb0"
    },
    {
      id: "hc_boost",
      label_tr: "HC Streak Boost",
      label_en: "HC Streak Boost",
      desc_tr: `5 HC ile streak \u00e7arpan\u0131n\u0131 24 saat x2 yap. Mevcut seri: ${streak} g\u00fcn.`,
      desc_en: `Spend 5 HC to double streak multiplier for 24h. Current streak: ${streak} days.`,
      cost: "5 HC",
      reward: "x2 Streak (24h)",
      available: hc >= 5,
      color: "#e040fb",
      icon: "\u26a1"
    },
    {
      id: "rc_craft",
      label_tr: "RC \u00d6zel Badge",
      label_en: "RC Special Badge",
      desc_tr: "10 RC ile \u00f6zel sezon badge'i craft et. Profilde g\u00f6r\u00fcn\u00fcr.",
      desc_en: "Craft a special season badge with 10 RC. Visible on profile.",
      cost: "10 RC",
      reward: "Season Badge",
      available: rc >= 10,
      color: "#ffd700",
      icon: "\ud83c\udfc5"
    },
    {
      id: "tier_forge",
      label_tr: "Tier \u0130lerletme",
      label_en: "Tier Advance",
      desc_tr: `T${tier} \u2192 T${tier + 1} i\u00e7in gereken materyalleri birle\u015ftir.`,
      desc_en: `Combine materials required for T${tier} \u2192 T${tier + 1} advancement.`,
      cost: `${tier * 500} SC + ${tier * 5} HC`,
      reward: `T${tier + 1} Unlock`,
      available: tier > 0 && sc >= tier * 500 && hc >= tier * 5,
      color: "#00ff88",
      icon: "\ud83d\udd31"
    },
    {
      id: "nxt_compound",
      label_tr: "NXT Bile\u015fik Mint",
      label_en: "NXT Compound Mint",
      desc_tr: "T\u00fcm kaynaklari birle\u015ftirip NXT token mint et. (100 SC + 1 HC + 1 RC)",
      desc_en: "Combine all resources to mint NXT tokens. (100 SC + 1 HC + 1 RC)",
      cost: "100 SC + 1 HC + 1 RC",
      reward: "0.5 NXT",
      available: sc >= 100 && hc >= 1 && rc >= 1,
      color: "#ff8800",
      icon: "\ud83e\uddea"
    }
  ];

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{isTr ? "Forge At\u00f6lyesi" : "Forge Workshop"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? "Kaynaklar\u0131n\u0131 birle\u015ftir, boost craft et, tier atla ve NXT mint et."
            : "Combine resources, craft boosts, advance your tier and mint NXT."}
        </p>
      </div>

      {/* ── Sub-navigation ── */}
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 8 }}>
        {([
          { key: "play" as const, icon: "🎮", l: props.lang === "tr" ? "Oyunlar" : "Games" },
          { key: "craft" as const, icon: "⚗️", l: props.lang === "tr" ? "Craft" : "Craft" },
          { key: "log" as const, icon: "📋", l: props.lang === "tr" ? "Geçmiş" : "History" },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setSubView(tab.key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
            background: subView === tab.key ? "rgba(255,136,0,0.12)" : "transparent",
            color: subView === tab.key ? "#ff8800" : "rgba(255,255,255,0.35)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            borderBottom: subView === tab.key ? "2px solid rgba(255,136,0,0.5)" : "2px solid transparent",
          }}>
            {tab.icon} {tab.l}
          </button>
        ))}
      </div>

      {subView === "play" && (
        <>
          <div className="akrCard akrCardGlow">
            <div className="akrFeaturedHeader">
              <div className="akrFeaturedIcon">🧩</div>
              <div>
                <div className="akrFeaturedTitle">{isTr ? "Kaynak Birleştir" : "Resource Merge"}</div>
                <div className="akrFeaturedSub">{isTr ? "İzometrik 3D puzzle · Kaynakları birleştir · NXT kazan" : "Isometric 3D puzzle · Merge resources · Earn NXT"}</div>
                <div className="akrFeaturedBadge">🧩 PUZZLE</div>
              </div>
            </div>
            <ResourceMerge lang={props.lang} />
          </div>
          <div className="akrCard akrCardGlow" style={{ marginTop: 12 }}>
            <div className="akrFeaturedHeader">
              <div className="akrFeaturedIcon">📦</div>
              <div>
                <div className="akrFeaturedTitle">{isTr ? "Sandık Açılışı" : "Chest Reveal"}</div>
                <div className="akrFeaturedSub">{isTr ? "Common · Rare · Epic — ödüller aç" : "Common · Rare · Epic — reveal rewards"}</div>
                <div className="akrFeaturedBadge">🎁 LOOT</div>
              </div>
            </div>
            <ChestReveal lang={props.lang} auth={props.auth} />
          </div>
        </>
      )}

      {subView === "craft" && (<>
      {/* Resource overview */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Mevcut Kaynaklar" : "Available Resources"}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "8px 0" }}>
          {[
            { key: "SC", value: sc, color: "#00ff88" },
            { key: "HC", value: hc, color: "#00d2ff" },
            { key: "RC", value: rc, color: "#e040fb" },
            { key: "TIER", value: `T${tier}`, color: "#ffd700", raw: true }
          ].map((c) => (
            <div key={c.key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{c.key}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.color, fontFamily: "var(--font-mono, monospace)" }}>
                {(c as any).raw ? c.value : (typeof c.value === "number" && c.value > 1000 ? `${(c.value / 1000).toFixed(1)}k` : c.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Craft result flash */}
      {craftResult && (
        <div className="akrCard" style={{
          borderColor: craftResult.ok ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: craftResult.ok ? "#00ff88" : "#ff6644",
            fontFamily: "var(--font-mono, monospace)",
            padding: "6px 0"
          }}>
            {craftResult.ok ? "\u2713 " : "\u2717 "}{craftResult.msg}
          </div>
        </div>
      )}

      {/* Recipes */}
      {FORGE_RECIPES.map((recipe) => {
        const onCooldown = cooldowns[recipe.id] && cooldowns[recipe.id] > now;
        const disabled = !recipe.available || !!craftingId || !!onCooldown;
        return (
          <div key={recipe.id} className="akrCard" style={{
            opacity: recipe.available ? 1 : 0.45,
            borderLeft: `3px solid ${recipe.color}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{recipe.icon}</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: recipe.color }}>
                    {isTr ? recipe.label_tr : recipe.label_en}
                  </div>
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, lineHeight: 1.4 }}>
                  {isTr ? recipe.desc_tr : recipe.desc_en}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono, monospace)", opacity: 0.7,
                    background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4 }}>
                    {recipe.cost}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.4 }}>&rarr;</span>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono, monospace)", color: recipe.color,
                    background: `${recipe.color}10`, padding: "2px 6px", borderRadius: 4 }}>
                    {recipe.reward}
                  </span>
                </div>
              </div>
              <button
                className="akrBtn akrBtnSm"
                disabled={disabled}
                style={{
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                  minWidth: 72
                }}
                onClick={() => handleCraft(recipe.id, isTr ? recipe.label_tr : recipe.label_en)}
              >
                {craftingId === recipe.id
                  ? (isTr ? "\u0130\u015fleniyor..." : "Crafting...")
                  : onCooldown
                    ? (isTr ? "Bekleniyor" : "Cooldown")
                    : "Craft"}
              </button>
            </div>
          </div>
        );
      })}
      </>)}

      {subView === "log" && (<>
      {/* Crafting history */}
      {craftLog.length > 0 && (
        <div className="akrCard">
          <div className="akrCardHeader">
            <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
              {isTr ? "Son Craft \u0130\u015flemleri" : "Recent Crafts"}
            </h3>
          </div>
          {craftLog.slice(0, 5).map((log, i) => (
            <div key={`${log.id}_${log.ts}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 0",
              borderBottom: i < Math.min(craftLog.length, 5) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
            }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{log.label}</div>
              <div style={{
                fontSize: 10,
                fontFamily: "var(--font-mono, monospace)",
                color: log.ok ? "#00ff88" : "#ff6644"
              }}>
                {log.ok ? "\u2713" : "\u2717"} {new Date(log.ts).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
      </>)}
    </section>
  );
}
