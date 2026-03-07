export const MINIAPP_SURFACE_NON_NEGOTIABLES = Object.freeze([
  "Target runtime is Next.js App Router plus Babylon.js, not a long-term Vite monolith.",
  "The Mini App stays mobile-first and Telegram-webview-first; desktop is secondary polish, not the primary constraint.",
  "3D world runtime and app shell runtime are isolated by an explicit scene bridge and typed event bus.",
  "Server state uses TanStack Query; transient UI state and scene state stay local and domain-scoped.",
  "All scene-facing content and labels enter through key-based localization payloads, never raw inline copy from random components.",
  "Quality adaptation is automatic from runtime capability profiling; users may upgrade manually but never above safe guardrails.",
  "The default player path is low-friction: one hub, one primary objective, one visible reward path, no menu maze.",
  "Any low-end or motion-sensitive device must get a graceful 2.5D or reduced-effects fallback instead of crashing or stalling.",
  "Telegram chat and Mini App must share one routing language via startapp zone keys and resume context.",
  "No district or effect ships without explicit CPU, GPU, memory and bundle budgets."
]);

export const MINIAPP_SURFACE_REJECTED_ALTERNATIVES = Object.freeze([
  { key: "stay_on_vite_three_forever", why: "The current Vite plus Three shell is valid for transition, but it is not the best long-term platform for SSR, locale hydration and Telegram-native route recovery." },
  { key: "single_runtime_global_store_for_everything", why: "Scene ticks, UI overlays, wallet flows and content publishing need different latency and hydration rules." },
  { key: "pure_canvas_ui", why: "Accessibility, localization, safe-area handling and wallet UX are all worse when the entire interface lives inside the renderer." },
  { key: "free_roam_joystick_navigation", why: "Telegram sessions are short and vertical; tap-first navigation is clearer and lower-friction." },
  { key: "full_scene_load_at_boot", why: "District bundles must stream progressively or low-end webviews will fail before first value." },
  { key: "one_quality_mode_for_all_devices", why: "Telegram webview hardware varies too much for a fixed render profile." }
]);

export const MINIAPP_SURFACE_IMPLEMENTATION_RISKS = Object.freeze([
  { key: "framework_migration_cost", severity: "high" },
  { key: "scene_ui_sync_drift", severity: "critical" },
  { key: "telegram_webview_memory_ceiling", severity: "critical" },
  { key: "bundle_fragmentation_without_asset_registry", severity: "high" },
  { key: "localized_text_overflow_inside_scene", severity: "medium" },
  { key: "capability_detection_false_positives", severity: "high" },
  { key: "background_resume_scene_corruption", severity: "high" },
  { key: "wallet_modal_plus_scene_focus_conflicts", severity: "medium" }
]);

export const MINIAPP_SURFACE_MVP_SUBSET = Object.freeze({
  runtime: Object.freeze(["Next.js app shell skeleton", "Babylon hub scene only", "TanStack Query", "SSR locale bootstrap"]),
  districts: Object.freeze(["central_hub", "mission_quarter", "loot_forge", "exchange_district"]),
  interaction: Object.freeze(["tap_to_travel", "guided onboarding overlay", "objective tracker", "zone map", "wallet drawer", "payout drawer"]),
  fallback: Object.freeze(["reduced effects mode", "low-end static skybox mode", "scene pause and resume recovery"]),
  telegram: Object.freeze(["startapp zone routing", "BackButton integration", "safe area handling", "share bridge"]) 
});

export const MINIAPP_SURFACE_SCALE_READY_SUBSET = Object.freeze({
  runtime: Object.freeze(["district streaming", "RSC-driven content payloads", "edge asset manifests", "Babylon worker-backed loading pipeline"]),
  districts: Object.freeze(["season_hall", "elite_district", "live_event_overlay", "social_monuments"]),
  interaction: Object.freeze(["NPC conversation layer", "microgames", "challenge chains", "async competition monuments", "premium pass pavilion"]),
  fallback: Object.freeze(["2.5D district cards mode", "battery saver profile", "dynamic particle suppression", "crash-safe restore"]),
  telegram: Object.freeze(["fullscreen recommendation flow", "current-chat share templates", "home-screen shortcut prompt"]) 
});

