type RejectIntelChip = {
  id: string;
  text: string;
  tone?: string;
  level?: number;
};

type RejectIntelMetrics = {
  root?: {
    tone?: string;
    category?: string;
    recent?: boolean;
    risk?: number;
    sweep?: number;
    flash?: number;
  };
  badge?: {
    text?: string;
    tone?: "warn" | "default" | "info";
  };
  texts?: {
    line?: string;
    hint?: string;
    plan?: string;
    solution?: string;
  };
  actionPanel?: {
    tone?: string;
    category?: string;
  };
  chips?: {
    reason?: RejectIntelChip;
    fresh?: RejectIntelChip;
    window?: RejectIntelChip;
    asset?: RejectIntelChip;
    directive?: RejectIntelChip;
    expected?: RejectIntelChip;
    queue?: RejectIntelChip;
    backoff?: RejectIntelChip;
    sync?: RejectIntelChip;
  };
  meters?: {
    recoveryPct?: number;
    riskPct?: number;
    recoveryPalette?: string;
    riskPalette?: string;
  };
};

type PvpRejectIntelBridge = {
  render: (metrics: RejectIntelMetrics) => boolean;
};

type MeterPalette = "neutral" | "safe" | "balanced" | "aggressive" | "critical";

const METER_PALETTES: Record<MeterPalette, { start: string; end: string; glow: string }> = Object.freeze({
  neutral: { start: "#3df8c2", end: "#ffb85c", glow: "rgba(61, 248, 194, 0.42)" },
  safe: { start: "#70ffa0", end: "#3df8c2", glow: "rgba(112, 255, 160, 0.38)" },
  balanced: { start: "#7fd6ff", end: "#3df8c2", glow: "rgba(127, 214, 255, 0.4)" },
  aggressive: { start: "#ff5d7d", end: "#ffb85c", glow: "rgba(255, 93, 125, 0.44)" },
  critical: { start: "#ff416d", end: "#ffc266", glow: "rgba(255, 93, 125, 0.56)" }
});

declare global {
  interface Window {
    __AKR_PVP_REJECT_INTEL__?: PvpRejectIntelBridge;
  }
}

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function asNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function setChip(el: HTMLElement | null, text: string, tone = "neutral", level = 0.15): void {
  if (!el) {
    return;
  }
  el.textContent = String(text || "-");
  el.classList.remove("neutral", "balanced", "advantage", "pressure", "critical");
  el.classList.add(String(tone || "neutral"));
  el.style.setProperty("--chip-level", clamp(asNum(level), 0, 1).toFixed(3));
}

function setMeterPalette(element: HTMLElement | null, paletteKey: string): void {
  if (!element?.style) {
    return;
  }
  const key = (String(paletteKey || "neutral").toLowerCase() as MeterPalette);
  const palette = METER_PALETTES[key] || METER_PALETTES.neutral;
  element.style.setProperty("--meter-start", palette.start);
  element.style.setProperty("--meter-end", palette.end);
  element.style.setProperty("--meter-glow", palette.glow);
}

function setMeter(element: HTMLElement | null, pct: number, paletteKey: string): void {
  if (!element) {
    return;
  }
  element.style.width = `${Math.round(clamp(asNum(pct), 0, 100))}%`;
  setMeterPalette(element, paletteKey);
}

function pulseOnce(node: HTMLElement | null, className: string, ms = 260): void {
  if (!node) {
    return;
  }
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  const anyNode = node as any;
  const key = `_${className}Timer`;
  if (anyNode[key]) {
    clearTimeout(anyNode[key]);
  }
  anyNode[key] = setTimeout(() => {
    node.classList.remove(className);
    anyNode[key] = null;
  }, ms);
}

