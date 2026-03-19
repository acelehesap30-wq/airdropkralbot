/**
 * Blueprint Section 7: Babylon.js scene bridge
 * Quality profiles: safe_low, balanced, immersive_high
 * District bundle loading and camera transitions
 */

export { loadDistrict } from './loadDistrict';
export { QUALITY_PROFILES, type QualityProfile } from './quality';
export { detectQuality } from './quality';
export { DISTRICT_CAMERAS } from './cameras';

/** Blueprint: district display metadata for scene bridge UI */
export interface DistrictNameEntry {
  tr: string;
  en: string;
  icon: string;
}

export const DISTRICT_NAMES: Record<string, DistrictNameEntry> = {
  central_hub: { tr: 'Merkez Üs', en: 'Central Hub', icon: '🏛️' },
  mission_quarter: { tr: 'Görev Bölgesi', en: 'Mission Quarter', icon: '📋' },
  loot_forge: { tr: 'Ganimet Dökümhanesi', en: 'Loot Forge', icon: '🔨' },
  exchange_district: { tr: 'Ticaret Bölgesi', en: 'Exchange District', icon: '💱' },
  season_hall: { tr: 'Sezon Salonu', en: 'Season Hall', icon: '🏆' },
  elite_district: { tr: 'Elit Bölge', en: 'Elite District', icon: '👑' },
  live_event_overlay: { tr: 'Canlı Etkinlik', en: 'Live Event', icon: '🎪' },
  social_monuments: { tr: 'Sosyal Anıtlar', en: 'Social Monuments', icon: '🗿' },
  arena: { tr: 'Arena', en: 'Arena', icon: '⚔️' },
};
