"use strict";

const GLOBAL_OPS_NON_NEGOTIABLE_DECISIONS = Object.freeze([
  {
    key: "stored_locale_override_wins",
    decision: "Stored user locale override always wins over detected language.",
    why: "Trust drops fastest when the product ignores an explicit user choice."
  },
  {
    key: "critical_trust_copy_fully_localized",
    decision: "Payout, wallet, premium purchase, fraud review and support blocker copy must be fully localized before a locale can ship.",
    why: "Partial localization on trust surfaces looks unsafe, not unfinished."
  },
  {
    key: "key_based_content_only",
    decision: "All chat, Mini App, world-label and ops copy ships through versioned content keys and bundles.",
    why: "Free-form operator text breaks rollback, QA and analytics coherence."
  },
  {
    key: "locale_readiness_gate",
    decision: "No locale can enter general rollout without screenshot QA, fallback verification and trust-copy completion.",
    why: "Broken fallback chains become a product outage for that locale."
  },
  {
    key: "locale_and_segment_analytics_required",
    decision: "Every product KPI must be sliceable by locale, region, device class, experiment variant and risk segment.",
    why: "Global failures hide inside blended metrics."
  },
  {
    key: "live_ops_is_configuration_driven",
    decision: "Live-ops text, timing, targeting and scarcity controls must be operator-configurable without code deploys.",
    why: "Engineering cannot sit in the loop for every event tweak."
  },
  {
    key: "fraud_is_locale_aware_not_locale_biased",
    decision: "Fraud models may use locale-aware patterns, but enforcement cannot hard-code punitive region bias.",
    why: "Risk detection must stay explainable and defensible."
  },
  {
    key: "trust_and_revenue_experiments_guarded",
    decision: "Experiments may optimize conversion, but cannot weaken payout truth, safety copy or support clarity.",
    why: "Short-term uplift is not worth trust damage."
  },
  {
    key: "single_content_governance_chain",
    decision: "Chat, Mini App, 3D labels and support macros share one content governance chain with surface-specific constraints.",
    why: "Independent copy systems create drift and conflicting promises."
  }
]);

const GLOBAL_OPS_REJECTED_ALTERNATIVES = Object.freeze([
  {
    key: "telegram_language_only",
    why: "Telegram language code is useful, but it is not reliable enough to override explicit user choice or region-specific formatting."
  },
  {
    key: "engineering_managed_all_copy",
    why: "Binding every copy tweak to deploys would choke live-ops velocity and inflate release risk."
  },
  {
    key: "translation_after_feature_launch",
    why: "Shipping first and localizing later creates permanent trust debt in non-primary locales."
  },
  {
    key: "single_global_event_calendar",
    why: "Region-blind scheduling ignores cultural timing, payout windows and local attention cycles."
  },
  {
    key: "one_risk_policy_for_all_regions",
    why: "Abuse patterns vary by market and channel; one blunt policy either misses fraud or hurts normals."
  },
  {
    key: "experiments_on_critical_financial_copy",
    why: "Users should not see randomized truth semantics on payout and reserve-sensitive messages."
  },
  {
    key: "free_text_operator_broadcasts",
    why: "Ad hoc messaging without templates, approvals and localization gates invites inconsistency and compliance failures."
  }
]);

const GLOBAL_OPS_IMPLEMENTATION_RISKS = Object.freeze([
  { key: "fallback_chain_drift", severity: "critical" },
  { key: "stale_translation_bundle_publish", severity: "high" },
  { key: "locale_specific_kpi_blindspots", severity: "high" },
  { key: "operator_overreach_in_live_ops", severity: "high" },
  { key: "false_positive_risk_in_new_regions", severity: "high" },
  { key: "unbounded_experiment_matrix", severity: "medium" },
  { key: "support_macro_inconsistency", severity: "medium" },
  { key: "event_targeting_misfire", severity: "high" }
]);

