import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition } from '../core/types';
import { cityBuildings, cityLand,onCityLand } from '../content/golden-city';
import { buildUrbanArchitecture } from './urban-architecture';
import {urbanPromenade} from './urban-promenade';
import {bakeLandmark} from './venue-landmarks';
import {bayRoofscape} from './venue-signatures';
import { cityAppearance, landmarkShowcase, type PresentationTheme } from './themes';
import { buildGoldenGateLandscape, GOLDEN } from './golden-gate-landscape';

/** Grounded original city blocks and an 88 m suspension span; collision rails are rendered separately. */
export function buildBay(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  const casters = new Set<StandardMaterial>();
  const mat = (role: string, color: string, casts = true) => {
    const m = new StandardMaterial(role, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.08);
    materials.set(role, m); if (casts) casters.add(m); return m;
  };
  mat('terrain', theme.scene.terrain, false); const concrete = mat('embankment', theme.scene.embankment, false);
  const white = mat('architecture', theme.scene.curb), steel = mat('architecture-trim', cityAppearance.roof), glass = mat('architecture-glass', cityAppearance.window);
  const red = mat('bridge-red', cityAppearance.bridge), metal = mat('bay-metal', theme.venue.metal);
  const leaf = mat('foliage', theme.scene.foliage), leafLight = mat('foliageLight', theme.scene.foliageLight);
  const rock = mat('rock', theme.scene.rock); mat('trunk', theme.scene.trunk);
  const paving = mat('city-paving', cityAppearance.paving), shop = mat('city-shopfront', cityAppearance.shop);
  const facadeMaterial = mat('city-facade', '#ffffff');
  glass.reflectionTexture = scene.environmentTexture; glass.specularColor.setAll(0.5);
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = material; return m;
  };
  // The land carries a painted map (golden-gate-detail.ts): UVs follow world x/z over the land's extent,
  // so the seawall faces take the coping's colour from the map's edge.
  const ground = mat('city-ground', '#7f9a5c', false), e = GOLDEN.land;
  for (const [i, land] of cityLand.entries()) {
    const mesh = box(`city-land-${i}`, land.x + land.width / 2, -1.035, land.z + land.depth / 2, land.width, 2, land.depth, ground), p = mesh.getVerticesData(VertexBuffer.PositionKind)!, uvs: number[] = [];
    for (let k = 0; k < p.length; k += 3) uvs.push((p[k] + mesh.position.x - e.minX) / (e.maxX - e.minX), (p[k + 2] + mesh.position.z - e.minZ) / (e.maxZ - e.minZ));
    mesh.setVerticesData(VertexBuffer.UVKind, uvs);
  }
  box('quay-head-retaining-face', 0, -1.05, 23.9, 86, 2, 0.2, concrete);
  for (const x of [-43.1, 43.1]) box('quay-bank-face', x, -1.05, 69.5, 0.2, 2, 91, concrete);
  const water = mat('water', theme.scene.water, false); water.specularColor.setAll(0.45);
  const sea = MeshBuilder.CreateGround('bay-water', { width: 2000, height: 2000 }, scene); sea.position.y = -2.08; sea.material = water;
  for (let i = 0; i < 20; i++) box('inlet-water-glint', -35 + i % 5 * 16, -2.06, 57 + Math.floor(i / 5) * 11, 3 + i % 3 * 2, 0.01, 0.08, metal);
  buildUrbanArchitecture(scene,cityBuildings.map(b=>({...b,style:b.style==='office'?2:b.style==='brick'?1:0})),false,facadeMaterial,glass);
  bakeLandmark('victorian-bay-roofscape',bayRoofscape(),scene,facadeMaterial);
  bakeLandmark('city-street-promenade',urbanPromenade(track,false,onCityLand),scene,white);
  for (const barrier of track.barriers.filter(b => b.kind === 'infield' && b.id.endsWith('block'))) {
    const xs = barrier.footprint.map(p => p.x), zs = barrier.footprint.map(p => p.z);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    box('protected-city-paving', (x0 + x1) / 2, 0.09, (z0 + z1) / 2, x1 - x0 - 0.4, 0.16, z1 - z0 - 0.4, paving);
    for (const x of [x0 + 1, x1 - 1]) {
      const z = z0 + 1;
      box('city-light-post', x, 2.1, z, 0.12, 4, 0.12, metal); box('city-light-head', x, 4.15, z, 0.6, 0.12, 0.38, white);
    }
  }
  // Small pocket plaza breaks the market frontage into a believable neighbourhood.
  box('market-pocket-plaza',-30.5,.2,-26,6.6,.18,5.8,paving);
  for(const x of [-32.5,-28.5]){
    box('market-planter',x,.52,-24.5,1.1,.7,1.1,white);
    const bush=MeshBuilder.CreateSphere('market-plaza-shrub',{diameter:1.35,segments:6},scene);bush.position.set(x,1.2,-24.5);bush.material=leaf;
  }
  for(const z of [-27.4,-25.8]){
    box('market-plaza-bench',-30.5,.64,z,2.1,.16,.42,metal);
    for(const x of [-31.25,-29.75])box('market-bench-foot',x,.38,z,.13,.52,.38,white);
  }
  for (const [x, z] of [[-33, 3], [-15, 3], [21, 17], [102, 13], [117, 13], [-115, 23], [-105, 23], [74, 101], [111, 101]].map(([x, z]) => [-x, z])) {
    box('city-planter', x, 0.25, z, 1.8, 0.5, 1.8, concrete);
    const tree = MeshBuilder.CreateSphere('city-tree', { diameter: 2.7, segments: 5 }, scene); tree.position.set(x, 2.5, z); tree.scaling.set(0.85, 1.4, 0.85); tree.material = x < 0 ? leaf : leafLight;
    box('city-tree-trunk', x, 1, z, 0.25, 2, 0.25, rock);
  }
  const signTexture = new DynamicTexture('city-series-sign', { width: 1024, height: 128 }, scene, false);
  const signContext = signTexture.getContext() as CanvasRenderingContext2D;
  signContext.fillStyle = '#19242c'; signContext.fillRect(0, 0, 1024, 128);
  signContext.fillStyle = theme.venue.accent; signContext.fillRect(0, 0, 24, 128);
  signContext.font = 'italic bold 66px sans-serif'; signContext.fillStyle = '#f1eee5'; signContext.textAlign = 'center'; signContext.fillText('GOLDEN GATE / CITY SERIES', 524, 87); signTexture.update();
  const signMaterial = mat('city-series-sign', '#ffffff', false); signMaterial.diffuseTexture = signTexture; signMaterial.emissiveColor.setAll(0.12);
  const sign = MeshBuilder.CreatePlane('city-series-facade', { width: 10, height: 1.25 }, scene); sign.position.set(24, 1.7, -22.8); sign.material = signMaterial;
  const bridge = track.bridges![0], span = Math.hypot(bridge.to.x - bridge.from.x, bridge.to.z - bridge.from.z);
  box('bridge-deck', 0, -0.27, 42, span, 0.54, bridge.width, concrete);
  for (const x of [-28, 28]) {
    for (const z of [32.5, 51.5]) {
      box('bridge-supported-pier', x, -0.9, z, 1.6, 2.2, 1.6, concrete); box('bridge-tower-leg', x, 6.7, z, 1.55, 13.4, 1.55, red);
    }
    box('bridge-tower-crossbeam', x, 13.05, 42, 1.55, 0.85, 20.25, red);
  }
  for (const z of [32.5, 51.5]) {
    const path = Array.from({ length: 49 }, (_, i) => {
      const x = -44 + i / 48 * 88, y = Math.abs(x) <= 28 ? 5.5 + 7.55 * (x / 28) ** 2 : 13.05 - (Math.abs(x) - 28) * 0.72;
      return new Vector3(x, y, z);
    });
    MeshBuilder.CreateTube('bridge-suspension-cable', { path, radius: 0.23, tessellation: 5 }, scene).material = red;
    for (let x = -40; x <= 40; x += landmarkShowcase.bridge.hangerSpacing) {
      const y = Math.abs(x)<=28?5.5+7.55*(x/28)**2:13.05-(Math.abs(x)-28)*.72,b=landmarkShowcase.bridge;
      box('bridge-hanger', x, (y + b.deckY) / 2, z, b.hangerWidth, y - b.deckY, b.hangerWidth, red);
      const inner=z<42?34.175:49.825;
      box('bridge-hanger-deck-bracket',x,.82,(z+inner)/2,.22,.24,Math.abs(z-inner)+.18,red);
    }
  }
  // Parks, shore, riprap, park boulders and the headlands across the bay.
  const landscape = buildGoldenGateLandscape(scene, track, materials, ground);
  return { shadowCasterMaterials: casters, lateShadowCasters: landscape.shadowCasters, update: (_time: number, _reduced: boolean) => {} };
}