export const MINIAPP_SURFACE_RESOLVED_QUESTIONS = Object.freeze([
  { key: "framework_choice", resolution: "Target architecture is Next.js App Router, while current Vite plus React shell is the transition runtime only." },
  { key: "3d_engine_choice", resolution: "Babylon.js wins for district-based world management, inspector maturity, mobile rendering controls and scene tooling." },
  { key: "navigation_model", resolution: "Tap-first travel with fast travel anchors is primary; free movement is never required." },
  { key: "hud_density", resolution: "Default HUD is sparse; advanced telemetry and economy detail open progressively." },
  { key: "locale_delivery", resolution: "Server delivers typed locale bundles for shell and scene labels together, keyed by zone and content bundle version." },
  { key: "low_end_strategy", resolution: "Low-end devices get reduced-effects or 2.5D fallback instead of degraded full 3D overload." }
]);

export const FRONTEND_ARCHITECTURE = Object.freeze({
  current_runtime_reality: Object.freeze({ framework: "Vite + React 18", state: "Redux Toolkit", renderer: "Three.js", note: "transition baseline only" }),
  target_stack: Object.freeze({ framework: "Next.js App Router", language: "TypeScript", renderer: "Babylon.js", server_state: "TanStack Query", validation: "Zod schemas", delivery: "edge-friendly asset CDN plus manifest routing", localization: "SSR plus client-integrated locale bundles" }),
  why_not_simpler: Object.freeze([
    "App Router gives server-rendered locale-safe shells and startapp route hydration that a pure client Vite shell handles less elegantly.",
    "Babylon.js offers stronger scene graph tooling, asset containers, mobile profiling controls and district streaming ergonomics than a raw Three.js app layer.",
    "TanStack Query gives explicit cache lifetimes, invalidation and suspense-friendly boundaries without forcing all server state into one global store.",
    "Typed API validation is required because Mini App, chat deep links, Web3 flows and admin-fed content all meet in the same surface."
  ]),
  package_boundaries: Object.freeze([
    "apps/miniapp-shell for Next.js shell and route composition",
    "packages/ui for tokens, HUD, cards and Telegram-safe layout primitives",
    "packages/scene for Babylon scene runtime, district loaders and scene bridge",
    "packages/contracts for zod schemas and typed API clients",
    "packages/i18n for locale bundles and formatters"
  ]),
  client_boundaries: Object.freeze([
    "RSC for shell layout, locale payloads, static content manifests and low-volatility read data",
    "client components for HUD, scene canvas host, Web3 drawers, live timers and optimistic interactions",
    "scene runtime never imports shell route internals directly"
  ]),
  scene_shell_sync: Object.freeze([
    "scene bridge emits typed events: zone_focus_changed, interactable_focused, camera_state_changed, performance_profile_changed",
    "shell emits typed commands: route_to_zone, open_surface, set_objective, set_quality_profile, focus_entity",
    "TanStack Query invalidation triggers HUD refresh, not renderer mutation directly",
    "renderer state is local to scene package and mirrored to overlay through a read-only adapter"
  ])
});

export const RENDERING_STRATEGY = Object.freeze({
  scene_isolation: Object.freeze([
    "Babylon engine host lives in a single client boundary mounted under app/world/[zone] shell route",
    "Districts are asset-container modules loaded on demand",
    "HUD never queries Babylon scene objects directly; it uses scene bridge selectors",
    "Web3 modals, payout flows and support drawers pause high-cost scene loops during foreground interaction"
  ]),
  loading_segmentation: Object.freeze([
    "shell first: SSR top bar, route chrome, locale bundle, safe-area frame",
    "hub bootstrap second: lightweight navigation district with no heavy combat or exchange shaders",
    "district container third: stream geometry, materials, audio and FX in independent chunks",
    "overlay detail last: monuments, crowd FX, premium flourishes and ambient extras"
  ]),
  multilingual_entry: Object.freeze([
    "scene labels use content keys mapped to locale bundle ids",
    "dynamic 3D labels render from sanitized text atlas inputs or signed bitmap text assets",
    "long text never blocks scene bootstrap; it swaps in after locale bundle ready",
    "RTL uses mirrored label containers instead of in-shader string hacks"
  ]),
  quality_profiles: Object.freeze([
    { key: "safe_low", target_fps: 30, shadows: "baked_only", post_fx: "off", particles: "minimal" },
    { key: "balanced", target_fps: 45, shadows: "single_main_light", post_fx: "light", particles: "limited" },
    { key: "immersive_high", target_fps: 60, shadows: "selective_dynamic", post_fx: "full", particles: "district_gated" }
  ])
});