const GLOBAL_OPS_MVP_SUBSET = Object.freeze({
  localization: Object.freeze([
    "tr and en fully governed",
    "stored locale override",
    "versioned command, chat, Mini App and payout copy",
    "fallback chain telemetry",
    "screenshot QA for trust surfaces"
  ]),
  live_ops: Object.freeze([
    "daily missions and seasonal events",
    "region-aware scheduling windows",
    "operator approval flow for event publish",
    "event disable kill switch"
  ]),
  analytics: Object.freeze([
    "locale/device/segment dashboards",
    "payout and wallet funnel by locale",
    "translation fallback error dashboard",
    "reactivation performance by locale"
  ]),
  trust: Object.freeze([
    "payout pending/approved/failed localized templates",
    "wallet connect failure templates",
    "fraud review neutral copy",
    "support macro catalog"
  ]),
  experimentation: Object.freeze([
    "localized onboarding copy variants",
    "reactivation timing tests",
    "premium conversion copy tests with trust guardrails"
  ])
});

const GLOBAL_OPS_SCALE_READY_SUBSET = Object.freeze({
  localization: Object.freeze([
    "staged locale rollout lanes",
    "per-locale screenshot automation",
    "world-label locale bundles",
    "RTL-ready shared primitives",
    "translation health scorecards"
  ]),
  live_ops: Object.freeze([
    "partner campaigns by region and chain",
    "scarcity windows with approval controls",
    "comeback campaigns by fatigue cohort",
    "automatic event blackout protection by locale quality state"
  ]),
  analytics: Object.freeze([
    "executive, live-ops, fraud, support and scene-performance dashboards",
    "revenue and liability by locale and risk segment",
    "content fatigue scoring by locale",
    "cross-surface funnel stitching across chat, Mini App and wallet events"
  ]),
  trust: Object.freeze([
    "locale-specific support playbooks",
    "fraud queue routing by language coverage",
    "translation abuse detection",
    "reserve-sensitive payout messaging guardrails"
  ]),
  experimentation: Object.freeze([
    "region-specific event timing tests",
    "chest reveal variants",
    "localized premium offer sequencing",
    "fraud-threshold shadow experiments with capped blast radius"
  ])
});

const GLOBAL_OPS_RESOLVED_QUESTIONS = Object.freeze([
  {
    key: "locale_precedence",
    resolution: "Stored override, then Telegram language code, then verified profile locale, then product default TR."
  },
  {
    key: "critical_copy_policy",
    resolution: "Critical trust and payout copy cannot fall back to English unless explicitly whitelisted during operator-only rollout."
  },
  {
    key: "event_regionalization",
    resolution: "All live events support region and locale targeting; no single universal schedule is assumed."
  },
  {
    key: "fraud_locale_usage",
    resolution: "Locale may inform anomaly models and staffing, but never acts as a blocking factor by itself."
  },
  {
    key: "content_ownership",
    resolution: "Content ops owns copy, localization ops owns quality, live-ops owns timing, engineering owns runtime contracts."
  },
  {
    key: "experimentation_scope",
    resolution: "Experiments are allowed on presentation and timing, not on factual payout semantics or safety disclosures."
  }
]);

