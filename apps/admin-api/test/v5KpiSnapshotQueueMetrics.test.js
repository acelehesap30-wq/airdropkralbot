const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadSnapshotModule() {
  const target = pathToFileURL(path.join(process.cwd(), "scripts", "v5_kpi_snapshot.mjs")).href;
  return import(target);
}

test("normalizeQueueActionStats maps completed/failed/queued counters", async () => {
  const snapshot = await loadSnapshotModule();
  const out = snapshot.normalizeQueueActionStats({
    total_events: "10",
    success_events: "6",
    non_ok_events: "4",
    completed_events: "5",
    failed_events: "3",
    queued_events: "1",
    ok_events: "1"
  });
  assert.deepEqual(out, {
    total_events: 10,
    success_events: 6,
    non_ok_events: 4,
    completed_events: 5,
    failed_events: 3,
    queued_events: 1,
    ok_events: 1
  });
});

test("normalizeQueueFailureReasons returns deterministic reason rows", async () => {
  const snapshot = await loadSnapshotModule();
  const rows = snapshot.normalizeQueueFailureReasons([
    { reason: "admin_cooldown_active", event_count: "4" },
    { reason: "", event_count: "1" }
  ]);
  assert.deepEqual(rows, [
    { reason: "admin_cooldown_active", event_count: 4 },
    { reason: "unknown", event_count: 1 }
  ]);
});
