type RuntimeBridgePayload = {
  lineText: string;
  eventsLineText: string;
  loopLineText?: string;
  loopHintText?: string;
  loopOpsLineText?: string;
  loopOpsHintText?: string;
  loopDetailText?: string;
  loopSignalText?: string;
};

type AdminRuntimeBridge = {
  render: (payload: RuntimeBridgePayload) => boolean;
};

declare global {
  interface Window {
    __AKR_ADMIN_RUNTIME__?: AdminRuntimeBridge;
  }
}

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
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

function render(payload: RuntimeBridgePayload): boolean {
  const line = byId<HTMLElement>("adminRuntimeLine");
  const eventsLine = byId<HTMLElement>("adminRuntimeEvents");
  const loopLine = byId<HTMLElement>("adminRuntimeLoopLine");
  const loopHint = byId<HTMLElement>("adminRuntimeLoopHint");
  const loopOpsLine = byId<HTMLElement>("adminRuntimeLoopOpsLine");
  const loopOpsHint = byId<HTMLElement>("adminRuntimeLoopOpsHint");
  const loopDetail = byId<HTMLElement>("adminRuntimeLoopDetail");
  const loopSignal = byId<HTMLElement>("adminRuntimeLoopSignal");
  if (!line || !eventsLine || !loopLine || !loopHint || !loopOpsLine || !loopOpsHint || !loopDetail || !loopSignal) {
    return false;
  }
  line.textContent = String(payload.lineText || "Bot Runtime: -");
  eventsLine.textContent = String(payload.eventsLineText || "Runtime events: kayit yok");
  loopLine.textContent = String(payload.loopLineText || "OPS LOOP | WAIT");
  loopHint.textContent = String(payload.loopHintText || "Scene loop focus bekleniyor.");
  loopOpsLine.textContent = String(payload.loopOpsLineText || "WAIT | FLOW IDLE");
  loopOpsHint.textContent = String(payload.loopOpsHintText || "District flow aktif degil.");
  loopDetail.textContent = String(payload.loopDetailText || "Loop detay bekleniyor.");
  loopSignal.textContent = String(payload.loopSignalText || "Signal detay bekleniyor.");
  pulseOnce(line);
  pulseOnce(eventsLine);
  pulseOnce(loopLine);
  pulseOnce(loopHint);
  pulseOnce(loopOpsLine);
  pulseOnce(loopOpsHint);
  pulseOnce(loopDetail);
  pulseOnce(loopSignal);
  return true;
}

export function installAdminRuntimeBridge(): void {
  window.__AKR_ADMIN_RUNTIME__ = { render };
}