const GLOBAL_LOCALIZATION_ARCHITECTURE = Object.freeze({
  locale_detection_precedence: Object.freeze([
    "stored_user_override",
    "telegram_ui_language_code",
    "verified_profile_locale",
    "region_default_language",
    "product_default_tr"
  ]),
  locale_model: Object.freeze([
    "language_and_region_are_distinct",
    "content_keys_are_surface_specific",
    "icu_pluralization_is_required",
    "intl_number_date_time_formatting_is_shared",
    "reward_amount_formatters_are_currency_aware",
    "rtl_layout_flags_exist_at_bundle_level"
  ]),
  translation_key_architecture: Object.freeze([
    "chat.command.*",
    "chat.card.*",
    "miniapp.ui.*",
    "miniapp.world_label.*",
    "event.announcement.*",
    "payout.status.*",
    "support.macro.*",
    "wallet.web3.*",
    "premium.offer.*"
  ]),
  critical_surfaces: Object.freeze([
    "telegram_command_labels",
    "chat_copy",
    "miniapp_ui_copy",
    "world_labels",
    "event_announcements",
    "payout_and_support_messaging",
    "wallet_interaction_copy",
    "premium_sales_copy"
  ]),
  per_surface_constraints: Object.freeze({
    telegram_command_label_max_chars: 16,
    inline_button_max_chars: 22,
    chat_status_card_max_lines: 8,
    miniapp_primary_cta_max_chars: 24,
    world_label_soft_max_chars: 18,
    support_macro_soft_max_chars: 280
  }),
  fallback_chain_rules: Object.freeze([
    "critical_trust_copy_requires_same_locale_or_region_fallback_before_global_default",
    "non_critical_marketing_copy_may_fallback_to_language_parent",
    "missing_key_emits_analytics_and_operator_alert",
    "operator_broadcasts_cannot_publish_with_missing_critical_keys"
  ]),
  screenshot_qa_workflow: Object.freeze([
    "capture_chat_cards",
    "capture_primary_miniapp_routes",
    "capture_payout_and_wallet_states",
    "capture_world_labels_and_overflows",
    "approve_before_locale_rollout"
  ]),
  locale_rollout_stages: Object.freeze([
    { key: "internal_only", audience: "ops_and_qa_only" },
    { key: "shadow_readiness", audience: "bundle_served_but_hidden_from_users" },
    { key: "pilot_5pct", audience: "small_cohort_in_target_locale" },
    { key: "managed_25pct", audience: "partial_locale_rollout_with_alerting" },
    { key: "general_100pct", audience: "fully_live_locale" }
  ]),
  health_dashboards: Object.freeze([
    "translation_coverage_by_surface",
    "fallback_rate_by_locale",
    "overflow_and_screenshot_failure_rate",
    "critical_copy_gap_count",
    "locale_specific_error_rate"
  ])
});

const OPERATIONAL_CONTENT_MODEL = Object.freeze({
  content_units: Object.freeze([
    { key: "command_labels", owner: "content_ops", publish_state: "versioned" },
    { key: "chat_templates", owner: "content_ops", publish_state: "versioned" },
    { key: "miniapp_bundles", owner: "content_ops", publish_state: "versioned" },
    { key: "world_label_bundles", owner: "content_ops", publish_state: "versioned" },
    { key: "event_announcements", owner: "live_ops", publish_state: "scheduled" },
    { key: "support_macros", owner: "support_ops", publish_state: "approved" },
    { key: "wallet_and_payout_copy", owner: "trust_ops", publish_state: "strict" },
    { key: "premium_offer_copy", owner: "growth_ops", publish_state: "guarded" }
  ]),
  workflow: Object.freeze([
    "draft",
    "localized",
    "qa_passed",
    "approved",
    "scheduled",
    "live",
    "retired"
  ]),
  required_metadata: Object.freeze([
    "content_key",
    "surface",
    "locale",
    "region_scope",
    "version",
    "owner_team",
    "approval_ref",
    "experiment_eligibility",
    "criticality"
  ]),
  runtime_rules: Object.freeze([
    "text_never_embeds_financial_truth_values_without_source_binding",
    "event_copy_links_to_targeting_rules_not_inline_segments",
    "operator_edits_generate_audit_rows",
    "emergency_disable_preserves_previous_published_version"
  ])
});

const LIVE_OPS_CONTROL_FRAMEWORK = Object.freeze({
  scheduling_model: Object.freeze([
    "daily_rotations_in_utc_with_region_windows",
    "seasonal_campaigns_with_preload_and_end_caps",
    "partner_campaigns_with_region_and_chain_filters",
    "scarcity_windows_with_max_frequency_rules",
    "leaderboard_resets_with_preannounce_and_postsettle_steps"
  ]),
  targeting_axes: Object.freeze([
    "locale",
    "region",
    "device_class",
    "risk_segment",
    "wallet_state",
    "kingdom_or_faction",
    "cohort_bucket",
    "experiment_variant",
    "returning_vs_new",
    "premium_status"
  ]),
  approvals: Object.freeze([
    "live_ops_owner_for_timing",
    "localization_owner_for_locale_readiness",
    "trust_owner_for_payout_support_copy",
    "fraud_owner_for_high_risk_promo_paths",
    "two_person_rule_for_high_blast_radius_events"
  ]),
  rollback_controls: Object.freeze([
    "event_disable_flag",
    "locale_disable_flag",
    "schedule_pause",
    "reward_route_close",
    "variant_holdout_restore",
    "broadcast_cancel_before_send"
  ]),
  operator_permissions: Object.freeze([
    "viewer",
    "content_editor",
    "localization_reviewer",
    "live_ops_scheduler",
    "trust_approver",
    "fraud_operator",
    "global_ops_admin"
  ]),
  runtime_safeguards: Object.freeze([
    "locale_readiness_gate",
    "preview_diff_before_publish",
    "send_budget_per_hour",
    "event_overlap_conflict_check",
    "protected_quiet_hours_by_region",
    "kill_switch_without_deploy",
    "all_changes_audited"
  ])
});

