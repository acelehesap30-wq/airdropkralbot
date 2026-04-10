// ── TON & NXT Jetton Constants ──────────────────────────────
// Single source of truth for all TON-chain related constants.

const NXT_JETTON_MASTER = "EQCb-sIwT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_";
const NXT_DECIMALS = 9;
const NXT_SYMBOL = "NXT";
const NXT_NANO_MULTIPLIER = 10 ** NXT_DECIMALS; // 1 NXT = 1_000_000_000 nano

const TON_DECIMALS = 9;
const TON_NANO_MULTIPLIER = 10 ** TON_DECIMALS;

const TONSCAN_JETTON_URL = `https://tonscan.org/jetton/${NXT_JETTON_MASTER}`;
const TONSCAN_TX_URL = (hash) => `https://tonscan.org/tx/${hash}`;
const TONSCAN_ADDRESS_URL = (addr) => `https://tonscan.org/address/${addr}`;

const TONAPI_BASE = "https://tonapi.io/v2";

// Deposit memo prefix — users must include "NK-{userId}" in their transfer comment
const DEPOSIT_MEMO_PREFIX = "NK-";
const buildDepositMemo = (userId) => `${DEPOSIT_MEMO_PREFIX}${userId}`;
const parseDepositMemo = (comment) => {
  if (!comment || typeof comment !== "string") return null;
  const match = comment.match(/NK-(\d+)/);
  return match ? Number(match[1]) : null;
};

// House fee configuration
const HOUSE_FEE_PCT = 0.08;     // 8% house fee on every game
const SWEEP_DEFAULT_PCT = 0.95; // 95% of house balance swept to cold wallet
const SWEEP_DEFAULT_THRESHOLD_TON = 1.0; // Minimum TON before sweep triggers

// Gas reserves — never sweep below this (prevents locked wallet)
const HOT_WALLET_GAS_RESERVE_TON = 0.5;

// Transfer amounts
const JETTON_FORWARD_TON = 0.05; // TON attached to jetton transfers for gas
const MIN_DEPOSIT_TON = 0.1;     // Minimum deposit amount
const MIN_WITHDRAW_NXT = 100;    // Minimum NXT withdrawal

module.exports = {
  NXT_JETTON_MASTER,
  NXT_DECIMALS,
  NXT_SYMBOL,
  NXT_NANO_MULTIPLIER,
  TON_DECIMALS,
  TON_NANO_MULTIPLIER,
  TONSCAN_JETTON_URL,
  TONSCAN_TX_URL,
  TONSCAN_ADDRESS_URL,
  TONAPI_BASE,
  DEPOSIT_MEMO_PREFIX,
  buildDepositMemo,
  parseDepositMemo,
  HOUSE_FEE_PCT,
  SWEEP_DEFAULT_PCT,
  SWEEP_DEFAULT_THRESHOLD_TON,
  HOT_WALLET_GAS_RESERVE_TON,
  JETTON_FORWARD_TON,
  MIN_DEPOSIT_TON,
  MIN_WITHDRAW_NXT
};
