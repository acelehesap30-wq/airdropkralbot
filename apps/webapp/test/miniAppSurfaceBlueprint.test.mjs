import test from "node:test";
import assert from "node:assert/strict";

async function load() {
  return import(new URL("../src/architecture/miniAppSurfaceBlueprint.js", import.meta.url));
}

test("miniapp surface blueprint exposes required decision and architecture sections", async () => {
  const mod = await load();
  assert.ok(mod.MINIAPP_SURFACE_NON_NEGOTIABLES.length >= 8);
  assert.ok(mod.MINIAPP_SURFACE_REJECTED_ALTERNATIVES.length >= 5);
  assert.ok(mod.MINIAPP_SURFACE_IMPLEMENTATION_RISKS.length >= 6);
  assert.ok(mod.MINIAPP_SURFACE_MVP_SUBSET.runtime.length >= 3);
  assert.ok(mod.MINIAPP_SURFACE_SCALE_READY_SUBSET.runtime.length >= 3);
  assert.ok(mod.MINIAPP_SURFACE_RESOLVED_QUESTIONS.length >= 5);
  assert.equal(mod.FRONTEND_ARCHITECTURE.target_stack.framework, "Next.js App Router");
  assert.equal(mod.FRONTEND_ARCHITECTURE.target_stack.renderer, "Babylon.js");
  assert.ok(mod.RENDERING_STRATEGY.quality_profiles.length >= 3);
  assert.ok(mod.WORLD_DISTRICTS.length >= 8);
  assert.ok(mod.GAMEPLAY_INTERACTION_SPEC.mechanics_catalog.length >= 8);
  assert.ok(mod.PERFORMANCE_QUALITY_PLAN.techniques.length >= 6);
  assert.ok(mod.MINIAPP_INFORMATION_ARCHITECTURE.primary_routes.length >= 7);
  assert.ok(mod.MULTILINGUAL_UX_ARCHITECTURE.locale_precedence.length >= 3);
  assert.ok(mod.TELEGRAM_NATIVE_INTEGRATION.launch_behavior.length >= 3);
  assert.ok(mod.BUILD_PHASES_QUALITY_GATES.phases.length >= 4);
  assert.ok(mod.ENGINEERING_HANDOFF_CHECKLIST.length >= 15);
});

test("district map covers mandatory world zones", async () => {
  const mod = await load();
  for (const key of [
    "central_hub",
    "mission_quarter",
    "loot_forge",
    "exchange_district",
    "season_hall",
    "elite_district",
    "live_event_overlay",
    "social_monuments"
  ]) {
    const row = mod.getDistrictSpec(key);
    assert.ok(row, `missing district ${key}`);
    assert.ok(String(row.visual_language || "").length > 10);
    assert.ok(String(row.interaction_purpose || "").length > 5);
    assert.ok(String(row.perf_budget || "").includes("draw calls"));
  }
});

test("target architecture explicitly separates current reality from target stack", async () => {
  const mod = await load();
  assert.equal(mod.FRONTEND_ARCHITECTURE.current_runtime_reality.framework, "Vite + React 18");
  assert.equal(mod.FRONTEND_ARCHITECTURE.current_runtime_reality.renderer, "Three.js");
  assert.ok(mod.FRONTEND_ARCHITECTURE.scene_shell_sync.some((item) => item.includes("scene bridge")));
  assert.ok(mod.RENDERING_STRATEGY.scene_isolation.some((item) => item.includes("HUD never queries Babylon")));
});

test("performance and Telegram constraints remain explicit", async () => {
  const mod = await load();
  const budgets = mod.PERFORMANCE_QUALITY_PLAN.budgets;
  assert.ok(budgets.first_meaningful_paint_ms <= 1500);
  assert.ok(budgets.first_interactive_ms <= 2500);
  assert.ok(budgets.low_end_draw_calls <= 140);
  assert.ok(budgets.memory_budget_mb_low <= 256);
  assert.ok(mod.TELEGRAM_NATIVE_INTEGRATION.chrome_integration.some((item) => item.includes("BackButton")));
  assert.ok(mod.TELEGRAM_NATIVE_INTEGRATION.chrome_integration.some((item) => item.includes("safe-area")));
});

test("handoff checklist preserves migration and quality gates", async () => {
  const mod = await load();
  const joined = mod.ENGINEERING_HANDOFF_CHECKLIST.join(" ");
  assert.match(joined, /Next\.js App Router/i);
  assert.match(joined, /Babylon\.js/i);
  assert.match(joined, /TanStack Query/i);
  assert.match(joined, /low-end fallback/i);
  assert.match(joined, /Telegram webview/i);
});