const ANALYTICS_KPI_FRAMEWORK = Object.freeze({
  canonical_dimensions: Object.freeze([
    "locale",
    "detected_language",
    "locale_override_source",
    "region_code",
    "device_class",
    "os_family",
    "surface",
    "district_or_zone",
    "wallet_chain",
    "wallet_state",
    "campaign_key",
    "event_key",
    "experiment_key",
    "variant_key",
    "risk_band",
    "user_segment"
  ]),
  executive_kpis: Object.freeze([
    "d1_and_d7_retention_by_locale",
    "arpdau_by_locale_and_segment",
    "intent_to_tx_submit_by_chain_and_locale",
    "payout_request_to_paid_rate_by_region",
    "premium_conversion_by_locale",
    "support_contact_rate_after_failure"
  ]),
  product_kpis: Object.freeze([
    "miniapp_launch_rate",
    "district_engagement_depth",
    "mission_accept_to_complete",
    "reward_reveal_rate",
    "event_participation_rate",
    "comeback_nudge_reactivation_rate"
  ]),
  localization_kpis: Object.freeze([
    "translation_coverage",
    "critical_copy_gap_rate",
    "fallback_rate",
    "overflow_rate",
    "locale_specific_failure_rate",
    "support_contacts_tagged_localization"
  ]),
  live_ops_kpis: Object.freeze([
    "event_entry_rate",
    "event_completion_rate",
    "fatigue_rate_by_locale",
    "rotation_lift_vs_control",
    "scarcity_window_conversion",
    "broadcast_ctr"
  ]),
  fraud_kpis: Object.freeze([
    "risk_case_open_rate",
    "false_positive_reversal_rate",
    "wallet_farm_cluster_count",
    "referral_ring_detection_rate",
    "payout_hold_release_time",
    "manual_review_load_by_locale"
  ]),
  trust_kpis: Object.freeze([
    "payout_pending_to_support_contact_rate",
    "wallet_failure_recovery_rate",
    "premium_issue_resolution_time",
    "fraud_review_message_open_rate",
    "critical_notice_ack_rate"
  ]),
  scene_performance_kpis: Object.freeze([
    "frame_time_p95_by_device_class",
    "district_load_ms_by_locale_and_region",
    "webgl_context_loss_rate",
    "resume_recovery_rate",
    "low_end_device_crash_rate"
  ]),
  dashboards: Object.freeze([
    { key: "executive_global", audience: "leadership" },
    { key: "product_global", audience: "product_and_design" },
    { key: "localization_health", audience: "localization_ops" },
    { key: "live_ops_runtime", audience: "live_ops" },
    { key: "fraud_and_review", audience: "fraud_ops" },
    { key: "payout_and_trust", audience: "trust_ops" },
    { key: "web3_chain_funnel", audience: "wallet_and_chain_ops" },
    { key: "scene_performance", audience: "frontend_platform" }
  ]),
  alerting_rules: Object.freeze([
    "critical_copy_gap_above_zero_on_live_locale",
    "fallback_rate_above_two_percent_on_trust_surfaces",
    "payout_failure_spike_by_region",
    "fraud_hold_spike_after_event_launch",
    "device_class_crash_spike",
    "variant_regression_vs_control_on_guardrail_metrics"
  ])
});

