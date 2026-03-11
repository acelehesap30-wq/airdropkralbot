export type LoopBridgeCard = {
  title: string;
  value: string;
  hint?: string;
  tone?: string;
};

function safeText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeTone(value: unknown): string {
  const tone = safeText(value, "neutral").toLowerCase();
  if (tone === "safe") return "advantage";
  if (tone === "aggressive") return "pressure";
  if (["neutral", "balanced", "advantage", "pressure", "critical"].includes(tone)) {
    return tone;
  }
  return "neutral";
}

export function renderLoopBridgeCards(host: HTMLElement | null, cards: LoopBridgeCard[] | undefined): void {
  if (!host) {
    return;
  }
  host.innerHTML = "";
  const rows = Array.isArray(cards) ? cards.filter(Boolean).slice(0, 4) : [];
  if (!rows.length) {
    host.classList.add("hidden");
    return;
  }
  host.classList.remove("hidden");
  rows.forEach((card) => {
    const article = document.createElement("article");
    article.className = "akrBridgeFocusCard";
    article.dataset.tone = normalizeTone(card.tone);

    const title = document.createElement("span");
    title.textContent = safeText(card.title, "FLOW");

    const value = document.createElement("strong");
    value.textContent = safeText(card.value, "--");

    article.appendChild(title);
    article.appendChild(value);

    if (safeText(card.hint)) {
      const hint = document.createElement("em");
      hint.textContent = safeText(card.hint);
      article.appendChild(hint);
    }

    host.appendChild(article);
  });
}
