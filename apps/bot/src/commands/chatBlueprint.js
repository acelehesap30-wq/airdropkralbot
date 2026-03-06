"use strict";

const CHAT_UX_PRINCIPLES = Object.freeze([
  "one_clear_action",
  "chat_is_cockpit",
  "low_scroll",
  "trust_before_hype",
  "locale_native",
  "miniapp_pull",
  "safe_quick_actions",
  "never_lost"
]);

const CHAT_INFORMATION_ARCHITECTURE = Object.freeze({
  chat_handles: Object.freeze(["onboarding", "trust", "summary", "safe_claim", "alerts", "deep_links", "support"]),
  mini_app_handles: Object.freeze(["3d_navigation", "full_tasks", "deep_progression", "shop", "full_payout", "full_rankings"]),
  boundary_rules: Object.freeze(["no_complex_form_duplication", "chat_routes_to_exact_zone", "no_fake_data_fallback"])
});

const CHAT_COMMAND_MATRIX = Object.freeze([
  { key: "start", group: "core", style: "entry", menu: true, labels: { tr: ["Baslat", "Dunyaya Gir"], en: ["Start", "Enter World"] }, purpose: { tr: "Ilk giris ve kimlik kurulumu", en: "First entry and identity setup" }, first_use: "assign_identity_then_open_hub", confused: "show_hub_help", context: ["locale", "onboarding"], deep_link: "hub", analytics: ["chat_start_opened"], abuse: ["once_per_session_rich_welcome"] },
  { key: "play", group: "core", style: "handoff", menu: true, labels: { tr: ["Arena'ya Gir"], en: ["Enter Arena"] }, purpose: { tr: "Mini App ana girisi", en: "Main Mini App entry" }, first_use: "resume_last_zone_or_hub", confused: "show_live_panel_copy", context: ["last_zone", "auth_sig"], deep_link: "hub", analytics: ["chat_play_requested"], abuse: ["launch_cooldown_15s"] },
  { key: "hub", group: "core", style: "summary", menu: true, labels: { tr: ["Hub"], en: ["Hub"] }, purpose: { tr: "Chat komuta merkezi", en: "Chat command center" }, first_use: "show_next_best_move", confused: "promote_tasks_claim_or_play", context: ["balances", "season", "task_state"], deep_link: "hub", analytics: ["chat_hub_opened"], abuse: ["edit_in_place"] },
  { key: "profile", group: "core", style: "summary", menu: true, labels: { tr: ["Profil"], en: ["Profile"] }, purpose: { tr: "Kimlik ve tier ozeti", en: "Identity and tier summary" }, first_use: "show_identity_and_next_step", confused: "link_to_kingdom_or_season", context: ["profile", "reputation"], deep_link: "profile", analytics: ["chat_profile_opened"], abuse: ["cache_10s"] },
  { key: "rewards", group: "core", style: "summary", menu: true, labels: { tr: ["Oduller"], en: ["Rewards"] }, purpose: { tr: "Hazir odul ve reward ritmi", en: "Ready rewards and reward rhythm" }, first_use: "promote_safe_claim_or_next_reward", confused: "show_missing_step", context: ["daily", "missions", "revealable"], deep_link: "rewards", analytics: ["chat_rewards_opened"], abuse: ["coalesce_same_minute"] },
  { key: "wallet", group: "economy", style: "summary", menu: true, labels: { tr: ["Cuzdan"], en: ["Wallet"] }, purpose: { tr: "Bakiye ozeti", en: "Balance summary" }, first_use: "separate_payout_and_token_paths", confused: "show_wallet_payout_token_buttons", context: ["balances", "daily_caps"], deep_link: "wallet", analytics: ["chat_wallet_opened"], abuse: ["refresh_5s"] },
  { key: "claim", group: "economy", style: "safe_action", menu: true, labels: { tr: ["Claim"], en: ["Claim"] }, purpose: { tr: "Safe quick claim", en: "Safe quick claim" }, first_use: "reveal_then_mission_claim_scan", confused: "explain_not_safe_then_route", context: ["revealable", "mission_board", "freeze"], deep_link: "claim", analytics: ["chat_claim_requested"], abuse: ["idempotent_per_target", "cooldown_3s"] },
  { key: "payout", group: "economy", style: "trust", menu: true, labels: { tr: ["Cekim"], en: ["Payout"] }, purpose: { tr: "Payout uygunluk ve review durumu", en: "Payout eligibility and review state" }, first_use: "explain_gate_threshold_or_ready", confused: "open_miniapp_for_full_form", context: ["payout_status", "cooldown", "release_gate"], deep_link: "payout", analytics: ["chat_payout_opened"], abuse: ["no_duplicate_pending_push_6h"] },
  { key: "history", group: "economy", style: "summary", menu: false, labels: { tr: ["Gecmis"], en: ["History"] }, purpose: { tr: "Token+payout+kingdom gecmisi", en: "Token+payout+kingdom history" }, first_use: "list_recent_financial_states", confused: "humanize_status_codes", context: ["payouts", "token_requests", "kingdom_history"], deep_link: "history", analytics: ["chat_history_opened"], abuse: ["refresh_10s"] },
  { key: "status", group: "economy", style: "summary", menu: false, labels: { tr: ["Durum"], en: ["Status"] }, purpose: { tr: "Canli sistem snapshot", en: "Live system snapshot" }, first_use: "show_health_and_next_safe_path", confused: "human_status_classes", context: ["runtime", "freeze"], deep_link: "status", analytics: ["chat_status_opened"], abuse: ["refresh_5s"] },
  { key: "missions", group: "progression", style: "summary", menu: true, labels: { tr: ["Misyonlar"], en: ["Missions"] }, purpose: { tr: "Claimable mission ozeti", en: "Claimable mission summary" }, first_use: "show_claimable_or_missing_step", confused: "explain_mission_vs_task", context: ["mission_board"], deep_link: "missions", analytics: ["chat_missions_opened"], abuse: ["hide_empty_claim_buttons"] },
  { key: "season", group: "progression", style: "summary", menu: true, labels: { tr: ["Sezon"], en: ["Season"] }, purpose: { tr: "Sezon puan ve deadline", en: "Season points and deadline" }, first_use: "show_today_value_and_milestone", confused: "show_days_left_with_goal", context: ["season"], deep_link: "season", analytics: ["chat_season_opened"], abuse: ["deadline_push_cap"] },
  { key: "rank", group: "progression", style: "summary", menu: false, labels: { tr: ["Rank"], en: ["Rank"] }, purpose: { tr: "Kisisel arena rank", en: "Personal arena rank" }, first_use: "show_personal_position_before_global", confused: "clarify_rank_vs_leaderboard", context: ["arena_rank", "rating_delta"], deep_link: "rank", analytics: ["chat_rank_opened"], abuse: ["refresh_8s"] },
  { key: "streak", group: "progression", style: "summary", menu: false, labels: { tr: ["Streak"], en: ["Streak"] }, purpose: { tr: "Streak risk ve grace penceresi", en: "Streak risk and grace window" }, first_use: "show_return_reason_without_panic", confused: "render_time_left_cleanly", context: ["streak", "grace_until"], deep_link: "streak", analytics: ["chat_streak_opened"], abuse: ["push_12h"] },
  { key: "inventory", group: "progression", style: "summary", menu: false, labels: { tr: ["Envanter"], en: ["Inventory"] }, purpose: { tr: "Aktif effect ve pass durumu", en: "Active effects and pass state" }, first_use: "show_effect_and_expiry", confused: "separate_owned_vs_buyable", context: ["active_effects"], deep_link: "inventory", analytics: ["chat_inventory_opened"], abuse: ["refresh_10s"] },
  { key: "invite", group: "social", style: "share", menu: false, labels: { tr: ["Davet Et"], en: ["Invite"] }, purpose: { tr: "Guvenli davet linki", en: "Trust-safe invite link" }, first_use: "share_without_fake_referral_claims", confused: "suppress_referral_language_when_inactive", context: ["bot_username", "locale"], deep_link: "invite", analytics: ["chat_invite_opened"], abuse: ["resend_30s"] },
  { key: "friends", group: "social", style: "handoff", menu: false, labels: { tr: ["Arkadaslar"], en: ["Friends"] }, purpose: { tr: "Sosyal yuzey girisi", en: "Social surface entry" }, first_use: "open_social_zone_not_fake_friend_list", confused: "say_friend_management_in_miniapp", context: ["social_mode"], deep_link: "friends", analytics: ["chat_friends_opened"], abuse: ["no_auto_push"] },
  { key: "kingdom", group: "social", style: "summary", menu: false, labels: { tr: ["Kingdom"], en: ["Kingdom"] }, purpose: { tr: "Tier ve kingdom hikayesi", en: "Tier and kingdom story" }, first_use: "show_current_tier_and_next_threshold", confused: "show_dated_tier_history", context: ["kingdom_tier", "history"], deep_link: "kingdom", analytics: ["chat_kingdom_opened"], abuse: ["refresh_10s"] },
  { key: "leaderboard", group: "social", style: "summary", menu: false, labels: { tr: ["Liderlik"], en: ["Leaderboard"] }, purpose: { tr: "Top liste teaser'i", en: "Top list teaser" }, first_use: "show_top5_plus_self", confused: "separate_self_from_global", context: ["leaderboard", "player_rank"], deep_link: "leaderboard", analytics: ["chat_leaderboard_opened"], abuse: ["broadcast_6h"] },
  { key: "share", group: "social", style: "share", menu: false, labels: { tr: ["Paylas"], en: ["Share"] }, purpose: { tr: "Kopyalanabilir premium share copy", en: "Copy-ready premium share copy" }, first_use: "two_line_share_copy", confused: "show_text_plus_link", context: ["launch_link"], deep_link: "share", analytics: ["chat_share_opened"], abuse: ["no_auto_push"] },
  { key: "events", group: "events", style: "summary", menu: true, labels: { tr: ["Etkinlikler"], en: ["Events"] }, purpose: { tr: "Aktif anomaly ve event panosu", en: "Active anomaly and event board" }, first_use: "explain_why_return_today", confused: "always_include_effect_and_next_step", context: ["anomaly", "contract", "season_deadline"], deep_link: "events", analytics: ["chat_events_opened"], abuse: ["push_3_per_day"] },
  { key: "news", group: "events", style: "summary", menu: false, labels: { tr: ["Haberler"], en: ["News"] }, purpose: { tr: "Oyuncu acik urun bulteni", en: "Player-facing product bulletin" }, first_use: "three_item_bulletin", confused: "avoid_ops_jargon", context: ["anomaly", "season", "economy_flags"], deep_link: "news", analytics: ["chat_news_opened"], abuse: ["broadcast_2_per_day"] },
  { key: "chests", group: "events", style: "summary", menu: false, labels: { tr: ["Kasalar"], en: ["Chests"] }, purpose: { tr: "Reveal ve pity ozeti", en: "Reveal and pity summary" }, first_use: "claim_if_ready_else_show_pity", confused: "send_forge_to_miniapp", context: ["revealable", "pity"], deep_link: "chests", analytics: ["chat_chests_opened"], abuse: ["alert_2_per_day"] },
  { key: "quests", group: "events", style: "summary", menu: false, labels: { tr: ["Questler"], en: ["Quests"] }, purpose: { tr: "Quest/task teaser", en: "Quest/task teaser" }, first_use: "show_offer_or_route_to_tasks", confused: "clarify_quest_vs_mission", context: ["offers", "missions"], deep_link: "quests", analytics: ["chat_quests_opened"], abuse: ["refresh_8s"] },
  { key: "discover", group: "events", style: "handoff", menu: false, labels: { tr: ["Kesfet"], en: ["Discover"] }, purpose: { tr: "3D kesif gecidi", en: "3D discovery gate" }, first_use: "hand_off_directly_to_zone", confused: "do_not_explain_long", context: ["last_zone", "event_theme"], deep_link: "discover", analytics: ["chat_discover_opened"], abuse: ["no_auto_push"] },
  { key: "language", group: "settings", style: "settings", menu: true, labels: { tr: ["Dil"], en: ["Language"] }, purpose: { tr: "Kalici dil override", en: "Persistent language override" }, first_use: "override_auto_detect", confused: "show_tr_en_only", context: ["detected_locale", "stored_override"], deep_link: "language", analytics: ["chat_language_changed"], abuse: ["cooldown_2s"] },
  { key: "settings", group: "settings", style: "summary", menu: true, labels: { tr: ["Ayarlar"], en: ["Settings"] }, purpose: { tr: "Minimal chat preference kokpiti", en: "Minimal chat preference cockpit" }, first_use: "single_message_two_rows", confused: "keep_only_effective_options", context: ["locale", "notification_prefs"], deep_link: "settings", analytics: ["chat_settings_opened"], abuse: ["edit_in_place"] },
  { key: "help", group: "settings", style: "help", menu: true, labels: { tr: ["Yardim"], en: ["Help"] }, purpose: { tr: "Kategori bazli help index", en: "Category-based help index" }, first_use: "open_index_not_wall", confused: "suggest_nearest_commands", context: ["locale", "role", "query"], deep_link: "help", analytics: ["chat_help_opened"], abuse: ["edit_navigation"] },
  { key: "support", group: "settings", style: "trust", menu: false, labels: { tr: ["Destek"], en: ["Support"] }, purpose: { tr: "Dogru destek girisi", en: "Correct support entry" }, first_use: "categorize_issue_first", confused: "route_to_faq_or_status_first", context: ["last_error", "last_surface"], deep_link: "support", analytics: ["chat_support_opened"], abuse: ["no_auto_push_except_blockers"] },
  { key: "faq", group: "settings", style: "trust", menu: false, labels: { tr: ["SSS"], en: ["FAQ"] }, purpose: { tr: "Kisa lokalize SSS kartlari", en: "Short localized FAQ cards" }, first_use: "open_top5_topics", confused: "use_qa_cards_not_wall", context: ["locale", "topic"], deep_link: "faq", analytics: ["chat_faq_opened"], abuse: ["edit_navigation"] }
]);

