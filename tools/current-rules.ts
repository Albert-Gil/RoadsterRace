// Generates docs/CURRENT_RULES.md from the source of truth. Run `pnpm docs:rules` after a
// tuning or version change; `tests/unit/current-rules.test.ts` fails when the file is stale.
import { RULES } from '../src/core/simulation';
import { flightGravity, FLIGHT_RULES } from '../src/core/support';
import { CONTACT_RULES } from '../src/core/vehicle-contact';
import { COMPILER_VERSION, PACE_RANGE, PACE_FILTER } from '../src/core/route';
import { DRAWING_RULES } from '../src/core/route-cleanup';
import { GATE_RULES } from '../src/core/start-finish';
import { SHORTCUT_RULES } from '../src/core/hop-shortcuts';
import { AI_TUNING, AI_DRIVING } from '../src/core/computer';
import { CHAMPIONSHIP_POINTS } from '../src/core/tournament';
import { DEFAULT_LAPS, MAX_LAPS, MIN_LAPS } from '../src/core/race-options';
import { circuits } from '../src/content/circuits';

type Unit = [unit: string, meaning: string];
/** Every exported tuning value needs a unit and meaning here; the test rejects undocumented keys. */
const documentation: Record<string, Record<string, Unit>> = {
  RULES: {
    version: ['—', 'Vehicle rules version; stored with records and championships'],
    dt: ['s', 'Fixed simulation step (two equal substeps per step)'],
    laps: ['laps', 'Default race distance'],
    acceleration: ['m/s²', 'Maximum pace-following acceleration'],
    braking: ['m/s²', 'Maximum pace-following braking'],
    accelerationJerk: ['m/s³', 'Maximum rate of change of acceleration'],
    paceResponse: ['1/s', 'Proportional gain from speed error to requested acceleration'],
    paceDeadband: ['m/s', 'Speed error ignored by the pace controller'],
    maxSpeed: ['m/s', 'Horizontal speed cap'],
    thrustAcceleration: ['m/s²', 'Thrust acceleration while a burst is active'],
    thrustDuration: ['s', 'Thrust burst length'],
    thrustRecharge: ['s', 'Thrust recharge, measured from activation'],
    hopRecharge: ['s', 'Hop recharge, measured from activation'],
    hopLaunchSpeed: ['m/s', 'Upward velocity of a manual hop'],
    flightLaunchCorrection: ['rad', 'Largest momentum rotation at launch'],
    flightTurnRate: ['rad/s', 'Largest momentum rotation rate in flight'],
    dirtGrip: ['m/s²', 'Packed-dirt lateral grip'],
    asphaltGrip: ['m/s²', 'Lateral acceleration limit on asphalt'],
    sandGrip: ['m/s²', 'Lateral acceleration limit on sand'],
    asphaltResponse: ['1/s', 'Velocity alignment gain per radian of slip on asphalt'],
    sandResponse: ['1/s', 'Velocity alignment gain per radian of slip on sand'],
    sandDrag: ['1/s', 'Exponential speed decay at full sand contact'],
    steeringResponse: ['1/s', 'Yaw-rate gain per radian of heading error'],
    steeringRate: ['rad/s', 'Largest commanded yaw rate'],
    steeringSmoothing: ['1/s', 'First-order yaw-rate smoothing'],
    lookAhead: ['m', 'Constant steering look-ahead along the drawn line'],
    lookAheadSeconds: ['s', 'Speed-proportional steering look-ahead'],
    surfaceTransition: ['m', 'Distance over which asphalt blends to sand'],
    driftStartAngle: ['rad', 'Slip angle that starts a drift'],
    driftEndAngle: ['rad', 'Slip angle below which a drift ends'],
    driftGripLoss: ['fraction', 'Largest loss of lateral authority beyond peak tire slip; no speed multiplier'],
    driftSaturationRange: ['peak-demand multiples', 'Excess tire demand over which lateral grip falls smoothly'],
    recoveryHold: ['s', 'Time a reset car waits before driving on'],
    hazardApproach: ['m', 'A crash this far before a drawn hazard resets the car past it'],
    hazardPenaltySpeed: ['m/s', 'Extra reset wait is the skipped circuit distance divided by this'],
    repeatRecoveryWindow: ['m', 'A second reset within this route distance also moves the car forward'],
  },
  FLIGHT_RULES: {
    gravity: ['m/s²', 'Gravity for automatic ramps and unsupported falls'],
    hopGravity: ['m/s²', 'Gravity during manual hops'],
    rampLaunchBoost: ['m/s', 'Upward velocity added at a ramp lip, before the slope term'],
    carHeight: ['m', 'Vertical vehicle envelope for walls and car contacts'],
    waterHeight: ['m', 'Water surface elevation'],
  },
  CONTACT_RULES: {
    restitution: ['—', 'Car-to-car coefficient of restitution'],
    friction: ['—', 'Car-to-car tangential friction coefficient'],
    passes: ['—', 'Contact resolution passes per substep'],
    ghostStartSeconds: ['s', 'Opening period without car-to-car contact (multi-car races)'],
  },
  PACE_RANGE: { min: ['m/s', 'Slowest drawn target speed'], max: ['m/s', 'Fastest drawn target speed'] },
  PACE_FILTER: { gestureRadius: ['m', 'Exact half-window for measuring drawing speed'], compiledRadius: ['m', 'Half-window of the compiled pace filter'], sampleSpacing: ['m', 'Maximum spacing of retained timed samples before pace/geometry smoothing'], pauseRadius: ['m', 'Motion inside this radius is a resting finger, independent of event rate'] },
  DRAWING_RULES: {
    minimumLapProgress: ['fraction', 'Minimum forward course progress, and share of covered stretches, for a completed lap'],
    minimumPhysicalLap: ['fraction of centerline length', 'Minimum actual drawing travel before finish can be counted'],
    backwardTolerance: ['m', 'Backward course movement tolerated before cleanup'],
    backwardShare: ['fraction of centerline length', 'Total backward course movement that marks a wrong-way lap'],
    coverageBins: ['—', 'Evenly spaced circuit stations checked for lap coverage'],
    coverageRoadWidths: ['road widths', 'A station counts as covered when the line passes within this distance beyond the asphalt'],
    longestStepRoadWidths: ['road widths', 'Longer jumps between touch samples mean the stroke lost contact'],
    longestPause: ['s', 'Longest pause counted in a drawing; longer hesitations are shortened to this'],
    localLoopRoadWidths: ['road widths', 'Course window searched for loops and spurs'],
  },
  GATE_RULES: {
    leadIn: ['m', 'Drawing may start this far before the start/finish line'],
    longitudinalTolerance: ['m', 'Along-track tolerance at the line'],
    lateralTolerance: ['m', 'Start tolerance beyond each end of the gate'],
    startBeyond: ['m', 'Drawing may also start this far past the line'],
    finishLateral: ['m', 'A finish crossing counts this far beyond each end of the gate'],
    closeDistance: ['m', 'Lifting up to this far before the line still closes the lap onto it'],
    blendDistance: ['m', 'Length blended at each end of the lap'],
  },
  SHORTCUT_RULES: {
    clearance: ['m', 'Required vehicle clearance inside a hop corridor'],
    sampleSpacing: ['m', 'Validation sample spacing along a hop corridor'],
    backwardTolerance: ['m', 'Backward movement tolerated inside a hop corridor'],
    commitAlignment: ['—', 'Minimum cosine between the line and the hop lane where the line meets the named obstacle (0.5 = within 60°)'],
  },
  AI_TUNING: { easy: ['—', 'Fraction of the safe pace profile'], normal: ['—', 'Fraction of the safe pace profile'], hard: ['—', 'Fraction of the safe pace profile'] },
  AI_DRIVING: {
    decisionTicks: ['ticks', 'Fixed-clock interval between each computer driver decision'],
    cornerGripShare: ['fraction', 'Nominal grip used for the safe planned corner pace'],
    brakingShare: ['fraction', 'Ordinary braking reserved by corner and burst predictions'],
    responseSeconds: ['s', 'Extra braking distance for pace-controller response after a burst'],
    followingSeconds: ['s', 'Following headway and speed-response horizon'],
    trafficRange: ['m', 'Furthest same-level car considered ahead'],
    minimumGap: ['m', 'Minimum bumper-to-bumper following gap'],
  },
};

