import { assetUrl } from './urls';
import { VEHICLE_DIMENSIONS } from '../core/vehicle-size';
import { launchsiteRemoteRockets } from '../core/tracks/venue-parcels';

export const paintFinishes = [
  { id: 'glacier', name: 'Stainless steel gray', color: '#aeb4b8' },
  { id: 'crimson', name: 'Crimson', color: '#d51f35' },
  { id: 'cobalt', name: 'Cobalt blue', color: '#3b79e6' },
  { id: 'solar', name: 'Solar yellow', color: '#f1be37' },
  { id: 'verdant', name: 'Verdant green', color: '#45a77b' },
  { id: 'ultraviolet', name: 'Ultraviolet', color: '#a477e5' },
] as const;
export const rewardPaintFinishes=[
 {id:'reward-pearl',name:'Pearl White',color:'#e6e6de'},
 {id:'reward-obsidian',name:'Obsidian',color:'#252b32'},
 {id:'reward-copper',name:'Copper Alloy',color:'#b57a52'},
 {id:'reward-titanium',name:'Champagne Titanium',color:'#bcb19a'},
] as const;

/** Stable paint IDs preserve saved choices. Steel is the fresh-install/default finish. */
export const defaultPaintId = 'glacier';
/** Native production kit colours; baked into existing venue batches. */
export const productionSurfaceTuning={rockFoot:.79,strata:.025,plantFoot:.76,crown:.05,snowFoot:.91,structureFoot:.83,top:.035};
export const productionAppearance={roofInset:'#59676a',bayGlass:'#315b68',foundation:'#848475',eaveShadow:'#525c59',awnings:['#467f7a','#a15e50','#c6a65f'],contact:'#5a6054'};
export const fleetAppearance={deckOffset:.015,drivingOffset:.035,deckApron:'#3b4b54',superstructure:'#a6b6bc',navy:'#34516b',hangar:'#202f3a',oxide:'#aa6048',rescueOrange:'#ef873b',rescueYellow:'#edbc46',helmet:'#f2e8cc',jetBlue:'#59788b',hull:'#8d9da6',hullShade:'#637a89',hullFill:'#344b58',waterline:'#435968',bootTop:'#273d49',deck:'#39464e',supportDeck:'#39464e',rampSurface:'#48565e',rampEdge:'#d9b764',rampRibs:'#b2c0c2',asphalt:'#485b65',coping:'#c0cdd1',ribs:'#536c7c',line:'#e2dbbd',aircraft:'#c3cecc',glass:'#294955',dark:'#28343a',equipment:'#ca9e48',emergencyRed:'#b94d3d',navalHelicopter:'#95a9ad',water:'#246779',foam:'#70a3aa'};
// Authored overview angles keep the normal route visible behind the tall islands.
// Refit distance to the safe rectangle, but never rotate or follow cars during play.
export const fleetLaneAppearance={surface:'#26333c',edge:'#e4e8dd',centre:'#d8cba4',kerbRed:'#b84c49',kerbWhite:'#d9dfdb',edgeWidth:.40,edgeInset:.30,kerbWidth:.85,kerbHeight:.08};
export const fleetFlagAppearance={red:'#b53f45',white:'#ecece5',blue:'#294765'};
export const fleetCamera={desktopElevation:64,phoneElevation:68,portraitElevation:56,desktopAzimuth:180,phoneAzimuth:210,portraitAzimuth:135};
/** Solo Thrust/Hop keep the standard red interface (`--control-1`) whatever the car paint; with two or more cars the pads use each driver's paint instead (ui/controls.ts). */
export const abilityControlColors = ['#d51f35', '#3b79e6', '#f1be37', '#45a77b'] as const;
export const vehicleMaterials = {
  steel: { metallic: .86, roughness: .32, coat: .28, coatRoughness: .23, brushing: .035 },
  painted: { metallic: .5, roughness: .23, coat: 1, coatRoughness: .1 },
  glass: { color: '#17252f', metallic: .18, roughness: .14, coat: .8 },
  carbon: { color: '#141a20', metallic: .3, roughness: .4 },
  metal: { color: '#aeb4b8', metallic: .86, roughness: .28 },
  wheels: { metallic: .65, roughness: .32 },
};

export interface PresentationTheme {
  id: 'coastal' | 'graphite';
  branding: { title: string; tagline: string; logo: string };
  typography: { body: string; display: string };
  /**
   * Interface tokens (CSS custom properties, kebab-cased by applyTheme). `fill` is the solid button colour and
   * `accentText` its label; `accent` marks selection and focus; `highlight` is small accent text (eyebrows);
   * `glass` is the translucent panel colour over the 3D scene or key art.
   */
  ui: { surface: string; glass: string; text: string; muted: string; accent: string; fill: string; accentText: string; highlight: string; border: string; radius: string };
  scene: { water: string; shallows: string; foam: string; terrain: string; embankment: string; asphalt: string; structure: string; shoulder: string; curb: string; paint: string; glass: string; foliage: string; foliageLight: string; rock: string; trunk: string; route: string; paceFast: string; sky: string; sunlight: number };
  players: string[];
  venue: { concrete: string; metal: string; accent: string; rubber: string; marking: string; repair: string };
  pace: { slow: string; medium: string; fast: string; width: number; outlineWidth: number; racingWidth: number; racingOutlineWidth: number };
}

