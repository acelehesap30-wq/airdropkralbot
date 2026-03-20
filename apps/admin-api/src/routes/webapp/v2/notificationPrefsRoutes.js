"use strict";

const {
  ALERT_FAMILIES,
  buildDefaultPreferences,
  mergePreferences,
  isValidAlertFamily
} = require("../../../../../../packages/shared/src/v5/notificationPreferenceEngine");

function requireDependency(deps, key, type = "function") {
  const value = deps[key];
  if (type === "function" && typeof value !== "function") {
    throw new Error(`registerWebappV2NotificationPrefsRoutes requires ${key}`);
  }
  if (type === "object" && (!value || typeof value !== "object")) {
    throw new Error(`registerWebappV2NotificationPrefsRoutes requires ${key}`);
  }
  return value;
}

function normalizeNotifPrefs(row) {
  const source = row && typeof row === "object" ? row : {};
  const rawPrefs = source.prefs_json && typeof source.prefs_json === "object" ? source.prefs_json : {};
  const notifPrefs = rawPrefs.notification_preferences && typeof rawPrefs.notification_preferences === "object"
    ? rawPrefs.notification_preferences
    : buildDefaultPreferences();
  return notifPrefs;
}

function registerWebappV2NotificationPrefsRoutes(fastify, deps = {}) {
  const pool = requireDependency(deps, "pool", "object");
  const verifyWebAppAuth = requireDependency(deps, "verifyWebAppAuth", "function");
  const issueWebAppSession = requireDependency(deps, "issueWebAppSession", "function");
  const getProfileByTelegram = requireDependency(deps, "getProfileByTelegram", "function");
  const webappStore = requireDependency(deps, "webappStore", "object");

  if (typeof webappStore.getUserUiPrefs !== "function" || typeof webappStore.upsertUserUiPrefs !== "function") {
    throw new Error("registerWebappV2NotificationPrefsRoutes requires webappStore.getUserUiPrefs and webappStore.upsertUserUiPrefs");
  }

  fastify.get(
    "/webapp/api/v2/notification/preferences",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" }
          }
        }
      }
    },
    async (request, reply) => {
      const auth = verifyWebAppAuth(request.query.uid, request.query.ts, request.query.sig);
      if (!auth.ok) {
        reply.code(401).send({ success: false, error: auth.reason });
        return;
      }
      const client = await pool.connect();
      try {
        const profile = await getProfileByTelegram(client, auth.uid);
        if (!profile) {
          reply.code(404).send({ success: false, error: "user_not_started" });
          return;
        }
        const current = await webappStore.getUserUiPrefs(client, profile.user_id).catch((err) => {
          if (err.code === "42P01") return null;
          throw err;
        });
        const notifPrefs = normalizeNotifPrefs(current);
        reply.send({
          success: true,
          session: issueWebAppSession(auth.uid),
          data: {
            api_version: "v2",
            alert_families: ALERT_FAMILIES,
            notification_preferences: notifPrefs
          }
        });
      } finally {
        client.release();
      }
    }
  );

  fastify.post(
    "/webapp/api/v2/notification/preferences",
    {
      schema: {
        body: {
          type: "object",
          required: ["uid", "ts", "sig", "updates"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
            updates: { type: "object" }
          }
        }
      }
    },
    async (request, reply) => {
      const auth = verifyWebAppAuth(request.body.uid, request.body.ts, request.body.sig);
      if (!auth.ok) {
        reply.code(401).send({ success: false, error: auth.reason });
        return;
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const profile = await getProfileByTelegram(client, auth.uid);
        if (!profile) {
          await client.query("ROLLBACK");
          reply.code(404).send({ success: false, error: "user_not_started" });
          return;
        }
        const current = await webappStore.getUserUiPrefs(client, profile.user_id).catch((err) => {
          if (err.code === "42P01") return null;
          throw err;
        });

        const currentNotif = normalizeNotifPrefs(current);
        const merged = mergePreferences(currentNotif, request.body.updates);

        const currentRow = current && typeof current === "object" ? current : {};
        const currentPrefsJson = currentRow.prefs_json && typeof currentRow.prefs_json === "object" ? currentRow.prefs_json : {};
        const nextPrefsJson = { ...currentPrefsJson, notification_preferences: merged };

        const saved = await webappStore
          .upsertUserUiPrefs(client, {
            userId: profile.user_id,
            uiMode: String(currentRow.ui_mode || "hardcore"),
            qualityMode: String(currentRow.quality_mode || "auto"),
            reducedMotion: Boolean(currentRow.reduced_motion),
            largeText: Boolean(currentRow.large_text),
            soundEnabled: currentRow.sound_enabled !== false,
            prefsJson: nextPrefsJson
          })
          .catch((err) => {
            if (err.code === "42P01") {
              const missing = new Error("ui_preferences_tables_missing");
              missing.code = "ui_preferences_tables_missing";
              throw missing;
            }
            throw err;
          });

        await client.query("COMMIT");
        const savedNotif = normalizeNotifPrefs(saved);
        reply.send({
          success: true,
          session: issueWebAppSession(auth.uid),
          data: {
            api_version: "v2",
            alert_families: ALERT_FAMILIES,
            notification_preferences: savedNotif
          }
        });
      } catch (err) {
        await client.query("ROLLBACK");
        if (err.code === "ui_preferences_tables_missing") {
          reply.code(503).send({ success: false, error: "ui_preferences_tables_missing" });
          return;
        }
        throw err;
      } finally {
        client.release();
      }
    }
  );
}

module.exports = {
  registerWebappV2NotificationPrefsRoutes
};
