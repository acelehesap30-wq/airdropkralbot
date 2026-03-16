/**
 * Blueprint: Quality profiles for scene rendering
 * safe_low: 30fps, minimal effects — default for unknown devices
 * balanced: 45fps, standard effects
 * immersive_high: 60fps, full effects
 */
export interface QualityProfile {
  name: 'safe_low' | 'balanced' | 'immersive_high';
  targetFps: number;
  shadows: boolean;
  particles: boolean;
  postProcess: boolean;
  maxTextureSize: number;
}

export const QUALITY_PROFILES: Record<string, QualityProfile> = {
  safe_low: {
    name: 'safe_low',
    targetFps: 30,
    shadows: false,
    particles: false,
    postProcess: false,
    maxTextureSize: 512,
  },
  balanced: {
    name: 'balanced',
    targetFps: 45,
    shadows: true,
    particles: true,
    postProcess: false,
    maxTextureSize: 1024,
  },
  immersive_high: {
    name: 'immersive_high',
    targetFps: 60,
    shadows: true,
    particles: true,
    postProcess: true,
    maxTextureSize: 2048,
  },
};

/** Blueprint: detect quality from device capabilities */
export function detectQuality(): QualityProfile {
  if (typeof navigator === 'undefined') return QUALITY_PROFILES.safe_low;

  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return QUALITY_PROFILES.safe_low;

  const cores = navigator.hardwareConcurrency ?? 2;
  const memory = (navigator as any).deviceMemory ?? 2;

  if (cores >= 6 && memory >= 6) return QUALITY_PROFILES.immersive_high;
  if (cores >= 4 && memory >= 4) return QUALITY_PROFILES.balanced;
  return QUALITY_PROFILES.safe_low;
}
