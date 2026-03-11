import test from "node:test";
import assert from "node:assert/strict";

import { resolveLoopRailTone } from "../src/core/runtime/loopRailTone.js";

test("resolveLoopRailTone maps critical and pressure families to stronger gate rails", () => {
  assert.equal(resolveLoopRailTone("critical", "family"), "critical");
  assert.equal(resolveLoopRailTone("critical", "gate"), "critical");
  assert.equal(resolveLoopRailTone("critical", "response"), "balanced");
  assert.equal(resolveLoopRailTone("pressure", "family"), "pressure");
  assert.equal(resolveLoopRailTone("pressure", "flow"), "balanced");
  assert.equal(resolveLoopRailTone("pressure", "response"), "advantage");
});

test("resolveLoopRailTone softens neutral rails and boosts advantage cadence", () => {
  assert.equal(resolveLoopRailTone("neutral", "summary"), "balanced");
  assert.equal(resolveLoopRailTone("neutral", "pressure"), "pressure");
  assert.equal(resolveLoopRailTone("neutral", "attention"), "balanced");
  assert.equal(resolveLoopRailTone("advantage", "family"), "advantage");
  assert.equal(resolveLoopRailTone("advantage", "flow"), "safe");
  assert.equal(resolveLoopRailTone("advantage", "cadence"), "safe");
});