export const themes: Record<string, PresentationTheme> = {
  coastal: {
    id: 'coastal',
    branding: { title: 'ROADSTER RACE', tagline: 'Your line. Your race.', logo: assetUrl('assets/mark.svg') },
    typography: { body: 'Barlow, system-ui, -apple-system, sans-serif', display: '"Barlow Condensed", Impact, sans-serif' },
    ui: { surface: '#111820', glass: 'rgb(12 17 24 / 86%)', text: '#f4f5f6', muted: '#a9b4be', accent: '#f0444b', fill: '#d9303a', accentText: '#ffffff', highlight: '#ff7a7f', border: 'rgb(255 255 255 / 12%)', radius: '14px' },
    scene: { water: '#216574', shallows: '#5a9e9c', foam: '#d1e5da', terrain: '#c7b78d', embankment: '#a7ae8a', asphalt: '#b0b6ba', structure: '#26313b', shoulder: '#9a9586', curb: '#ede9de', paint: '#aeb4b8', glass: '#13212c', foliage: '#344d36', foliageLight: '#687349', rock: '#b7b5a5', trunk: '#786b53', route: '#ff4c48', paceFast: '#4ce879', sky: '#a4b8c1', sunlight: 1.0 },
    players: ['#4caaff', '#ffac4c', '#ba91ff', '#56e0d2'],
    venue: { concrete: '#c6c8be', metal: '#7e8a8d', accent: '#bd303b', rubber: '#222c31', marking: '#e8e5d8', repair: '#41494a' },
    pace: { slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 },
  },
  graphite: {
    id: 'graphite',
    branding: { title: 'ROADSTER / RACE', tagline: 'Find your flow.', logo: assetUrl('assets/mark-graphite.svg') },
    typography: { body: 'Barlow, system-ui, -apple-system, sans-serif', display: 'Barlow, system-ui, sans-serif' },
    ui: { surface: '#172022', glass: 'rgb(20 31 32 / 88%)', text: '#f1f5e8', muted: '#b8c6bd', accent: '#d7f877', fill: '#d7f877', accentText: '#18291e', highlight: '#e3fba6', border: 'rgb(241 245 232 / 14%)', radius: '14px' },
    scene: { water: '#234d60', shallows: '#4a8e91', foam: '#b1dace', terrain: '#b8b69b', embankment: '#b7c5b1', asphalt: '#b3c0c7', structure: '#263b40', shoulder: '#919b86', curb: '#e4dfcb', paint: '#aeb4b8', glass: '#182e35', foliage: '#3a6357', foliageLight: '#839b73', rock: '#b1bdb4', trunk: '#81765f', route: '#dcf896', paceFast: '#f3aa6c', sky: '#739597', sunlight: 0.85 },
    players: ['#d7f877', '#f3aa6c', '#bea3e9', '#ec9cbe'],
    venue: { concrete: '#b8c1b6', metal: '#74898a', accent: '#bd303b', rubber: '#182b2e', marking: '#e7ecd9', repair: '#3b4b4c' },
    pace: { slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 },
  },
};

/** Presentation only: camera, lighting and quality never enter route compilation or physics. */
export const sceneTuning = {
  vehicle: { racingScale: 1.12 * VEHICLE_DIMENSIONS.scale, landingCompression: 0.09, contactCompression: 0.05, impactDuration: 0.22, groundLift:0.13, contactGap:.01,shadowGap:.008,shadowMaxScale:2.5,shadowTriangles:512,suspensionTravel:0.22, tireMarkLift:0.16,projectedMarkLift:.025 },
  camera: { elevationDegrees: 42, compactElevationDegrees: 65, terrainElevationDegrees: [50,58,65,72], terrainVerticalFov: 0.3, azimuthDegrees: 5, verticalFov: 0.5, fittingMargin: 1, clearancePixels: 6, phoneRunoffClearancePixels: 20, azimuthStep: 5 },
  grading: { exposure: 1.16, contrast: 1.1 },
  lighting: { ambient: 0.55, sunlight: 1.25, shadowDarkness: 0.32, contactHardening: 0.012 },
};

/**
 * Graphics tiers. Presentation only: no tier changes the fixed-step simulation, timing or input.
 * The draw-call targets (90 Time Trial / 150 four cars) are verified at Medium. Post-processing
 * passes and the ambient-occlusion pre-pass add screen passes on High/Ultra, not scene geometry.
 */
export type GraphicsLevel = 'low' | 'medium' | 'high' | 'ultra';
export const graphicsLevels: readonly GraphicsLevel[] = ['low', 'medium', 'high', 'ultra'];
export interface GraphicsTier {
  label: string;
  /** Rendered megapixels for the canvas; large tablets render below their native density. */
  pixelBudget: number;
  maxPixelRatio: number;
  shadowMapSize: number;
  /** PCSS gives contact-hardening soft shadows; PCF a uniform soft edge. */
  shadowFilter: 'pcf' | 'pcss';
  shadowQuality: 'low' | 'medium' | 'high';
  /** Real-sky (CC0 HDRI) image lighting and reflections; Low keeps the small procedural sky. */
  skyLighting: boolean;
  /** World-space procedural normal detail, tonal variation and animated water. */
  surfaceDetail: boolean;
  detailTextureSize: 128 | 256;
  postProcessing: false | { msaa: number; fxaa: boolean; bloom: boolean; sharpen: number };
  ambientOcclusion: false | { ratio: number; samples: number; radius: number; strength: number };
  screenReflections: boolean;
}
export const graphicsTiers: Record<GraphicsLevel, GraphicsTier> = {
  low: { label: 'Low', pixelBudget: 0.9, maxPixelRatio: 1, shadowMapSize: 1024, shadowFilter: 'pcf', shadowQuality: 'low', skyLighting: false, surfaceDetail: false, detailTextureSize: 128, postProcessing: false, ambientOcclusion: false, screenReflections: false },
  medium: { label: 'Medium', pixelBudget: 1.6, maxPixelRatio: 1.5, shadowMapSize: 2048, shadowFilter: 'pcf', shadowQuality: 'medium', skyLighting: true, surfaceDetail: true, detailTextureSize: 128, postProcessing: false, ambientOcclusion: false, screenReflections: false },
  high: { label: 'High', pixelBudget: 2.6, maxPixelRatio: 2, shadowMapSize: 2048, shadowFilter: 'pcss', shadowQuality: 'medium', skyLighting: true, surfaceDetail: true, detailTextureSize: 256, postProcessing: { msaa: 4, fxaa: false, bloom: true, sharpen: 0.18 }, ambientOcclusion: { ratio: 0.5, samples: 8, radius: 2.4, strength: 1.1 }, screenReflections: false },
  ultra: { label: 'Ultra', pixelBudget: 4.6, maxPixelRatio: 2.5, shadowMapSize: 4096, shadowFilter: 'pcss', shadowQuality: 'high', skyLighting: true, surfaceDetail: true, detailTextureSize: 256, postProcessing: { msaa: 4, fxaa: true, bloom: true, sharpen: 0.22 }, ambientOcclusion: { ratio: 0.75, samples: 16, radius: 2.4, strength: 1.2 }, screenReflections: true },
};
/** Automatic tier adaptation: step down when the measured frame time stays above budget. */
export const graphicsGovernor = { warmupSeconds: 3, windowSeconds: 4, frameBudgetMs: 1000 / 45, ignoreFrameMs: 250 };
export const postEffects = { bloomThreshold: 0.88, bloomWeight: 0.32, bloomKernel: 48, bloomScale: 0.5, ssrStrength: 0.55, ssrMaxDistance: 120 };
/** Film-style grade on High/Ultra (Babylon ColorCurves: hue in degrees, others -100..100): warm highlights, cool shadows. */
export const colorGrade = { saturation: 8, highlights: { hue: 38, density: 12, saturation: 14 }, shadows: { hue: 205, density: 14, saturation: 12 } };

