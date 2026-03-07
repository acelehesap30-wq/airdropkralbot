import { buildHomeFeedViewModel } from "../../../core/player/homeFeedViewModel.js";
import { buildVaultViewModel } from "../../../core/player/vaultViewModel.js";
import { normalizeLang, t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";
import type { PlayerShellPanelKey } from "./usePlayerShellPanelController";

type PlayerShellPanelProps = {
  lang: Lang;
  panelKey: PlayerShellPanelKey;
  focusKey: string;
  data: BootstrapV2Data | null;
  homeFeed: Record<string, unknown> | null;
  vaultData: Record<string, unknown> | null;
  onClose: () => void;
  onOpenPanel: (panelKey: PlayerShellPanelKey, focusKey?: string) => void;
  onTabChange: (tab: "home" | "pvp" | "tasks" | "vault") => void;
  onToggleReducedMotion: (next: boolean) => void;
  onToggleLargeText: (next: boolean) => void;
  onToggleLanguage: (next: Lang) => void;
};

function resolveRootPanelKey(panelKey: PlayerShellPanelKey): string {
  if (panelKey === "settings") {
    return "language";
  }
  return panelKey;
}

export function PlayerShellPanel(props: PlayerShellPanelProps) {
  const homeView = buildHomeFeedViewModel({
    homeFeed: props.homeFeed,
    bootstrap: props.data
  });
  const vaultView = buildVaultViewModel({
    vaultData: props.vaultData || {}
  });
  const prefs = props.data?.ui_prefs || null;
  const prefsJson = prefs?.prefs_json && typeof prefs.prefs_json === "object" ? prefs.prefs_json : {};
  const nextLang = normalizeLang(props.lang) === "tr" ? "en" : "tr";
  const rootPanelKey = resolveRootPanelKey(props.panelKey);
  const supportStatus = [
    props.data?.analytics?.session_ref
      ? `${props.lang === "tr" ? "Oturum" : "Session"} ${String(props.data.analytics.session_ref).slice(0, 10)}`
      : "",
    vaultView.summary.wallet_active
      ? `${props.lang === "tr" ? "Wallet" : "Wallet"} ${vaultView.summary.wallet_chain || "-"}`
      : props.lang === "tr"
        ? "Wallet kapali"
        : "Wallet idle",
    vaultView.summary.payout_can_request
      ? `${vaultView.summary.payout_requestable_btc.toFixed(8)} BTC`
      : vaultView.latest.payout_request_status || t(props.lang, "status_unknown")
  ].filter(Boolean);

  return (
    <section className="akrCard akrCardWide akrShellSurface" data-akr-panel-key={rootPanelKey}>
      <div className="akrShellSurfaceHero">
        <div>
          <p className="akrKicker">{t(props.lang, "launch_handoff_title")}</p>
          <h3>{t(props.lang, `shell_panel_${props.panelKey}_title` as any)}</h3>
          <p className="akrMuted">{t(props.lang, `shell_panel_${props.panelKey}_body` as any)}</p>
        </div>
        <div className="akrActionRow">
          {props.panelKey !== "discover" ? (
            <button className="akrBtn akrBtnGhost" onClick={() => props.onOpenPanel("discover", "command_center")}>
              {t(props.lang, "shell_panel_open_discover")}
            </button>
          ) : null}
          {props.panelKey !== "settings" ? (
            <button className="akrBtn akrBtnGhost" onClick={() => props.onOpenPanel("settings", "locale_override")}>
              {t(props.lang, "shell_panel_open_settings")}
            </button>
          ) : null}
          {props.panelKey !== "support" ? (
            <button className="akrBtn akrBtnGhost" onClick={() => props.onOpenPanel("support", "faq_cards")}>
              {t(props.lang, "shell_panel_open_support")}
            </button>
          ) : null}
          <button className="akrBtn akrBtnAccent" onClick={props.onClose}>
            {t(props.lang, "shell_panel_close")}
          </button>
        </div>
      </div>

      {props.panelKey === "settings" ? (
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="locale_override">
            <h4>{t(props.lang, "shell_panel_settings_language")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{String(props.lang).toUpperCase()}</span>
              <span className="akrChip">{String(prefs?.quality_mode || "auto")}</span>
              <span className="akrChip">{String(prefsJson.workspace || "player")}</span>
            </div>
            <div className="akrActionRow">
              <button className="akrBtn akrBtnAccent" onClick={() => props.onToggleLanguage(nextLang)}>
                {t(props.lang, "language")}: {String(nextLang).toUpperCase()}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key="accessibility">
            <h4>{t(props.lang, "shell_panel_settings_accessibility")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{prefs?.reduced_motion ? "motion_reduced" : "motion_normal"}</span>
              <span className="akrChip">{prefs?.large_text ? "large_text" : "base_text"}</span>
              <span className="akrChip">{prefs?.sound_enabled === false ? "sound_off" : "sound_on"}</span>
            </div>
            <div className="akrActionRow">
              <button className="akrBtn akrBtnGhost" onClick={() => props.onToggleReducedMotion(!Boolean(prefs?.reduced_motion))}>
                {t(props.lang, "shell_panel_toggle_motion")}
              </button>
              <button className="akrBtn akrBtnGhost" onClick={() => props.onToggleLargeText(!Boolean(prefs?.large_text))}>
                {t(props.lang, "shell_panel_toggle_text")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {props.panelKey === "support" ? (
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="system_status">
            <h4>{t(props.lang, "shell_panel_support_status_title")}</h4>
            <div className="akrChipRow">
              {supportStatus.map((entry) => (
                <span className="akrChip" key={entry}>
                  {entry}
                </span>
              ))}
              <span className="akrChip">{homeView.summary.wallet_kyc_status || t(props.lang, "status_unknown")}</span>
            </div>
            <div className="akrActionRow">
              <button className="akrBtn akrBtnAccent" onClick={() => props.onTabChange("vault")}>
                {t(props.lang, "shell_panel_go_vault")}
              </button>
              <button className="akrBtn akrBtnGhost" onClick={() => props.onOpenPanel("settings", "accessibility")}>
                {t(props.lang, "shell_panel_open_settings")}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key={props.focusKey || "faq_cards"}>
            <h4>{t(props.lang, "shell_panel_support_faq_title")}</h4>
            <ul className="akrList">
              <li>
                <strong>{t(props.lang, "shell_panel_support_faq_1_title")}</strong>
                <span>{t(props.lang, "shell_panel_support_faq_1_body")}</span>
              </li>
              <li>
                <strong>{t(props.lang, "shell_panel_support_faq_2_title")}</strong>
                <span>{t(props.lang, "shell_panel_support_faq_2_body")}</span>
              </li>
              <li>
                <strong>{t(props.lang, "shell_panel_support_faq_3_title")}</strong>
                <span>{t(props.lang, "shell_panel_support_faq_3_body")}</span>
              </li>
            </ul>
          </section>
        </div>
      ) : null}

      {props.panelKey === "discover" ? (
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="next_steps">
            <h4>{t(props.lang, "shell_panel_discover_next_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">Ready {Math.floor(homeView.summary.mission_ready)}</span>
              <span className="akrChip">Open {Math.floor(homeView.summary.mission_open)}</span>
              <span className="akrChip">Wallet {homeView.summary.wallet_active ? "on" : "off"}</span>
              <span className="akrChip">Premium {homeView.summary.premium_active ? "on" : "off"}</span>
            </div>
            <div className="akrActionRow">
              <button className="akrBtn akrBtnAccent" onClick={() => props.onTabChange("tasks")}>
                {t(props.lang, "shell_panel_go_tasks")}
              </button>
              <button className="akrBtn akrBtnGhost" onClick={() => props.onTabChange("pvp")}>
                {t(props.lang, "shell_panel_go_pvp")}
              </button>
              <button className="akrBtn akrBtnGhost" onClick={() => props.onTabChange("vault")}>
                {t(props.lang, "shell_panel_go_vault")}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key={props.focusKey || "command_center"}>
            <h4>{t(props.lang, "shell_panel_discover_commands_title")}</h4>
            {homeView.command_hints.length ? (
              <ul className="akrList">
                {homeView.command_hints.map((row) => (
                  <li key={row.key}>
                    <strong>/{row.key}</strong>
                    <span>{row.description || "-"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="akrMuted">{t(props.lang, "shell_panel_discover_empty")}</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
