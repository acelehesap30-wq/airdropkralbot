type RuntimeBridgePayload = {
  lineText: string;
  eventsLineText: string;
  loopLineText?: string;
  loopHintText?: string;
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
  if (!line || !eventsLine || !loopLine || !loopHint) {
    return false;
  }
  line.textContent = String(payload.lineText || "Bot Runtime: -");
  eventsLine.textContent = String(payload.eventsLineText || "Runtime events: kayit yok");
  loopLine.textContent = String(payload.loopLineText || "OPS LOOP | WAIT");
  loopHint.textContent = String(payload.loopHintText || "Scene loop focus bekleniyor.");
  pulseOnce(line);
  pulseOnce(eventsLine);
  pulseOnce(loopLine);
  pulseOnce(loopHint);
  return true;
}

export function installAdminRuntimeBridge(): void {
  window.__AKR_ADMIN_RUNTIME__ = { render };
}
