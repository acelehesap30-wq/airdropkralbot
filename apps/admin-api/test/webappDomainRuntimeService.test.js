const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deriveRootDomain,
  summarizeWebappDomainRuntime
} = require("../src/services/webapp/webappDomainRuntimeService");

test("deriveRootDomain keeps registrable suffix for simple hostnames", () => {
  assert.equal(deriveRootDomain("webapp.k99-exchange.xyz"), "k99-exchange.xyz");
  assert.equal(deriveRootDomain("localhost"), "localhost");
});

test("summarizeWebappDomainRuntime resolves ready contract when dns and https probes pass", async () => {
  const summary = await summarizeWebappDomainRuntime({
    publicUrl: "https://webapp.k99-exchange.xyz/webapp",
    runtimeGuardBaseUrl: "https://webapp.k99-exchange.xyz",
    resolver: {
      resolveCname: async () => ["airdropkral-admin.onrender.com"],
      resolve4: async () => ["216.24.57.7", "216.24.57.251"]
    },
    fetchImpl: async (url) => ({
      status: String(url).endsWith("/health") || String(url).endsWith("/webapp") ? 200 : 404
    })
  });

  assert.equal(summary.state_key, "ready");
  assert.equal(summary.contract_ready, true);
  assert.equal(summary.host, "webapp.k99-exchange.xyz");
  assert.equal(summary.root_domain, "k99-exchange.xyz");
  assert.equal(summary.runtime_guard_matches_host, true);
  assert.deepEqual(summary.cname_targets, ["airdropkral-admin.onrender.com"]);
  assert.deepEqual(summary.a_records, ["216.24.57.7", "216.24.57.251"]);
  assert.equal(summary.health_status_code, 200);
  assert.equal(summary.webapp_status_code, 200);
});

test("summarizeWebappDomainRuntime returns partial state when dns resolves but probes fail", async () => {
  const summary = await summarizeWebappDomainRuntime({
    publicUrl: "https://webapp.k99-exchange.xyz/webapp",
    runtimeGuardBaseUrl: "https://webapp.k99-exchange.xyz",
    resolver: {
      resolveCname: async () => ["airdropkral-admin.onrender.com"],
      resolve4: async () => []
    },
    fetchImpl: async () => {
      throw new Error("timeout");
    }
  });

  assert.equal(summary.state_key, "partial");
  assert.equal(summary.contract_ready, false);
  assert.equal(summary.dns_ready, true);
  assert.equal(summary.health_ok, false);
  assert.equal(summary.webapp_ok, false);
  assert.match(summary.health_error, /timeout/i);
});
