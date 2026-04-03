"use strict";

/**
 * TON Jetton Admin Routes — NXT on-chain operations
 *
 * POST /webapp/api/admin/ton-jetton/mint   — Mint NXT to a TON address
 * GET  /webapp/api/admin/ton-jetton/info   — Get Jetton contract info
 * GET  /webapp/api/admin/ton-jetton/balance — Check NXT balance for address
 */

function registerTonJettonRoutes(fastify, deps = {}) {
  const verifyWebAppAuth = deps.verifyWebAppAuth;
  const requireWebAppAdmin = deps.requireWebAppAdmin;
  const tonJettonService = deps.tonJettonService;

  if (!tonJettonService) {
    console.warn("[tonJettonRoutes] tonJettonService not provided — routes disabled");
    return;
  }

  // ── Mint NXT to a TON wallet ──
  fastify.post(
    "/webapp/api/admin/ton-jetton/mint",
    {
      schema: {
        body: {
          type: "object",
          required: ["uid", "ts", "sig", "to_address", "amount"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
            to_address: { type: "string", minLength: 20 },
            amount: { type: "number", minimum: 0.001, maximum: 1000000 },
            reason: { type: "string", maxLength: 200 },
          },
        },
      },
      preValidation: async (request, reply) => {
        await verifyWebAppAuth(request, reply);
        await requireWebAppAdmin(request, reply);
      },
    },
    async (request, reply) => {
      const { to_address, amount, reason } = request.body;

      if (!tonJettonService.enabled) {
        return reply.code(503).send({
          success: false,
          error: "ton_jetton_not_configured",
          message: "TON Jetton service is not configured. Set NXT_JETTON_MINTER in .env",
        });
      }

      const result = await tonJettonService.mintNXT(to_address, amount);

      if (result.success) {
        fastify.log.info({
          event: "nxt_jetton_mint",
          to: to_address,
          amount,
          seqno: result.seqno,
          reason: reason || "admin_mint",
        });
      }

      return reply.send(result);
    }
  );

  // ── Get Jetton contract info ──
  fastify.get(
    "/webapp/api/admin/ton-jetton/info",
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
        await requireWebAppAdmin(request, reply);
      },
    },
    async (request, reply) => {
      if (!tonJettonService.enabled) {
        return reply.code(503).send({
          success: false,
          error: "ton_jetton_not_configured",
        });
      }
      const data = await tonJettonService.getJettonData();
      return reply.send(data);
    }
  );

  // ── Check NXT balance for a TON address ──
  fastify.get(
    "/webapp/api/admin/ton-jetton/balance",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig", "address"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
            address: { type: "string", minLength: 20 },
          },
        },
      },
      preValidation: async (request, reply) => {
        await verifyWebAppAuth(request, reply);
        await requireWebAppAdmin(request, reply);
      },
    },
    async (request, reply) => {
      if (!tonJettonService.enabled) {
        return reply.code(503).send({
          success: false,
          error: "ton_jetton_not_configured",
        });
      }
      const { address } = request.query;
      const data = await tonJettonService.balanceNXT(address);
      return reply.send(data);
    }
  );
}

module.exports = { registerTonJettonRoutes };
