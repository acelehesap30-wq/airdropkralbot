"use strict";

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.max(1, Number(fallback || 1));
  }
  return Math.max(1, Math.floor(parsed));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asRows(value) {
  return Array.isArray(value)
    ? value.filter((row) => row && typeof row === "object" && !Array.isArray(row))
    : [];
}

function pickTopBucket(rows) {
  const topRow = asRows(rows)[0] || {};
  return String(topRow.bucket_key || "").trim();
}

function hasSurfaceMatch(campaign, surfaceBucket) {
  const safeSurface = String(surfaceBucket || "").trim();
  if (!safeSurface) {
    return false;
  }
  const surfaces = Array.isArray(campaign?.surfaces) ? campaign.surfaces : [];
  return surfaces.some((row) => String(row?.surface_key || "").trim() === safeSurface);
}

function resolveLiveOpsSceneGate(sceneRuntimeSummary, campaign) {
  const safeSummary = sceneRuntimeSummary && typeof sceneRuntimeSummary === "object" && !Array.isArray(sceneRuntimeSummary)
    ? sceneRuntimeSummary
    : {};
  const configuredRecipients = Math.max(1, toPositiveInt(campaign?.targeting?.max_recipients, 50));
  const alarmState = String(safeSummary.alarm_state_7d || "no_data");
  const total24h = Math.max(0, Number(safeSummary.total_24h || 0));

  if (alarmState === "alert") {
    return {
      scene_gate_state: "alert",
      scene_gate_effect: "blocked",
      scene_gate_reason: "scene_runtime_alert_blocked",
      scene_gate_recipient_cap: 0,
      ready_for_auto_dispatch: false
    };
  }

  if (alarmState === "watch") {
    const cappedRecipients = Math.min(configuredRecipients, 20);
    const effect = cappedRecipients < configuredRecipients ? "capped" : "open";
    return {
      scene_gate_state: "watch",
      scene_gate_effect: effect,
      scene_gate_reason: effect === "capped" ? "scene_runtime_watch_capped" : "scene_runtime_watch_observed",
      scene_gate_recipient_cap: cappedRecipients,
      ready_for_auto_dispatch: true
    };
  }

  if (!total24h) {
    return {
      scene_gate_state: "no_data",
      scene_gate_effect: "open",
      scene_gate_reason: "scene_runtime_no_data",
      scene_gate_recipient_cap: configuredRecipients,
      ready_for_auto_dispatch: true
    };
  }

  return {
    scene_gate_state: "clear",
    scene_gate_effect: "open",
    scene_gate_reason: "",
    scene_gate_recipient_cap: configuredRecipients,
    ready_for_auto_dispatch: true
  };
}

function resolveLiveOpsRecipientCapRecommendation(sceneRuntimeSummary, campaign, schedulerSkipSummary, opsAlertTrendSummary) {
  const safeCampaign = asRecord(campaign);
  const safeTargeting = asRecord(safeCampaign.targeting);
  const safeSkip = asRecord(schedulerSkipSummary);
  const safeTrend = asRecord(opsAlertTrendSummary);
  const sceneGate = resolveLiveOpsSceneGate(sceneRuntimeSummary, safeCampaign);
  const configuredRecipients = Math.max(1, toPositiveInt(safeTargeting.max_recipients, 50));
  const baseCap = Math.max(0, Number(sceneGate.scene_gate_recipient_cap || configuredRecipients));
  const experimentKey = String(safeTrend.experiment_key || "webapp_react_v1").trim() || "webapp_react_v1";
  const localeBucket = pickTopBucket(safeTrend.locale_breakdown);
  const segmentBucket = pickTopBucket(safeTrend.segment_breakdown);
  const surfaceBucket = pickTopBucket(safeTrend.surface_breakdown);
  const variantBucket = pickTopBucket(safeTrend.variant_breakdown);
  const cohortBucket = pickTopBucket(safeTrend.cohort_breakdown);
  const campaignSegmentKey = String(safeTargeting.segment_key || "").trim();
  const segmentMatch = Boolean(campaignSegmentKey && segmentBucket && campaignSegmentKey === segmentBucket);
  const surfaceMatch = hasSurfaceMatch(safeCampaign, surfaceBucket);
  const latestAlarmState = String(safeTrend.latest_alarm_state || safeSkip.alarm_state || "clear").trim().toLowerCase();
  const raised24h = Math.max(0, Number(safeTrend.raised_24h || 0));
  const raised7d = Math.max(0, Number(safeTrend.raised_7d || 0));
  let pressureBand = "clear";
  let reason = sceneGate.scene_gate_effect === "capped" ? "scene_gate_watch_cap" : sceneGate.scene_gate_reason || "";
  let multiplier = 1;

  if (sceneGate.scene_gate_effect === "blocked" || baseCap <= 0) {
    return {
      configured_recipients: configuredRecipients,
      scene_gate_recipient_cap: baseCap,
      recommended_recipient_cap: 0,
      pressure_band: "alert",
      reason: sceneGate.scene_gate_reason || "scene_gate_blocked",
      experiment_key: experimentKey,
      locale_bucket: localeBucket,
      segment_key: segmentBucket,
      surface_bucket: surfaceBucket,
      variant_bucket: variantBucket,
      cohort_bucket: cohortBucket,
      segment_match: segmentMatch,
      surface_match: surfaceMatch
    };
  }

  if (latestAlarmState === "alert" || raised24h >= 2 || raised7d >= 4) {
    pressureBand = "alert";
    multiplier = 0.55;
    reason = "ops_alert_pressure_high";
  } else if (latestAlarmState === "watch" || raised24h >= 1 || raised7d >= 2) {
    pressureBand = "watch";
    multiplier = 0.75;
    reason = "ops_alert_pressure_watch";
  }

  if (segmentMatch && pressureBand !== "clear") {
    multiplier = Math.min(multiplier, pressureBand === "alert" ? 0.45 : 0.6);
    reason = "ops_alert_segment_pressure";
  } else if (surfaceMatch && pressureBand !== "clear") {
    multiplier = Math.min(multiplier, pressureBand === "alert" ? 0.5 : 0.7);
    reason = "ops_alert_surface_pressure";
  }

  const recommendedCap =
    pressureBand === "clear" ? baseCap : Math.max(1, Math.min(baseCap, Math.floor(baseCap * multiplier)));

  return {
    configured_recipients: configuredRecipients,
    scene_gate_recipient_cap: baseCap,
    recommended_recipient_cap: recommendedCap,
    pressure_band: pressureBand,
    reason,
    experiment_key: experimentKey,
    locale_bucket: localeBucket,
    segment_key: segmentBucket,
    surface_bucket: surfaceBucket,
    variant_bucket: variantBucket,
    cohort_bucket: cohortBucket,
    segment_match: segmentMatch,
    surface_match: surfaceMatch
  };
}

module.exports = {
  resolveLiveOpsSceneGate,
  resolveLiveOpsRecipientCapRecommendation
};