const FRAUD_TRUST_OPERATIONS_MODEL = Object.freeze({
  risk_scoring_pipeline: Object.freeze([
    "identity_and_device_signals",
    "wallet_graph_signals",
    "referral_and_invite_velocity",
    "event_exploitation_patterns",
    "support_abuse_patterns",
    "locale_specific_content_or_translation_abuse",
    "payout_destination_reuse"
  ]),
  review_queues: Object.freeze([
    "wallet_farm_review",
    "referral_ring_review",
    "payout_hold_review",
    "support_abuse_review",
    "event_exploitation_review",
    "translation_abuse_review"
  ]),
  evidence_capture: Object.freeze([
    "raw_event_refs",
    "wallet_link_history",
    "payout_request_history",
    "device_cluster_snapshot",
    "content_variant_context",
    "operator_action_audit"
  ]),
  enforcement_modes: Object.freeze([
    "shadow_score_only",
    "silent_dampening",
    "reward_hold",
    "manual_review_gate",
    "cooldown_extension",
    "hard_block_for_confirmed_abuse"
  ]),
  false_positive_controls: Object.freeze([
    "locale_specific_baselines_before_hard_enforcement",
    "appealable_manual_actions",
    "new_region_shadow_period",
    "review_sampling_on_model_changes",
    "support_override_with_audit"
  ]),
  payout_hold_policy: Object.freeze([
    "first_high_value_payout_hold",
    "shared_destination_hold",
    "recent_wallet_relink_hold",
    "event_anomaly_hold",
    "manual_release_or_reject_with_reason_code"
  ]),
  operator_training_notes: Object.freeze([
    "do_not_equate_language_with_fraud",
    "check_cultural_holiday_spikes_before_escalation",
    "use_neutral_language_in_fraud_review_messages",
    "log_evidence_before_action",
    "never_promise_payout_timing_beyond_policy"
  ])
});

const SUPPORT_MESSAGING_FRAMEWORK = Object.freeze({
  tone_rules: Object.freeze([
    "clear",
    "calm",
    "specific",
    "non_accusatory",
    "no_fake_urgency",
    "no_financial_overpromise"
  ]),
  localization_rules: Object.freeze([
    "critical_templates_translated_before_launch",
    "locale_parent_fallback_allowed_only_on_noncritical_help",
    "dates_numbers_and_currency_follow_user_locale",
    "support_macros_have_locale_owner"
  ]),
  urgency_rules: Object.freeze([
    "payout_and_security_incidents_are_high_urgency",
    "event_confusion_is_medium_urgency",
    "education_and_how_to_content_is_low_urgency",
    "fraud_review_copy_is_high_clarity_but_low_drama"
  ]),
  trust_preserving_patterns: Object.freeze([
    "state_what_happened",
    "state_what_is_being_checked",
    "state_what_the_user_can_do_next",
    "state_safe_expected_timing_without_false_precision",
    "link_to_history_or_status_when_available"
  ]),
  forbidden_language_patterns: Object.freeze([
    "guaranteed_profit",
    "instant_payout_for_everyone",
    "suspicious_user_accusation_without_decision",
    "panic_inducing_caps_lock",
    "unbounded_soon",
    "engineering_jargon_in_user_facing_blockers"
  ]),
  message_families: Object.freeze([
    "payout_pending",
    "payout_approved",
    "payout_failed",
    "wallet_connection_failed",
    "localization_fallback_issue",
    "premium_purchase_issue",
    "event_issue",
    "fraud_review_state",
    "user_confusion_recovery",
    "beginner_education",
    "power_user_troubleshooting"
  ])
});