function render(metrics: RejectIntelMetrics): boolean {
  const root = byId<HTMLElement>("pvpRejectIntelStrip");
  const badge = byId<HTMLElement>("pvpRejectIntelBadge");
  const line = byId<HTMLElement>("pvpRejectIntelLine");
  const hint = byId<HTMLElement>("pvpRejectIntelHint");
  const plan = byId<HTMLElement>("pvpRejectIntelPlan");
  const reasonChip = byId<HTMLElement>("pvpRejectIntelReasonChip");
  const freshChip = byId<HTMLElement>("pvpRejectIntelFreshChip");
  const windowChip = byId<HTMLElement>("pvpRejectIntelWindowChip");
  const assetChip = byId<HTMLElement>("pvpRejectIntelAssetChip");
  const recoveryMeter = byId<HTMLElement>("pvpRejectIntelRecoveryMeter");
  const riskMeter = byId<HTMLElement>("pvpRejectIntelRiskMeter");
  const actionPanel = byId<HTMLElement>("pvpRejectIntelActionPanel");
  const directiveChip = byId<HTMLElement>("pvpRejectIntelDirectiveChip");
  const expectedChip = byId<HTMLElement>("pvpRejectIntelExpectedChip");
  const queueChip = byId<HTMLElement>("pvpRejectIntelQueueChip");
  const backoffChip = byId<HTMLElement>("pvpRejectIntelBackoffChip");
  const syncChip = byId<HTMLElement>("pvpRejectIntelSyncChip");
  const solutionLine = byId<HTMLElement>("pvpRejectIntelSolutionLine");
  if (
    !root || !badge || !line || !hint || !plan || !reasonChip || !freshChip || !windowChip || !assetChip ||
    !recoveryMeter || !riskMeter || !actionPanel || !directiveChip || !expectedChip || !queueChip ||
    !backoffChip || !syncChip || !solutionLine
  ) {
    return false;
  }

  root.dataset.tone = String(metrics.root?.tone || "neutral");
  root.dataset.category = String(metrics.root?.category || "none");
  root.dataset.recent = metrics.root?.recent ? "1" : "0";
  root.style.setProperty("--reject-intel-risk", clamp(asNum(metrics.root?.risk), 0, 1).toFixed(3));
  root.style.setProperty("--reject-intel-sweep", clamp(asNum(metrics.root?.sweep), 0, 1).toFixed(3));
  root.style.setProperty("--reject-intel-flash", clamp(asNum(metrics.root?.flash), 0, 1).toFixed(3));

  badge.textContent = String(metrics.badge?.text || "WATCH");
  badge.className =
    metrics.badge?.tone === "warn" ? "badge warn" :
    metrics.badge?.tone === "default" ? "badge" :
    "badge info";

  line.textContent = String(metrics.texts?.line || "Reject diagnostics");
  hint.textContent = String(metrics.texts?.hint || "Reject diagnostics aktif.");
  plan.textContent = String(metrics.texts?.plan || "Plan bilgisi yok.");
  solutionLine.textContent = String(metrics.texts?.solution || "Cozum onerisi bekleniyor.");

  const chipMap = metrics.chips || {};
  const chipTargets: Record<string, HTMLElement | null> = {
    pvpRejectIntelReasonChip: reasonChip,
    pvpRejectIntelFreshChip: freshChip,
    pvpRejectIntelWindowChip: windowChip,
    pvpRejectIntelAssetChip: assetChip,
    pvpRejectIntelDirectiveChip: directiveChip,
    pvpRejectIntelExpectedChip: expectedChip,
    pvpRejectIntelQueueChip: queueChip,
    pvpRejectIntelBackoffChip: backoffChip,
    pvpRejectIntelSyncChip: syncChip
  };
  [chipMap.reason, chipMap.fresh, chipMap.window, chipMap.asset, chipMap.directive, chipMap.expected, chipMap.queue, chipMap.backoff, chipMap.sync]
    .forEach((entry) => {
      if (!entry?.id) {
        return;
      }
      setChip(chipTargets[String(entry.id)] || null, String(entry.text || "-"), String(entry.tone || "neutral"), asNum(entry.level));
    });

  actionPanel.dataset.tone = String(metrics.actionPanel?.tone || "neutral");
  actionPanel.dataset.category = String(metrics.actionPanel?.category || "none");

  setMeter(recoveryMeter, asNum(metrics.meters?.recoveryPct), String(metrics.meters?.recoveryPalette || "neutral"));
  setMeter(riskMeter, asNum(metrics.meters?.riskPct), String(metrics.meters?.riskPalette || "neutral"));

  pulseOnce(root, "enter", 220);
  return true;
}

export function installPvpRejectIntelBridge(): void {
  window.__AKR_PVP_REJECT_INTEL__ = { render };
}

