import { distance } from '../core/geometry';
import { canStartDrawing } from '../core/start-finish';
import { drawingSectors, drawnProgress, joinSectorTail, sectorAt, sectorSampleDuration, type DrawingSector } from '../core/drawing-sectors';
import type { CompiledRoute, DrawSample, DrawingTrim, Point, RouteResult, TrackDefinition } from '../core/types';

/**
 * Drawing behaviour the session needs from its host, passed in at the start so a visual theme can never change
 * how a line is recorded: the sector zoom per sector count and how far back a continuing touch may retake.
 */
export interface DrawingSettings { zoomPerSector: Readonly<Record<number, number>>; retakeMetres: number }
/** Below this share of the lap, a lifted phone stroke continues in a sector instead of compiling. */
export const SECTOR_LAP_SHARE = 0.9;

/** A compile the session asked for. Its reply only counts while turn, revision and venue still match. */
export interface CompileRequest { session: DrawingSession; turn: number; revision: number; venue: string; samples: DrawSample[] }
export type StrokeEnd = { kind: 'sector'; progress: number } | { kind: 'compile'; progress: number; request: CompileRequest };
export type CompileOutcome =
  | { kind: 'stale' }
  | { kind: 'preview'; route: CompiledRoute; trim?: DrawingTrim }
  | { kind: 'sector'; progress: number }
  | { kind: 'error'; message: string; point?: Point; section?: Point[]; progress: number; sector: boolean };

/**
 * One driver's drawing turn, without the DOM, the canvas or Babylon: timestamped samples, the active stroke,
 * phone sectors with their undo history, the pending compile and the accepted preview. The page projects
 * pointer positions to world points and passes them in (with each event's timestamp, coalesced events
 * included); it renders from this state and runs the compiler worker. Behaviour matches the code it was
 * extracted from in src/main.ts (2026-11-27).
 */
export class DrawingSession {
  samples: DrawSample[] = [];
  /** The pointer drawing right now, or null. */
  pointer: number | null = null;
  /** Indices where each touch of the current sector began (undo history). */
  strokeStarts: number[] = [];
  readonly sectors: DrawingSector[];
  sectorIndex = 0;
  /** Phone sectors: the overview before the first sector starts. */
  overview: boolean;
  /** First sample index of each sector reached so far. */
  sectorStarts: number[] = [0];
  /** Set when samples change; the page redraws the live line at most once per frame and clears it. */
  dirty = false;
  /** Bumped by every change to the samples, so a compile of an older stroke is recognised as stale. */
  revision = 0;
  preview?: { route: CompiledRoute; trim?: DrawingTrim };
  private previousInputTime = 0;
  private metresFromJoin = 0;
  private incomingPace?: number;
  private preserved = 0;
  private beforeTouch?: { first: number; tail: DrawSample[]; starts: number[] };
  readonly venue: string;

  constructor(readonly track: TrackDefinition, sectorCount: number, readonly turn: number, readonly settings: DrawingSettings) {
    this.sectors = sectorCount > 1 ? drawingSectors(track, sectorCount) : [];
    this.overview = this.sectors.length > 1;
    this.venue = track.id + ':' + track.version;
  }
  get sectorMode() { return this.sectors.length > 1; }
  get zoom() { return this.settings.zoomPerSector[this.sectors.length] ?? 1; }
  get last() { return this.samples.at(-1); }
  get drawing() { return this.pointer !== null; }
  private changed() { this.revision++; this.dirty = true; }

  /** Phones: draw the whole lap in one stroke instead of sectors. */
  chooseWhole() { if (!this.overview) return false; this.sectors.length = 0; this.overview = false; return true; }

