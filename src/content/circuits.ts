import { goldenGateTrack } from '../core/tracks/golden-gate';
import { coastalTrack } from '../core/track';
import { orbitalTrack } from '../core/tracks/orbital';
import { santaMonicaTrack } from '../core/tracks/santa-monica';
import type { TrackDefinition } from '../core/types';

export type SceneryId = 'coastal' | 'spaceport' | 'bay' | 'sunset';
export interface CircuitDefinition {
  id: string;
  number: string;
  scenery: SceneryId;
  track: TrackDefinition;
  difficulty: string;
  tagline: string;
  description: string;
  features: string[];
}
export const circuits: readonly CircuitDefinition[] = [
  { id: coastalTrack.id, number: '01', scenery: 'coastal', track: coastalTrack, difficulty: 'CLUB / 2',
    tagline: 'One circuit. Endless possibilities.', description: 'Open sweepers, a tight inner turn and generous coastal runoff.',
    features: ['Coastal sweepers', 'Sand runoff', `${Math.round(coastalTrack.length)} m`] },
  { id: orbitalTrack.id, number: '02', scenery: 'spaceport', track: orbitalTrack, difficulty: 'SPORT / 3',
    tagline: 'Launch straight. Precision return.', description: 'A long thrust straight and a linked technical return through a spaceport.',
    features: ['Launch straight', 'Linked S complex', `${Math.round(orbitalTrack.length)} m`] },
  { id: goldenGateTrack.id, number: '03', scenery: 'bay', track: goldenGateTrack, difficulty: 'EXPERT / 4',
    tagline: 'City precision. Bridge speed.', description: 'Technical city streets, waterfront turns and a suspension bridge across the bay.',
    features: ['City streets', 'Suspension bridge', `${Math.round(goldenGateTrack.length)} m`] },
  { id: santaMonicaTrack.id, number: '04', scenery: 'sunset', track: santaMonicaTrack, difficulty: 'SPORT / 3',
    tagline: 'Chase the sun. Clear the Pacific.', description: 'Beachfront sweepers, a sunset amusement pier and an optional ramp over water.',
    features: ['Sunset pier', 'Optional water jump', `${Math.round(santaMonicaTrack.length)} m`] },
];
export const defaultCircuit = circuits[0];
export const findCircuit = (id: unknown) => circuits.find(circuit => circuit.id === (id === 'launchsite' ? 'orbital-launchyard' : id)) ?? defaultCircuit;

/** Original selection-card silhouette drawn from the actual physical centerline. */
export function circuitMapPath(track: TrackDefinition) {
  const xs = track.centerline.map(p => p.x), zs = track.centerline.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = Math.min(156 / (maxX - minX), 72 / (maxZ - minZ));
  return track.centerline.filter((_, i) => i % 2 === 0).map((p, i) => `${i ? 'L' : 'M'}${(90 + (p.x - (minX + maxX) / 2) * scale).toFixed(2)},${(46 - (p.z - (minZ + maxZ) / 2) * scale).toFixed(2)}`).join(' ') + ' Z';
}
