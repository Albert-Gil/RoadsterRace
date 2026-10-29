import { clamp, lerp, modulo, projectToPolyline } from './geometry';
import { barrierContact } from './barriers';
import { projectCourse } from './route-cleanup';
import { vehicleContact, CONTACT_RULES } from './vehicle-contact';
import { createContactLog, stepRacers } from './stepping';
import { RaceSimulation, RULES } from './simulation';
import { DEFAULT_LAPS, validateLapCount } from './race-options';
import type { CompiledRoute, RaceEvent, TrackDefinition } from './types';
import { startGate } from './start-finish';
import { vehicleSupported } from './support';

export interface Standing {
  player: number;
  rank: number;
  progress: number;
  finished: boolean;
  finishTime: number | null;
}

export function gridPose(track: TrackDefinition, slot: number, across?: number, row = Math.floor(slot / 2)) {
  const gate = startGate(track), a = gate.center, heading = Math.atan2(gate.forward.x, gate.forward.z);
  const back = Math.max(3.2, track.carLength / 2 + .4) + row * (track.carLength + .5);
  const side = across ?? (slot % 2 ? 1 : -1) * Math.max(1.6, track.carWidth / 2 + .2);
  return { x: a.x - Math.sin(heading) * back + Math.cos(heading) * side, z: a.z - Math.cos(heading) * back - Math.sin(heading) * side, heading };
}
/** Keep each driver near their own crossing anchor, without overlapping a neighbour. */
export function startingGrid(track: TrackDefinition, routes: CompiledRoute[], rotation = 0) {
  const gate = startGate(track), right = { x: gate.forward.z, z: -gate.forward.x };
  const limit = (gate.width - track.carWidth) / 2 - 0.2;
  const occupied: ReturnType<typeof gridPose>[] = [], poses = new Array<ReturnType<typeof gridPose>>(routes.length);
  for (let slot = 0; slot < routes.length; slot++) {
    const player = modulo(slot - rotation, routes.length), anchor = routes[player].points[0];
    const preferred = clamp((anchor.x - gate.center.x) * right.x + (anchor.z - gate.center.z) * right.z, -limit, limit);
    const candidates = [preferred, ...Array.from({ length: Math.ceil(limit * 8) + 1 }, (_, i) => clamp(-limit + i * 0.25, -limit, limit))];
    candidates.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
    // Identical edge anchors may need four staggered rows. Prefer a clear row
    // behind that anchor over forcing a large sideways detour across the start.
    const rows = Array.from({length: 4 - Math.floor(slot / 2)}, (_,i)=>Math.floor(slot / 2)+i);
    const near = candidates.filter(across => Math.abs(across-preferred) <= .3);
    const options = [...rows.flatMap(row=>near.map(across=>gridPose(track,slot,across,row))), ...rows.flatMap(row=>candidates.map(across=>gridPose(track,slot,across,row)))];
    const pose = options.find(p => {
      const body = { position: p, velocity: { x: 0, z: 0 }, heading: p.heading };
      return !barrierContact(p, p.heading, track, 0.15) && vehicleSupported(p, p.heading, track)
        && !occupied.some(other => vehicleContact(body, { position: other, velocity: { x: 0, z: 0 }, heading: other.heading }, { ...track, carWidth: track.carWidth + 0.25 }));
    });
    if (!pose) throw new Error('The starting grid has no safe space for this driver.');
    poses[player] = pose; occupied.push(pose);
  }
  return poses;
}
/** Owns one shared clock; each car retains independent physics and ability state. */
export class LocalRace {
  readonly racers: RaceSimulation[];
  private courseMaps: number[][];
  tick = 0;
  private contacts = createContactLog();
  get contactCount() { return this.contacts.count; }

  constructor(readonly routes: CompiledRoute[], readonly track: TrackDefinition, readonly lapCount: number = DEFAULT_LAPS, readonly gridRotation = 0) {
    validateLapCount(lapCount);
    if (routes.length < 1 || routes.length > 4) throw new Error('A local race needs one to four players.');
    if (routes.some(route => route.trackId !== track.id)) throw new Error('All players must race on the same circuit.');
    this.racers = routes.map(route => new RaceSimulation(route, track, lapCount));
    const grid = routes.length > 1 ? startingGrid(track, routes, gridRotation) : [];
    if (routes.length > 1) this.racers.forEach((racer, i) => {
      const pose = grid[i];
      if (barrierContact(pose, pose.heading, track)) throw new Error('The starting grid is blocked.');
      racer.state.position = { x: pose.x, z: pose.z }; racer.state.heading = pose.heading; racer.gridPending = true;
    });
    // Rank by progress around the common circuit, not by metres along differently sized lines.
    this.courseMaps = routes.map(route => {
      const projected = route.points.map(point => track.jumps?.length || track.hopShortcuts?.length ? projectCourse(point, track).progress : projectToPolyline(point, track.centerline, track.distances).progress);
      let unwrapped = 0;
      const values = [0];
      for (let i = 1; i < projected.length; i++) {
        let delta = projected[i] - projected[i - 1];
        if (delta < -track.length / 2) delta += track.length;
        if (delta > track.length / 2) delta -= track.length;
        unwrapped += delta;
        values.push(Math.max(values[i - 1], unwrapped));
      }
      const length = values.at(-1)!;
      return values.map(value => clamp(value / Math.max(1e-9, length), 0, 1) * track.length);
    });
  }

  get time() { return this.tick * RULES.dt; }
  get ghostStartRemaining() { return this.racers.length > 1 ? Math.max(0, CONTACT_RULES.ghostStartSeconds - this.time) : 0; }
  get finished() { return this.racers.every(racer => racer.state.finished); }
  pressThrust(player: number) { this.racers[player]?.pressThrust(); }
  pressHop(player: number) { this.racers[player]?.pressHop(); }
  clearCommands() { this.racers.forEach(racer => racer.clearCommands()); }
  step() {
    if (this.finished) return;
    stepRacers(this.racers, this.track, this.time, this.contacts);
    this.tick++;
  }
  drainEvents(): (RaceEvent & { player: number })[] {
    return [...this.contacts.events.splice(0), ...this.racers.flatMap((racer, player) => racer.drainEvents().map(event => ({ ...event, player })))];
  }
  courseProgress(player: number) {
    const racer = this.racers[player], route = this.routes[player], values = this.courseMaps[player];
    if (racer.state.finished) return this.lapCount * this.track.length;
    const laps = Math.floor(racer.state.distance / route.length);
    const t = modulo(racer.state.distance, route.length) / route.length * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(t));
    return laps * this.track.length + lerp(values[i], values[i + 1], t - i);
  }
  standings(): Standing[] {
    const ordered = this.racers.map((racer, player) => ({ player, progress: this.courseProgress(player), finished: racer.state.finished, finishTime: racer.state.finishTime, rank: 0 }));
    // Displayed hundredths define a tie; array order must never award a false winner.
    const hundredths = (value: number) => Math.round(value * 100);
    ordered.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return a.finished ? hundredths(a.finishTime!) - hundredths(b.finishTime!) : b.progress - a.progress;
    });
    ordered.forEach((standing, i) => {
      const previous = ordered[i - 1];
      const tied = previous && standing.finished === previous.finished && (standing.finished
        ? hundredths(standing.finishTime!) === hundredths(previous.finishTime!)
        : Math.abs(standing.progress - previous.progress) < 0.01);
      standing.rank = tied ? previous.rank : i + 1;
    });
    return ordered;
  }
}
