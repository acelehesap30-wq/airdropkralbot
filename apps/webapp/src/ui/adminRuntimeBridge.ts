type RuntimeBridgePayload = {
  lineText: string;
  eventsLineText: string;
  loopLineText?: string;
  loopHintText?: string;
  loopFocusText?: string;
  loopOpsLineText?: string;
  loopOpsHintText?: string;
  loopSequenceText?: string;
  loopStateText?: string;
  loopDetailText?: string;
  loopSignalText?: string;
  loopQueueText?: string;
  loopRuntimeText?: string;
  loopDispatchText?: string;
  loopQueueFocusText?: string;
  loopRuntimeFocusText?: string;
  loopDispatchFocusText?: string;
  loopQueueStageText?: string;
  loopRuntimeStageText?: string;
  loopDispatchStageText?: string;
  loopQueueOpsText?: string;
  loopRuntimeOpsText?: string;
  loopDispatchOpsText?: string;
  loopQueueStateText?: string;
  loopRuntimeStateText?: string;
  loopDispatchStateText?: string;
  loopQueueSignalText?: string;
  loopRuntimeSignalText?: string;
  loopDispatchSignalText?: string;
  loopQueueDetailText?: string;
  loopRuntimeDetailText?: string;
  loopDispatchDetailText?: string;
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
  const loopFocus = byId<HTMLElement>("adminRuntimeLoopFocus");
  const loopOpsLine = byId<HTMLElement>("adminRuntimeLoopOpsLine");
  const loopOpsHint = byId<HTMLElement>("adminRuntimeLoopOpsHint");
  const loopSequence = byId<HTMLElement>("adminRuntimeLoopSequence");
  const loopState = byId<HTMLElement>("adminRuntimeLoopState");
  const loopDetail = byId<HTMLElement>("adminRuntimeLoopDetail");
  const loopSignal = byId<HTMLElement>("adminRuntimeLoopSignal");
  const loopQueue = byId<HTMLElement>("adminRuntimeLoopQueue");
  const loopQueueFocus = byId<HTMLElement>("adminRuntimeLoopQueueFocus");
  const loopQueueStage = byId<HTMLElement>("adminRuntimeLoopQueueStage");
  const loopRuntime = byId<HTMLElement>("adminRuntimeLoopRuntime");
  const loopRuntimeFocus = byId<HTMLElement>("adminRuntimeLoopRuntimeFocus");
  const loopRuntimeStage = byId<HTMLElement>("adminRuntimeLoopRuntimeStage");
  const loopDispatch = byId<HTMLElement>("adminRuntimeLoopDispatch");
  const loopDispatchFocus = byId<HTMLElement>("adminRuntimeLoopDispatchFocus");
  const loopDispatchStage = byId<HTMLElement>("adminRuntimeLoopDispatchStage");
  const loopQueueState = byId<HTMLElement>("adminRuntimeLoopQueueState");
  const loopRuntimeState = byId<HTMLElement>("adminRuntimeLoopRuntimeState");
  const loopDispatchState = byId<HTMLElement>("adminRuntimeLoopDispatchState");
  const loopQueueOps = byId<HTMLElement>("adminRuntimeLoopQueueOps");
  const loopRuntimeOps = byId<HTMLElement>("adminRuntimeLoopRuntimeOps");
  const loopDispatchOps = byId<HTMLElement>("adminRuntimeLoopDispatchOps");
  const loopQueueSignal = byId<HTMLElement>("adminRuntimeLoopQueueSignal");
  const loopRuntimeSignal = byId<HTMLElement>("adminRuntimeLoopRuntimeSignal");
  const loopDispatchSignal = byId<HTMLElement>("adminRuntimeLoopDispatchSignal");
  const loopQueueDetail = byId<HTMLElement>("adminRuntimeLoopQueueDetail");
  const loopRuntimeDetail = byId<HTMLElement>("adminRuntimeLoopRuntimeDetail");
  const loopDispatchDetail = byId<HTMLElement>("adminRuntimeLoopDispatchDetail");
  if (!line || !eventsLine || !loopLine || !loopHint || !loopFocus || !loopOpsLine || !loopOpsHint || !loopSequence || !loopState || !loopDetail || !loopSignal) {
    return false;
  }
  line.textContent = String(payload.lineText || "Bot Runtime: -");
  eventsLine.textContent = String(payload.eventsLineText || "Runtime events: kayit yok");
  loopLine.textContent = String(payload.loopLineText || "OPS LOOP | WAIT");
  loopHint.textContent = String(payload.loopHintText || "Scene loop focus bekleniyor.");
  loopFocus.textContent = String(payload.loopFocusText || "FLOW | WAIT");
  loopOpsLine.textContent = String(payload.loopOpsLineText || "WAIT | FLOW IDLE");
  loopOpsHint.textContent = String(payload.loopOpsHintText || "District flow aktif degil.");
  loopSequence.textContent = String(payload.loopSequenceText || "Sequence detay bekleniyor.");
  loopState.textContent = String(payload.loopStateText || "IDLE | FLOW WAIT");
  loopDetail.textContent = String(payload.loopDetailText || "Loop detay bekleniyor.");
  loopSignal.textContent = String(payload.loopSignalText || "Signal detay bekleniyor.");
  if (loopQueue) {
    loopQueue.textContent = String(payload.loopQueueText || "QUEUE | WAIT");
  }
  if (loopQueueFocus) {
    loopQueueFocus.textContent = String(payload.loopQueueFocusText || "ENTRY WAIT | FOCUS WAIT | FLOW WAIT");
  }
  if (loopQueueStage) {
    loopQueueStage.textContent = String(payload.loopQueueStageText || "STAGE -- | STATUS -- | ENTRY WAIT");
  }
  if (loopRuntime) {
    loopRuntime.textContent = String(payload.loopRuntimeText || "RUNTIME | WAIT");
  }
  if (loopRuntimeFocus) {
    loopRuntimeFocus.textContent = String(payload.loopRuntimeFocusText || "SEQ WAIT | FOCUS WAIT | ALERT --");
  }
  if (loopRuntimeStage) {
    loopRuntimeStage.textContent = String(payload.loopRuntimeStageText || "STAGE -- | STATUS -- | SEQ WAIT");
  }
  if (loopDispatch) {
    loopDispatch.textContent = String(payload.loopDispatchText || "DISPATCH | WAIT");
  }
  if (loopDispatchFocus) {
    loopDispatchFocus.textContent = String(payload.loopDispatchFocusText || "ENTRY WAIT | FOCUS WAIT | STAGE --");
  }
  if (loopDispatchStage) {
    loopDispatchStage.textContent = String(payload.loopDispatchStageText || "STAGE -- | STATUS -- | SENT --");
  }
  if (loopQueueState) {
    loopQueueState.textContent = String(payload.loopQueueStateText || "FLOW WAIT | ENTRY WAIT | QUEUE --");
  }
  if (loopRuntimeState) {
    loopRuntimeState.textContent = String(payload.loopRuntimeStateText || "FLOW WAIT | SEQ WAIT | HEALTH --");
  }
  if (loopDispatchState) {
    loopDispatchState.textContent = String(payload.loopDispatchStateText || "FLOW WAIT | STAGE -- | SENT --");
  }
  if (loopQueueOps) {
    loopQueueOps.textContent = String(payload.loopQueueOpsText || "ENTRY WAIT | QUEUE -- | FLOW WAIT");
  }
  if (loopRuntimeOps) {
    loopRuntimeOps.textContent = String(payload.loopRuntimeOpsText || "SEQ WAIT | HEALTH -- | ALERT --");
  }
  if (loopDispatchOps) {
    loopDispatchOps.textContent = String(payload.loopDispatchOpsText || "ENTRY WAIT | SENT -- | STAGE --");
  }
  if (loopQueueSignal) {
    loopQueueSignal.textContent = String(payload.loopQueueSignalText || "QUEUE -- | FLOW WAIT | ENTRY WAIT");
  }
  if (loopRuntimeSignal) {
    loopRuntimeSignal.textContent = String(payload.loopRuntimeSignalText || "HEALTH -- | ALERT -- | FLOW WAIT");
  }
  if (loopDispatchSignal) {
    loopDispatchSignal.textContent = String(payload.loopDispatchSignalText || "SENT -- | STAGE -- | FLOW WAIT");
  }
  if (loopQueueDetail) {
    loopQueueDetail.textContent = String(payload.loopQueueDetailText || "Queue action detay bekleniyor.");
  }
  if (loopRuntimeDetail) {
    loopRuntimeDetail.textContent = String(payload.loopRuntimeDetailText || "Runtime diagnostics bekleniyor.");
  }
  if (loopDispatchDetail) {
    loopDispatchDetail.textContent = String(payload.loopDispatchDetailText || "Dispatch gate detay bekleniyor.");
  }
  pulseOnce(line);
  pulseOnce(eventsLine);
  pulseOnce(loopLine);
  pulseOnce(loopHint);
  pulseOnce(loopFocus);
  pulseOnce(loopOpsLine);
  pulseOnce(loopOpsHint);
  pulseOnce(loopSequence);
  pulseOnce(loopState);
  pulseOnce(loopDetail);
  pulseOnce(loopSignal);
  pulseOnce(loopQueue);
  pulseOnce(loopQueueFocus);
  pulseOnce(loopQueueStage);
  pulseOnce(loopRuntime);
  pulseOnce(loopRuntimeFocus);
  pulseOnce(loopRuntimeStage);
  pulseOnce(loopDispatch);
  pulseOnce(loopDispatchFocus);
  pulseOnce(loopDispatchStage);
  pulseOnce(loopQueueDetail);
  pulseOnce(loopRuntimeDetail);
  pulseOnce(loopDispatchDetail);
  return true;
}

export function installAdminRuntimeBridge(): void {
  window.__AKR_ADMIN_RUNTIME__ = { render };
}
