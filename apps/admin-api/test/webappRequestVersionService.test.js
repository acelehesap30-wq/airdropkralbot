const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCanonicalVersionedWebappPath } = require("../src/services/webapp/webappRequestVersionService");

test("buildCanonicalVersionedWebappPath adds current version when missing", () => {
  const next = buildCanonicalVersionedWebappPath("/webapp?uid=1&route_key=hub", "abc123");
  assert.equal(next, "/webapp?uid=1&route_key=hub&v=abc123");
});

test("buildCanonicalVersionedWebappPath replaces stale version but keeps auth and launch params", () => {
  const next = buildCanonicalVersionedWebappPath(
    "/webapp?uid=1&ts=2&sig=3&route_key=vault&panel_key=payout&focus_key=request&v=oldrev",
    "newrev"
  );
  assert.equal(next, "/webapp?uid=1&ts=2&sig=3&route_key=vault&panel_key=payout&focus_key=request&v=newrev");
});

test("buildCanonicalVersionedWebappPath refreshes signed auth while keeping launch params", () => {
  const next = buildCanonicalVersionedWebappPath(
    "/webapp?uid=1&ts=old&sig=oldsig&route_key=hub&startapp=hub&v=oldrev",
    "newrev",
    { uid: "77", ts: "88", sig: "99" }
  );
  assert.equal(next, "/webapp?uid=77&ts=88&sig=99&route_key=hub&startapp=hub&v=newrev");
});