export const APP_SHELL_UI_SYSTEM = Object.freeze({
  layout: Object.freeze([
    "safe-area aware frame with top meta bar, center scene host and bottom action rail",
    "compact mode for short sessions and immersive mode for district exploration",
    "HUD cards slide over the scene instead of hard route replacements where possible"
  ]),
  loading_choreography: Object.freeze([
    "phase_1 SSR shell shimmer under 300ms",
    "phase_2 scene portal reveal with district crest",
    "phase_3 interactable highlights and objective pulse",
    "phase_4 ambient animation unlock only after input-ready"
  ]),
  skeletons: Object.freeze([
    "server-fed cards use true content skeletons",
    "world scene uses branded district silhouette placeholders",
    "wallet and payout panels use deterministic field skeletons, never fake balances"
  ]),
  overlay_system: Object.freeze([
    "top status strip for identity, season, wallet pulse",
    "left objective stack for current tasks and event countdowns",
    "bottom action dock for zone travel and quick actions",
    "right contextual drawer for details, inventory, rankings and support"
  ]),
  feedback: Object.freeze([
    "toast bus with success, info, warning and trust states",
    "inline CTA resolution for mission and payout actions",
    "Telegram main button mirrors only one critical next step at a time"
  ]),
  typography: Object.freeze({ heading: "Oswald", body: "Manrope", mono: "IBM Plex Mono" }),
  tokens: Object.freeze({
    color_modes: ["neon_steel", "sunset_gold_alert", "frosted_safe", "risk_red_restrained"],
    density_modes: ["compact", "standard", "expanded"],
    motion_modes: ["full", "reduced", "minimal"]
  })
});

