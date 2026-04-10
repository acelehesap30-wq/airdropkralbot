import { tabLabel, type Lang } from "../../i18n";
import type { TabKey } from "../../types";

/* ── SVG Icon Paths (Lucide-inspired, no dependency) ── */
const TAB_ICONS: Record<string, string> = {
  home: `<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>`,
  pvp: `<path d="M6 3l-3 8h6L6 21"/><path d="M18 3l-3 8h6L18 21"/>`,
  tasks: `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>`,
  forge: `<path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3L12 9"/><path d="M17.64 4.36a2.12 2.12 0 013 3L14 14"/>`,
  exchange: `<path d="M7 10l5-6 5 6"/><path d="M7 14l5 6 5-6"/><line x1="12" y1="4" x2="12" y2="20"/>`,
  season: `<circle cx="12" cy="8" r="5"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>`,
  events: `<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4" y1="12" x2="2" y2="12"/><line x1="22" y1="12" x2="20" y2="12"/>`,
  vault: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>`,
};

const TAB_GLOW: Record<string, string> = {
  home: "0,212,255",
  pvp: "244,63,94",
  tasks: "16,185,129",
  forge: "168,85,247",
  exchange: "245,158,11",
  season: "255,215,0",
  events: "0,212,255",
  vault: "16,185,129",
  settings: "148,163,184",
};

type PlayerTabsProps = {
  lang: Lang;
  tab: TabKey;
  tabs: TabKey[];
  onChange: (tab: TabKey) => void;
};

export function PlayerTabs(props: PlayerTabsProps) {
  return (
    <nav className="ds-tabs" role="tablist">
      {props.tabs.map((entry) => {
        const iconSvg = TAB_ICONS[entry] || TAB_ICONS.home;
        const glow = TAB_GLOW[entry] || "0,212,255";
        const active = props.tab === entry;
        return (
          <button
            type="button"
            role="tab"
            key={entry}
            className={`ds-tab ${active ? "is-active" : ""}`}
            aria-selected={active}
            onClick={() => props.onChange(entry)}
            style={active ? {
              "--tab-glow-color": `rgba(${glow},0.5)`,
              boxShadow: `0 0 16px rgba(${glow},0.2), inset 0 0 8px rgba(${glow},0.06)`,
            } as React.CSSProperties : undefined}
          >
            <span className="ds-tab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: iconSvg }}
                style={active ? { stroke: `rgba(${glow},1)`, filter: `drop-shadow(0 0 4px rgba(${glow},0.4))` } : undefined}
              />
            </span>
            <span className="ds-tab-label">{tabLabel(props.lang, entry)}</span>
          </button>
        );
      })}
    </nav>
  );
}
