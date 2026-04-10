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

/* ── SVG Icons (inline, no deps) ── */
const IconBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 11-6.22-8.56"/>
    <polyline points="21 3 21 9 15 9"/>
  </svg>
);

const IconGlobe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconGamepad = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/>
  </svg>
);

export function TopBar(props: TopBarProps) {
  const isAdmin = props.workspace === "admin";
  const titleKey = isAdmin ? "admin_console_title" : "app_title";
  return (
    <header className="ds-topbar">
      <div className="ds-topbar-brand">
        <div className="ds-topbar-logo">
          <IconBolt />
        </div>
        <div>
          <h1 className="ds-topbar-title">{t(props.lang, titleKey)}</h1>
          <p className="ds-topbar-subtitle">{t(props.lang, isAdmin ? "app_subtitle_admin" : "app_subtitle")}</p>
        </div>
      </div>
      <div className="ds-topbar-actions">
        <button className="ds-btn-icon" onClick={props.onRefresh} title={t(props.lang, "refresh")}>
          <IconRefresh />
        </button>
        <button
          className="ds-btn-icon"
          onClick={() => {
            const next = normalizeLang(props.lang) === "tr" ? "en" : "tr";
            props.onToggleLanguage(next);
          }}
          title={t(props.lang, "language")}
        >
          <IconGlobe />
        </button>
        {props.showAdvancedToggle ? (
          <button
            className={`ds-btn-icon ${props.advanced ? "is-active" : ""}`}
            onClick={() => props.onToggleAdvanced(!props.advanced)}
            title={props.advanced ? t(props.lang, "advanced_on") : t(props.lang, "advanced_off")}
            style={props.advanced ? { borderColor: "var(--ds-primary)", color: "var(--ds-primary)" } : undefined}
          >
            <IconWrench />
          </button>
        ) : null}
        {props.showWorkspaceToggle ? (
          <button
            className="ds-btn ds-btn-sm ds-btn-ghost"
            onClick={() => props.onToggleWorkspace(isAdmin ? "player" : "admin")}
          >
            {isAdmin ? <IconGamepad /> : <IconShield />}
            <span>{isAdmin ? t(props.lang, "workspace_player") : t(props.lang, "workspace_admin")}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
