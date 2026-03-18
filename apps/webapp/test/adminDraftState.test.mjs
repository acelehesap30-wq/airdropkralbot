import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadModule() {
  const target = pathToFileURL(
    path.join(process.cwd(), "apps", "webapp", "src", "core", "admin", "adminDraftState.js")
  ).href;
  return import(target);
}

test("preserveExistingDraft uses incoming draft when current draft is empty or placeholder", async () => {
  const mod = await loadModule();

  assert.equal(mod.preserveExistingDraft('{"next":true}', "", ["", "{}"]), '{"next":true}');
  assert.equal(mod.preserveExistingDraft('{"next":true}', "{}", ["", "{}"]), '{"next":true}');
  assert.equal(mod.preserveExistingDraft('[1,2,3]', "[]", ["", "[]"]), "[1,2,3]");
});

test("preserveExistingDraft keeps unsaved local draft when current draft is non-placeholder", async () => {
  const mod = await loadModule();

  assert.equal(
    mod.preserveExistingDraft('{"server":true}', '{"local":true}', ["", "{}"]),
    '{"local":true}'
  );
  assert.equal(
    mod.preserveExistingDraft("[1,2,3]", '[{"local":true}]', ["", "[]"]),
    '[{"local":true}]'
  );
});

