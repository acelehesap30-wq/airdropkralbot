"use strict";

function sanitizeWebappVersion(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 40);
}

function buildCanonicalVersionedWebappPath(rawUrl = "", version = "", session = null) {
  const safeVersion = sanitizeWebappVersion(version);
  const fallbackPath = String(rawUrl || "").trim() || "/webapp";
  const url = new URL(fallbackPath, "https://webapp.local");
  if (safeVersion) {
    url.searchParams.set("v", safeVersion);
  }
  if (session && typeof session === "object") {
    const uid = String(session.uid || "").trim();
    const ts = String(session.ts || "").trim();
    const sig = String(session.sig || "").trim();
    if (uid && ts && sig) {
      url.searchParams.set("uid", uid);
      url.searchParams.set("ts", ts);
      url.searchParams.set("sig", sig);
    }
  }
  return `${url.pathname}${url.search}`;
}

module.exports = {
  buildCanonicalVersionedWebappPath
};
