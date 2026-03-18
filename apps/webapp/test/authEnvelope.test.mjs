import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadModule() {
  const target = pathToFileURL(
    path.join(process.cwd(), "apps", "webapp", "src", "core", "shared", "authEnvelope.js")
  ).href;
  return import(target);
}

test("withSignedAuthFields keeps signed auth over stale payload fields", async () => {
  const mod = await loadModule();

  const result = mod.withSignedAuthFields(
    { uid: "42", ts: "100", sig: "good_sig" },
    { uid: "9", ts: "1", sig: "bad_sig", action: "queue_pay" }
  );

  assert.deepEqual(result, {
    uid: "42",
    ts: "100",
    sig: "good_sig",
    action: "queue_pay"
  });
});

test("withSignedAuthFields ignores non-object payloads safely", async () => {
  const mod = await loadModule();

  const result = mod.withSignedAuthFields({ uid: "42", ts: "100", sig: "good_sig" }, null);

  assert.deepEqual(result, {
    uid: "42",
    ts: "100",
    sig: "good_sig"
  });
});