const ADMIN_HIDDEN_COMMANDS = Object.freeze([
  { key: "admin", type: "entry", abuse: ["admin_only_scope"] },
  { key: "admin_queue", type: "review", abuse: ["admin_only_scope", "critical_confirm_required"] },
  { key: "admin_payouts", type: "review", abuse: ["admin_only_scope", "critical_confirm_required"] },
  { key: "admin_tokens", type: "review", abuse: ["admin_only_scope", "critical_confirm_required"] },
  { key: "admin_metrics", type: "metrics", abuse: ["admin_only_scope"] },
  { key: "admin_config", type: "runtime", abuse: ["admin_only_scope"] },
  { key: "admin_gate", type: "critical", abuse: ["admin_only_scope", "critical_confirm_required", "cooldown_enforced"] },
  { key: "admin_freeze", type: "critical", abuse: ["admin_only_scope", "critical_confirm_required", "cooldown_enforced"] },
  { key: "pay", type: "critical", abuse: ["admin_only_scope", "critical_confirm_required", "idempotency_required"] },
  { key: "reject_payout", type: "critical", abuse: ["admin_only_scope", "critical_confirm_required", "idempotency_required"] },
  { key: "approve_token", type: "critical", abuse: ["admin_only_scope", "critical_confirm_required", "idempotency_required"] },
  { key: "reject_token", type: "critical", abuse: ["admin_only_scope", "critical_confirm_required", "idempotency_required"] },
  { key: "admin_live", type: "runtime", abuse: ["admin_only_scope"] }
]);

