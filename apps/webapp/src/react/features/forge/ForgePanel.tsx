import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";

type ForgePanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

export function ForgePanel(props: ForgePanelProps) {
  const isTr = props.lang === "tr";
  const balances = props.data?.balances || {};
  const sc = Number(balances.sc || 0);
  const hc = Number(balances.hc || 0);
  const rc = Number(balances.rc || 0);
  const tier = Number(props.data?.profile?.kingdom_tier || 0);

  const FORGE_RECIPES = [
    {
      id: "sc_to_hc",
      label_tr: "SC \u2192 HC Donusum",
      label_en: "SC \u2192 HC Convert",
      desc_tr: "1000 SC harcayarak 1 HC kazan",
      desc_en: "Spend 1000 SC to earn 1 HC",
      cost: "1000 SC",
      reward: "1 HC",
      available: sc >= 1000,
      color: "#00d2ff"
    },
    {
      id: "hc_boost",
      label_tr: "HC Streak Boost",
      label_en: "HC Streak Boost",
      desc_tr: "5 HC ile streak carpanini 24 saat x2 yap",
      desc_en: "Spend 5 HC to double streak multiplier for 24h",
      cost: "5 HC",
      reward: "x2 Streak (24h)",
      available: hc >= 5,
      color: "#e040fb"
    },
    {
      id: "rc_craft",
      label_tr: "RC Ozel Badge",
      label_en: "RC Special Badge",
      desc_tr: "10 RC ile ozel sezon badge'i craft et",
      desc_en: "Craft a special season badge with 10 RC",
      cost: "10 RC",
      reward: "Season Badge",
      available: rc >= 10,
      color: "#ffd700"
    },
    {
      id: "tier_forge",
      label_tr: "Tier Ilerletme",
      label_en: "Tier Advance",
      desc_tr: "Tier atlama icin gereken materyalleri biriktir",
      desc_en: "Gather materials required for tier advancement",
      cost: `T${tier} Materials`,
      reward: `T${tier + 1} Unlock`,
      available: tier > 0,
      color: "#00ff88"
    }
  ];

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{isTr ? "Forge Atolyesi" : "Forge Workshop"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr
            ? "Kaynaklarini birlestir, boost craft et ve tier atla."
            : "Combine resources, craft boosts and advance your tier."}
        </p>
      </div>

      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Mevcut Kaynaklar" : "Available Resources"}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "8px 0" }}>
          {[
            { key: "SC", value: sc, color: "#00ff88" },
            { key: "HC", value: hc, color: "#00d2ff" },
            { key: "RC", value: rc, color: "#e040fb" }
          ].map((c) => (
            <div key={c.key} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{c.key}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.color, fontFamily: "var(--font-mono, monospace)" }}>
                {c.value > 1000 ? `${(c.value / 1000).toFixed(1)}k` : c.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {FORGE_RECIPES.map((recipe) => (
        <div key={recipe.id} className="akrCard" style={{ opacity: recipe.available ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: recipe.color }}>
                {isTr ? recipe.label_tr : recipe.label_en}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                {isTr ? recipe.desc_tr : recipe.desc_en}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono, monospace)", opacity: 0.7 }}>
                  {recipe.cost}
                </span>
                <span style={{ fontSize: 10, opacity: 0.4 }}>&rarr;</span>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono, monospace)", color: recipe.color }}>
                  {recipe.reward}
                </span>
              </div>
            </div>
            <button
              className="akrBtn akrBtnSm"
              disabled={!recipe.available}
              style={{ opacity: recipe.available ? 1 : 0.4 }}
            >
              {isTr ? "Craft" : "Craft"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