export const WORLD_DISTRICTS = Object.freeze([
  {
    key: "central_hub",
    visual_language: "clean neon plaza, suspended holo rails, calm sky dome",
    interaction_purpose: "entry, orientation, next best action",
    economy_purpose: "balance teaser and reward pulse",
    status_purpose: "player identity and kingdom standing",
    event_compatibility: "global event overlays and banners",
    localization: "short labels only, no paragraph text in scene",
    accessibility: "highest contrast district, reduced camera motion baseline",
    perf_budget: "<= 140 draw calls, <= 70MB gpu memory"
  },
  {
    key: "mission_quarter",
    visual_language: "industrial terminals, route beacons, procedural contract walls",
    interaction_purpose: "task pickup, mission progress, guided onboarding",
    economy_purpose: "labor loop, SC and RC sinks and sources",
    status_purpose: "daily streak and assignment readiness",
    event_compatibility: "partner contracts and region-targeted mission overlays",
    localization: "terminal cards support variable text length",
    accessibility: "large tap targets on terminals",
    perf_budget: "<= 160 draw calls, <= 80MB gpu memory"
  },
  {
    key: "loot_forge",
    visual_language: "molten glass chambers, reveal pedestals, restrained particle heat",
    interaction_purpose: "chest opening and reveal rituals",
    economy_purpose: "loot claim, pity visibility, cosmetic preview",
    status_purpose: "recent rare drops and inventory glow",
    event_compatibility: "event-bound chest skins and reveal pools",
    localization: "rarity labels and short reward lines only",
    accessibility: "flash-safe reveal mode required",
    perf_budget: "<= 180 draw calls, <= 90MB gpu memory"
  },
  {
    key: "exchange_district",
    visual_language: "precision market hall, data ribbons, trust-blue lighting",
    interaction_purpose: "token quote, buy intent, route status, upgrades",
    economy_purpose: "NXT access, wallet and monetization gateways",
    status_purpose: "quote freshness and route health",
    event_compatibility: "campaign pricing and premium sales kiosks",
    localization: "numeric formatting and trust copy dominate",
    accessibility: "wallet flows must be fully operable without scene motion",
    perf_budget: "<= 150 draw calls, <= 75MB gpu memory"
  },
  {
    key: "season_hall",
    visual_language: "cathedral scale scoreboards, prestige beams, ceremonial pacing",
    interaction_purpose: "season standings, milestones, league overview",
    economy_purpose: "season-bound sink and reward outlook",
    status_purpose: "rank, streak, weekly ladder and arc boss progress",
    event_compatibility: "season finale and deadline overlays",
    localization: "rank labels and milestone copy support wide strings",
    accessibility: "text-first fallback card view required",
    perf_budget: "<= 170 draw calls, <= 85MB gpu memory"
  },
  {
    key: "elite_district",
    visual_language: "dark glass, controlled red hazard, high-contrast gate geometry",
    interaction_purpose: "high-risk challenges, premium gates, advanced loops",
    economy_purpose: "HC sinks, elite pass surfaces, gated reward multipliers",
    status_purpose: "prestige display and challenge eligibility",
    event_compatibility: "limited-time elite anomaly gates",
    localization: "warning language must remain concise and non-panic",
    accessibility: "forced reduced effect option on entry",
    perf_budget: "<= 165 draw calls, <= 80MB gpu memory"
  },
  {
    key: "live_event_overlay",
    visual_language: "district-specific takeover layer, banner meshes, timed sky changes",
    interaction_purpose: "event urgency and redirection without full route rewrite",
    economy_purpose: "campaign-linked rewards and temporary shops",
    status_purpose: "countdowns and event participation state",
    event_compatibility: "core overlay system itself",
    localization: "event names and countdowns are locale-driven assets",
    accessibility: "overlay can be disabled independently from base district",
    perf_budget: "<= +25 draw calls on top of base district"
  },
  {
    key: "social_monuments",
    visual_language: "animated statues, holographic leader columns, kingdom emblems",
    interaction_purpose: "leaderboards, kingdom identity, async competition",
    economy_purpose: "social prestige more than direct spending",
    status_purpose: "player rank teaser and kingdom monument state",
    event_compatibility: "war and leaderboard event wraps",
    localization: "player names clipped safely, rank text localized",
    accessibility: "all info mirrored in list drawer",
    perf_budget: "<= 145 draw calls, <= 72MB gpu memory"
  }
]);

export const GAMEPLAY_INTERACTION_SPEC = Object.freeze({
  movement: Object.freeze([
    "tap-to-travel on district anchors and interactables",
    "double-tap for fast-travel when zone unlocked",
    "no mandatory joystick for core progression",
    "camera auto-aligns to destination and stops before overshoot"
  ]),
  camera: Object.freeze([
    "portrait-first framing with upper safe-area reserved for Telegram chrome",
    "soft follow on movement, no free spin by default",
    "interaction zooms are 400-700ms and cancel-safe",
    "background resume restores last stable camera bookmark"
  ]),
  mechanics_catalog: Object.freeze([
    "mission terminals",
    "NPC interactions",
    "timed hold interactions",
    "microgames",
    "loot chamber reveals",
    "prestige display surfaces",
    "event gates",
    "challenge chains",
    "asynchronous competition monuments",
    "daily weekly progression boards"
  ]),
  onboarding: Object.freeze([
    "minute-zero overlay points to one terminal and one reward path",
    "objective tracker always shows next safe action",
    "onboarding can be skipped but resumed from hub",
    "teach one mechanic per district, never the full system at once"
  ]),
  interruption_safety: Object.freeze([
    "scene freezes on wallet modal or Telegram background",
    "input queue clears on resume if stale",
    "player returns to last unlocked district bookmark",
    "mission or payout drawers reopen from saved resume context if still valid"
  ])
});