/** Biome colors stay independent of interface branding and the driver's selected paint. */
export const sceneryPalettes = {
  naval:{terrain:fleetAppearance.water,water:fleetAppearance.water,asphalt:'#a6b2b8',structure:'#637c87',sky:'#c6d9de',sunlight:1.06},
  yosemite:{terrain:'#61816a',embankment:'#859070',asphalt:'#8f826b',shoulder:'#a5a079',structure:'#5a6552',curb:'#ddd4b9',glass:'#39564b',foliage:'#254f3a',foliageLight:'#658351',rock:'#c5c2b3',trunk:'#795d40',water:'#367f84',foam:'#dfefdd',sky:'#afd5d9',sunlight:1.05},
  alpine: {terrain:'#dce7ee',embankment:'#b9cad6',asphalt:'#8ca6b9',shoulder:'#d2e0e9',structure:'#3b4f59',curb:'#edf5f7',glass:'#304f60',foliage:'#34564e',foliageLight:'#5e7970',rock:'#87959f',trunk:'#716357',water:'#23647f',foam:'#c4e3ec',sky:'#b1d3e3',sunlight:.96},
  'night-city': { terrain:'#34383e',embankment:'#53515a',asphalt:'#b4b4b8',shoulder:'#535058',structure:'#383440',curb:'#ded4c3',glass:'#272a34',foliage:'#344c45',foliageLight:'#637567',rock:'#5c5960',trunk:'#5c4d46',water:'#1c2c33',foam:'#8c9c9b',sky:'#15151f',sunlight:.42 },
  coastal: { terrain: '#dec697', embankment: '#a2ae7c', water: '#277e8d', shallows: '#76b8af', foliage: '#3e644a', foliageLight: '#839757' },
  sunset: { terrain: '#e4c59d', embankment: '#c8a47e', asphalt: '#9ca4ad', shoulder: '#ba9c7c', structure: '#765d60', foliage: '#526e58', foliageLight: '#8d9e68', rock: '#c5ac92', trunk: '#9c735a', water: '#388ca2', shallows: '#6bb5b9', foam: '#f1dbc3', sky: '#e5a3a0', sunlight: 1.08 },
  bay: { terrain: '#b9c2a6', embankment: '#bdbea8', asphalt: '#a7b2b8', shoulder: '#b5aa8f', structure: '#34434d', foliage: '#4c6857', foliageLight: '#879873', rock: '#b4b8ae', trunk: '#7e7769', water: '#3b8196', shallows: '#689b9c', foam: '#d7e8df', sky: '#b1ccd1', sunlight: 1.05 },
  spaceport: { terrain: '#d1bc9b', embankment: '#a69a85', asphalt: '#aeb1ad', shoulder: '#a99c85',
    structure: '#33404b', curb: '#e8e8dd', glass: '#243746', foliage: '#68674b', foliageLight: '#8d8863',
    rock: '#a69883', trunk: '#7d715d', sky: '#cfae94', sunlight: 1.05 },
  canyon: { terrain:'#bd8963',embankment:'#c69c72',asphalt:'#805d43',shoulder:'#b58b62',rock:'#ae6344',foliage:'#68724b',foliageLight:'#8c9565',trunk:'#765640',water:'#98785d',sky:'#e5c6a5',sunlight:1.08 },
} satisfies Record<string, Partial<PresentationTheme['scene']>>;
export const sceneryLighting = {
  naval:{ambient:'#dbe8eb',ground:'#647779',sun:'#ffe2b5'},
  yosemite:{ambient:'#d9e7d9',ground:'#67775b',sun:'#ffdfaa'},
  alpine: {ambient:'#d6e8f5',ground:'#8299aa',sun:'#fff1d9'},
  'night-city': {ambient:'#c5c2d0',ground:'#574d55',sun:'#e6d6c4'},
  coastal: { ambient: '#d6e5ed', ground: '#6e6957', sun: '#fff0cf' },
  sunset: { ambient: '#f7c9cb', ground: '#816c77', sun: '#ffd29b' },
  bay: { ambient: '#dcebf1', ground: '#717b6b', sun: '#fff1d5' },
  spaceport: { ambient: '#ddd6cf', ground: '#756755', sun: '#ffddb2' },
  canyon: { ambient:'#ead3b8',ground:'#836451',sun:'#ffdab0' },
};
/**
 * Real-sky lighting per venue: prefiltered CC0 HDRIs baked by `pnpm bake:env` into
 * public/assets/env/. The sky is turned so its brightest direction agrees with the sun.
 */
export const venueSkies = {
  naval:{file:'sky',intensity:.85,waterReflection:.8},
  yosemite:{file:'sky',intensity:.85,waterReflection:.7},
  alpine: {file:'sky',intensity:.8,waterReflection:.65},
  coastal: { file: 'sky', intensity: 0.85, waterReflection: 0.75 },
  spaceport: { file: 'dawn', intensity: 0.8, waterReflection: 0.7 },
  bay: { file: 'sky', intensity: 0.85, waterReflection: 0.8 },
  sunset: { file: 'sunset', intensity: 0.95, waterReflection: 0.6 },
  canyon: { file: 'dawn', intensity: 0.85, waterReflection: 0.6 },
  'night-city': { file: 'night', intensity: 0.7, waterReflection: 1 },
} satisfies Record<keyof typeof sceneryLighting, { file: string; intensity: number; waterReflection: number }>;
/**
 * Newport harbour dressing (presentation only; src/presentation/newport.ts). Angles and rings are
 * relative to the coastal island ellipse (85 × 62 m; ring 1 = shore, 1.25 = outer edge of its
 * shelf). Scales convert the CC0 Kenney models to metres (boats ~8 m, houses ~10 m).
 */