const format = (value: number) => Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
function table(name: string, values: Record<string, number>) {
  const docs = documentation[name], rows = ['| Key | Value | Unit | Meaning |', '|---|---:|---|---|'];
  for (const [key, value] of Object.entries(values)) {
    const entry = docs[key];
    if (!entry) throw new Error(`Document the unit and meaning of ${name}.${key} in tools/current-rules.ts.`);
    const degrees = entry[0].startsWith('rad') ? ` (${format(value * 180 / Math.PI)}°${entry[0] === 'rad/s' ? '/s' : ''})` : '';
    rows.push(`| \`${key}\` | ${format(value)}${degrees} | ${entry[0]} | ${entry[1]} |`);
  }
  for (const key of Object.keys(docs)) if (!(key in values)) throw new Error(`${name}.${key} is documented but no longer exists.`);
  return `## ${name}\n\n${rows.join('\n')}\n`;
}

export function currentRulesMarkdown() {
  const peak = RULES.hopLaunchSpeed ** 2 / (2 * flightGravity('hop')), airtime = 2 * RULES.hopLaunchSpeed / flightGravity('hop');
  const crest = circuits.find(c => c.id === 'grand-canyon')!.track.jumps!.find(j => j.kind === 'crest')!;
  const courses = ['| Circuit | ID | Track version | Road width (m) | Centerline (m) | Barriers | Branches |', '|---|---|---:|---:|---:|---:|---|',
    ...circuits.map(({ track }) => `| ${track.name} | \`${track.id}\` | ${track.version} | ${format(track.roadWidth)} | ${track.length.toFixed(1)} | ${track.barriers.length} | ${[
      ...(track.jumps ?? []).map(j => `${j.kind === 'crest' ? 'crest' : 'ramp'} \`${j.id}\``), ...(track.hopShortcuts ?? []).map(h => `hop lane \`${h.id}\``), ...(track.bridges ?? []).map(b => `bridge \`${b.id}\``),
    ].join(', ') || '—'} |`)];
  return `# Current rules and course values

