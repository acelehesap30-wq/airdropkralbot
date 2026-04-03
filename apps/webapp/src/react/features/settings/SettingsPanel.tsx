import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";

type SettingsPanelProps = {
  lang: Lang;
  advanced: boolean;
  data: BootstrapV2Data | null;
  onToggleReducedMotion: (next: boolean) => void;
  onToggleLargeText: (next: boolean) => void;
  onToggleLanguage: (next: Lang) => void;
  onToggleNotification: (family: string, enabled: boolean) => void;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

const ALERT_FAMILIES = [
  { key: "chest_ready", i18nKey: "settings_alert_chest_ready" as const },
  { key: "mission_refresh", i18nKey: "settings_alert_mission_refresh" as const },
  { key: "event_countdown", i18nKey: "settings_alert_event_countdown" as const },
  { key: "kingdom_war", i18nKey: "settings_alert_kingdom_war" as const },
  { key: "streak_risk", i18nKey: "settings_alert_streak_risk" as const },
  { key: "payout_update", i18nKey: "settings_alert_payout_update" as const },
  { key: "rare_drop", i18nKey: "settings_alert_rare_drop" as const },
  { key: "comeback_offer", i18nKey: "settings_alert_comeback_offer" as const },
  { key: "season_deadline", i18nKey: "settings_alert_season_deadline" as const },
  { key: "daily_task_available", i18nKey: "settings_alert_daily_task" as const },
  { key: "pvp_match_ready", i18nKey: "settings_alert_pvp_ready" as const },
  { key: "payout_ready", i18nKey: "settings_alert_payout_ready" as const },
  { key: "wallet_required", i18nKey: "settings_alert_wallet_required" as const },
  { key: "tier_upgrade", i18nKey: "settings_alert_tier_upgrade" as const }
];

export function SettingsPanel(props: SettingsPanelProps) {
  const isTr = props.lang === "tr";
  const prefs = (props.data?.ui_prefs as {
    reduced_motion?: boolean;
    large_text?: boolean;
    sound_enabled?: boolean;
    prefs_json?: Record<string, unknown>;
  } | null) || {};
  const profile = props.data?.profile || {};

  const notifPrefs = (prefs.prefs_json as Record<string, unknown>) || {};

  return (
    <section className="akrPanelSection">
      <div className="akrCard akrCardGlow">
        <div className="akrCardHeader">
          <h2 className="akrCardTitle">{t(props.lang, "settings_title")}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {t(props.lang, "settings_hero_body")}
        </p>
      </div>

      {/* Profile card */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Profil" : "Profile"}
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 0" }}>
          <div>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{isTr ? "Kullanıcı" : "Username"}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {String((profile as any)?.public_name || "-")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>Tier</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ffd700" }}>
              T{Number((profile as any)?.kingdom_tier || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="akrCard">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{isTr ? "Dil" : "Language"}</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>{isTr ? "Türkçe / English" : "Turkish / English"}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`akrBtn akrBtnSm ${isTr ? "akrBtnActive" : ""}`}
              onClick={() => props.onToggleLanguage("tr")}
              style={{ fontSize: 11, fontWeight: isTr ? 700 : 400, opacity: isTr ? 1 : 0.5 }}
            >
              TR
            </button>
            <button
              className={`akrBtn akrBtnSm ${!isTr ? "akrBtnActive" : ""}`}
              onClick={() => props.onToggleLanguage("en")}
              style={{ fontSize: 11, fontWeight: !isTr ? 700 : 400, opacity: !isTr ? 1 : 0.5 }}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* UI Preferences */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Arayüz" : "Interface"}
          </h3>
        </div>
        <ToggleRow
          label={isTr ? "Azaltılmış Hareket" : "Reduced Motion"}
          checked={Boolean(prefs.reduced_motion)}
          onChange={(v) => props.onToggleReducedMotion(v)}
        />
        <ToggleRow
          label={isTr ? "Büyük Yazı" : "Large Text"}
          checked={Boolean(prefs.large_text)}
          onChange={(v) => props.onToggleLargeText(v)}
        />
      </div>

      {/* Notification preferences */}
      <div className="akrCard">
        <div className="akrCardHeader">
          <h3 className="akrCardTitle" style={{ fontSize: 13 }}>
            {isTr ? "Bildirimler" : "Notifications"}
          </h3>
        </div>
        {ALERT_FAMILIES.map((fam) => {
          const prefKey = `alert_${fam.key}`;
          const enabled = notifPrefs[prefKey] !== false;
          return (
            <ToggleRow
              key={fam.key}
              label={t(props.lang, fam.i18nKey)}
              checked={enabled}
              onChange={(v) => props.onToggleNotification(fam.key, v)}
            />
          );
        })}
      </div>

      {/* App info */}
      <div className="akrCard" style={{ opacity: 0.6 }}>
        <div style={{ fontSize: 10, textAlign: "center" }}>
          AirdropKralBot v{props.data?.api_version || "2.0"} &bull; {isTr ? "Blueprint'ten üretildi" : "Built from Blueprint"}
        </div>
      </div>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)"
    }}>
      <span style={{ fontSize: 12 }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
          background: checked ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.1)",
          position: "relative", transition: "background 0.2s"
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          background: checked ? "#00d4ff" : "rgba(255,255,255,0.3)",
          position: "absolute", top: 3,
          left: checked ? 21 : 3,
          transition: "left 0.2s, background 0.2s"
        }} />
      </button>
    </div>
  );
}
