"use strict";

function sanitizeWebappVersion(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 40);
}

function pickCanonicalWebappVersion({
  overrideVersion = "",
  releaseEnvVersion = "",
  renderCommitVersion = "",
  releaseMarkerVersion = "",
  startupVersion = ""
} = {}) {
  const safeOverride = sanitizeWebappVersion(overrideVersion);
  if (safeOverride) {
    return { version: safeOverride, source: "env_override" };
  }

  const safeReleaseEnv = sanitizeWebappVersion(releaseEnvVersion);
  if (safeReleaseEnv) {
    return { version: safeReleaseEnv, source: "release_env" };
  }

  const safeRenderCommit = sanitizeWebappVersion(renderCommitVersion);
  if (safeRenderCommit) {
    return { version: safeRenderCommit, source: "render_git_commit" };
  }

  const safeReleaseMarker = sanitizeWebappVersion(releaseMarkerVersion);
  if (safeReleaseMarker) {
    return { version: safeReleaseMarker, source: "release_marker" };
  }

  const safeStartup = sanitizeWebappVersion(startupVersion) || "startup";
  return { version: safeStartup, source: "startup_timestamp" };
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
  buildCanonicalVersionedWebappPath,
  pickCanonicalWebappVersion
};
