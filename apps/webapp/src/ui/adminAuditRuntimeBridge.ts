type MeterPalette = "neutral" | "safe" | "balanced" | "aggressive" | "critical";
type Tone = "neutral" | "advantage" | "pressure" | "critical" | "balanced";
type BadgeTone = "info" | "warn" | "default";

type LiveChipPayload = {
  id: string;
  text: string;
  tone: Tone | "info";
  level: number;
};

type MeterPayload = {
  id: string;
  pct: number;
  palette: MeterPalette;
};

export type AdminAuditRuntimeBridgePayload = {
  tone: Tone;
  phaseHealth: number;
  truthScore: number;
  phaseChipText: string;
  phaseChipTone: BadgeTone;
  signalLineText: string;
  hintLineText: string;
  chips: LiveChipPayload[];
  meters: MeterPayload[];
};

type AdminAuditRuntimeBridge = {
  render: (payload: AdminAuditRuntimeBridgePayload) => boolean;
};

declare global {
  interface Window {
    __AKR_ADMIN_AUDIT_RUNTIME__?: AdminAuditRuntimeBridge;
  }
}

const METER_PALETTES: Record<MeterPalette, { start: string; end: string; glow: string }> = Object.freeze({
  neutral: { start: "#3df8c2", end: "#ffb85c", glow: "rgba(61, 248, 194, 0.42)" },
  safe: { start: "#70ffa0", end: "#3df8c2", glow: "rgba(112, 255, 160, 0.38)" },
  balanced: { start: "#7fd6ff", end: "#3df8c2", glow: "rgba(127, 214, 255, 0.4)" },
  aggressive: { start: "#ff5d7d", end: "#ffb85c", glow: "rgba(255, 93, 125, 0.44)" },
  critical: { start: "#ff416d", end: "#ffc266", glow: "rgba(255, 93, 125, 0.56)" }
});

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pulseOnce(node: HTMLElement | null, className = "enter"): void {
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
  }, 280);
}

function setBadgeClass(node: HTMLElement | null, tone: BadgeTone): void {
  if (!node) {
    return;
  }
  if (tone === "warn") {
    node.className = "badge warn";
    return;
  }
  if (tone === "info") {
    node.className = "badge info";
    return;
  }
  node.className = "badge";
}

function setMeterPalette(element: HTMLElement | null, paletteKey: MeterPalette): void {
  if (!element?.style) {
    return;
  }
  const palette = METER_PALETTES[paletteKey] || METER_PALETTES.neutral;
  element.style.setProperty("--meter-start", palette.start);
  element.style.setProperty("--meter-end", palette.end);
  element.style.setProperty("--meter-glow", palette.glow);
}

function setMeter(element: HTMLElement | null, pct: number, palette: MeterPalette): void {
  if (!element) {
    return;
  }
  element.style.width = `${Math.round(clamp(asNum(pct), 0, 100))}%`;
  setMeterPalette(element, palette);
}

function setLiveChip(payload: LiveChipPayload): void {
  const el = byId<HTMLElement>(payload.id);
  if (!el) {
    return;
  }
  const tone = String(payload.tone || "neutral").toLowerCase();
  el.textContent = String(payload.text || "--");
  el.classList.remove("critical", "pressure", "advantage", "balanced", "neutral", "info");
  if (tone !== "default") {
    el.classList.add(tone);
  }
  el.style.setProperty("--chip-level", clamp(asNum(payload.level), 0, 1).toFixed(3));
}

function applyMeters(meters: MeterPayload[]): void {
  (Array.isArray(meters) ? meters : []).forEach((meter) => {
    setMeter(byId<HTMLElement>(meter.id), meter.pct, meter.palette);
  });
}

function render(payload: AdminAuditRuntimeBridgePayload): boolean {
  const host = byId<HTMLElement>("adminAuditRuntimeStrip");
  const phaseChip = byId<HTMLElement>("adminAuditPhaseChip");
  const signalLine = byId<HTMLElement>("adminAuditSignalLine");
  const hintLine = byId<HTMLElement>("adminAuditHintLine");
  if (!host || !phaseChip || !signalLine || !hintLine) {
    return false;
  }
  host.dataset.tone = String(payload.tone || "neutral");
  host.style.setProperty("--audit-health", clamp(payload.phaseHealth, 0, 1).toFixed(3));
  host.style.setProperty("--audit-truth", clamp(payload.truthScore, 0, 1).toFixed(3));
  phaseChip.textContent = String(payload.phaseChipText || "PHASE UNKNOWN");
  setBadgeClass(phaseChip, payload.phaseChipTone || "default");
  signalLine.textContent = String(payload.signalLineText || "Runtime telemetry bekleniyor.");
  hintLine.textContent = String(payload.hintLineText || "Audit finding bekleniyor.");
  pulseOnce(signalLine);
  pulseOnce(hintLine);
  (Array.isArray(payload.chips) ? payload.chips : []).forEach(setLiveChip);
  applyMeters(payload.meters || []);
  return true;
}

export function installAdminAuditRuntimeBridge(): void {
  window.__AKR_ADMIN_AUDIT_RUNTIME__ = { render };
}