const EXPERIMENTATION_FRAMEWORK = Object.freeze({
  eligible_experiment_classes: Object.freeze([
    "localized_copy_variants",
    "onboarding_step_order",
    "premium_offer_presentation",
    "event_timing",
    "chest_reveal_pacing",
    "reactivation_timing",
    "fraud_threshold_shadow_tests",
    "region_specific_offer_mix"
  ]),
  randomization_boundaries: Object.freeze([
    "user_level_for_copy_and_onboarding",
    "locale_or_region_level_for_event_timing",
    "segment_level_for_fraud_shadow_tests",
    "never_randomize_inside_a_single_payout_request_flow"
  ]),
  guardrails: Object.freeze([
    "no_experiment_on_core_factual_payout_copy",
    "no_experiment_on_security_or_wallet_truth_messages",
    "revenue_lift_cannot_override_trust_regression",
    "locale_qa_must_exist_before_variant_goes_live",
    "holdout_required_for_new_high_blast_radius_live_ops_patterns"
  ]),
  stopping_conditions: Object.freeze([
    "stat_sig_negative_on_trust_metric",
    "payout_failure_or_support_contact_spike",
    "locale_specific_error_rate_spike",
    "fraud_false_positive_rate_breach",
    "performance_regression_on_low_end_devices"
  ]),
  localization_qa_constraints: Object.freeze([
    "every_variant_translated_for_target_locale_before_launch",
    "critical_copy_variants_require_trust_review",
    "variant_does_not_ship_if_overflow_baseline_fails",
    "rtl_locales_need_separate_visual_qc"
  ])
});

const ROLLOUT_GOVERNANCE_MODEL = Object.freeze({
  ownership_model: Object.freeze([
    "product_ops_owns_kpis_and_priorities",
    "localization_ops_owns_locale_quality",
    "live_ops_owns_schedules_and_targeting",
    "trust_ops_owns_payout_and_support_copy",
    "fraud_ops_owns_enforcement_policy",
    "engineering_owns_runtime_contracts_and_alerting"
  ]),
  rollout_path: Object.freeze([
    "internal_ops",
    "target_locale_shadow",
    "pilot_cohort",
    "managed_partial_rollout",
    "general_availability"
  ]),
  release_gates: Object.freeze([
    "critical_copy_translated",
    "fallback_chain_passed",
    "dashboard_alerts_online",
    "support_macros_ready",
    "fraud_shadow_baseline_ready",
    "kill_switch_verified"
  ]),
  governance_cadence: Object.freeze([
    "daily_live_ops_check",
    "weekly_locale_health_review",
    "weekly_fraud_false_positive_review",
    "biweekly_experiment_readout",
    "monthly_global_ops_audit"
  ])
});

const EMERGENCY_RESPONSE_MODEL = Object.freeze({
  scenarios: Object.freeze([
    {
      key: "critical_locale_fallback_break",
      first_actions: Object.freeze(["disable_locale_rollout", "force_parent_locale", "notify_ops"]),
      user_message_rule: "Acknowledge language issue and provide safe fallback without blaming the user."
    },
    {
      key: "untranslated_payout_message_live",
      first_actions: Object.freeze(["pull_template", "restore_previous_version", "audit_publish_path"]),
      user_message_rule: "Revert to last approved trust copy immediately."
    },
    {
      key: "fraud_spike_after_event",
      first_actions: Object.freeze(["raise_risk_thresholds", "hold_high_risk_rewards", "pause_event_variant"]),
      user_message_rule: "Do not mention fraud publicly unless user-specific action exists."
    },
    {
      key: "payout_failure_spike_by_region",
      first_actions: Object.freeze(["pause_auto_release", "route_to_manual_review", "publish_calm_status_update"]),
      user_message_rule: "State processing delay and preserve user confidence with history visibility."
    },
    {
      key: "wallet_provider_or_chain_degradation",
      first_actions: Object.freeze(["disable_impacted_connect_option", "show_safe_retry_message", "fallback_to_offchain_safe_path"]),
      user_message_rule: "Make clear that cancellation is safe and funds are not moved."
    },
    {
      key: "event_targeting_misfire",
      first_actions: Object.freeze(["disable_event", "cancel_unsent_broadcasts", "repair_targeting_rules"]),
      user_message_rule: "Explain event availability adjustment without scarcity panic."
    }
  ]),
  severity_model: Object.freeze([
    "sev1_trust_or_payout",
    "sev1_localization_break_on_critical_surface",
    "sev2_live_ops_targeting_or_performance",
    "sev3_noncritical_content_issue"
  ]),
  response_rules: Object.freeze([
    "incident_owner_assigned_within_5_minutes",
    "user_facing_copy_approved_by_trust_owner_for_sev1",
    "all_manual_overrides_audited",
    "postmortem_required_for_sev1_and_sev2"
  ])
});

