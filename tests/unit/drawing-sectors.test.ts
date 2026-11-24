import { describe, expect, it } from 'vitest';
import { circuits, findCircuit, phoneDrawingSectors } from '../../src/content/circuits';
import { continuationOffset, drawingSectors, drawnProgress, sectorAt, SECTOR_RULES, upcomingCourse } from '../../src/core/drawing-sectors';
import { compileRoute, createPracticeSamples } from '../../src/core/route';
import { distance } from '../../src/core/geometry';
import { phoneSizedTouchScreen, PHONE_SHORT_SIDE_MAX } from '../../src/app/drawing-mode';
import { planningPanel } from '../../src/ui/panels/planning';
import type { DrawSample } from '../../src/core/types';

describe('phone drawing sectors', () => {
  it('splits only the longer circuits, into 2–4 contiguous sectors with boundaries on open road', () => {
    for (const c of circuits) {
      const n = phoneDrawingSectors[c.id] ?? 1, t = c.track, sectors = drawingSectors(t, n);
      expect(sectors.length, c.id).toBe(n);
      expect(sectors[0].from).toBe(0); expect(sectors.at(-1)!.to).toBeCloseTo(t.length, 6);
      for (let i = 1; i < sectors.length; i++) {
        const at = sectors[i].from;
        expect(at, c.id).toBe(sectors[i - 1].to);
        expect(at, `${c.id} boundary near the gate`).toBeGreaterThanOrEqual(SECTOR_RULES.gateMargin);
        expect(at).toBeLessThanOrEqual(t.length - SECTOR_RULES.gateMargin);
        for (const b of [...(t.jumps ?? []), ...(t.hopShortcuts ?? [])]) expect(at >= b.entryProgress - SECTOR_RULES.corridorMargin && at <= b.exitProgress + SECTOR_RULES.corridorMargin, `${c.id} boundary inside ${b.id}`).toBe(false);
      }
      expect(sectorAt(sectors, t.length * .99).index).toBe(n - 1);
    }
    expect(['coastal-launch', 'orbital-launchyard', 'golden-gate'].every(id => !phoneDrawingSectors[id])).toBe(true);
    expect(Math.max(...Object.values(phoneDrawingSectors))).toBe(4);
  });

  it('measures how far round the course a partial drawing has travelled', () => {
    for (const id of Object.keys(phoneDrawingSectors)) {
      const t = findCircuit(id).track, lap = createPracticeSamples(t, 7);
      expect(drawnProgress(lap, t) / t.length, id).toBeGreaterThan(.97);
      const half = lap.slice(0, Math.floor(lap.length / 2));
      expect(drawnProgress(half, t) / t.length, id).toBeGreaterThan(.3);
      expect(drawnProgress(half, t) / t.length, id).toBeLessThan(.7);
      expect(upcomingCourse(t, 100, 200).length).toBe(51);
    }
  });

  it('joins lifted strokes into the same route as one continuous stroke, retakes included', () => {
    for (const id of ['lax', 'santa-monica', 'san-diego-fleet']) {
      const t = findCircuit(id).track, lap = createPracticeSamples(t, 7), whole = compileRoute(lap, t);
      expect(whole.ok, id).toBe(true);
      // Three strokes: each later one starts after a 3 s lift (camera glide), a little behind the
      // line's end (a retake), and the overlap is trimmed exactly as the game does.
      const cuts = [Math.floor(lap.length / 3), Math.floor(lap.length * 2 / 3)];
      let joined: DrawSample[] = lap.slice(0, cuts[0] + 1);
      for (const [k, cut] of cuts.entries()) {
        const next = cuts[k + 1] ?? lap.length - 1, from = joined.length - 3, touch = { x: joined[from].x + .3, z: joined[from].z };
        const lifted = 3000 * (k + 1), offset = continuationOffset(joined, from, touch, lap[cut].time + lifted);
        joined = joined.slice(0, from + 1);
        for (const p of lap.slice(cut, next + 1)) joined.push({ ...p, time: p.time + lifted + offset });
      }
      expect(joined.every((p, i) => i === 0 || p.time >= joined[i - 1].time)).toBe(true);
      const result = compileRoute(joined, t);
      expect(result.ok, id).toBe(true);
      if (!result.ok || !whole.ok) continue;
      expect(Math.abs(result.route.length - whole.route.length) / whole.route.length, id).toBeLessThan(.02);
      expect(Math.abs(result.route.drawingDuration - whole.route.drawingDuration) / whole.route.drawingDuration, id).toBeLessThan(.05);
      expect(distance(result.route.points[0], whole.route.points[0])).toBeLessThan(1);
    }
  });

  it('detects phone-sized touch screens, not iPads, desktops or automation', () => {
    const win = (w: number, h: number, coarse: boolean, search = '', webdriver = false) => ({ innerWidth: w, innerHeight: h, location: { search } as Location, navigator: { webdriver } as Navigator, matchMedia: (() => ({ matches: coarse })) as unknown as Window['matchMedia'] });
    expect(phoneSizedTouchScreen(win(844, 390, true))).toBe(true);      // iPhone landscape
    expect(phoneSizedTouchScreen(win(390, 844, true))).toBe(true);      // iPhone portrait
    expect(phoneSizedTouchScreen(win(932, 430, true))).toBe(true);      // iPhone Pro Max
    expect(phoneSizedTouchScreen(win(1133, 744, true))).toBe(false);    // iPad mini
    expect(phoneSizedTouchScreen(win(1366, 1024, true))).toBe(false);   // iPad Pro
    expect(phoneSizedTouchScreen(win(800, 450, false))).toBe(false);    // small desktop window
    expect(phoneSizedTouchScreen(win(1366, 1024, false, '?sectors=on'))).toBe(true);
    expect(phoneSizedTouchScreen(win(844, 390, true, '?sectors=off'))).toBe(false);
    expect(phoneSizedTouchScreen(win(844, 390, true, '', true))).toBe(false);
    expect(phoneSizedTouchScreen(win(844, 390, true, '?sectors=on', true))).toBe(true);
    expect(PHONE_SHORT_SIDE_MAX).toBeLessThan(744);
  });

  it('shows the sector, the continue hint and Undo on the drawing panel', () => {
    const view = { preview: false, playerCount: 1, turn: 0, playerName: () => 'P1', humans: () => 1, inTour: false };
    const html = planningPanel({ ...view, sector: { index: 1, total: 3, continuing: true, canUndo: true } });
    expect(html).toContain('Sector 2 of 3'); expect(html).toContain('glowing end'); expect(html).toContain('data-action="undo-sector"');
    expect(planningPanel(view)).not.toContain('undo-sector');
    expect(planningPanel({ ...view, sector: { index: 0, total: 2, continuing: false, canUndo: false }, message: 'Oops' })).toContain('Oops');
  });
});
