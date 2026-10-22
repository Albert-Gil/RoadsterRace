export interface RoadsterPart { p: number[]; n: number[] }
export interface RoadsterMaterial { c: number[]; metal?: number; rough?: number; spec?: number; emit?: number }
export function buildRoadsterGeometry(detail?: 'race' | 'showcase'): {
  body: Record<string, RoadsterPart>;
  wheels: { spin: Record<string, RoadsterPart>; fixed: Record<string, RoadsterPart> }[];
  mounts: { x: number; y: number; z: number; r: number; w: number }[];
  materials: Record<string, RoadsterMaterial>;
  wheelMaterials: Record<string, RoadsterMaterial>;
};