export const newportHarbour = {
  seed: 7, draft: 0.28, boatScale: 2.3, houseScale: 6, palmScale: 1.5, breeze: 2.3, berthStart: 5, berthGap: 0.9,
  dock: { length: 6, width: 2.2, deck: '#a8845d', piling: '#5c4636' },
  /** Marina piers run out from the beach at these ellipse angles (east end, west end, north shore). */
  piers: [
    { angle: 0.16, boats: ['boat-speed-a', 'boat-sail-a', 'boat-speed-c', 'boat-house-b'] },
    { angle: -0.22, boats: ['boat-sail-b', 'boat-speed-g', 'boat-fishing-small'] },
    { angle: Math.PI - 0.2, boats: ['boat-sail-a', 'boat-speed-i', 'boat-speed-b', 'boat-sail-b'] },
    { angle: Math.PI + 0.16, boats: ['boat-house-b', 'boat-speed-a', 'boat-speed-c'] },
    { angle: Math.PI + 0.48, boats: ['boat-fishing-small', 'boat-speed-g'] },
    { angle: -1.3, boats: ['boat-speed-b', 'boat-sail-a'] },
  ],
  islets: [
    { angle: 0.66, ring: 1.52, length: 34, width: 14, houses: ['house-b', 'house-n-blue', 'house-e'], boats: ['boat-speed-a', 'boat-sail-a', 'boat-speed-g'], palms: [-0.92, 0.9] },
    { angle: Math.PI - 0.66, ring: 1.52, length: 34, width: 14, houses: ['house-d', 'house-s', 'house-g'], boats: ['boat-sail-b', 'boat-speed-c', 'boat-speed-i'], palms: [-0.9, 0.92] },
    { angle: -0.62, ring: 1.54, length: 34, width: 14, houses: ['house-u', 'house-a', 'house-d-blue'], boats: ['boat-speed-b', 'boat-house-b', 'boat-speed-a'], palms: [-0.92, 0.9] },
    { angle: Math.PI + 0.64, ring: 1.54, length: 34, width: 14, houses: ['house-c', 'house-b-blue', 'house-h'], boats: ['boat-fishing-small', 'boat-speed-g', 'boat-sail-a'], palms: [-0.9, 0.92] },
  ],
  /** Moored boats in the shallows (rings beyond the shore), clear of piers, islets and the grandstand side. */
  moorings: { step: 0.15, pierClearance: 0.2, isletClearance: 0.3, avoid: [[1.2, 1.95]] as [number, number][], rings: [1.13, 1.21, 1.17], boats: ['boat-sail-a', 'boat-speed-c', 'boat-sail-b', 'boat-speed-i', 'boat-row-small', 'boat-speed-a', 'boat-sail-a', 'boat-speed-b', 'boat-fishing-small', 'boat-speed-g'] },
  buoys: { ring: 1.27, step: 0.5, offset: 0.25 },
  underWay: [
    { key: 'boat-sail-b', ring: 1.33, speed: 2.4, phase: 0.4 },
    { key: 'boat-speed-i', ring: 1.34, speed: 4.6, phase: 2.5 },
    { key: 'boat-fishing-small', ring: 1.33, speed: 3, phase: 4.5 },
  ],
};

/**
 * Home key art (public/assets/hero/<id>-wide.webp and -tall.webp; provenance in docs/ASSET_RIGHTS.md).
 * One picture is chosen at random each time the player arrives on Home. `wide`/`tall` are CSS
 * object-position focus points that keep the cars in frame when a screen crops the picture.
 */
export const heroArtRevision = '2026-10-29-steel';
export const heroImages = [
  { id: 'thruster-hop', wide: '78% 50%', tall: '50% 72%' },
  { id: 'drivers-grid', wide: '100% 60%', tall: '50% 80%' },
  { id: 'door-to-door', wide: '100% 50%', tall: '50% 60%' },
  { id: 'water-jump', wide: '50% 52%', tall: '50% 50%' },
  { id: 'canyon-jump', wide: '58% 45%', tall: '50% 50%' },
] as const;

/**
 * World-space surface detail by material role (scenery-specific roles override the shared ones).
 * kind selects a procedural tile; scale is metres per tile; normal is the bump strength;
 * variation the broad tonal mottling. Water adds animated waves and sky reflection.
 */
