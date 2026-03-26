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
  { key: "chest_ready", label_tr: "Sandık Hazır", label_en: "Chest Ready" },
  { key: "mission_refresh", label_tr: "Görev Yenilendi", label_en: "Mission Refresh" },
  { key: "event_countdown", label_tr: "Etkinlik Geri Sayım", label_en: "Event Countdown" },
  { key: "kingdom_war", label_tr: "Krallık Savaşı", label_en: "Kingdom War" },
  { key: "streak_risk", label_tr: "Streak Riski", label_en: "Streak Risk" },
  { key: "payout_update", label_tr: "Ödeme Durumu", label_en: "Payout Update" },
  { key: "rare_drop", label_tr: "Nadir Ödül", label_en: "Rare Drop" },
  { key: "comeback_offer", label_tr: "Geri Dönüş Teklifi", label_en: "Comeback Offer" },
  { key: "season_deadline", label_tr: "Sezon Bitişi", label_en: "Season Deadline" },
  { key: "daily_task_available", label_tr: "Günlük Görev", label_en: "Daily Task" },
  { key: "pvp_match_ready", label_tr: "PvP Hazır", label_en: "PvP Ready" },
  { key: "payout_ready", label_tr: "Çekim Hazır", label_en: "Payout Ready" },
  { key: "wallet_required", label_tr: "Cüzdan Gerekli", label_en: "Wallet Required" },
  { key: "tier_upgrade", label_tr: "Tier Yükseltme", label_en: "Tier Upgrade" }
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
          <h2 className="akrCardTitle">{isTr ? "Ayarlar" : "Settings"}</h2>
        </div>
        <p className="akrCardBody" style={{ fontSize: 12, opacity: 0.7 }}>
          {isTr ? "Profil, bildirimler ve arayuz tercihleri." : "Profile, notifications and UI preferences."}
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
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase" }}>{isTr ? "Kullanici" : "Username"}</div>
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
            <div style={{ fontSize: 11, opacity: 0.5 }}>{isTr ? "Turkce / English" : "Turkish / English"}</div>
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
            {isTr ? "Arayuz" : "Interface"}
          </h3>
        </div>
        <ToggleRow
          label={isTr ? "Azaltilmis Hareket" : "Reduced Motion"}
          checked={Boolean(prefs.reduced_motion)}
          onChange={(v) => props.onToggleReducedMotion(v)}
        />
        <ToggleRow
          label={isTr ? "Buyuk Yazi" : "Large Text"}
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
              label={isTr ? fam.label_tr : fam.label_en}
              checked={enabled}
              onChange={(v) => props.onToggleNotification(fam.key, v)}
            />
          );
        })}
      </div>

      {/* App info */}
      <div className="akrCard" style={{ opacity: 0.6 }}>
        <div style={{ fontSize: 10, textAlign: "center" }}>
          AirdropKralBot v{props.data?.api_version || "2.0"} &bull; {isTr ? "Blueprintten uretildi" : "Built from Blueprint"}
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
