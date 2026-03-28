import { normalizeLang, t, type Lang } from "../../i18n";

type TopBarProps = {
  lang: Lang;
  advanced: boolean;
  showAdvancedToggle?: boolean;
  showWorkspaceToggle?: boolean;
  showAccessibilityControls?: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  workspace: "player" | "admin";
  onRefresh: () => void;
  onToggleAdvanced: (next: boolean) => void;
  onToggleReducedMotion: (next: boolean) => void;
  onToggleLargeText: (next: boolean) => void;
  onToggleLanguage: (next: Lang) => void;
  onToggleWorkspace: (next: "player" | "admin") => void;
};

export function TopBar(props: TopBarProps) {
  const isAdmin = props.workspace === "admin";
  const titleKey = isAdmin ? "admin_console_title" : "app_title";
  return (
    <header className="akrTopbar akrGlass">
      <div className="akrBrand">
        <div className="akrBrandLogo">
          <span className="akrBrandIcon">⚡</span>
          <div>
            <h1>{t(props.lang, titleKey)}</h1>
            <p className="akrMuted akrBrandSub">{t(props.lang, isAdmin ? "app_subtitle_admin" : "app_subtitle")}</p>
          </div>
        </div>
      </div>
      <div className="akrTopbarActions">
        <button className="akrBtn akrBtnIcon" onClick={props.onRefresh} title={t(props.lang, "refresh")}>
          🔄
        </button>
        <button
          className="akrBtn akrBtnIcon"
          onClick={() => {
            const next = normalizeLang(props.lang) === "tr" ? "en" : "tr";
            props.onToggleLanguage(next);
          }}
          title={t(props.lang, "language")}
        >
          {normalizeLang(props.lang) === "tr" ? "🇹🇷" : "🇬🇧"}
        </button>
        {props.showAdvancedToggle ? (
          <button
            className={`akrBtn akrBtnIcon ${props.advanced ? "isActive" : ""}`}
            onClick={() => props.onToggleAdvanced(!props.advanced)}
            title={props.advanced ? t(props.lang, "advanced_on") : t(props.lang, "advanced_off")}
          >
            🔧
          </button>
        ) : null}
        {props.showWorkspaceToggle ? (
          <button
            className="akrBtn akrBtnAccent akrBtnSm"
            onClick={() => props.onToggleWorkspace(isAdmin ? "player" : "admin")}
          >
            {isAdmin ? "🎮" : "🛡️"} {isAdmin ? t(props.lang, "workspace_player") : t(props.lang, "workspace_admin")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