export type SurfaceKind = 'asphalt' | 'sand' | 'dirt' | 'concrete' | 'grass' | 'rock' | 'water' | 'wood' | 'snow' | 'brick';
export interface SurfaceFinish { kind: SurfaceKind; scale: number; normal: number; variation: number; walls?: boolean; reflection?: number; roughness?: number; specular?: number; gloss?: number }
export const surfaceFinishes: Record<string, SurfaceFinish> = {
  asphalt: { kind: 'asphalt', scale: 10, normal: 0.27, variation: 0.13, specular: 0.065, gloss: 22 },
  'asphalt-repair': { kind: 'asphalt', scale: 10, normal: 0.3, variation: 0.08 },
  'rubbered-racing-surface': { kind: 'asphalt', scale: 10, normal: 0.2, variation: 0.06 },
  shoulder: { kind: 'dirt', scale: 12, normal: 0.5, variation: 0.14 },
  terrain: { kind: 'sand', scale: 26, normal: 0.6, variation: 0.16 },
  'wet-sand': { kind: 'sand', scale: 20, normal: 0.3, variation: 0.12, reflection: 0.15, roughness: 0.5, specular: 0.2, gloss: 48 },
  embankment: { kind: 'grass', scale: 14, normal: 0.55, variation: 0.18 },
  'barrier-concrete': { kind: 'concrete', scale: 8, normal: 0.25, variation: 0.07 },
  'city-paving': { kind: 'concrete', scale: 10, normal: 0.3, variation: 0.1 },
  'pier-timber': { kind: 'wood', scale: 8, normal: 0.24, variation: 0.12, specular: .045, gloss: 12 },
  rock: { kind: 'rock', scale: 9, normal: 0.7, variation: 0.14, walls: true },
  'mesa-cap': { kind: 'rock', scale: 14, normal: 0.6, variation: 0.12, walls: true },
  'sandstone-*': { kind: 'rock', scale: 16, normal: 0.6, variation: 0.1, walls: true },
  // Procedural landscape (landscape/): colour lives in the vertices, the finish adds grain and relief.
  'landscape-rock': { kind: 'rock', scale: 5, normal: 0.48, variation: 0.13, walls: true },
  'canyon-trail-rock': { kind: 'rock', scale: 4, normal: 0.6, variation: 0.1, walls: true },
  'landscape-plants': { kind: 'grass', scale: 1.6, normal: 0.8, variation: 0.14, walls: true },
  foliage: { kind: 'grass', scale: 2.5, normal: 0.9, variation: 0.22, walls: true },
  foliageLight: { kind: 'grass', scale: 2.5, normal: 0.9, variation: 0.22, walls: true },
  trunk: { kind: 'rock', scale: 1.5, normal: 0.6, variation: 0.12, walls: true },
  architecture: { kind: 'concrete', scale: 6, normal: 0.15, variation: 0.06, walls: true },
  'city-facade': { kind: 'concrete', scale: 6, normal: 0.15, variation: 0.07, walls: true },
  water: { kind: 'water', scale: 30, normal: 0.5, variation: 0.08, reflection: 0.6, roughness: 0.16, specular: 0.3, gloss: 150 },
  shallows: { kind: 'water', scale: 24, normal: 0.35, variation: 0.08, reflection: 0.4, roughness: 0.25 },
  'architecture-glass': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.65, roughness: 0.12 },
  'city-shopfront': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.4, roughness: 0.2 },
  'galvanized-rail': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.35, roughness: 0.35 },
  'orbital-metal': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.35, roughness: 0.3 },
  'bay-metal': { kind: 'concrete', scale: 40, normal: 0, variation: 0, reflection: 0.3, roughness: 0.35 },
};
export const sceneryFinishes: Partial<Record<keyof typeof sceneryLighting, Record<string, SurfaceFinish>>> = {
  naval:{terrain:{kind:'water',scale:90,normal:.10,variation:.035,reflection:.35,roughness:.32,specular:.12,gloss:80},'fleet-hull':{kind:'concrete',scale:14,normal:.045,variation:.035,walls:true,reflection:.18,roughness:.56},'fleet-deck':{kind:'asphalt',scale:9,normal:.10,variation:.055,reflection:.08,roughness:.80},'fleet-equipment':{kind:'concrete',scale:6,normal:.05,variation:.025,walls:true,reflection:.12,roughness:.48}},
  yosemite:{terrain:{kind:'dirt',scale:22,normal:.26,variation:.08},asphalt:{kind:'dirt',scale:12,normal:.32,variation:.12},shoulder:{kind:'dirt',scale:15,normal:.26,variation:.1},'yosemite-granite':{kind:'rock',scale:11,normal:.32,variation:.13,walls:true}},
  alpine: {terrain:{kind:'snow',scale:18,normal:.16,variation:.035},asphalt:{kind:'snow',scale:10,normal:.2,variation:.055},shoulder:{kind:'snow',scale:14,normal:.19,variation:.04},'tahoe-granite':{kind:'rock',scale:5,normal:.45,variation:.12,walls:true}},
  // Golden Gate paints its land in full colour; the finish adds only fine grain. The shore carries vertex colour.
  bay: { 'city-facade':{kind:'brick',scale:3.6,normal:.20,variation:.12,walls:true}, terrain: { kind: 'grass', scale: 16, normal: 0.55, variation: 0.18 }, 'city-ground': { kind: 'dirt', scale: 6, normal: 0.3, variation: 0.05 }, 'golden-shore': { kind: 'dirt', scale: 14, normal: 0.5, variation: 0.1 } },
  // Launchsite paints its own ground; its sand keeps fine, low ripples so the paint reads.
  spaceport: { terrain: { kind: 'sand', scale: 11, normal: 0.4, variation: 0.1 } },
  // Newport and Santa Monica paint their beaches; fine, low ripples keep the paint readable.
  coastal: { terrain: { kind: 'sand', scale: 11, normal: 0.45, variation: 0.1 } },
  sunset: { terrain: { kind: 'sand', scale: 11, normal: 0.4, variation: 0.1 } },
  canyon: { terrain: { kind: 'dirt', scale: 22, normal: 0.7, variation: 0.18 }, asphalt: { kind: 'dirt', scale: 12, normal: 0.55, variation: 0.14 }, shoulder: { kind: 'dirt', scale: 16, normal: 0.6, variation: 0.16 } },
  'night-city': { 'la-facade-1':{kind:'brick',scale:3.6,normal:.18,variation:.10,walls:true},'la-facade-3':{kind:'brick',scale:4.8,normal:.16,variation:.10,walls:true}, terrain: { kind: 'concrete', scale: 12, normal: 0.3, variation: 0.12 }, 'la-ground': { kind: 'concrete', scale: 12, normal: 0.3, variation: 0.06 }, asphalt: { kind: 'asphalt', scale: 10, normal: 0.35, variation: 0.08, reflection: 0.2, roughness: 0.45, specular: 0.14, gloss: 60 } },
};

export const canyonAppearance={cliff:['#a85f43','#bc7850','#d39464','#e1ad79'],mesa:'#c6986b',road:'#aa895d',ruts:'#705c42',dryWash:'#d9b891',scrub:'#68724b',guard:'#96745a'};
/** Cosmetic trail geology: actual support edges/elevations stay authoritative. */
export const canyonIntegration = {
  floor: -2.6, bankLayers: 16, baseSpread: 1.65, bedHeight: 2.6,
  rimRoughness: 1.1, roadRoughness: 0.9, roadFeather: 1.8,
  cliffErosion: 0.55,
  strata: ['#914b38', '#ca8556', '#e6b87f', '#a65d43', '#ecd0a1', '#a4563b', '#c78b61'],
  cap: '#c49b72', dust: '#b98159', shade: '#6f4437',
  shoulderMapSize: 2048,
};
export const nightAppearance={facades:['#645d65','#785a67','#5c7474','#89705c','#6c797e','#826b78'],neon:['#ff93b6','#97d8df','#ffc480'],window:'#ffe0a2',darkWindow:'#29272e',signBackground:'#221e29',poolOpacity:.48,glowIntensity:.4,glowTextureSize:256,glowKernel:24,ambientIntensity:.8,vehicleFill:.55,gameExposure:1.12,menuExposure:.65};
export function sceneryTheme(theme: PresentationTheme, scenery: keyof typeof sceneryPalettes): PresentationTheme {
  return { ...theme, scene: { ...theme.scene, ...sceneryPalettes[scenery] } };
}

