import { assetUrl } from './urls';

export const paintFinishes = [
  { id: 'crimson', name: 'Crimson', color: '#d51f35' },
  { id: 'glacier', name: 'Glacier silver', color: '#dfe7eb' },
  { id: 'cobalt', name: 'Cobalt blue', color: '#3b79e6' },
  { id: 'solar', name: 'Solar yellow', color: '#f1be37' },
  { id: 'verdant', name: 'Verdant green', color: '#45a77b' },
  { id: 'ultraviolet', name: 'Ultraviolet', color: '#a477e5' },
] as const;

export interface PresentationTheme {
  id: 'coastal' | 'graphite';
  branding: { title: string; tagline: string; logo: string };
  typography: { body: string; display: string };
  ui: { surface: string; text: string; muted: string; accent: string; accentText: string; border: string; radius: string };
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
    ui: { surface: '#111820', text: '#f4f5f6', muted: '#b6c0c9', accent: '#f0444b', accentText: '#ffffff', border: '#39434d', radius: '3px' },
    scene: { water: '#216574', shallows: '#5a9e9c', foam: '#d1e5da', terrain: '#c7b78d', embankment: '#a7ae8a', asphalt: '#b0b6ba', structure: '#26313b', shoulder: '#9a9586', curb: '#ede9de', paint: '#d51f35', glass: '#13212c', foliage: '#344d36', foliageLight: '#687349', rock: '#b7b5a5', trunk: '#786b53', route: '#ff4c48', paceFast: '#4ce879', sky: '#a4b8c1', sunlight: 1.0 },
    players: ['#4caaff', '#ffac4c', '#ba91ff', '#56e0d2'],
    venue: { concrete: '#c6c8be', metal: '#7e8a8d', accent: '#bd303b', rubber: '#222c31', marking: '#e8e5d8', repair: '#41494a' },
    pace: { slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 },
  },
  graphite: {
    id: 'graphite',
    branding: { title: 'ROADSTER / RACE', tagline: 'Find your flow.', logo: assetUrl('assets/mark-graphite.svg') },
    typography: { body: 'Barlow, system-ui, -apple-system, sans-serif', display: 'Barlow, system-ui, sans-serif' },
    ui: { surface: '#172022', text: '#f1f5e8', muted: '#b8c6bd', accent: '#d7f877', accentText: '#18291e', border: '#47554e', radius: '3px' },
    scene: { water: '#234d60', shallows: '#4a8e91', foam: '#b1dace', terrain: '#b8b69b', embankment: '#b7c5b1', asphalt: '#b3c0c7', structure: '#263b40', shoulder: '#919b86', curb: '#e4dfcb', paint: '#d7f877', glass: '#182e35', foliage: '#3a6357', foliageLight: '#839b73', rock: '#b1bdb4', trunk: '#81765f', route: '#dcf896', paceFast: '#f3aa6c', sky: '#739597', sunlight: 0.85 },
    players: ['#d7f877', '#f3aa6c', '#bea3e9', '#ec9cbe'],
    venue: { concrete: '#b8c1b6', metal: '#74898a', accent: '#bd303b', rubber: '#182b2e', marking: '#e7ecd9', repair: '#3b4b4c' },
    pace: { slow: '#ff4c48', medium: '#ffd15a', fast: '#4ce879', width: 10, outlineWidth: 14, racingWidth: 8, racingOutlineWidth: 11 },
  },
};

/** Presentation only: camera, lighting and quality never enter route compilation or physics. */
export const sceneTuning = {
  vehicle: { racingScale: 1.12 },
  camera: { elevationDegrees: 42, compactElevationDegrees: 65, azimuthDegrees: 5, verticalFov: 0.5, fittingMargin: 1, clearancePixels: 6, azimuthStep: 5 },
  grading: { exposure: 1.16, contrast: 1.1 },
  lighting: { ambient: 0.55, sunlight: 1.25, shadowDarkness: 0.32, shadowMapSize: 1024 },
};

/** Biome colors stay independent of interface branding and the driver's selected paint. */
export const sceneryPalettes = {
  coastal: { terrain: '#dec697', embankment: '#a2ae7c', water: '#277e8d', shallows: '#76b8af', foliage: '#3e644a', foliageLight: '#839757' },
  sunset: { terrain: '#e4c59d', embankment: '#c8a47e', asphalt: '#9ca4ad', shoulder: '#ba9c7c', structure: '#765d60', foliage: '#526e58', foliageLight: '#8d9e68', rock: '#c5ac92', trunk: '#9c735a', water: '#388ca2', shallows: '#6bb5b9', foam: '#f1dbc3', sky: '#e5a3a0', sunlight: 1.08 },
  bay: { terrain: '#b9c2a6', embankment: '#bdbea8', asphalt: '#a7b2b8', shoulder: '#b5aa8f', structure: '#34434d', foliage: '#4c6857', foliageLight: '#879873', rock: '#b4b8ae', trunk: '#7e7769', water: '#3b8196', shallows: '#689b9c', foam: '#d7e8df', sky: '#b1ccd1', sunlight: 1.05 },
  spaceport: { terrain: '#d1bc9b', embankment: '#a69a85', asphalt: '#aeb1ad', shoulder: '#a99c85',
    structure: '#33404b', curb: '#e8e8dd', glass: '#243746', foliage: '#68674b', foliageLight: '#8d8863',
    rock: '#a69883', trunk: '#7d715d', sky: '#cfae94', sunlight: 1.05 },
} satisfies Record<string, Partial<PresentationTheme['scene']>>;
export const sceneryLighting = {
  coastal: { ambient: '#d6e5ed', ground: '#6e6957', sun: '#fff0cf' },
  sunset: { ambient: '#f7c9cb', ground: '#816c77', sun: '#ffd29b' },
  bay: { ambient: '#dcebf1', ground: '#717b6b', sun: '#fff1d5' },
  spaceport: { ambient: '#ddd6cf', ground: '#756755', sun: '#ffddb2' },
};
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
  document.title = `${theme.branding.title.replace(' / ', ' ')} — ${theme.branding.tagline}`;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme.scene.water);
}

export function applyPlayerColors(colors: readonly string[]) {
  const root = document.documentElement;
  colors.forEach((color, i) => {
    root.style.setProperty(`--player-${i + 1}`, color);
    const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    root.style.setProperty(`--player-${i + 1}-ink`, luminance < 0.179 ? '#ffffff' : '#000000');
  });
}

export const thrustEffects = { capacity: 96, emission: 120, lifetime: 0.8, exhaustSpeed: 5, startSize: 0.45, expansion: 2.1, opacity: 0.66, color: "#e1eff3", coreColor: "#e6fbff", coreOpacity: 0.72 };

/** Shared city materials; architecture placement is authored in content/golden-city.ts. */
export const cityAppearance = { bridge: '#cb4b36', facades: ['#caba91', '#8aa49a', '#bb8068', '#9daabb', '#d8be8d', '#9b8173'], paving: '#bbb7a6', roof: '#52616a', shop: '#354953', window: '#456575', warmWindow: '#b9bd9d' };
export const sunsetAppearance = { deck: '#a9866b', steel: '#465360', ivory: '#f6e4cc', glass: '#4a7e91', coral: '#e67b77', gold: '#eec575' };

export const ghostAppearance = { color: '#a6e5ed', opacity: 0.32 };
