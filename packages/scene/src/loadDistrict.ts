/**
 * Blueprint: District GLB loader
 * Hard budget: district bundle <= 900KB gzip
 * Falls back to procedural scene on load failure
 */

const CDN_BASE = 'https://cdn.k99-exchange.xyz/districts';

export interface DistrictLoadResult {
  success: boolean;
  meshCount: number;
  loadTimeMs: number;
}

export async function loadDistrict(
  districtKey: string,
  scene: any,
): Promise<DistrictLoadResult> {
  const start = performance.now();

  try {
    const { SceneLoader } = await import('@babylonjs/core');
    await import('@babylonjs/loaders');

    const url = `${CDN_BASE}/${districtKey}.glb`;

    const result = await SceneLoader.ImportMeshAsync('', url, '', scene);

    return {
      success: true,
      meshCount: result.meshes.length,
      loadTimeMs: performance.now() - start,
    };
  } catch (err) {
    console.warn(`[loadDistrict] Failed to load ${districtKey}:`, err);
    return {
      success: false,
      meshCount: 0,
      loadTimeMs: performance.now() - start,
    };
  }
}