export const PERFORMANCE_QUALITY_PLAN = Object.freeze({
  budgets: Object.freeze({
    first_meaningful_paint_ms: 1200,
    first_interactive_ms: 2200,
    app_shell_gzip_kb: 220,
    scene_runtime_gzip_kb: 650,
    district_bundle_gzip_kb: 900,
    low_end_draw_calls: 120,
    balanced_draw_calls: 170,
    high_end_draw_calls: 230,
    texture_budget_mb_low: 32,
    texture_budget_mb_balanced: 64,
    texture_budget_mb_high: 96,
    memory_budget_mb_low: 220,
    memory_budget_mb_balanced: 320,
    memory_budget_mb_high: 440,
    particle_budget_low: 200,
    particle_budget_balanced: 800,
    particle_budget_high: 1800
  }),
  techniques: Object.freeze([
    "LOD meshes per district",
    "thin instancing for repeated props",
    "texture atlases for signage and props",
    "baked lighting first, selective dynamic lights only",
    "occlusion and frustum culling mandatory",
    "audio banks streamed by district",
    "mesh merge for static architecture, separate nodes for interactables",
    "post-processing only on balanced and above"
  ]),
  capability_detection: Object.freeze([
    "boot collects memory hint, device pixel ratio, viewport size, UA class and previous fps profile",
    "first 3 seconds of hub scene calibrate GPU and CPU pressure",
    "quality profile clamps upward only after stable frame budget",
    "battery saver or thermal signals force downgrade"
  ]),
  low_end_fallback: Object.freeze([
    "replace dynamic sky and volumetrics with static gradient dome",
    "switch monuments to billboard cards",
    "disable shadows and particles",
    "collapse crowd ambience to audio only",
    "replace district traversal animation with instant fades"
  ]),
  telemetry: Object.freeze([
    "frame_time_p95",
    "district_load_ms",
    "memory_pressure_flag",
    "quality_profile_switch_count",
    "resume_recovery_count",
    "webgl_context_loss_count"
  ])
});

export const MINIAPP_INFORMATION_ARCHITECTURE = Object.freeze({
  primary_routes: Object.freeze([
    { route: "hub", reaches: ["world_hub", "next_best_action", "season_teaser"] },
    { route: "missions", reaches: ["mission_quarter", "objective_tracker", "assignment_drawer"] },
    { route: "forge", reaches: ["chest_opening", "inventory_recent", "loot_reveal"] },
    { route: "exchange", reaches: ["wallet", "web3", "premium_pass", "upgrades"] },
    { route: "season", reaches: ["rankings", "season_hall", "kingdom", "weekly_progress"] },
    { route: "events", reaches: ["live_event_overlay", "event_gates", "campaign_details"] },
    { route: "vault", reaches: ["payout_request", "wallet_section", "token_route_status"] },
    { route: "settings", reaches: ["language", "accessibility", "support"] }
  ]),
  short_session_design: Object.freeze([
    "one-thumb bottom rail",
    "hub always returns to one clear action",
    "zone map reachable in one tap",
    "wallet and payout kept in drawers not deep menus"
  ]),
  deep_session_design: Object.freeze([
    "district chaining without route reload",
    "drawer stack remembers context",
    "season and event overlays can layer over district scene",
    "advanced stats hidden behind detail toggles"
  ])
});

export const MULTILINGUAL_UX_ARCHITECTURE = Object.freeze({
  locale_precedence: Object.freeze(["stored_override", "telegram_language_code", "server profile locale", "default_tr"]),
  delivery: Object.freeze([
    "SSR route loads locale bundle and content bundle manifest together",
    "client receives same locale token for HUD and scene labels",
    "numbers and dates format through shared Intl wrapper",
    "fallback locale chain is explicit per content bundle"
  ]),
  scene_text_rules: Object.freeze([
    "3D labels limited to short nouns and counts",
    "terminal narrative lives in 2D drawer cards",
    "fonts use Latin-first headline set plus robust fallback for TR and EN",
    "RTL-ready container logic is planned even if launch locales are TR and EN only"
  ]),
  testing_rules: Object.freeze([
    "TR and EN screenshot baselines per district",
    "long-string stress test on mission quarter and season hall",
    "numeric and countdown format tests",
    "locale fallback event when translation missing"
  ])
});

