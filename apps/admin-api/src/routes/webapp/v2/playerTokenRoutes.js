"use strict";

/**
 * Player Token Routes — NXT balance & price for webapp users
 *
 * GET /webapp/api/v2/token/balance — user's NXT balance on TON
 * GET /webapp/api/v2/token/info    — NXT token info (price, supply, chain)
 */

function registerPlayerTokenRoutes(fastify, deps = {}) {
  const verifyWebAppAuth = deps.verifyWebAppAuth;
  const tonJettonService = deps.tonJettonService;
  const pool = deps.pool;

  // ── Get user's NXT balance ──
  fastify.get(
    "/webapp/api/v2/token/balance",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
          },
        },
      },
      preValidation: async (request, reply) => {
        await verifyWebAppAuth(request, reply);
      },
    },
    async (request, reply) => {
      const { uid } = request.query;

      // Get user's linked TON wallet from DB
      let walletAddress = null;
      try {
        const result = await pool.query(
          `SELECT wallet_address FROM player_wallets
           WHERE uid = $1 AND chain = 'TON' AND verified = true
           ORDER BY verified_at DESC LIMIT 1`,
          [uid]
        );
        walletAddress = result.rows[0]?.wallet_address || null;
      } catch {
        // Table may not exist yet
      }

      if (!walletAddress) {
        return reply.send({
          success: true,
          data: {
            balance: "0",
            humanBalance: 0,
            walletLinked: false,
            chain: "TON",
            symbol: "NXT",
            decimals: 9,
          },
        });
      }

      // Check on-chain balance
      if (tonJettonService && tonJettonService.enabled) {
        const onchain = await tonJettonService.balanceNXT(walletAddress);
        return reply.send({
          success: true,
          data: {
            balance: onchain.balance || "0",
            humanBalance: onchain.humanBalance || 0,
            walletLinked: true,
            walletAddress,
            chain: "TON",
            symbol: "NXT",
            decimals: 9,
          },
        });
      }

      // Fallback: return DB balance (off-chain tracking)
      let dbBalance = 0;
      try {
        const result = await pool.query(
          `SELECT COALESCE(nxt_balance, 0) as balance FROM player_economy
           WHERE uid = $1 LIMIT 1`,
          [uid]
        );
        dbBalance = Number(result.rows[0]?.balance || 0);
      } catch {
        // Table may not exist
      }

      return reply.send({
        success: true,
        data: {
          balance: String(Math.floor(dbBalance * 1e9)),
          humanBalance: dbBalance,
          walletLinked: true,
          walletAddress,
          chain: "TON",
          symbol: "NXT",
          decimals: 9,
          source: "database",
        },
      });
    }
  );

  // ── Get NXT token info (public) ──
  fastify.get(
    "/webapp/api/v2/token/info",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
          },
        },
      },
      preValidation: async (request, reply) => {
        await verifyWebAppAuth(request, reply);
      },
    },
    async (request, reply) => {
      let jettonData = null;
      if (tonJettonService && tonJettonService.enabled) {
        jettonData = await tonJettonService.getJettonData();
      }

      return reply.send({
        success: true,
        data: {
          symbol: "NXT",
          name: "AirdropKral Nexus",
          chain: "TON",
          decimals: 9,
          max_supply: "1000000000",
          total_supply: jettonData?.humanTotalSupply || 0,
          minter_address: tonJettonService?.minterAddress || null,
          mintable: jettonData?.mintable ?? true,
          network: tonJettonService?.network || "testnet",
          explorer_url: tonJettonService?.minterAddress
            ? `https://tonviewer.com/${tonJettonService.minterAddress}`
            : null,
          // Price — placeholder until DEX listing or oracle integration
          price_usd: 0,
          price_source: "pre_launch",
        },
      });
    }
  );
}

module.exports = { registerPlayerTokenRoutes };