export function applyTheme(theme: PresentationTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  for (const [key, value] of Object.entries(theme.ui)) root.style.setProperty(`--${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}`, value);
  root.style.setProperty('--font-body', theme.typography.body);
  root.style.setProperty('--font-display', theme.typography.display);
  root.style.setProperty('--water', theme.scene.water);
  root.style.setProperty('--pace-slow', theme.pace.slow);
  root.style.setProperty('--pace-medium', theme.pace.medium);
  root.style.setProperty('--pace-fast', theme.pace.fast);
  applyPlayerColors(theme.players);
  setIdentityColors('control', abilityControlColors);
  document.title = `${theme.branding.title.replace(' / ', ' ')} — ${theme.branding.tagline}`;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme.scene.water);
}

export function applyPlayerColors(colors: readonly string[]) {
  setIdentityColors('player', colors);
}

function setIdentityColors(prefix: 'player' | 'control', colors: readonly string[]) {
  const root = document.documentElement;
  colors.forEach((color, i) => {
    root.style.setProperty(`--${prefix}-${i + 1}`, color);
    const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    root.style.setProperty(`--${prefix}-${i + 1}-ink`, luminance < 0.179 ? '#ffffff' : '#000000');
  });
}

export const thrustEffects = { capacity: 96, emission: 120, lifetime: 0.8, exhaustSpeed: 5, startSize: 0.45, expansion: 2.1, opacity: 0.66, color: "#e1eff3", coreColor: "#e6fbff", coreOpacity: 0.72 };
export const hopEffects = { pulse: 0.22, nozzleHeight: 0.20, puffs: 16, lifetime: 0.6, downwardSpeed: 18, size: 0.65, mounts: [{ x: -0.52, z: -1.8 }, { x: 0.52, z: -1.8 }, { x: -0.52, z: 1.8 }, { x: 0.52, z: 1.8 }], coreColor: '#eef8ff', maxBodyPitch: 0.12 };

/** Shared city materials; architecture placement is authored in content/golden-city.ts. */
export const cityAppearance = { bridge: '#e45534', facades: ['#caba91', '#8aa49a', '#bb8068', '#9daabb', '#d8be8d', '#9b8173'], paving: '#d2bfa1', roof: '#52616a', shop: '#354953', window: '#456575', warmWindow: '#b9bd9d' };
export const sunsetAppearance = { deck: '#a9866b', steel: '#465360', ivory: '#f6e4cc', glass: '#4a7e91', coral: '#e67b77', gold: '#eec575' };
export const pierRampAppearance = { surfaceOffset:.11,plankLength:.58,boards:['#fff7e8','#e7d9c4','#f6ead7','#d2c9b8','#eee0ca'],shade:'#655c51',fascia:'#c6b9a3',joist:'#a59985',hardware:'#78817f' };
export const pierComposition={wheelX:96.5,wheelY:27,wheelZ:15,wheelRadius:24,speed:.055,coral:'#f07359',ivory:'#fff0ce',gold:'#f3c55f',glass:'#507987',timber:'#bd9870',deckSeam:'#8d735a',cabins:['#ef7054','#62b7b0','#edbf49','#ac83bf'],coaster:{x:104,z:30,rx:29,rz:6,base:3,amplitude:11.5}};
/** Large native attractions, reused material batches and one capped vapor mesh. */
export const landmarkShowcase={
 rockets:[{x:105,z:11,height:36,radius:3.5,form:'ship'},{x:105,z:29,height:40,radius:3.8,form:'booster'},...launchsiteRemoteRockets],
 boilOff:{capacity:96,period:5.2,opacity:.6,color:'#f2f5ef',sizeStart:1.15,sizeGrowth:6.8,rise:10,drift:7,vents:[{x:95,y:19,z:16.5},{x:105,y:25,z:7},{x:105,y:28,z:26},...launchsiteRemoteRockets.map(r=>({x:r.x,y:r.height*.6,z:r.z-3}))]},
 bridge:{hangerSpacing:4,hangerWidth:.18,deckY:1.0},
 tahoe:{snow:'#f4f2e7',shade:'#afc4ce',steel:'#344653',red:'#d35449',glass:'#527784',wood:'#805637',warm:'#f1ca84',cloth:'#ac3e3a',clearings:[{x:-36,z:-8.2,width:24,depth:7.2},{x:24,z:-20,width:9,depth:27},{x:-54,z:16,width:13,depth:9},{x:1,z:24,width:19,depth:5},{x:-55,z:1,width:11,depth:8},{x:-43,z:25,width:12,depth:7},{x:26,z:8,width:10,depth:9}]},
 skyline:{warm:'#efd8ab',cool:'#9ebbc0',facade:'#41434b',roof:'#8e7769'},
};
export const shoreComposition={speed:.065,opacity:.67,foam:'#e7eee2'};
export const urbanRampAppearance = { concrete:'#e4e7e7',edge:'#c5cdd1',paving:'#dce1e3',drain:'#405058',surfaceOffset:.10 };

