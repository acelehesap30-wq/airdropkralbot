const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GLOBAL_OPS_NON_NEGOTIABLE_DECISIONS,
  GLOBAL_OPS_REJECTED_ALTERNATIVES,
  GLOBAL_OPS_IMPLEMENTATION_RISKS,
  GLOBAL_OPS_MVP_SUBSET,
  GLOBAL_OPS_SCALE_READY_SUBSET,
  GLOBAL_OPS_RESOLVED_QUESTIONS,
  GLOBAL_LOCALIZATION_ARCHITECTURE,
  OPERATIONAL_CONTENT_MODEL,
  LIVE_OPS_CONTROL_FRAMEWORK,
  ANALYTICS_KPI_FRAMEWORK,
  FRAUD_TRUST_OPERATIONS_MODEL,
  SUPPORT_MESSAGING_FRAMEWORK,
  EXPERIMENTATION_FRAMEWORK,
  ROLLOUT_GOVERNANCE_MODEL,
  EMERGENCY_RESPONSE_MODEL,
  GLOBAL_SCALE_READINESS_CHECKLIST,
  ENGINEERING_HANDOFF_CHECKLIST,
  getLocaleRolloutStage,
  getDashboardSpec,
  getEmergencyScenario
} = require("../src/architecture/globalOperatingSystemBlueprint");

test("global ops blueprint exposes required operating sections", () => {
  assert.ok(GLOBAL_OPS_NON_NEGOTIABLE_DECISIONS.length >= 8);
  assert.ok(GLOBAL_OPS_REJECTED_ALTERNATIVES.length >= 6);
  assert.ok(GLOBAL_OPS_IMPLEMENTATION_RISKS.length >= 6);
  assert.ok(GLOBAL_OPS_MVP_SUBSET.localization.length >= 4);
  assert.ok(GLOBAL_OPS_SCALE_READY_SUBSET.localization.length >= 4);
  assert.ok(GLOBAL_OPS_RESOLVED_QUESTIONS.length >= 5);
  assert.ok(GLOBAL_LOCALIZATION_ARCHITECTURE.locale_detection_precedence.length >= 4);
  assert.ok(OPERATIONAL_CONTENT_MODEL.content_units.length >= 6);
  assert.ok(LIVE_OPS_CONTROL_FRAMEWORK.targeting_axes.length >= 8);
  assert.ok(ANALYTICS_KPI_FRAMEWORK.dashboards.length >= 7);
  assert.ok(FRAUD_TRUST_OPERATIONS_MODEL.review_queues.length >= 5);
  assert.ok(SUPPORT_MESSAGING_FRAMEWORK.message_families.length >= 8);
  assert.ok(EXPERIMENTATION_FRAMEWORK.eligible_experiment_classes.length >= 6);
  assert.ok(ROLLOUT_GOVERNANCE_MODEL.release_gates.length >= 5);
  assert.ok(EMERGENCY_RESPONSE_MODEL.scenarios.length >= 5);
  assert.ok(GLOBAL_SCALE_READINESS_CHECKLIST.length >= 18);
  assert.ok(ENGINEERING_HANDOFF_CHECKLIST.length >= 20);
});

test("localization precedence and critical surface policy stay explicit", () => {
  assert.deepEqual(GLOBAL_LOCALIZATION_ARCHITECTURE.locale_detection_precedence.slice(0, 3), [
    "stored_user_override",
    "telegram_ui_language_code",
    "verified_profile_locale"
  ]);
  assert.ok(GLOBAL_LOCALIZATION_ARCHITECTURE.critical_surfaces.includes("payout_and_support_messaging"));
  assert.ok(GLOBAL_LOCALIZATION_ARCHITECTURE.fallback_chain_rules.includes("missing_key_emits_analytics_and_operator_alert"));
  assert.equal(getLocaleRolloutStage("pilot_5pct").audience, "small_cohort_in_target_locale");
});

test("analytics and live ops stay globally sliceable and guarded", () => {
  assert.ok(ANALYTICS_KPI_FRAMEWORK.canonical_dimensions.includes("locale"));
  assert.ok(ANALYTICS_KPI_FRAMEWORK.canonical_dimensions.includes("device_class"));
  assert.ok(ANALYTICS_KPI_FRAMEWORK.canonical_dimensions.includes("risk_band"));
  assert.equal(getDashboardSpec("localization_health").audience, "localization_ops");
  assert.ok(LIVE_OPS_CONTROL_FRAMEWORK.runtime_safeguards.includes("locale_readiness_gate"));
  assert.ok(LIVE_OPS_CONTROL_FRAMEWORK.rollback_controls.includes("event_disable_flag"));
});

test("fraud, support and experimentation rules protect trust surfaces", () => {
  assert.ok(FRAUD_TRUST_OPERATIONS_MODEL.false_positive_controls.includes("new_region_shadow_period"));
  assert.ok(FRAUD_TRUST_OPERATIONS_MODEL.payout_hold_policy.includes("shared_destination_hold"));
  assert.ok(SUPPORT_MESSAGING_FRAMEWORK.forbidden_language_patterns.includes("guaranteed_profit"));
  assert.ok(EXPERIMENTATION_FRAMEWORK.guardrails.includes("no_experiment_on_core_factual_payout_copy"));
  assert.ok(EXPERIMENTATION_FRAMEWORK.stopping_conditions.includes("payout_failure_or_support_contact_spike"));
});

test("emergency model and engineering handoff remain concrete", () => {
  const localeBreak = getEmergencyScenario("critical_locale_fallback_break");
  assert.ok(localeBreak);
  assert.ok(localeBreak.first_actions.includes("disable_locale_rollout"));
  const joined = ENGINEERING_HANDOFF_CHECKLIST.join(" ");
  assert.match(joined, /shared locale precedence resolver/i);
  assert.match(joined, /critical copy/i);
  assert.match(joined, /trust approver/i);
  assert.match(joined, /kill switches/i);
  assert.match(joined, /sev1 response templates/i);
});