const CHAT_BUTTON_SYSTEM = Object.freeze({
  primary_patterns: Object.freeze(["one_primary_per_message", "verb_first_label", "single_dominant_cta"]),
  secondary_patterns: Object.freeze(["two_per_row_max", "group_related_surfaces"]),
  danger_patterns: Object.freeze(["explicit_not_dramatic", "confirm_required_for_critical"]),
  trust_patterns: Object.freeze(["human_status_badges", "units_always_visible", "proof_near_money"]),
  premium_patterns: Object.freeze(["status_block_highlight", "expiry_inline", "value_not_noise"]),
  urgency_patterns: Object.freeze(["only_real_timers", "exact_time_windows", "no_fake_last_chance"]),
  edit_vs_send_rules: Object.freeze(["edit_for_navigation", "send_for_money_state_changes", "send_only_on_real_alert_state_change"])
});

const CHAT_FIRST_RUN_FLOW = Object.freeze({
  minute_0_to_1: Object.freeze(["detect_locale", "assign_identity", "show_one_reason", "show_enter_world", "show_one_trust_line"]),
  minute_1_to_3: Object.freeze(["surface_reward_path", "surface_mission_path", "surface_social_hook", "create_return_reason"]),
  day_1: Object.freeze(["teach_next_step_only", "reinforce_hub_play_claim_loop", "avoid_feature_dump"])
});

