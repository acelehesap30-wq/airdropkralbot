"use strict";

/**
 * NXT Token — On-chain configuration
 * Deployed on TON mainnet 2026-04-04
 */
const NXT_TOKEN_CONFIG = Object.freeze({
  symbol: "NXT",
  name: "AirdropKral Nexus",
  chain: "TON",
  decimals: 9,
  max_supply: 1_000_000_000,
  initial_supply: 10_000_000,

  // Mainnet Jetton Minter contract
  jetton_minter: "EQCb-sIWT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_",
  admin_wallet: "EQD8w9rfuxbtdl30ybCIwPi5uNl-17ynIM2oyxGviEyuKs8j",

  // Explorer links
  explorer_url: "https://tonviewer.com/EQCb-sIWT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_",
  tonscan_url: "https://tonscan.org/address/EQCb-sIWT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_",

  // Standards
  standard: "TEP-74 / TEP-89",
  mintable: true,
});

module.exports = { NXT_TOKEN_CONFIG };
