import { buildHomeFeedViewModel } from "../../../core/player/homeFeedViewModel.js";
import { resolvePlayerCommandHintNavigation } from "../../../core/player/commandHintNavigation.js";
import { buildVaultViewModel } from "../../../core/player/vaultViewModel.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { normalizeLang, t, type Lang } from "../../i18n";
import type { BootstrapV2Data } from "../../types";
import type { PlayerShellPanelKey } from "./usePlayerShellPanelController";

type PlayerShellPanelProps = {
  lang: Lang;
  panelKey: PlayerShellPanelKey;
  focusKey: string;
  data: BootstrapV2Data | null;
  sceneProfile: {
    qualityMode: string;
    effectiveQuality: string;
    hudDensity: string;
    perfTier: string;
    deviceClass: string;
    sceneProfile: string;
  };
  homeFeed: Record<string, unknown> | null;
  vaultData: Record<string, unknown> | null;
  onClose: () => void;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
  onTabChange: (tab: "home" | "pvp" | "tasks" | "vault") => void;
  onRouteTarget: (input: {
    routeKey?: string;
    panelKey?: string;
    focusKey?: string;
    tab?: "home" | "pvp" | "tasks" | "vault" | string;
    sourcePanelKey?: string;
  }) => void;
  onToggleReducedMotion: (next: boolean) => void;
  onToggleLargeText: (next: boolean) => void;
  onToggleLanguage: (next: Lang) => void;
  onToggleNotification: (family: string, enabled: boolean) => void;
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
  const copy =
    props.lang === "tr"
      ? {
          langLabel: "Dil",
          qualityLabel: "Kalite",
          fxLabel: "Fx",
          hudLabel: "HUD",
          workspaceLabel: "Alan",
          motionReduced: "motion az",
          motionNormal: "motion normal",
          largeText: "buyuk metin",
          baseText: "standart metin",
          soundOff: "ses kapali",
          soundOn: "ses acik",
          perfLabel: "Perf",
          deviceLabel: "Cihaz",
          profileLabel: "Profil",
          tierLabel: "Tier",
          streakLabel: "Streak",
          seasonLabel: "Sezon",
          pointsLabel: "Puan",
          chainLabel: "Chain",
          tasksLabel: "Gorev",
          readyLabel: "Hazir",
          openLabel: "Acik",
          routeLabel: "Rota",
          requestableLabel: "Talep",
          entitledLabel: "Hak",
          passesLabel: "Pass",
          cosmeticsLabel: "Cosmetic",
          ownedLabel: "Sahip",
          historyLabel: "Gecmis",
          premiumOn: "premium acik",
          premiumOff: "premium kapali",
          walletReady: "wallet hazir",
          walletIdle: "wallet bekliyor",
          walletOn: "wallet acik",
          walletOff: "wallet kapali",
          kycLabel: "KYC",
          assetLabel: "Asset",
          unlockTierLabel: "Tier",
          payoutOpen: "talep acik",
          payoutLocked: "kilitli"
        }
      : {
          langLabel: "Lang",
          qualityLabel: "Quality",
          fxLabel: "Fx",
          hudLabel: "HUD",
          workspaceLabel: "Workspace",
          motionReduced: "motion reduced",
          motionNormal: "motion normal",
          largeText: "large text",
          baseText: "base text",
          soundOff: "sound off",
          soundOn: "sound on",
          perfLabel: "Perf",
          deviceLabel: "Device",
          profileLabel: "Profile",
          tierLabel: "Tier",
          streakLabel: "Streak",
          seasonLabel: "Season",
          pointsLabel: "Pts",
          chainLabel: "Chain",
          tasksLabel: "Tasks",
          readyLabel: "Ready",
          openLabel: "Open",
          routeLabel: "Route",
          requestableLabel: "Req",
          entitledLabel: "Entitled",
          passesLabel: "Passes",
          cosmeticsLabel: "Cosmetics",
          ownedLabel: "Owned",
          historyLabel: "History",
          premiumOn: "premium on",
          premiumOff: "premium off",
          walletReady: "wallet ready",
          walletIdle: "wallet idle",
          walletOn: "wallet on",
          walletOff: "wallet off",
          kycLabel: "KYC",
          assetLabel: "Asset",
          unlockTierLabel: "Tier",
          payoutOpen: "request open",
          payoutLocked: "locked"
        };
  const chipText = (label: string, value: unknown, fallback = "-") => {
    const text = String(value ?? "").trim() || fallback;
    return `${label} ${text}`;
  };
  const countChip = (label: string, value: unknown) => `${label} ${Math.floor(Number(value || 0))}`;
  const resolveSurfaceActionKey = (sectionKey: string, slotKey: string, fallbackActionKey: string) => {
    const rows = Array.isArray((homeView.surface_actions as Record<string, Array<Record<string, unknown>>> | undefined)?.[sectionKey])
      ? ((homeView.surface_actions as Record<string, Array<Record<string, unknown>>>)[sectionKey] || [])
      : [];
    const match = rows.find((row) => String(row.slot_key || "").trim().toLowerCase() === String(slotKey || "").trim().toLowerCase());
    return String(match?.action_key || fallbackActionKey || "");
  };
  const runSurfaceAction = (sectionKey: string, slotKey: string, fallbackActionKey: string) => {
    const actionKey = resolveSurfaceActionKey(sectionKey, slotKey, fallbackActionKey);
    if (!actionKey) {
      return;
    }
    props.onShellAction(actionKey, rootPanelKey);
  };
  const runCommandHint = (row: Record<string, unknown>) => {
    const target = resolvePlayerCommandHintNavigation(row);
    if (!target) {
      return;
    }
    if (target.kind === "action") {
      props.onShellAction(target.action_key, rootPanelKey);
      return;
    }
    props.onRouteTarget({
      routeKey: target.route_key,
      panelKey: target.panel_key,
      focusKey: target.focus_key,
      tab: target.tab,
      sourcePanelKey: rootPanelKey
    });
  };
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
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_DISCOVER_CENTER, rootPanelKey)}>
              {t(props.lang, "shell_panel_open_discover")}
            </button>
          ) : null}
          {props.panelKey !== "settings" ? (
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_SETTINGS_LOCALE, rootPanelKey)}>
              {t(props.lang, "shell_panel_open_settings")}
            </button>
          ) : null}
          {props.panelKey !== "support" ? (
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_SUPPORT_FAQ, rootPanelKey)}>
              {t(props.lang, "shell_panel_open_support")}
            </button>
          ) : null}
          <button type="button" className="akrBtn akrBtnAccent" onClick={props.onClose}>
            {t(props.lang, "shell_panel_close")}
          </button>
        </div>
      </div>

      {props.panelKey === "settings" ? (
        <>
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="locale_override">
            <h4>{t(props.lang, "shell_panel_settings_language")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{chipText(copy.langLabel, String(props.lang).toUpperCase())}</span>
              <span className="akrChip">{chipText(copy.qualityLabel, props.sceneProfile.qualityMode || prefs?.quality_mode || "auto")}</span>
              <span className="akrChip">{chipText(copy.fxLabel, props.sceneProfile.effectiveQuality || "medium")}</span>
              <span className="akrChip">{chipText(copy.hudLabel, props.sceneProfile.hudDensity || "normal")}</span>
              <span className="akrChip">{chipText(copy.workspaceLabel, prefsJson.workspace || "player")}</span>
            </div>
            <div className="akrActionRow">
              <button type="button" className="akrBtn akrBtnAccent" onClick={() => props.onToggleLanguage(nextLang)}>
                {t(props.lang, "language")}: {String(nextLang).toUpperCase()}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key="accessibility">
            <h4>{t(props.lang, "shell_panel_settings_accessibility")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{prefs?.reduced_motion ? copy.motionReduced : copy.motionNormal}</span>
              <span className="akrChip">{prefs?.large_text ? copy.largeText : copy.baseText}</span>
              <span className="akrChip">{prefs?.sound_enabled === false ? copy.soundOff : copy.soundOn}</span>
              <span className="akrChip">{chipText(copy.perfLabel, props.sceneProfile.perfTier || "-")}</span>
              <span className="akrChip">{chipText(copy.deviceLabel, props.sceneProfile.deviceClass || "-")}</span>
              <span className="akrChip">{chipText(copy.profileLabel, props.sceneProfile.sceneProfile || "-")}</span>
            </div>
            <div className="akrActionRow">
              <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onToggleReducedMotion(!Boolean(prefs?.reduced_motion))}>
                {t(props.lang, "shell_panel_toggle_motion")}
              </button>
              <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onToggleLargeText(!Boolean(prefs?.large_text))}>
                {t(props.lang, "shell_panel_toggle_text")}
              </button>
            </div>
          </section>
        </div>
        <section className="akrMiniPanel akrAlertPrefsPanel" data-akr-focus-key="alert_preferences">
          <h4>{props.lang === "tr" ? "Bildirim Tercihleri" : "Notification Preferences"}</h4>
          <p className="akrMuted akrMiniPanelBody">
            {props.lang === "tr"
              ? "Hangi bildirimleri almak istediginizi secin. Kapatilan bildirimler sessize alinir."
              : "Choose which notifications you want to receive. Disabled notifications are muted."}
          </p>
          <div className="akrAlertPrefsList">
            {[
              { key: "payout_status", tr: "Odeme Durumu", en: "Payout Status" },
              { key: "quest_complete", tr: "Gorev Tamamlama", en: "Quest Complete" },
              { key: "pvp_result", tr: "PvP Sonuclari", en: "PvP Results" },
              { key: "season_milestone", tr: "Sezon Hedefleri", en: "Season Milestones" },
              { key: "chest_rare_drop", tr: "Nadir Kasa Droplari", en: "Rare Chest Drops" },
              { key: "daily_reminder", tr: "Gunluk Hatirlatma", en: "Daily Reminder" },
              { key: "referral_bonus", tr: "Davet Bonusu", en: "Referral Bonus" },
              { key: "token_price_alert", tr: "Token Fiyat Uyarisi", en: "Token Price Alert" }
            ].map((alert) => {
              const notifPrefs = (prefsJson as Record<string, unknown>)?.notification_preferences as Record<string, { enabled?: boolean }> | undefined;
              const isEnabled = notifPrefs?.[alert.key]?.enabled !== false;
              return (
                <label
                  key={alert.key}
                  className="akrAlertPrefRow"
                  role="button"
                  tabIndex={0}
                  onClick={() => props.onToggleNotification(alert.key, !isEnabled)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") props.onToggleNotification(alert.key, !isEnabled); }}
                >
                  <span className="akrAlertPrefLabel">{props.lang === "tr" ? alert.tr : alert.en}</span>
                  <span className={`akrChip ${isEnabled ? "akrChipSuccess" : ""}`}>
                    {isEnabled
                      ? (props.lang === "tr" ? "Acik" : "On")
                      : (props.lang === "tr" ? "Kapali" : "Off")}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="akrMuted akrSmallText">
            {props.lang === "tr"
              ? "Sistem ve admin bildirimleri her zaman acik kalir."
              : "System and admin notifications are always enabled."}
          </p>
        </section>
        </>
      ) : null}

      {props.panelKey === "profile" ? (
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="identity">
            <h4>{t(props.lang, "shell_panel_profile_identity_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{homeView.summary.player_name || t(props.lang, "unknown_player")}</span>
              <span className="akrChip">{countChip(copy.tierLabel, homeView.summary.kingdom_tier)}</span>
              <span className="akrChip">{countChip(copy.streakLabel, homeView.summary.streak)}</span>
              <span className="akrChip">{`${copy.seasonLabel} #${Math.floor(homeView.summary.season_id)}`}</span>
              <span className="akrChip">{countChip(copy.pointsLabel, homeView.summary.season_points)}</span>
            </div>
            <div className="akrActionRow">
              <button type="button" className="akrBtn akrBtnAccent" onClick={() => props.onTabChange("pvp")}>
                {t(props.lang, "shell_panel_go_pvp")}
              </button>
              <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onTabChange("tasks")}>
                {t(props.lang, "shell_panel_go_tasks")}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key={props.focusKey || "balances"}>
            <h4>{t(props.lang, "shell_panel_profile_balance_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">SC {Math.floor(homeView.summary.sc_earned)}</span>
              <span className="akrChip">RC {Math.floor(homeView.summary.rc_earned)}</span>
              <span className="akrChip">HC {Math.floor(homeView.summary.hc_earned)}</span>
              <span className="akrChip">{homeView.summary.wallet_active ? copy.walletOn : copy.walletOff}</span>
              <span className="akrChip">{chipText(copy.chainLabel, homeView.summary.wallet_chain || "-")}</span>
            </div>
            <div className="akrActionRow">
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_profile", "status", SHELL_ACTION_KEY.PLAYER_STATUS_PANEL)}
              >
                {t(props.lang, "shell_panel_open_status")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_profile", "wallet", SHELL_ACTION_KEY.PLAYER_WALLET_CONNECT)}
              >
                {t(props.lang, "shell_panel_go_wallet")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {props.panelKey === "status" ? (
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="system_status">
            <h4>{t(props.lang, "shell_panel_status_runtime_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{`${copy.tasksLabel} ${Math.floor(homeView.summary.tasks_done)}/${Math.floor(homeView.summary.daily_cap)}`}</span>
              <span className="akrChip">{countChip(copy.readyLabel, homeView.summary.mission_ready)}</span>
              <span className="akrChip">{countChip(copy.openLabel, homeView.summary.mission_open)}</span>
              <span className="akrChip">{homeView.summary.wallet_active ? copy.walletOn : copy.walletOff}</span>
              <span className="akrChip">{chipText(copy.kycLabel, homeView.summary.wallet_kyc_status || t(props.lang, "status_unknown"))}</span>
            </div>
            <div className="akrActionRow">
              <button type="button" className="akrBtn akrBtnAccent" onClick={() => props.onTabChange("tasks")}>
                {t(props.lang, "shell_panel_go_tasks")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_status_primary", "support", SHELL_ACTION_KEY.PLAYER_SUPPORT_STATUS)}
              >
                {t(props.lang, "shell_panel_open_support")}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key={props.focusKey || "economy_status"}>
            <h4>{t(props.lang, "shell_panel_status_economy_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{chipText(copy.assetLabel, vaultView.summary.token_symbol || "-")}</span>
              <span className="akrChip">{chipText(copy.routeLabel, vaultView.summary.route_status || "-")}</span>
              <span className="akrChip">{`${copy.requestableLabel} ${vaultView.summary.payout_requestable_btc.toFixed(8)} BTC`}</span>
              <span className="akrChip">{countChip(copy.passesLabel, vaultView.summary.active_pass_count)}</span>
              <span className="akrChip">{vaultView.summary.premium_active ? copy.premiumOn : copy.premiumOff}</span>
            </div>
            <div className="akrActionRow">
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_status_economy", "rewards", SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL)}
              >
                {t(props.lang, "shell_panel_open_rewards")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_status_economy", "payout", SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST)}
              >
                {t(props.lang, "shell_panel_go_payout")}
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
              <button
                type="button"
                className="akrBtn akrBtnAccent"
                onClick={() => runSurfaceAction("shell_support", "payout", SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST)}
              >
                {t(props.lang, "shell_panel_go_payout")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_support", "wallet", SHELL_ACTION_KEY.PLAYER_WALLET_CONNECT)}
              >
                {t(props.lang, "shell_panel_go_wallet")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_support", "settings", SHELL_ACTION_KEY.PLAYER_SETTINGS_ACCESSIBILITY)}
              >
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
              <span className="akrChip">{countChip(copy.readyLabel, homeView.summary.mission_ready)}</span>
              <span className="akrChip">{countChip(copy.openLabel, homeView.summary.mission_open)}</span>
              <span className="akrChip">{homeView.summary.wallet_active ? copy.walletReady : copy.walletIdle}</span>
              <span className="akrChip">{homeView.summary.premium_active ? copy.premiumOn : copy.premiumOff}</span>
            </div>
            <div className="akrActionRow">
              <button type="button" className="akrBtn akrBtnAccent" onClick={() => props.onTabChange("tasks")}>
                {t(props.lang, "shell_panel_go_tasks")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_discover", "pvp", SHELL_ACTION_KEY.PLAYER_PVP_DAILY_DUEL)}
              >
                {t(props.lang, "shell_panel_go_pvp")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_discover", "vault", SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST)}
              >
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
                    <span>
                      {row.description || "-"}
                      {resolvePlayerCommandHintNavigation(row) ? (
                        <button
                          type="button"
                          className="akrBtn akrBtnGhost"
                          onClick={() => runCommandHint(row as Record<string, unknown>)}
                        >
                          {t(props.lang, "command_handoff_open")}
                        </button>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="akrMuted">{t(props.lang, "shell_panel_discover_empty")}</p>
            )}
          </section>
        </div>
      ) : null}

      {props.panelKey === "rewards" ? (
        <div className="akrSplit">
          <section className="akrMiniPanel" data-akr-focus-key="premium_pass">
            <h4>{t(props.lang, "shell_panel_rewards_catalog_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{countChip(copy.passesLabel, vaultView.catalog.passes.length)}</span>
              <span className="akrChip">{countChip(copy.cosmeticsLabel, vaultView.catalog.cosmetics.length)}</span>
              <span className="akrChip">{countChip(copy.ownedLabel, vaultView.summary.cosmetics_owned_count)}</span>
              <span className="akrChip">{countChip(copy.historyLabel, vaultView.summary.pass_history_count)}</span>
            </div>
            <div className="akrActionRow">
              <button
                type="button"
                className="akrBtn akrBtnAccent"
                onClick={() => runSurfaceAction("shell_rewards", "support", SHELL_ACTION_KEY.PLAYER_SUPPORT_FAQ)}
              >
                {t(props.lang, "shell_panel_open_support")}
              </button>
              <button
                type="button"
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("shell_rewards", "payout", SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST)}
              >
                {t(props.lang, "shell_panel_go_payout")}
              </button>
            </div>
          </section>
          <section className="akrMiniPanel" data-akr-focus-key={props.focusKey || "payout_lane"}>
            <h4>{t(props.lang, "shell_panel_rewards_payout_title")}</h4>
            <div className="akrChipRow">
              <span className="akrChip">{vaultView.summary.payout_can_request ? copy.payoutOpen : copy.payoutLocked}</span>
              <span className="akrChip">{chipText(copy.unlockTierLabel, vaultView.summary.payout_unlock_tier || "-")}</span>
              <span className="akrChip">{`${copy.requestableLabel} ${vaultView.summary.payout_requestable_btc.toFixed(8)} BTC`}</span>
              <span className="akrChip">{`${copy.entitledLabel} ${vaultView.summary.payout_entitled_btc.toFixed(8)} BTC`}</span>
            </div>
            <p className="akrMuted">
              {vaultView.latest.payout_request_status || t(props.lang, "status_unknown")} | {vaultView.latest.submit_tx_hash || "-"}
            </p>
          </section>
        </div>
      ) : null}
    </section>
  );
}
