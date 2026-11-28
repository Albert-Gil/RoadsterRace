/**
 * Live numbers from the room server for sizing its room limit (served at /stats, no secrets): how long each
 * 60 Hz simulation step takes per circuit, how much real time the rooms fell behind, rooms open by circuit,
 * and how quickly the process became ready after a (cold) start. One `duel-steps` log line per circuit per
 * minute carries the same step numbers.
 */
export interface StepSummary { samples: number; medianMs: number; p95Ms: number; maxMs: number }
function summarise(values: number[]): StepSummary {
  const sorted = [...values].sort((a, b) => a - b), at = (q: number) => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(3);
  return { samples: sorted.length, medianMs: at(0.5), p95Ms: at(0.95), maxMs: at(1) };
}

export class ServerStats {
  private current = new Map<string, number[]>();
  private minutes: { at: number; circuit: string; summary: StepSummary; behindMs: number }[] = [];
  private behind = new Map<string, number>();
  private rooms = new Map<string, number>();
  readyMs?: number;
  constructor(readonly startedAt = Date.now(), private log: (line: string) => void = line => console.log(line)) {}

  recordStep(circuit: string, ms: number) {
    let list = this.current.get(circuit);
    if (!list) this.current.set(circuit, list = []);
    list.push(ms);
  }
  /** Real time a room could not simulate (its accumulator was capped). */
  recordBehind(circuit: string, ms: number) { this.behind.set(circuit, (this.behind.get(circuit) ?? 0) + ms); }
  roomOpened(circuit: string) { this.rooms.set(circuit, (this.rooms.get(circuit) ?? 0) + 1); }
  roomClosed(circuit: string) { const n = (this.rooms.get(circuit) ?? 1) - 1; if (n > 0) this.rooms.set(circuit, n); else this.rooms.delete(circuit); }
  get openRooms() { let n = 0; for (const v of this.rooms.values()) n += v; return n; }

  /** Closes the current minute: logs and keeps one summary per circuit (the last hour is kept). */
  rollMinute(now = Date.now()) {
    for (const [circuit, values] of this.current) {
      if (!values.length) continue;
      const summary = summarise(values), behindMs = Math.round(this.behind.get(circuit) ?? 0);
      this.minutes.push({ at: now, circuit, summary, behindMs });
      this.log(JSON.stringify({ type: 'duel-steps', circuit, rooms: this.rooms.get(circuit) ?? 0, ...summary, behindMs }));
    }
    this.current.clear(); this.behind.clear();
    while (this.minutes.length && this.minutes[0].at < now - 3_600_000) this.minutes.shift();
  }

  snapshot(now = Date.now()) {
    const lastMinute: Record<string, StepSummary & { behindMs: number }> = {}, lastHour: Record<string, StepSummary & { minutes: number; behindMs: number }> = {};
    for (const [circuit, values] of this.current) if (values.length) lastMinute[circuit] = { ...summarise(values), behindMs: Math.round(this.behind.get(circuit) ?? 0) };
    const byCircuit = new Map<string, typeof this.minutes>();
    for (const m of this.minutes) { const list = byCircuit.get(m.circuit) ?? []; list.push(m); byCircuit.set(m.circuit, list); }
    for (const [circuit, list] of byCircuit) {
      lastHour[circuit] = {
        samples: list.reduce((n, m) => n + m.summary.samples, 0),
        medianMs: +(list.reduce((n, m) => n + m.summary.medianMs * m.summary.samples, 0) / Math.max(1, list.reduce((n, m) => n + m.summary.samples, 0))).toFixed(3),
        p95Ms: Math.max(...list.map(m => m.summary.p95Ms)), maxMs: Math.max(...list.map(m => m.summary.maxMs)),
        minutes: list.length, behindMs: list.reduce((n, m) => n + m.behindMs, 0),
      };
    }
    return { ok: true, uptimeSeconds: Math.round((now - this.startedAt) / 1000), readyMs: this.readyMs ?? null,
      rooms: Object.fromEntries(this.rooms), stepsLastMinute: lastMinute, stepsLastHour: lastHour, tickBudgetMs: +(1000 / 60).toFixed(3) };
  }
}

/** The process's numbers, measured from process start (so readyMs includes module loading after a cold start). */
export const stats = new ServerStats(Date.now() - Math.round(process.uptime() * 1000));
const minuteTimer = setInterval(() => stats.rollMinute(), 60_000);
minuteTimer.unref?.();