const CHAT_REENGAGEMENT_SYSTEM = Object.freeze([
  { key: "chest_ready", spam_limits: "max_2_per_day", controls: "reward_alert_toggle" },
  { key: "mission_refresh", spam_limits: "max_2_per_day", controls: "progress_alert_toggle" },
  { key: "event_countdown", spam_limits: "max_3_per_event", controls: "event_alert_toggle" },
  { key: "kingdom_war", spam_limits: "max_2_per_day", controls: "social_alert_toggle" },
  { key: "streak_risk", spam_limits: "max_1_per_12h", controls: "progress_alert_toggle" },
  { key: "payout_update", spam_limits: "state_change_only", controls: "critical_money_updates_always_on" },
  { key: "rare_drop", spam_limits: "state_change_only", controls: "reward_alert_toggle" },
  { key: "comeback_offer", spam_limits: "max_1_per_72h", controls: "marketing_alert_toggle" },
  { key: "season_deadline", spam_limits: "max_3_per_window", controls: "event_alert_toggle" }
]);

const CHAT_LOCALIZATION_MODEL = Object.freeze({
  detection_precedence: Object.freeze(["stored_override", "telegram_language_code", "webapp_pref", "default_tr"]),
  command_naming_strategy: Object.freeze(["slash_commands_ascii", "localized_descriptions_and_buttons", "intent_router_accepts_tr_en_aliases"]),
  fallback_rules: Object.freeze(["player_facing_default_tr", "partial_translation_does_not_break_layout"]),
  translation_key_structure: Object.freeze(["chat.command.<key>", "chat.button.<surface>", "chat.alert.<key>", "chat.trust.<key>"]),
  button_label_rules: Object.freeze(["tr_max_22", "en_max_24", "verbs_first"]),
  rtl_readiness: Object.freeze(["rows_not_ltr_only", "neutral_status_tokens", "safe_number_wrapping"])
});

