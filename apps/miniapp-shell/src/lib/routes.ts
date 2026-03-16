/**
 * Blueprint Section 7: Canonical navigation routes
 * route_key + panel_key + focus_key grammar
 */

export const ROUTES = {
  hub: '/hub',
  missions: '/missions',
  forge: '/forge',
  exchange: '/exchange',
  season: '/season',
  events: '/events',
  vault: '/vault',
  settings: '/settings',
  admin: '/admin',
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Blueprint: Route to district map */
export const ROUTE_DISTRICT_MAP: Record<RouteKey, string> = {
  hub: 'central_hub',
  missions: 'mission_quarter',
  forge: 'loot_forge',
  exchange: 'exchange_district',
  season: 'season_hall',
  events: 'live_event_overlay',
  vault: 'exchange_district',
  settings: 'central_hub',
  admin: 'central_hub',
};

/** Blueprint: District set */
export const DISTRICTS = [
  'central_hub',
  'mission_quarter',
  'loot_forge',
  'exchange_district',
  'season_hall',
  'elite_district',
  'live_event_overlay',
  'social_monuments',
] as const;

export type DistrictKey = (typeof DISTRICTS)[number];

/** Blueprint: startapp param -> route resolution */
export function resolveStartParam(param: string | null): RouteKey {
  if (!param) return 'hub';
  const key = param.split('__')[0] as RouteKey;
  if (key in ROUTES) return key;
  return 'hub'; // Blueprint: invalid startapp falls back to hub
}

/** Blueprint: panel_key extraction from startapp */
export function resolvePanelKey(param: string | null): string | null {
  if (!param) return null;
  const parts = param.split('__');
  return parts[1] ?? null;
}
