import { tabLabel, type Lang } from "../../i18n";
import type { TabKey } from "../../types";

const TAB_META: Record<string, { icon: string; glow: string }> = {
  home:     { icon: "🏠", glow: "0,214,255" },
  pvp:      { icon: "⚔️", glow: "255,80,80" },
  tasks:    { icon: "📋", glow: "47,255,181" },
  forge:    { icon: "🔨", glow: "224,64,251" },
  exchange: { icon: "💱", glow: "255,178,94" },
  season:   { icon: "🏆", glow: "255,215,0" },
  events:   { icon: "🎯", glow: "0,214,255" },
  vault:    { icon: "🔐", glow: "47,255,181" },
  settings: { icon: "⚙️", glow: "136,168,197" },
};

type PlayerTabsProps = {
  lang: Lang;
  tab: TabKey;
  tabs: TabKey[];
  onChange: (tab: TabKey) => void;
};

export function PlayerTabs(props: PlayerTabsProps) {
  return (
    <nav className="akrTabs" role="tablist">
      {props.tabs.map((entry) => {
        const meta = TAB_META[entry] || { icon: "📌", glow: "0,214,255" };
        const active = props.tab === entry;
        return (
          <button
            type="button"
            role="tab"
            key={entry}
            className={`akrTab ${active ? "isActive" : ""}`}
            aria-selected={active}
            onClick={() => props.onChange(entry)}
            style={active ? {
              "--tab-glow": meta.glow,
              boxShadow: `0 0 20px rgba(${meta.glow},0.35), inset 0 0 12px rgba(${meta.glow},0.1)`,
              borderColor: `rgba(${meta.glow},0.7)`,
            } as React.CSSProperties : undefined}
          >
            <span className="akrTabIcon">{meta.icon}</span>
            <span className="akrTabLabel">{tabLabel(props.lang, entry)}</span>
            {active && <span className="akrTabGlow" style={{ background: `rgba(${meta.glow},0.5)` }} />}
          </button>
        );
      })}
    </nav>
  );
}
