/** Stable roles: replacing presentation never changes the simulation's car or course. */
export interface VisualAssets {
  vehicle: { kind: 'procedural' } | { kind: 'glb'; url: string; scale: number; rotationY: number };
  roadTexture?: string;
  terrainTexture?: string;
  embankmentTexture?: string;
}
export const visualAssets: VisualAssets = { vehicle: { kind: 'procedural' }, roadTexture: '/assets/textures/asphalt-v1.webp', embankmentTexture: '/assets/textures/coastal-embankment-v1.webp' };
