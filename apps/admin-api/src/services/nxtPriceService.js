"use strict";

/**
 * NXT Price Service — Token price oracle
 *
 * Phase 1: Manual price set by admin via DB or API
 * Phase 2: DexScreener/CoinGecko auto-fetch (future)
 */

let _cachedPrice = { usd: 0, updatedAt: null, source: "manual" };

/**
 * Get current NXT token price.
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ usd: number, source: string, updatedAt: string|null }>}
 */
async function getPrice(pool) {
  // Try DB config first
  try {
    const result = await pool.query(
      `SELECT value FROM system_config WHERE key = 'nxt_price_usd' LIMIT 1`
    );
    if (result.rows.length > 0) {
      const dbPrice = Number(result.rows[0].value || 0);
      if (dbPrice > 0) {
        return { usd: dbPrice, source: "db_manual", updatedAt: new Date().toISOString() };
      }
    }
  } catch (_) {
    // system_config table might not exist, use cached
  }

  return {
    usd: _cachedPrice.usd,
    source: _cachedPrice.source,
    updatedAt: _cachedPrice.updatedAt
  };
}

/**
 * Set NXT price manually (admin action).
 * @param {import('pg').Pool} pool
 * @param {number} priceUsd
 * @param {number} adminId
 * @returns {Promise<{ ok: boolean, usd: number }>}
 */
async function setPrice(pool, priceUsd, adminId) {
  const safePrice = Math.max(0, Number(priceUsd || 0));
  _cachedPrice = { usd: safePrice, updatedAt: new Date().toISOString(), source: "admin_manual" };

  try {
    await pool.query(
      `INSERT INTO system_config (key, value, updated_by, updated_at)
       VALUES ('nxt_price_usd', $1, $2, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
      [String(safePrice), String(adminId || 0)]
    );
  } catch (_) {
    // Best effort — system_config table may not exist
  }

  return { ok: true, usd: safePrice };
}

/**
 * Get NXT token summary (price + on-chain info).
 * @param {import('pg').Pool} pool
 * @param {object} [jettonService] — optional ton jetton service
 * @returns {Promise<object>}
 */
async function getTokenSummary(pool, jettonService) {
  const price = await getPrice(pool);
  let onchain = null;

  if (jettonService?.enabled) {
    try {
      onchain = await jettonService.getJettonData();
    } catch (_) { /* best-effort */ }
  }

  return {
    symbol: "NXT",
    chain: "TON",
    decimals: 9,
    price,
    minterAddress: "EQCb-sIwT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_",
    explorerUrl: "https://tonviewer.com/EQCb-sIwT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_",
    onchain: onchain?.success ? {
      totalSupply: onchain.humanTotalSupply,
      mintable: onchain.mintable,
      adminAddress: onchain.adminAddress
    } : null
  };
}

module.exports = { getPrice, setPrice, getTokenSummary };