const GLOBAL_SCALE_READINESS_CHECKLIST = Object.freeze([
  "Locale override persistence works across chat, Mini App and Web3 drawers.",
  "Every live locale has complete payout, wallet and support templates.",
  "Fallback chain dashboards and alerts are online.",
  "Region-aware event scheduling is operator-configurable.",
  "Event targeting supports locale, region, segment, risk and experiment filters.",
  "All operator edits are audited with before and after snapshots.",
  "Fraud queues support language-aware staffing but not locale bias enforcement.",
  "Support macros exist for payout, wallet, premium, event and fraud review states.",
  "Analytics dashboards expose locale and device class cuts by default.",
  "Localization screenshot QA is part of release gates.",
  "Critical trust copy cannot publish without approval.",
  "Experiment framework blocks trust-damaging copy tests.",
  "Low-end device performance is monitored by locale and region.",
  "Scene and chat reactivation alerts are deduped and frequency capped.",
  "Emergency locale and event kill switches are verified.",
  "New-region fraud models start in shadow mode.",
  "Payout hold policies are visible to trust and support teams.",
  "Partner campaigns cannot bypass locale readiness gates.",
  "Translation health scorecards are reviewed weekly.",
  "Global ops runbooks are versioned and reachable by on-call staff."
]);

const ENGINEERING_HANDOFF_CHECKLIST = Object.freeze([
  "Create a shared locale precedence resolver used by bot, admin-api and webapp runtimes.",
  "Persist explicit locale override separately from detected Telegram language.",
  "Version all critical copy through content keys and bundle versions; remove ad hoc literal trust strings.",
  "Add locale readiness state to content bundles and block rollout until readiness is approved.",
  "Emit analytics for missing translations, parent fallbacks and critical copy gaps.",
  "Add per-surface copy constraints to content validation so operators cannot publish oversized labels or buttons.",
  "Create localization dashboards for coverage, fallback rate, overflow rate and critical trust copy status.",
  "Separate event schedule configuration from localized event copy and from targeting rules.",
  "Add audit rows for publish, rollback, locale disable and emergency copy restore actions.",
  "Implement operator permissions for content editor, localization reviewer, live-ops scheduler, trust approver and fraud operator.",
  "Add region quiet-hours and send-budget safeguards to notification and live-ops pipelines.",
  "Make payout, wallet and fraud-review templates strict-approval content families.",
  "Expose support macro catalog by locale and issue family inside admin tooling.",
  "Add locale, region, device class, risk band and experiment dimensions to executive and product KPI queries.",
  "Create fraud queues for wallet farms, referral rings, payout holds, support abuse and translation abuse.",
  "Start new locale fraud models in shadow mode and require false-positive review before hard enforcement.",
  "Block experimentation on factual payout and security copy in schema and runtime policy.",
  "Require every experiment variant to have localized copy and screenshot QA before rollout.",
  "Implement locale and event kill switches that work without code deploy.",
  "Create sev1 response templates for payout delays, wallet provider degradation and critical localization failures.",
  "Store before-and-after snapshots for emergency content restores.",
  "Document global ops governance cadence and ownership matrix in runbooks used by on-call staff."
]);

function getLocaleRolloutStage(key) {
  return (
    GLOBAL_LOCALIZATION_ARCHITECTURE.locale_rollout_stages.find(
      (item) => item.key === String(key || "").trim().toLowerCase()
    ) || null
  );
}

function getDashboardSpec(key) {
  return ANALYTICS_KPI_FRAMEWORK.dashboards.find((item) => item.key === String(key || "").trim().toLowerCase()) || null;
}

function getEmergencyScenario(key) {
  return EMERGENCY_RESPONSE_MODEL.scenarios.find((item) => item.key === String(key || "").trim().toLowerCase()) || null;
}

module.exports = {
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
};