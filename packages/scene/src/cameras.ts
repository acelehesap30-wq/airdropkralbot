/**
 * Blueprint: District camera presets
 * Each district has a default camera position for smooth transitions
 */
export interface CameraPreset {
  alpha: number;
  beta: number;
  radius: number;
  target: [number, number, number];
}

export const DISTRICT_CAMERAS: Record<string, CameraPreset> = {
  central_hub: { alpha: Math.PI / 4, beta: Math.PI / 3, radius: 12, target: [0, 0, 0] },
  mission_quarter: { alpha: Math.PI / 3, beta: Math.PI / 3.5, radius: 10, target: [5, 0, 3] },
  loot_forge: { alpha: Math.PI / 2, beta: Math.PI / 4, radius: 8, target: [-3, 0, -2] },
  exchange_district: { alpha: Math.PI / 6, beta: Math.PI / 3, radius: 14, target: [0, 0, 5] },
  season_hall: { alpha: Math.PI, beta: Math.PI / 3, radius: 16, target: [0, 2, 0] },
  elite_district: { alpha: Math.PI / 5, beta: Math.PI / 4, radius: 10, target: [4, 0, -4] },
  live_event_overlay: { alpha: 0, beta: Math.PI / 2.5, radius: 20, target: [0, 0, 0] },
  social_monuments: { alpha: Math.PI / 3, beta: Math.PI / 3, radius: 12, target: [-5, 0, 5] },
};
