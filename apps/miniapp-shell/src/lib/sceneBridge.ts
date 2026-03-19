'use client';

/**
 * Blueprint: Typed scene bridge — connects Mini App routes to 3D districts.
 * Maps route keys to district keys, manages transition state,
 * and provides the current district for BabylonSceneHost.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { DistrictKey } from '../components/scene/districts';
import { useAppStore } from '../store/useAppStore';
import { detectQuality, type QualityProfile } from '@airdropkralbot/scene';

/* ── Route → District mapping ── */

const ROUTE_TO_DISTRICT: Record<string, DistrictKey> = {
  hub: 'central_hub',
  missions: 'mission_quarter',
  forge: 'loot_forge',
  exchange: 'exchange_district',
  season: 'season_hall',
  events: 'live_event_overlay',
  vault: 'exchange_district',
  settings: 'central_hub',
  arena: 'arena',
} as const;

const DEFAULT_DISTRICT: DistrictKey = 'central_hub';

/**
 * Resolve a route key to a district key.
 * Falls back to central_hub for unknown routes.
 */
export function getDistrictForRoute(routeKey: string): DistrictKey {
  return ROUTE_TO_DISTRICT[routeKey] ?? DEFAULT_DISTRICT;
}

/* ── Types ── */

export type SceneBridgeState = {
  currentDistrict: DistrictKey;
  previousDistrict: DistrictKey | null;
  transitionActive: boolean;
  quality: QualityProfile;
};

/* ── Helpers ── */

/** Extract the route key segment from a pathname (e.g. "/missions/daily" -> "missions"). */
function routeKeyFromPathname(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment ?? 'hub';
}

/** Fire Telegram haptic feedback if available. */
function hapticImpact() {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  } catch {
    // Silently ignore — not inside Telegram or API unavailable
  }
}

/* ── Hook ── */

/**
 * useSceneBridge — watches the current route, maps it to a district,
 * and manages transition lifecycle for BabylonSceneHost.
 */
export function useSceneBridge(): SceneBridgeState & {
  /** The district key to pass to BabylonSceneHost (stable during transitions). */
  districtKey: DistrictKey;
  /** Call when the transition animation completes. */
  onTransitionComplete: () => void;
} {
  const pathname = usePathname();
  const locale = useAppStore((s) => s.locale);

  // Detect quality once on mount
  const [quality] = useState<QualityProfile>(() => detectQuality());

  const routeKey = routeKeyFromPathname(pathname);
  const targetDistrict = getDistrictForRoute(routeKey);

  const [currentDistrict, setCurrentDistrict] = useState<DistrictKey>(targetDistrict);
  const [previousDistrict, setPreviousDistrict] = useState<DistrictKey | null>(null);
  const [transitionActive, setTransitionActive] = useState(false);

  // Track if this is the initial mount (skip transition on first render)
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (targetDistrict === currentDistrict) return;

    if (isInitialMount.current) {
      // First render — just set directly, no transition
      isInitialMount.current = false;
      setCurrentDistrict(targetDistrict);
      return;
    }

    // District changed — start transition
    setPreviousDistrict(currentDistrict);
    setTransitionActive(true);
    hapticImpact();

    // Actual district swap happens mid-transition (the overlay is opaque).
    // We set the district immediately; DistrictTransition handles the visual.
    setCurrentDistrict(targetDistrict);
  }, [targetDistrict]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTransitionComplete = useCallback(() => {
    setTransitionActive(false);
    setPreviousDistrict(null);
  }, []);

  return {
    currentDistrict,
    previousDistrict,
    transitionActive,
    quality,
    districtKey: currentDistrict,
    onTransitionComplete,
  };
}