Generated from the source by \`pnpm docs:rules\` (see \`tools/current-rules.ts\`). Do not edit by hand; \`pnpm test\` fails when this file is out of date. Dated milestone documents record history; this file and the code are authoritative.

Conventions: SI units; horizontal plane (x, z) with y up; heading 0 points along +z; angles in radians (degrees in parentheses).

## Versions

| Item | Version |
|---|---:|
| Vehicle rules (\`RULES.version\`) | ${RULES.version} |
| Route compiler (\`COMPILER_VERSION\`) | ${COMPILER_VERSION} |
${circuits.map(({ track }) => `| ${track.name} track (\`${track.id}\`) | ${track.version} |`).join('\n')}

Records, ghosts, session bests and championships are scoped by these versions. Change a version whenever a value below changes race results.

## Courses

${courses.join('\n')}

Vehicle envelope: ${format(circuits[0].track.carWidth)} m × ${format(circuits[0].track.carLength)} m. Race distance: ${MIN_LAPS}–${MAX_LAPS} laps (default ${DEFAULT_LAPS}). Championship points by place: ${CHAMPIONSHIP_POINTS.join(' / ')}.

${table('RULES', RULES)}
Derived: level-ground manual hop peak ${peak.toFixed(3)} m and airtime ${airtime.toFixed(3)} s. Santa Monica ramp launch upward velocity is \`rampLaunchBoost + max(0, forward speed) × lipHeight / rampLength\`. Grand Canyon uses its authored natural crest: \`${format(crest.launchBoost!)} + max(0, forward speed) × ${format(crest.launchSlope!)}\` from ${format(crest.takeoffElevation!)} m to the ${format(crest.landingElevation!)} m receiving surface, across a ${format(crest.gap)} m unsupported opening. Grounded elevation changes do not add slope acceleration.

${table('FLIGHT_RULES', FLIGHT_RULES)}
${table('CONTACT_RULES', CONTACT_RULES)}
${table('PACE_RANGE', PACE_RANGE)}
${table('PACE_FILTER', PACE_FILTER)}
${table('DRAWING_RULES', DRAWING_RULES)}
${table('GATE_RULES', GATE_RULES)}
${table('SHORTCUT_RULES', SHORTCUT_RULES)}
${table('AI_TUNING', AI_TUNING)}
${table('AI_DRIVING', AI_DRIVING)}`;
}