export const TELEGRAM_NATIVE_INTEGRATION = Object.freeze({
  launch_behavior: Object.freeze([
    "chat startapp params map to typed zone keys",
    "hub is the safe fallback when zone param invalid",
    "Telegram ready and expand fire after shell is stable, not before"
  ]),
  chrome_integration: Object.freeze([
    "BackButton pops drawer, then district, then exits to chat",
    "MainButton mirrors one next-best action only",
    "safe-area insets drive shell padding and camera top dead-zone",
    "fullscreen recommendation appears after first successful interaction, not at cold boot"
  ]),
  sharing_and_resume: Object.freeze([
    "share actions generate localized short copy plus startapp zone param",
    "resume from Telegram reopen restores route, district bookmark and drawer if valid",
    "current-chat context affects share copy only, not gameplay eligibility"
  ]),
  monetization_touchpoints: Object.freeze([
    "Telegram Stars may sell premium passes or cosmetics only if policy and region allow",
    "Stars surface never replaces wallet or payout trust flows",
    "subscriptions map to premium entitlements through backend receipts"
  ])
});

export const BUILD_PHASES_QUALITY_GATES = Object.freeze({
  phases: Object.freeze([
    { phase: "phase_1_shell_platform", scope: ["Next.js shell", "locale SSR", "Telegram integration adapters", "scene bridge contract"] },
    { phase: "phase_2_hub_and_core_districts", scope: ["hub", "mission quarter", "loot forge", "exchange district"] },
    { phase: "phase_3_quality_and_fallbacks", scope: ["device profiling", "quality profiles", "2.5D fallback", "resume safety"] },
    { phase: "phase_4_scale_districts", scope: ["season hall", "elite district", "social monuments", "event overlays"] },
    { phase: "phase_5_hardening", scope: ["perf telemetry", "bundle gating", "crash recovery", "accessibility certification"] }
  ]),
  gates: Object.freeze([
    "no district exceeds bundle or draw-call budget",
    "no wallet or payout flow blocks on scene readiness",
    "TR and EN must pass screenshot and overflow checks",
    "low-end profile must reach stable 30fps in hub",
    "balanced profile must reach 45fps in all core districts",
    "context loss and resume smoke tests pass inside Telegram webview",
    "all startapp routes recover to a valid zone",
    "motion-reduced mode removes non-essential camera and particle effects"
  ])
});

export const ENGINEERING_HANDOFF_CHECKLIST = Object.freeze([
  "Stand up a new Next.js App Router workspace for the Mini App shell without deleting the current Vite shell on day one.",
  "Create packages for scene runtime, UI kit, contracts and i18n before moving district code.",
  "Adopt Babylon.js as the target renderer and keep existing Three.js runtime only as migration baseline.",
  "Define the scene bridge event contract before district implementation starts.",
  "Move API access from RTK Query monolith to TanStack Query in the target shell, keeping schema validation with Zod.",
  "Build SSR locale bootstrap and ensure client hydration receives the same locale and content bundle versions.",
  "Implement typed startapp route parsing with safe hub fallback.",
  "Ship central hub first and use it to calibrate quality profiles and resume behavior.",
  "Treat mission quarter, loot forge and exchange district as the first production districts.",
  "Create district asset manifests and hard budgets before art production scales.",
  "Implement reduced-effects and low-end fallback modes before elite district work starts.",
  "Pause or downshift the scene during wallet, payout and support drawers.",
  "Keep all long-form text in 2D overlay surfaces; scene labels stay short and localized by key.",
  "Record performance telemetry per district and quality profile from the first beta build.",
  "Add Telegram BackButton, MainButton, fullscreen and safe-area adapters as shared shell primitives.",
  "Require resume and background recovery tests inside the Telegram webview, not only desktop browsers.",
  "Block ship if any district breaks memory, bundle or draw-call budgets.",
  "Block ship if low-end fallback does not remain usable on Telegram mid-tier Android.",
  "Do not cut chat to Mini App routing until zone keys, resume state and invalid-param fallback are stable.",
  "Preserve accessibility toggles across shell, HUD and scene runtime through one capability and preference contract."
]);

export function getDistrictSpec(key) {
  return WORLD_DISTRICTS.find((item) => item.key === String(key || "").trim().toLowerCase()) || null;
}

export function getStateQuestion(key) {
  return MINIAPP_SURFACE_RESOLVED_QUESTIONS.find((item) => item.key === String(key || "").trim().toLowerCase()) || null;
}
