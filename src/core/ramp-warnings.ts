import clearing from '../content/ramp-clearing.json';
import { RULES } from './rules';
import type { CompiledRoute, Point, TrackDefinition } from './types';
import { sampleRoute } from './route';

/** Extra speed asked for above the measured landing limit: the drawn pace is a target the car only approaches. */
export const RAMP_SPEED_MARGIN = 0.5;
/** How far before the ramp mouth the drawn pace already decides the takeoff speed (m). */
export const RAMP_APPROACH = 6;

export interface RampWarning { id: string; point: Point; needed: number; drawn: number }
type ClearingTable = { rules: number; tracks: Record<string, { version: number; crossings: Record<string, number> }> };

/** Clearing speeds for this track, or nothing when the generated table is stale for the current rules or track. */
export function clearingSpeeds(track: TrackDefinition, table: ClearingTable = clearing): Record<string, number> | undefined {
  const entry = table.tracks[track.id];
  return table.rules === RULES.version && entry?.version === track.version ? entry.crossings : undefined;
}

/**
 * Automatic ramps whose drawn approach pace is too slow to land: drawing guidance only, never physics.
 * The slowest drawn pace from RAMP_APPROACH metres before the mouth to the lip is compared with the
 * measured clearing speed plus RAMP_SPEED_MARGIN.
 */
export function rampWarnings(route: CompiledRoute, track: TrackDefinition, table: ClearingTable = clearing): RampWarning[] {
  const speeds = clearingSpeeds(track, table);
  if (!speeds) return [];
  const warnings: RampWarning[] = [];
  for (const crossing of route.crossings ?? []) {
    const needed = speeds[crossing.id], jump = track.jumps?.find(j => j.id === crossing.id);
    if (needed === undefined || !jump || crossing.activation !== 'automatic') continue;
    const from = crossing.entryDistance - RAMP_APPROACH, to = crossing.entryDistance + jump.rampLength;
    let drawn = Infinity;
    for (const p of route.points) if (p.distance >= from && p.distance <= to) drawn = Math.min(drawn, p.desiredSpeed);
    if (drawn < needed + RAMP_SPEED_MARGIN) {
      const at = sampleRoute(route, crossing.entryDistance);
      warnings.push({ id: crossing.id, point: { x: at.x, z: at.z }, needed: needed + RAMP_SPEED_MARGIN, drawn });
    }
  }
  return warnings;
}