const CHAT_TRUST_SUPPORT_FRAMEWORK = Object.freeze({
  payout_message_patterns: Object.freeze(["pending", "review", "approved", "rejected_with_reason_family"]),
  balance_summary_rules: Object.freeze(["show_units", "separate_soft_hard_value", "no_implied_cash_value"]),
  proof_and_history_rules: Object.freeze(["latest_request_near_state", "human_status_before_code"]),
  support_entry_rules: Object.freeze(["topic_first", "faq_before_escalation", "critical_money_blockers_can_jump"]),
  anti_panic_copy_rules: Object.freeze(["what_happened", "what_it_means_now", "what_to_do_next", "no_panic_caps"])
});

const CHAT_DEEP_LINK_FRAMEWORK = Object.freeze({
  startapp_strategy: Object.freeze({ hub: "hub", tasks: "tasks", claim: "claim", payout: "payout", wallet: "wallet", rank: "rank", season: "season", events: "events", chests: "chests", invite: "invite", settings: "settings", support: "support" }),
  state_restoration: Object.freeze(["persist_last_zone", "prefer_valid_zone", "fallback_to_hub"]),
  continue_where_left_off: Object.freeze(["play_resumes_last_safe_zone", "alerts_open_exact_zone", "return_to_context_or_hub"]),
  analytics_instrumentation: Object.freeze(["chat_deeplink_created", "chat_deeplink_opened", "miniapp_restored_from_chat"]),
  abuse_safe_validation: Object.freeze(["only_allow_known_zone_keys", "strip_unknown_payload", "server_side_auth_signature_required", "invalid_signature_fallback_hub"])
});

const CHAT_FAILURE_MODES = Object.freeze([
  { key: "unknown_intent", mitigation: "show_three_best_routes_plus_help" },
  { key: "miniapp_launch_unavailable", mitigation: "show_trust_copy_and_url_fallback" },
  { key: "claim_not_safe", mitigation: "explain_then_route_exact_zone" },
  { key: "payout_review_delay", mitigation: "pending_review_copy_not_alarm_copy" },
  { key: "translation_gap", mitigation: "safe_locale_fallback" },
  { key: "callback_duplicate", mitigation: "idempotency_and_rate_limit" },
  { key: "admin_missing_confirm", mitigation: "force_confirm_step" },
  { key: "alert_overload", mitigation: "per_alert_caps_and_opt_outs" }
]);

function getMenuCommands() {
  return CHAT_COMMAND_MATRIX.filter((item) => item.menu).map((item) => item.key);
}

function getCommandByKey(key) {
  const normalized = String(key || "").trim().toLowerCase();
  return CHAT_COMMAND_MATRIX.find((item) => item.key === normalized) || null;
}

module.exports = {
  CHAT_UX_PRINCIPLES,
  CHAT_INFORMATION_ARCHITECTURE,
  CHAT_COMMAND_MATRIX,
  ADMIN_HIDDEN_COMMANDS,
  CHAT_BUTTON_SYSTEM,
  CHAT_FIRST_RUN_FLOW,
  CHAT_REENGAGEMENT_SYSTEM,
  CHAT_LOCALIZATION_MODEL,
  CHAT_TRUST_SUPPORT_FRAMEWORK,
  CHAT_DEEP_LINK_FRAMEWORK,
  CHAT_FAILURE_MODES,
  getMenuCommands,
  getCommandByKey
};
