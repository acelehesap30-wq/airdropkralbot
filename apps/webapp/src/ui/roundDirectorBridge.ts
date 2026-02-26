type RoundDirectorPayload = {
  heat: {
    phase: string;
    text: string;
    pct: number;
  };
  tempo: {
    text: string;
    pct: number;
  };
  dominance: {
    state: string;
    text: string;
    pct: number;
  };
  pressure: {
    state: string;
    text: string;
    pct: number;
  };
};

type RoundDirectorBridge = {
  render: (payload: RoundDirectorPayload) => boolean;
};

declare global {
  interface Window {
    __AKR_ROUND_DIRECTOR__?: RoundDirectorBridge;
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

function setMeter(node: HTMLElement | null, pct: number): void {
  if (!node) return;
  node.style.width = `${Math.round(clamp(asNum(pct), 0, 100))}%`;
}

export function installRoundDirectorBridge(): void {
  window.__AKR_ROUND_DIRECTOR__ = {
    render(payload: RoundDirectorPayload): boolean {
      const heatLine = byId<HTMLElement>("roundHeatLine");
      const heatMeter = byId<HTMLElement>("roundHeatMeter");
      const tempoLine = byId<HTMLElement>("roundTempoLine");
      const tempoMeter = byId<HTMLElement>("roundTempoMeter");
      const dominanceLine = byId<HTMLElement>("roundDominanceLine");
      const dominanceMeter = byId<HTMLElement>("roundDominanceMeter");
      const pressureLine = byId<HTMLElement>("roundPressureLine");
      const pressureMeter = byId<HTMLElement>("roundPressureMeter");
      if (
        !heatLine ||
        !heatMeter ||
        !tempoLine ||
        !tempoMeter ||
        !dominanceLine ||
        !dominanceMeter ||
        !pressureLine ||
        !pressureMeter
      ) {
        return false;
      }

      heatLine.dataset.phase = String(payload.heat?.phase || "warmup");
      heatLine.textContent = String(payload.heat?.text || "0% | WARMUP");
      setMeter(heatMeter, asNum(payload.heat?.pct || 0));

      tempoLine.textContent = String(payload.tempo?.text || "0% | Tick 1000ms");
      setMeter(tempoMeter, asNum(payload.tempo?.pct || 0));

      dominanceLine.dataset.dominance = String(payload.dominance?.state || "even");
      dominanceLine.textContent = String(payload.dominance?.text || "YOU 0 - 0 OPP | EVEN");
      setMeter(dominanceMeter, asNum(payload.dominance?.pct || 0));

      pressureLine.dataset.pressure = String(payload.pressure?.state || "low");
      pressureLine.textContent = String(payload.pressure?.text || "0% | Queue 0");
      setMeter(pressureMeter, asNum(payload.pressure?.pct || 0));

      return true;
    }
  };
}

