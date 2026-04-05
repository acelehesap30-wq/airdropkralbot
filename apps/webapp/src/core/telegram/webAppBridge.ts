/**
 * WebApp Bridge — Telegram Mini App ↔ Bot communication
 *
 * Uses window.Telegram.WebApp.sendData() to send structured
 * messages from the webapp to the bot's web_app_data handler.
 */

interface TelegramWebApp {
  sendData: (data: string) => void;
  close: () => void;
  ready: () => void;
  expand: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  initDataUnsafe?: {
    user?: { id: number; first_name: string; language_code?: string };
    start_param?: string;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp || null;
}

function isInTelegramWebApp(): boolean {
  return !!getTelegramWebApp();
}

/**
 * Send a structured action to the bot via web_app_data.
 * The bot's handleWebAppAction will receive this as JSON.
 */
function sendBotAction(action: string, payload: Record<string, unknown> = {}): boolean {
  const webapp = getTelegramWebApp();
  if (!webapp) return false;

  try {
    webapp.sendData(JSON.stringify({
      action,
      request_id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
    }));
    return true;
  } catch {
    return false;
  }
}

// ── Specific bridge actions ──

export function sendGameComplete(gameId: string, result: { score?: number; wave?: number }): boolean {
  return sendBotAction("game_complete", {
    game_id: gameId,
    score: result.score || 0,
    wave: result.wave || 1,
  });
}

export function sendTaskAccept(offerId: number): boolean {
  return sendBotAction("accept_offer", { offer_id: offerId });
}

export function sendMintToken(amount?: number): boolean {
  return sendBotAction("mint_token", { amount });
}

export function sendRerollTasks(): boolean {
  return sendBotAction("reroll_tasks", {});
}

export { getTelegramWebApp, isInTelegramWebApp, sendBotAction };
