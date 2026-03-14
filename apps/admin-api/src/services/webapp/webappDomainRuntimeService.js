const dns = require("node:dns");

function readText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function deriveRootDomain(host) {
  const normalized = readText(host).toLowerCase();
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length < 2) {
    return normalized;
  }
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

async function probeUrl(url, fetchImpl = globalThis.fetch, timeoutMs = 12000) {
  if (!readText(url) || typeof fetchImpl !== "function") {
    return {
      ok: false,
      status_code: 0,
      error: "fetch_unavailable"
    };
  }
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId =
    controller && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller?.signal
    });
    return {
      ok: Number(res?.status || 0) >= 200 && Number(res?.status || 0) < 400,
      status_code: Number(res?.status || 0),
      error: ""
    };
  } catch (error) {
    return {
      ok: false,
      status_code: 0,
      error: readText(error?.message, "request_failed")
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function summarizeWebappDomainRuntime({
  publicUrl = "",
  runtimeGuardBaseUrl = "",
  resolver = dns.promises,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000
} = {}) {
  const publicUrlText = readText(publicUrl);
  const runtimeGuardText = readText(runtimeGuardBaseUrl);
  let parsedPublicUrl = null;
  let parsedRuntimeGuardUrl = null;

  try {
    parsedPublicUrl = publicUrlText ? new URL(publicUrlText) : null;
  } catch {
    parsedPublicUrl = null;
  }
  try {
    parsedRuntimeGuardUrl = runtimeGuardText ? new URL(runtimeGuardText) : null;
  } catch {
    parsedRuntimeGuardUrl = null;
  }

  const host = readText(parsedPublicUrl?.host);
  const baseOrigin = readText(parsedPublicUrl?.origin);
  const rootDomain = deriveRootDomain(host);
  const webappPath = readText(parsedPublicUrl?.pathname, "/webapp");
  const runtimeGuardHost = readText(parsedRuntimeGuardUrl?.host);
  const runtimeGuardMatchesHost = Boolean(runtimeGuardHost && runtimeGuardHost === host);
  const httpsRequired = readText(parsedPublicUrl?.protocol) === "https:";

  let cnameTargets = [];
  let aRecords = [];
  if (host && resolver) {
    if (typeof resolver.resolveCname === "function") {
      try {
        cnameTargets = asArray(await resolver.resolveCname(host)).map((value) => readText(value)).filter(Boolean);
      } catch {
        cnameTargets = [];
      }
    }
    if (typeof resolver.resolve4 === "function") {
      try {
        aRecords = asArray(await resolver.resolve4(host)).map((value) => readText(value)).filter(Boolean);
      } catch {
        aRecords = [];
      }
    } else if (typeof resolver.lookup === "function") {
      try {
        const lookupRows = await resolver.lookup(host, { all: true });
        aRecords = asArray(lookupRows)
          .map((row) => readText(row?.address))
          .filter(Boolean);
      } catch {
        aRecords = [];
      }
    }
  }

  const healthUrl = baseOrigin ? `${baseOrigin}/health` : "";
  const webappUrl = baseOrigin ? `${baseOrigin}/webapp` : "";
  const healthProbe = await probeUrl(healthUrl, fetchImpl, timeoutMs);
  const webappProbe = await probeUrl(webappUrl, fetchImpl, timeoutMs);
  const dnsReady = cnameTargets.length > 0 || aRecords.length > 0;

  let stateKey = "missing";
  if (httpsRequired && dnsReady && healthProbe.ok && webappProbe.ok) {
    stateKey = "ready";
  } else if (publicUrlText && (dnsReady || healthProbe.ok || webappProbe.ok)) {
    stateKey = "partial";
  }

  return {
    public_url: publicUrlText,
    runtime_guard_base_url: runtimeGuardText,
    host,
    root_domain: rootDomain,
    webapp_path: webappPath,
    runtime_guard_host: runtimeGuardHost,
    runtime_guard_matches_host: runtimeGuardMatchesHost,
    https_required: httpsRequired,
    cname_targets: [...new Set(cnameTargets)],
    a_records: [...new Set(aRecords)],
    dns_ready: dnsReady,
    health_url: healthUrl,
    webapp_url: webappUrl,
    health_status_code: Number(healthProbe.status_code || 0),
    webapp_status_code: Number(webappProbe.status_code || 0),
    health_ok: Boolean(healthProbe.ok),
    webapp_ok: Boolean(webappProbe.ok),
    state_key: stateKey,
    contract_ready: stateKey === "ready",
    health_error: readText(healthProbe.error),
    webapp_error: readText(webappProbe.error)
  };
}

module.exports = {
  deriveRootDomain,
  probeUrl,
  summarizeWebappDomainRuntime
};