  /** One timestamped world point (coalesced events first). Pauses and sub-metre motion are kept; the compiler filters. */
  add(point: Point, inputTime: number) {
    const last = this.last;
    if (this.sectorMode && inputTime < this.previousInputTime) return;
    let time = inputTime;
    if (this.sectorMode && last) {
      const metres = distance(point, last);
      time = last.time + sectorSampleDuration(inputTime - this.previousInputTime, this.zoom, metres, this.metresFromJoin, this.incomingPace);
      this.metresFromJoin += metres;
    }
    this.previousInputTime = inputTime;
    // Sector samples also keep the raw input time (the joined clock is in `time`).
    const sample = this.sectorMode ? { ...point, time, inputTime } : { ...point, time };
    if (last && sample.time < last.time) return;
    if (!last || sample.time > last.time || distance(sample, last) > 0.001) { this.samples.push(sample); this.changed(); }
  }
  /** A new lap from the start box; false (and nothing changes) when the point is outside it. */
  begin(pointerId: number, point: Point, inputTime: number) {
    if (!canStartDrawing(point, this.track)) return false;
    this.pointer = pointerId; this.samples = []; this.strokeStarts = [0]; this.previousInputTime = inputTime; this.incomingPace = undefined; this.preview = undefined;
    this.changed(); this.add(point, inputTime);
    return true;
  }
  /** Sample indices a continuing touch may grab: from the end back up to the retake distance, within this sector. */
  continueCandidates() {
    const out: number[] = [];
    let travelled = 0;
    for (let i = this.samples.length - 1; i >= (this.sectorStarts[this.sectorIndex] ?? 0) && travelled <= this.settings.retakeMetres; i--) {
      if (i < this.samples.length - 1) travelled += distance(this.samples[i], this.samples[i + 1]);
      out.push(i);
    }
    return out;
  }
  /**
   * Phone sectors: continue from sample `best` (the glowing end, or a little behind it to retake the last
   * metres; the overlap is trimmed). The clock is shifted so the joined samples read as one continuous
   * stroke at the line's recent pace: lifting costs no time.
   */
  continueFrom(best: number, pointerId: number, inputTime: number, point: Point | null) {
    let backup = best, metres = 0;
    while (backup > 0 && metres < 5) { metres += distance(this.samples[backup], this.samples[backup - 1]); backup--; }
    this.beforeTouch = { first: backup, tail: this.samples.slice(backup), starts: this.strokeStarts.slice() };
    this.samples.length = best + 1;
    this.incomingPace = joinSectorTail(this.samples, this.preserved);
    this.previousInputTime = inputTime;
    this.metresFromJoin = 0;
    this.strokeStarts = this.strokeStarts.filter(i => i <= best);
    this.strokeStarts.push(this.samples.length);
    this.pointer = pointerId; this.preview = undefined;
    this.changed(); if (point) this.add(point, inputTime);
  }
  /** Progress along the lap, recording where each sector was reached. */
  measure() {
    this.sectorStarts = [0];
    return drawnProgress(this.samples, this.track, (index, progress) => {
      while (this.sectorStarts.length < this.sectors.length && progress >= this.sectors[this.sectorStarts.length].from) this.sectorStarts.push(index);
    });
  }
  /** Lift: a phone stroke short of the lap continues in a sector; otherwise the stroke is compiled. */
  end(pointerId: number, point: Point | null, inputTime: number): StrokeEnd | null {
    if (this.pointer !== pointerId) return null;
    if (point) this.add(point, inputTime); this.pointer = null; this.beforeTouch = undefined;
    const progress = this.sectorMode ? this.measure() : Infinity;
    if (progress < this.track.length * SECTOR_LAP_SHARE) return { kind: 'sector', progress };
    return { kind: 'compile', progress, request: this.request() };
  }
  request(): CompileRequest { return { session: this, turn: this.turn, revision: this.revision, venue: this.venue, samples: this.samples }; }
  /** A compiler reply. A reply for an older stroke, turn, venue or session is dropped. */
  accept(request: CompileRequest, result: RouteResult, progress: number): CompileOutcome {
    if (request.session !== this || request.turn !== this.turn || request.revision !== this.revision || request.venue !== this.venue || this.pointer !== null) return { kind: 'stale' };
    if (result.ok) {
      if (this.sectorMode) this.sectorIndex = this.sectorStarts.length - 1;
      this.preview = { route: result.route, trim: result.drawing };
      return { kind: 'preview', route: result.route, trim: result.drawing };
    }
    // Phones: a line that has not yet reached the finish simply continues.
    if (this.sectorMode && progress < this.track.length) return { kind: 'sector', progress };
    return { kind: 'error', message: result.message, point: result.point, section: result.section, progress, sector: this.sectorMode && this.samples.length > 0 };
  }
  /** The sector a stroke end belongs to (after measure()). */
  sectorFor(progress: number) { this.sectorIndex = Math.min(sectorAt(this.sectors, progress).index, this.sectorStarts.length - 1); return this.sectorIndex; }
  /** Redraw from the start of sector `index`; false when not allowed now. */
  restartSector(index: number) {
    if (!this.sectorMode || this.pointer !== null || index < 0 || index >= this.sectorStarts.length) return false;
    this.overview = false;
    this.sectorIndex = index;
    this.samples.length = index === 0 ? 0 : this.sectorStarts[index] + 1;
    this.preserved = this.samples.length;
    this.strokeStarts = [];
    this.sectorStarts.length = index + 1;
    this.preview = undefined;
    this.changed();
    return true;
  }
  /** Undo the last touch of this sector: 'restart' when it was the sector's first, 'continue' otherwise. */
  undo(): 'none' | 'restart' | 'continue' {
    if (!this.sectorMode || this.pointer !== null) return 'none';
    const start = this.strokeStarts.pop();
    if (start === undefined) return 'none';
    if (start === 0) return 'restart';
    this.samples.length = Math.max(start, this.preserved); this.changed();
    return 'continue';
  }
  /** An interrupted stroke: a continuing touch restores the line it cut back; a fresh lap is cleared. */
  cancel(): 'none' | 'restored' | 'cleared' {
    if (this.pointer === null) return 'none';
    this.pointer = null;
    if (this.beforeTouch) {
      this.samples.length = this.beforeTouch.first;
      for (const point of this.beforeTouch.tail) this.samples.push(point);
      this.strokeStarts = this.beforeTouch.starts;
      this.beforeTouch = undefined;
      this.revision++; this.dirty = true;
      return 'restored';
    }
    this.samples = []; this.revision++; this.dirty = false;
    return 'cleared';
  }
  /** The planning panel's sector view. */
  sectorView(drawingPhase: boolean) {
    return this.sectorMode && (drawingPhase || this.samples.length > 0)
      ? { index: this.sectorIndex, total: this.sectors.length, overview: this.overview, continuing: this.samples.length > 0 && this.pointer === null, canUndo: this.strokeStarts.length > 0 && this.samples.length > 0 && this.pointer === null }
      : undefined;
  }
}
