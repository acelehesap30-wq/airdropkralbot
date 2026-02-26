type CameraDirectorPayload = {
  mode: {
    key: string;
    text: string;
  };
  focus: {
    text: string;
  };
  energy: {
    pct: number;
  };
};

type CameraDirectorBridge = {
  render: (payload: CameraDirectorPayload) => boolean;
};

declare global {
  interface Window {
    __AKR_CAMERA_DIRECTOR__?: CameraDirectorBridge;
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

export function installCameraDirectorBridge(): void {
  window.__AKR_CAMERA_DIRECTOR__ = {
    render(payload: CameraDirectorPayload): boolean {
      const modeLine = byId<HTMLElement>("cameraModeLine");
      const focusLine = byId<HTMLElement>("cameraFocusLine");
      const energyMeter = byId<HTMLElement>("cameraEnergyMeter");
      if (!modeLine || !focusLine || !energyMeter) {
        return false;
      }

      modeLine.dataset.mode = String(payload.mode?.key || "broadcast");
      modeLine.textContent = String(payload.mode?.text || "BROADCAST | Drift 0%");

      focusLine.textContent = String(payload.focus?.text || "Focus dengede, director hazir.");
      setMeter(energyMeter, asNum(payload.energy?.pct || 0));
      return true;
    }
  };
}

