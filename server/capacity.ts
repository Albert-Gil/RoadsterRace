/**
 * How many rooms one room-server process admits, weighted by what each circuit costs to simulate.
 *
 * A circuit's weight is its 4-car simulation step time relative to Newport Island. Until /stats reports the
 * live server's own numbers, the weights come from medians measured on the development CPU (plan
 * paddock-circuits-cup, "Current state"): only the ratios are used, not the absolute times.
 * Override any weight with DUEL_WEIGHTS ("lax=12,capitan-yosemite=10") after reading /stats.
 *
 * Two limits apply together:
 *  - DUEL_MAX_ROOMS: the room count (default 2, unchanged);
 *  - DUEL_CAPACITY: the summed weight, in Newport rooms. Its default admits two rooms of the heaviest
 *    circuit already offered (San Diego Fleet), so every room admitted before this change is still admitted;
 *    it is the heavy new circuits that are limited.
 * An idle process always admits one room, whatever its weight, so no circuit becomes unplayable.
 */
export const MEASURED_WEIGHTS: Readonly<Record<string, number>> = {
  'coastal-launch': 1, // 0.22 ms
  'golden-gate': 1.7, // 0.38 ms
  'santa-monica': 3, // 0.66 ms
  'san-diego-fleet': 4.6, // 1.02 ms
  'orbital-launchyard': 3.5, // 0.77 ms
  'la-nights': 2.5, // 0.56 ms
  'canyon-south-rim': 4.7, // 1.03 ms (shown as Grand Canyon)
  'snowy-tahoe': 8.9, // 1.96 ms
  'capitan-yosemite': 9.6, // 2.11 ms
  'lax': 11.2, // 2.47 ms
};
/** Unknown circuits count as the heaviest measured one. */
const UNKNOWN_WEIGHT = Math.max(...Object.values(MEASURED_WEIGHTS));
export const DEFAULT_CAPACITY = 2 * MEASURED_WEIGHTS['san-diego-fleet'];

export interface CapacitySettings { maxRooms: number; capacity: number; weights: Readonly<Record<string, number>> }

function positive(value: string | undefined, fallback: number) {
  const n = Number(value);
  return value !== undefined && value.trim() !== '' && Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Reads the limits from the environment (each call, so a test or a restart with new values takes effect). */
export function capacitySettings(env: Record<string, string | undefined> = process.env): CapacitySettings {
  const weights: Record<string, number> = { ...MEASURED_WEIGHTS };
  for (const pair of (env.DUEL_WEIGHTS ?? '').split(',')) {
    const [id, value] = pair.split('=').map(s => s?.trim());
    if (id && value) weights[id] = positive(value, weights[id] ?? UNKNOWN_WEIGHT);
  }
  return { maxRooms: Math.max(1, Math.floor(positive(env.DUEL_MAX_ROOMS, 2))), capacity: positive(env.DUEL_CAPACITY, DEFAULT_CAPACITY), weights };
}

export function circuitWeight(circuit: string, settings: CapacitySettings) {
  return settings.weights[circuit] ?? UNKNOWN_WEIGHT;
}

/**
 * Whether one more room on `circuit` fits beside the open rooms (circuit ids, one entry per room).
 * `replacing` is the room's own current circuit when an open room switches circuit.
 */
export function admits(open: readonly string[], circuit: string, settings: CapacitySettings, replacing?: string) {
  const others = [...open];
  if (replacing !== undefined) { const at = others.indexOf(replacing); if (at >= 0) others.splice(at, 1); }
  if (!others.length) return true;
  if (others.length + 1 > settings.maxRooms) return false;
  const used = others.reduce((sum, id) => sum + circuitWeight(id, settings), 0);
  return used + circuitWeight(circuit, settings) <= settings.capacity + 1e-9;
}
