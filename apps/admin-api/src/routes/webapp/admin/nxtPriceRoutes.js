"use strict";

/**
 * NXT Price Admin Routes
 *
 * POST /webapp/api/admin/nxt-price/set   — set NXT price manually
 * GET  /webapp/api/admin/nxt-price       — get current price + token summary
 */

const nxtPriceService = require("../../../services/nxtPriceService");

function registerNxtPriceRoutes(fastify, deps = {}) {
  const { requireWebAppAdmin, pool, tonJettonService } = deps;

  // ── Set NXT price ──
  fastify.post(
    "/webapp/api/admin/nxt-price/set",
    {
      preValidation: async (request, reply) => {
        await requireWebAppAdmin(request, reply);
      },
    },
    async (request, reply) => {
      const priceUsd = Number(request.body?.price_usd || 0);
      const adminId = Number(request.body?.admin_id || 0);

      if (priceUsd < 0) {
        return reply.code(400).send({ success: false, error: "invalid_price" });
      }

      const result = await nxtPriceService.setPrice(pool, priceUsd, adminId);
      fastify.log.info({ event: "nxt_price_set", price_usd: result.usd, admin_id: adminId });

      return reply.send({
        success: true,
        data: { usd: result.usd },
      });
    }
  );

  // ── Get current price + token summary ──
  fastify.get(
    "/webapp/api/admin/nxt-price",
    {
      preValidation: async (request, reply) => {
        await requireWebAppAdmin(request, reply);
      },
    },
    async (request, reply) => {
      const summary = await nxtPriceService.getTokenSummary(pool, tonJettonService);
      return reply.send({
        success: true,
        data: summary,
      });
    }
  );
}

module.exports = { registerNxtPriceRoutes };
