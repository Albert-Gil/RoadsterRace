export const DEFAULT_LAPS = 2;
export const MIN_LAPS = 1;
export const MAX_LAPS = 6;

export function validateLapCount(laps: number) {
  if (!Number.isInteger(laps) || laps < MIN_LAPS || laps > MAX_LAPS) throw new Error('Choose between one and six laps.');
  return laps;
}
