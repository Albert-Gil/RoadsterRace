import { DEFAULT_LAPS, MAX_LAPS, MIN_LAPS } from '../core/race-options';
import { defaultCircuit, findCircuit } from '../content/circuits';

/** Presentation preferences never enter the route compiler or vehicle physics. */
import { defaultPaintId, paintFinishes } from './themes';
export { paintFinishes } from './themes';
export interface DriverProfile { name: string; paint: string }
export interface RacePreferences { version: 1; laps: number; drivers: DriverProfile[]; circuitId: string; ghost?: boolean }
export const PREFERENCES_KEY = 'roadster-race.preferences.v1';
const defaults = [defaultPaintId, 'cobalt', 'solar', 'verdant'];
export const defaultDriverName = (index: number) => `Player ${index + 1}`;
export function cleanDriverName(value: string, index: number) {
  const name = Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim().replace(/\s+/g, ' ')).slice(0, 18).join('');
  return name || defaultDriverName(index);
}
export const finishFor = (id: string) => paintFinishes.find(paint => paint.id === id) ?? paintFinishes.find(paint => paint.id === defaultPaintId)!;
export function defaultPreferences(): RacePreferences {
  return { version: 1, ghost: true, laps: DEFAULT_LAPS, circuitId: defaultCircuit.id, drivers: defaults.map((paint, index) => ({ name: defaultDriverName(index), paint })) };
}
export function parsePreferences(serialized: string | null): RacePreferences {
  const defaults = defaultPreferences();
  try {
    const data = JSON.parse(serialized ?? 'null');
    if (!data || data.version !== 1) return defaults;
    const laps = Number.isInteger(data.laps) && data.laps >= MIN_LAPS && data.laps <= MAX_LAPS ? data.laps : DEFAULT_LAPS;
    return { version: 1, laps, ghost: data.ghost !== false, circuitId: findCircuit(data.circuitId).id, drivers: defaults.drivers.map((driver, index) => {
      const saved = Array.isArray(data.drivers) ? data.drivers[index] : null;
      return { name: typeof saved?.name === 'string' ? cleanDriverName(saved.name, index) : driver.name,
        paint: paintFinishes.some(paint => paint.id === saved?.paint) ? saved.paint : driver.paint };
    }) };
  } catch { return defaults; }
}
export function loadPreferences(): RacePreferences {
  try { return parsePreferences(localStorage.getItem(PREFERENCES_KEY)); } catch { return defaultPreferences(); }
}
export function savePreferences(preferences: RacePreferences) {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Session choices still work when storage is unavailable. */ }
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
