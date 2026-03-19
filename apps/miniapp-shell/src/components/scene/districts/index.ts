/**
 * District scene registry.
 * Each module exports `createScene(engine, canvas, quality)` returning a BabylonJS Scene.
 * We use dynamic imports so the full BabylonJS tree-shake per district works
 * and the initial bundle stays small.
 */

export type DistrictKey =
  | 'central_hub'
  | 'mission_quarter'
  | 'loot_forge'
  | 'exchange_district'
  | 'season_hall'
  | 'arena';

export type QualityTier = 'low' | 'medium' | 'high';

/**
 * Lazy-load the correct district module and return its `createScene` function.
 */
export async function loadDistrictScene(key: DistrictKey) {
  switch (key) {
    case 'central_hub':
      return (await import('./CentralHubScene')).createScene;
    case 'mission_quarter':
      return (await import('./MissionQuarterScene')).createScene;
    case 'loot_forge':
      return (await import('./LootForgeScene')).createScene;
    case 'exchange_district':
      return (await import('./ExchangeDistrictScene')).createScene;
    case 'season_hall':
      return (await import('./SeasonHallScene')).createScene;
    case 'arena':
      return (await import('./ArenaScene')).createScene;
    default: {
      // Fallback to central hub for unknown keys
      const _exhaustive: never = key;
      return (await import('./CentralHubScene')).createScene;
    }
  }
}