/** Large compositions and roofscape colors, tuned in the fixed phone overview. */
export const venueComposition={
 night:{facades:['#9b8278','#b07879','#899383','#b6976a','#8b9b95','#a78396'],roofs:['#938075','#a97659','#718f82','#a47b87'],foot:'#625b5b',trim:'#dbcaad',window:'#343a41',light:'#ffe3ac',door:'#3b3438',terrace:'#ba956c',plant:'#50725d',paving:'#7d756c',neon:['#ffacbf','#a5dddd','#ffd197']},
 city:{facades:['#edc583','#69b1b0','#df886b','#9fb7d0','#edc759','#b194c6'],roofs:['#ab5239','#d27d4c','#62948a','#d0a65c'],foot:'#b6b09b',trim:'#fff0cd',window:'#3a697b',light:'#e6d5a4',door:'#52615e',terrace:'#b69b77',plant:'#4f7856',paving:'#c6bda6',neon:['#e4c488']},
 coastal:{roof:'#c98361',wall:'#f0e2c7',wood:'#a77e55',glass:'#527f8a',trim:'#f8edcf',leaf:'#397251',sand:'#dfc99e'},
 industrial:{roof:'#b7c6c8',steel:'#536c78',dark:'#334954',trim:'#e3e7d9',glass:'#72a0aa',accent:'#d48852'},
 mountain:{snowLight:'#fffdf5',snowShade:'#658dae',snowGully:'#3f6482',granite:'#657077',talus:'#a9ac91',valleyGreen:'#537b55',riparian:'#3d7254',canyonBeds:['#824b3b','#c47b4d','#e0b178','#a65c43','#eed1a0']},
};
export const venueSignatureAppearance={
 launch:{orange:'#cc5e33',white:'#edf1df',glass:'#477d8b',steel:'#354954'},
 bay:{ivory:'#f9e7c5',glass:'#418985',trim:'#c7c9a8',brick:'#ad614b',paving:'#c8bca4'},
 night:{canopy:'#6d3e45',frame:'#d8b184',amber:'#ffd496',coral:'#ed8c8c',roof:'#b58769',planter:'#d0ac86',leaf:'#537c58'},
};

/** Decorative density/scale only. All geometry is batched and stays on existing structures. */
export const venueDetail = { floorSpacing: 1.9, rockLayers: 7, mesaStones: 34, stoneScale: 1.15,
  strataContrast: .12, dirtWearOpacity: .12, dirtTextureScale: 3 };

/** Parked cars share opaque facade batches, but must not inherit masonry detail. */
export const parkedVehicleFacades = [0, 2, 4, 5] as const;
export const ghostAppearance = { color: '#a6e5ed', opacity: 0.32 };

export const snowyTahoeAppearance = {
  surfaceOffsets:{road:.12,branch:.13,fringe:.045,branchFringe:.055},
  snow:'#dce7ee',packed:'#8ca6b9',ruts:'#7e99aa',powder:'#eef5f7',fir:'#304f46',firLight:'#526f63',bark:'#6d5a48',rock:'#87959f',timber:'#8e7254',lodge:'#a28869',roof:'#c9dbe5',window:'#dcb77b',lake:'#23647f',
  extent:{minX:-320,maxX:340,minZ:-270,maxZ:300},corridor:24,treeCount:460,nearTreeCount:160,nearTreeHeight:[5.5,10] as const,nearTreeOffset:[18,24] as const,
  cabin:'#a06c45',stone:'#89969f',lift:'#b73f46',steel:'#3e5361',cutTimber:'#cbb087',
  weather:{flakes:1050,groundWisps:48,size:1.3,opacity:.72,fallSpeed:4.4,gustPeriod:19,wind:6,nearCourse:.74,wispSize:7.5,wispOpacity:.11},
  slopeGrooming:{spacing:6,width:.16,inset:2.3,minimumGrade:.25,surfaceGap:.018},
  liftSpeed:3.8,
};

/** Original granite-valley presentation; all physical heights/footprints come from the track. */
export const yosemiteAppearance={
 extent:{minX:-280,maxX:300,minZ:-220,maxZ:320},cameraElevation:58,road:'#8f8065',shoulder:'#a3936d',meadow:'#7c9368',dryMeadow:'#b4ab79',forestFloor:'#45624b',forest:'#34553d',forestLight:'#70865a',bark:'#71563e',granite:['#aeb6b1','#c9c8b9','#e2ddce','#737f83'],lichen:'#727b4e',timber:'#896648',roof:'#495548',window:'#b9d5bf',water:'#438c8d',waterDeep:'#285b6c',foam:'#dcebdc',
 treeCount:400,treeHeight:[11,25],nearTreeCount:180,nearTreeHeight:[7,13],nearTreeSetback:14,nearTreeSightline:.45,cedar:'#3c644c',fern:'#426c42',grass:'#8b995a',flowers:'#d4c37c',surfaceOffsets:{road:.12,branch:.13,fringe:.045,branchFringe:.055},mist:{count:18,opacity:.04,speed:.42},
 waterfall:{speed:.8,sprayCount:36,dropletCount:54,gravity:28,opacity:.96,sprayOpacity:.48,wetRock:'#657b7b',lipFraction:.90,lipRadius:.88,waterRadius:.89,halfAngle:.42,curtainWidth:10.8,basinWidth:16,basinDepth:10,basinHeight:.75,angle:Math.PI/2+.04,
  widths:{'granite-falls':10.8,'creek-falls':6.4,'cathedral-falls':7.2,'sentinel-falls':6.6,'sentinel-buttress-falls':7.4,'granite-twin-falls':6.2} as Record<string,number>},
 dressing:{roadWorn:'#b0a07d',roadEdge:'#857d60',barkDark:'#4d3a2c',cutWood:'#c8ab77',stonework:'#a2a18f',trim:'#d6cfac',roofSeam:'#687166'},
 riverLife:{length:7.2,width:1.8,bob:.045,roll:.012,paddleSpeed:2.6,paddleSwing:.34,travel:5,cruisePeriod:48,
  hulls:['#f35a40','#ffce43','#f18c41'],wood:'#d4ad75',interior:'#b99567',vest:'#ffd05a',shirt:'#315c74',skin:'#d6a27c',foam:'#c0d9d3',
  anchors:[{x:14,z:-10},{x:14,z:-30},{x:14,z:-46}]},
};

