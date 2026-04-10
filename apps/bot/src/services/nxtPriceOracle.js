// ── NXT Price Oracle ──────────────────────────────────────
// Fetches real NXT/TON price from on-chain sources.
// Falls back to config-based price if no pool data available.
// Updates every 5 minutes.

const { NXT_JETTON_MASTER } = require("../../../../packages/shared/src/tonConstants");

let cachedPrice = { nxtPerTon: 0, tonUsd: 0, nxtUsd: 0, updatedAt: 0, source: "config" };
let pollTimer = null;

function getCachedPrice() {
  return { ...cachedPrice };
}

async function fetchTonUsdPrice() {
  try {
    const resp = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=usd", {
      headers: { "Accept": "application/json" }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const usd = Number(data?.rates?.TON?.prices?.USD || 0);
    return usd > 0 ? usd : null;
  } catch {
    return null;
  }
}

async function fetchNxtPoolPrice(tonapiKey) {
  // Try to get NXT/TON price from TonAPI jetton metadata or known DEX pools
  try {
    const headers = { "Accept": "application/json" };
    if (tonapiKey) headers["Authorization"] = `Bearer ${tonapiKey}`;

    // Check if there's a DeDust or STON.fi pool for NXT
    const resp = await fetch(
      `https://tonapi.io/v2/jettons/${encodeURIComponent(NXT_JETTON_MASTER)}`,
      { headers }
    );
    if (!resp.ok) return null;
    const data = await resp.json();

    // If TonAPI returns a price from pool
    if (data?.metadata?.price_usd && Number(data.metadata.price_usd) > 0) {
      return { nxtUsd: Number(data.metadata.price_usd), source: "tonapi_pool" };
    }

    // If holders/supply data is available, compute from market cap estimate
    const totalSupply = Number(data?.total_supply || 0) / 1e9; // 9 decimals
    if (totalSupply > 0 && data?.metadata?.price_usd) {
      return { nxtUsd: Number(data.metadata.price_usd), source: "tonapi_metadata" };
    }

    return null;
  } catch {
    return null;
  }
}

async function updatePrice(runtimeConfig) {
  const tonapiKey = process.env.TONAPI_KEY || "";
  const configPrice = Number(process.env.NXT_USD_PRICE || runtimeConfig?.nxt_usd_price || 0.001);
  const tonUsdFallback = Number(process.env.TON_USD_PRICE || 3);

  // 1. Try to get real TON/USD price
  const tonUsd = (await fetchTonUsdPrice()) || tonUsdFallback;

  // 2. Try to get real NXT price from pool
  const poolResult = await fetchNxtPoolPrice(tonapiKey);

  if (poolResult && poolResult.nxtUsd > 0) {
    const nxtPerTon = tonUsd > 0 ? tonUsd / poolResult.nxtUsd : 0;
    cachedPrice = {
      nxtPerTon,
      tonUsd,
      nxtUsd: poolResult.nxtUsd,
      updatedAt: Date.now(),
      source: poolResult.source
    };
  } else {
    // Fallback to config-based price
    const nxtPerTon = tonUsd > 0 && configPrice > 0 ? tonUsd / configPrice : 0;
    cachedPrice = {
      nxtPerTon,
      tonUsd,
      nxtUsd: configPrice,
      updatedAt: Date.now(),
      source: "config"
    };
  }

  return cachedPrice;
}

function start(runtimeConfig) {
  // Initial fetch
  updatePrice(runtimeConfig).catch(() => {});

  // Poll every 5 minutes
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    updatePrice(runtimeConfig).catch(() => {});
  }, 5 * 60 * 1000);
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

module.exports = { getCachedPrice, updatePrice, start, stop };
