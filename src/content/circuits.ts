import { goldenGateTrack } from '../core/tracks/golden-gate';
import { coastalTrack } from '../core/track';
import { orbitalTrack } from '../core/tracks/orbital';
import { santaMonicaTrack } from '../core/tracks/santa-monica';
import { laNightsTrack } from '../core/tracks/la-nights';
import { snowyTahoeTrack } from '../core/tracks/snowy-tahoe';
import { yosemiteTrack } from '../core/tracks/yosemite';
import { canyonSouthRimTrack } from '../core/tracks/canyon-south-rim';
import { sanDiegoFleetTrack } from '../core/tracks/san-diego-fleet';
import { laxTrack } from '../core/tracks/lax';
import type { TrackDefinition } from '../core/types';

export type SceneryId = 'coastal' | 'spaceport' | 'bay' | 'sunset' | 'canyon' | 'night-city' | 'alpine' | 'yosemite' | 'naval' | 'airport';
export interface CircuitDefinition {
  artwork?: string;
  id: string;
  number: string;
  scenery: SceneryId;
  track: TrackDefinition;
  difficulty: string;
  tagline: string;
  description: string;
  features: string[];
}
const circuitDefinitions: CircuitDefinition[] = [
  { id: coastalTrack.id, number: '01', scenery: 'coastal', track: coastalTrack, difficulty: 'CLUB / 2',
    tagline: 'One circuit. Endless possibilities.', description: 'Open harbour sweepers, a tight inner turn and generous sand runoff.',
    features: ['Harbour sweepers', 'Sand runoff', `${Math.round(coastalTrack.length)} m`] },
  { id: orbitalTrack.id, number: '02', scenery: 'spaceport', track: orbitalTrack, difficulty: 'SPORT / 3',
    tagline: 'Launch straight. Precision return.', description: 'A long thrust straight and a linked technical return through a spaceport.',
    features: ['Launch straight', 'Hop shortcut', `${Math.round(orbitalTrack.length)} m`] },
  { id: goldenGateTrack.id, number: '03', scenery: 'bay', track: goldenGateTrack, difficulty: 'EXPERT / 4',
    tagline: 'City precision. Bridge speed.', description: 'Technical city streets, waterfront turns and a suspension bridge across the bay.',
    features: ['City streets', 'Suspension bridge', `${Math.round(goldenGateTrack.length)} m`] },
  { id: santaMonicaTrack.id, number: '04', scenery: 'sunset', track: santaMonicaTrack, difficulty: 'SPORT / 3',
    tagline: 'Chase the sun. Clear the Pacific.', description: 'Beachfront sweepers, a sunset amusement pier and an optional ramp over water.',
    features: ['Sunset pier', 'Optional water jump', `${Math.round(santaMonicaTrack.length)} m`] },
  // The original Grand Canyon (`grand-canyon`) is retired; South Rim keeps its stable ID and is displayed as Grand Canyon.
  { id:canyonSouthRimTrack.id,number:'05',scenery:'canyon',track:canyonSouthRimTrack,difficulty:'SPORT / 3',
    tagline:'Follow the sandstone.',description:'A South Rim trail, airborne crossing and two hidden saddles.',features:[`${Math.round(canyonSouthRimTrack.length)} m`] },
  { id: laNightsTrack.id, number: '06', scenery: 'night-city', track: laNightsTrack, difficulty: 'EXPERT / 4',
    tagline: 'Own the night.', description: 'Downtown boulevards, an industrial water crossing and a hidden backlot alley.',
    features: [`${Math.round(laNightsTrack.length)} m`] },
  { id: snowyTahoeTrack.id, number: '07', scenery: 'alpine', track: snowyTahoeTrack, difficulty: 'SPORT / 3',
    tagline:'Find your winter line.',description:'Packed-snow forest sweepers above an alpine lake.',features:[`${Math.round(snowyTahoeTrack.length)} m`] },
  { id: yosemiteTrack.id, number:'08', scenery:'yosemite',track:yosemiteTrack,difficulty:'SPORT / 3',
    tagline:'Into the granite valley.',description:'Forest trails, granite foothills and an automatic creek crossing.',features:[`${Math.round(yosemiteTrack.length)} m`] },
  {id:sanDiegoFleetTrack.id,number:'09',scenery:'naval',track:sanDiegoFleetTrack,difficulty:'EXPERT / 4',tagline:'Across the fleet.',description:'Stationary flight decks and ship-to-ship crossings in a Pacific harbor.',features:[`${Math.round(sanDiegoFleetTrack.length)} m`]},
  {id:laxTrack.id,number:'10',scenery:'airport',track:laxTrack,difficulty:'EXPERT / 4',tagline:'Clear for takeoff.',description:'Seven terminals, an elevated horseshoe and twin runway straights.',features:[`${Math.round(laxTrack.length)} m`]},
];
export const circuits: readonly CircuitDefinition[] = circuitDefinitions.map(circuit => ({ ...circuit, artwork: `assets/circuits/${circuit.id}.webp` }));
export const defaultCircuit = circuits[0];
/**
 * Player-facing names that differ from the legacy IDs kept for saved preferences and links.
 * Navigation only: saved tournaments, records and medals are validated against exact physical IDs.
 * The retired original `grand-canyon` opens the surviving Grand Canyon (`canyon-south-rim`).
 */
const circuitAliases: Record<string, string> = { 'grand-canyon':'canyon-south-rim','south-rim':'canyon-south-rim', launchsite: 'orbital-launchyard', newport: 'coastal-launch', 'newport-island': 'coastal-launch', tahoe:'snowy-tahoe', 'lake-tahoe':'snowy-tahoe',yosemite:'capitan-yosemite','el-capitan':'capitan-yosemite' };
export const findCircuit = (id: unknown) => circuits.find(circuit => circuit.id === (typeof id === 'string' && circuitAliases[id] || id)) ?? defaultCircuit;

/** Original selection-card silhouette drawn from the actual physical centerline. */
export function circuitMapPath(track: TrackDefinition) {
  const xs = track.centerline.map(p => p.x), zs = track.centerline.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = Math.min(156 / (maxX - minX), 72 / (maxZ - minZ));
  return track.centerline.filter((_, i) => i % 2 === 0).map((p, i) => `${i ? 'L' : 'M'}${(90 + (p.x - (minX + maxX) / 2) * scale).toFixed(2)},${(46 - (p.z - (minZ + maxZ) / 2) * scale).toFixed(2)}`).join(' ') + ' Z';
}