export const roadsideAppearance = {
 spacing:3.8,plantingOffset:3.4,plantHeight:.65,maxFurniture:48,
 palettes:{
  coastal:{plant:'#496c40',tip:'#9bab68',flower:'#e58bb5',trim:'#d2c5a1',timber:'#ae8f64',metal:'#5a7070',surface:'#3f4848'},
  naval:{plant:'#527e68',tip:'#adc6bb',flower:'#d5bf79',trim:'#b9c8ca',timber:'#858b82',metal:'#637781',surface:'#818e91'},
  spaceport:{plant:'#6d7651',tip:'#b5ae78',flower:'#d5bf79',trim:'#b8c4c6',timber:'#858b82',metal:'#4e626b',surface:'#514d45'},
  bay:{plant:'#3e6b4c',tip:'#82a469',flower:'#d6a673',trim:'#c7c1ad',timber:'#896f55',metal:'#53616a',surface:'#535d61'},
  sunset:{plant:'#6d8551',tip:'#b8b47d',flower:'#e9a197',trim:'#e3ccaa',timber:'#b78f66',metal:'#57686a',surface:'#5d5349'},
  canyon:{plant:'#74784c',tip:'#b6a26c',flower:'#d7aa69',trim:'#ab835f',timber:'#876543',metal:'#6a6056',surface:'#b58a64'},
  'night-city':{plant:'#355b50',tip:'#6c8979',flower:'#a79fc8',trim:'#8d9ca6',timber:'#687273',metal:'#3c5362',surface:'#435262'},
  alpine:{plant:'#7a9290',tip:'#d1dce0',flower:'#e9eff0',trim:'#b4c5cb',timber:'#95755b',metal:'#586c7a',surface:'#c0d1d8'},
  yosemite:{plant:'#537548',tip:'#a9ae6e',flower:'#d5c481',trim:'#a8a794',timber:'#97754d',metal:'#53645a',surface:'#b1a080'},
 },
};

/** Santa Monica beach life (santa-monica-beach-life.ts): one opaque vertex-colour batch of people, structures and boats. */
export const santaBeachLifeAppearance = {
  skin: ['#f3cfae', '#e3b08a', '#c99067', '#a8704a', '#7f5236', '#5c3b28'],
  hair: ['#2a201a', '#5b3d2a', '#9a6a3e', '#d8b46c', '#18181b', '#b9b1a7', '#b5452f'],
  clothes: ['#e54b4b', '#f2a541', '#f6dd5c', '#3fb8af', '#2f6fd6', '#7d4fd1', '#ffffff', '#f27fb2', '#2c3e50', '#8bd17c', '#ff7b54', '#5ec2e6'],
  swimwear: ['#d62d4f', '#1f4fa8', '#15181c', '#f28c28', '#18a39a', '#e8467c', '#f6dd5c', '#6d4bc3'],
  towels: ['#c83a3c', '#3c60be', '#ecc446', '#f7f4ec', '#3c968c', '#e678aa', '#7a5bd0', '#f08a3c'],
  umbrellas: ['#e45d5d', '#f7f4ec', '#f2c14e', '#36a6a1', '#4a74d4', '#f08ac0', '#ff8c42'],
  boards: ['#f6dd5c', '#ff7b54', '#5ec2e6', '#f7f4ec', '#e8467c', '#3fb8af', '#a3d977'],
  huts: ['#9fd3e6', '#f7e08a', '#f4a6b4', '#b9e3c6'],
  trim: '#f6f1e6', timber: '#b88b5e', deck: '#a07d62', concrete: '#d6cfc2', steel: '#4a5763', glass: '#2c4d5c', dark: '#25292e',
  rope: '#f2efe6', ropeAccent: '#2d5fa8', rescue: '#e8432e', yellow: '#f5c518', tier: ['#7fb9d6', '#f6f1e6'], seat: '#d9573f',
  fence: ['#2d5fa8', '#e8432e', '#f5c518'], truck: ['#3fb8af', '#f6f1e6'], truckStripe: '#e8467c', cafe: ['#f6e4cc', '#e67b77', '#3a8f8a'],
  hull: ['#ffffff', '#f3efe4', '#1f3a5f', '#b8392d'], sail: ['#ffffff', '#f6efe0', '#f2d7c4'], kayak: ['#f2a541', '#e54b4b', '#3fb8af', '#f6dd5c'],
  buoy: ['#f7c948', '#e8432e', '#ffffff'], foam: '#f4fbfb', plant: '#5f8a42', pot: '#c96f4a', bike: ['#2f6fd6', '#e54b4b', '#3fb8af', '#15181c'],
};
/** Shared miniature-world ground treatment. Thin opaque geometry joins existing batches. */
export interface VenueFinish { edge:string; ground:string; grit:string; inset:number; spread:number }
export const venueFinish = {
 coastal:{edge:'#b4a384',ground:'#d6c19a',grit:'#e9d9b9',inset:.9,spread:1.2},
 naval:{edge:'#81939c',ground:'#81939c',grit:'#a7b5b7',inset:.9,spread:.5},
 spaceport:{edge:'#9f9784',ground:'#ceba98',grit:'#e4d4b5',inset:.9,spread:1.2},
 bay:{edge:'#92998e',ground:'#b0ba9c',grit:'#d6d4be',inset:.9,spread:.9},
 sunset:{edge:'#bba587',ground:'#dec49f',grit:'#f0dcc0',inset:.9,spread:1.2},
 canyon:{edge:'#aa885f',ground:'#c09267',grit:'#d9af7f',inset:.18,spread:1.1},
 'night-city':{edge:'#394550',ground:'#28384b',grit:'#5b6268',inset:.9,spread:.8},
 alpine:{edge:'#bacbd5',ground:'#dce7ee',grit:'#f1f6f7',inset:.18,spread:1.15},
 yosemite:{edge:'#a08e6c',ground:'#84906a',grit:'#bdaf8b',inset:.18,spread:1.05},
} satisfies Record<string,VenueFinish>;
export const interfaceMotion = { durationMs:160, rowStaggerMs:40 };
export const circuitArtRevision = '2026-11-06-fleet-signature';
/** One sun per venue; unchanged shadow-map dimensions and cached caster policy. */
export const venueSunDirections = {
 naval:[.55,-1,.5],
 coastal:[.50,-1,.60],spaceport:[.65,-1,.38],bay:[.40,-1,.62],sunset:[.72,-1,.35],
 canyon:[.68,-1,.44],'night-city':[.55,-1,.45],alpine:[.48,-1,.64],yosemite:[.64,-1,.42],
} as const;
