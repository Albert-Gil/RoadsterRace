import { randomBytes } from 'node:crypto';
import { Room, ServerError, matchMaker, type Client } from '@colyseus/core';
import { newRoomCode } from '../src/duels/codes';
import { duelError, type DuelReason } from '../src/duels/errors';
import { LocalRace } from '../src/core/local-race';
import { compileRoute, COMPILER_VERSION } from '../src/core/route';
import { RULES } from '../src/core/simulation';
import { coastalTrack } from '../src/core/track';
import { goldenGateTrack } from '../src/core/tracks/golden-gate';
import { santaMonicaTrack } from '../src/core/tracks/santa-monica';
import { sanDiegoFleetTrack } from '../src/core/tracks/san-diego-fleet';
import type { Ability, CompiledRoute, DrawSample, TrackDefinition } from '../src/core/types';
import { resolveBallot } from '../src/core/rematch-vote';
import { DUEL_PROTOCOL, defaultDuelVenues, packFrame, type AbilityCommand, type AbilityOutcome, type AbilityResult, type DriverSeat, type DuelVenue, type RaceFrame, type Rematch, type RoomView } from '../src/duels/protocol';

const allDuelTracks = [coastalTrack, goldenGateTrack, santaMonicaTrack, sanDiegoFleetTrack];
/** Circuits this server offers: the defaults plus any listed in DUEL_EXTRA_VENUES (read on each call, comma-separated). */
export function duelTracks(): Map<string, TrackDefinition> {
  const extra = (process.env.DUEL_EXTRA_VENUES ?? '').split(',').map(id => id.trim()).filter(Boolean);
  return new Map(allDuelTracks.filter(t => (defaultDuelVenues as readonly string[]).includes(t.id) || extra.includes(t.id)).map(t => [t.id, t]));
}
const tickMs = 1000 / 60;
let rooms = 0;
/** Rooms one process admits. Render Free has 0.1 CPU: raise only after reading the step-time log. */
const MAX_ROOMS = Math.max(1, Number(process.env.DUEL_MAX_ROOMS ?? 2));
/** Seconds a driver may keep drawing before the host can remove them. */
export const DRAWING_GRACE_SECONDS = 90;
/** How stale a press's observed tick may be (1 s): a slow phone's press still counts, applied on arrival. */
const ABILITY_WINDOW_TICKS = 60;
const steps: number[] = [];
let stepLog: ReturnType<typeof setInterval> | undefined;
/** One line per minute: how long simulation steps take on this instance (ms), to size MAX_ROOMS. */
function recordStep(ms: number) {
  steps.push(ms);
  stepLog ??= setInterval(() => {
    if (!steps.length) return;
    const sorted = steps.splice(0).sort((a, b) => a - b), at = (q: number) => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(3);
    console.log(JSON.stringify({ type: 'duel-steps', rooms, samples: sorted.length, medianMs: at(.5), p95Ms: at(.95), maxMs: at(1) }));
  }, 60_000);
  stepLog.unref?.();
}
const creations: number[] = [];
type Options = { protocol: number; physics: number; compiler: number; circuit: DuelVenue; laps: number; name: string; paint: string; versions: Record<string,number>; since?: number };
interface Seat extends DriverSeat { versions: Record<string, number>; route?: CompiledRoute; samples?: DrawSample[]; lastSequence: number; lastUpload: number; sentCooldowns?: string }

function readStroke(input: unknown, track: TrackDefinition) {
  if (!Array.isArray(input) || input.length < 4 || input.length > 16384) return;
  const samples: DrawSample[] = [];
  let length = 0;
  for (const point of input) {
    if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) return;
    const [x,z,time] = point;
    if (Math.abs(x) > 1500 || Math.abs(z) > 1500 || time < 0 || time > 3_600_000) return;
    const prev = samples.at(-1);
    if (prev) {
      if (time < prev.time) return;
      length += Math.hypot(x-prev.x,z-prev.z);
      if (length > track.length * 6) return;
    }
    samples.push({ x, z, time });
  }
  return samples;
}

export class DuelRoom extends Room {
  maxClients = 4;
  maxMessagesPerSecond = 30;
  patchRate = null;
  private counted = false;
  private seats: Seat[] = [];
  private view!: RoomView;
  private track!: TrackDefinition;
  private race?: LocalRace;
  /** Accepted ability commands waiting for the step that evaluates them. */
  private awaiting:{seat:Seat;round:number;sequence:number;ability:Ability}[]=[];
  private reserved = new Set<string>();
  private removed = new Set<string>();
  private countdown = 0;
  private accumulator = 0;
  private idleSince = Date.now();
  private drawingSince = 0;
  /** The host changed the circuit after a race: the next round needs fresh lines whatever the vote. */
  private forceRedraw = false;
  private events: RaceFrame['events'] = [];

  async onCreate(options: Options) {
    this.track = duelTracks().get(options.circuit)!;
    if (!this.track || !Number.isInteger(options.laps) || options.laps < 1 || options.laps > 6) throw new ServerError(400,'settings-invalid' satisfies DuelReason);
    this.compatible(options);
    while (creations.length && creations[0] < Date.now()-60_000) creations.shift();
    if (rooms >= MAX_ROOMS || creations.length >= 30) throw new ServerError(429,'server-full' satisfies DuelReason);
    rooms++; this.counted = true; creations.push(Date.now());
    // Six unambiguous characters players can type; retry on the (rare) clash with a live room.
    let code = newRoomCode(n => randomBytes(n));
    while (matchMaker.getLocalRoomById(code)) code = newRoomCode(n => randomBytes(n));
    this.roomId = code;
    await this.setPrivate(true);
    this.view = {created:Math.floor(Date.now()/1000), phase:'lobby', circuit:options.circuit, laps:options.laps, round:0, host:'', drivers:[], physics:RULES.version, compiler:COMPILER_VERSION, trackVersion:this.track.version};
    this.onMessage('sync', c => this.sync(c));
    this.onMessage('start', c => {
      if (c.sessionId !== this.view.host || this.view.phase !== 'lobby' || this.seats.length < 2 || this.seats.some(s=>!s.connected)) return;
      this.lock(); this.awaiting=[]; this.view.phase='drawing'; this.view.round++; this.drawingSince=Date.now(); this.publish();
    });
    this.onMessage('line', (c,data) => this.lockLine(c,data));
    // The host may change circuit and laps in the lobby or on results; a circuit change means fresh lines.
    this.onMessage('settings',(c,data:{circuit?:string;laps?:number})=>{
      if(c.sessionId!==this.view.host||(this.view.phase!=='lobby'&&this.view.phase!=='results'))return;
      const track=duelTracks().get(data?.circuit as DuelVenue), laps=data?.laps;
      if(!track||!Number.isInteger(laps)||laps!<1||laps!>6){this.fail(c,'settings-invalid');return;}
      if(this.seats.some(s=>s.versions[track.id]!==track.version)){this.fail(c,'circuit-version');return;}
      if(track.id!==this.track.id&&this.view.phase==='results'){this.forceRedraw=true;this.seats.forEach(s=>s.vote=null);}
      this.track=track;this.view.circuit=track.id as DuelVenue;this.view.laps=laps!;this.view.trackVersion=track.version;this.publish();
    });
    // After the grace period the host can remove a driver who is still drawing; everyone else then races.
    this.onMessage('remove',(c,data:{id?:string})=>{
      const target=this.seats.find(s=>s.id===data?.id);
      if(c.sessionId!==this.view.host||this.view.phase!=='drawing'||!target||target.ready||target.id===c.sessionId)return;
      if(Date.now()-this.drawingSince<(DRAWING_GRACE_SECONDS-5)*1000)return;
      this.removed.add(target.id);this.clients.find(x=>x.sessionId===target.id)?.leave(4002);
    });
    this.onMessage('ability',(c,command: AbilityCommand) => {
      // A command from an earlier round is dropped: that client already cleared it on the round change.
      if (!command || command.round !== this.view.round) return;
      const i=this.seats.findIndex(s=>s.id===c.sessionId), seat=this.seats[i];
      const ability=command.ability==='hop'||command.ability==='thrust'?command.ability:null;
      if (!seat || !ability || !Number.isSafeInteger(command.sequence)) return;
      const reply=(outcome:AbilityOutcome)=>c.send('ability-result',{round:command.round,sequence:command.sequence,ability,outcome,tick:this.race?.tick??0} satisfies AbilityResult);
      if (command.sequence<=seat.lastSequence) return reply('duplicate');
      seat.lastSequence=command.sequence;
      if (this.view.phase !== 'racing' || !this.race || seat.withdrawn) return reply('unavailable');
      if (!Number.isInteger(command.tick) || command.tick>this.race.tick || this.race.tick-command.tick>ABILITY_WINDOW_TICKS) return reply('too-late');
      if (this.awaiting.some(a=>a.seat===seat&&a.ability===ability)) return reply('duplicate');
      if (!(ability==='hop'?this.race.pressHop(i):this.race.pressThrust(i))) return reply('unavailable');
      this.awaiting.push({seat,round:command.round,sequence:command.sequence,ability});
    });
    this.onMessage('rematch',(c,data) => {
      if(this.view.phase!=='results' || data?.round!==this.view.round || !['same','redraw'].includes(data.vote)) return;
      this.seat(c).vote=data.vote as Rematch; this.checkVotes();
    });
    // Colyseus can also tick its room clock to service reconnect timers. Measure
    // the real interval between simulation callbacks independently.
    let previous=performance.now();
    this.setTimestep(()=>{const now=performance.now();this.advance(now-previous);previous=now;},tickMs);
  }
  private compatible(o: Options) {
    if (o.protocol!==DUEL_PROTOCOL || o.physics!==RULES.version || o.compiler!==COMPILER_VERSION || o.versions?.[this.track.id]!==this.track.version) throw new ServerError(409,'version-mismatch' satisfies DuelReason);
  }
  onAuth(_c: Client,o: Options) {
    this.compatible(o);
    // An invite link names the room it was made for; a newer room reusing the code is not that room.
    if (o.since!==undefined && o.since!==this.view.created) throw new ServerError(410,'invite-expired' satisfies DuelReason);
    return true;
  }
  onJoin(c: Client,o: Options) {
    if(this.view.phase!=='lobby') throw new ServerError(409,'room-started' satisfies DuelReason);
    this.seats.push({ versions:{...(o.versions??{})}, id:c.sessionId, name:String(o.name??'Driver').trim().slice(0,24)||'Driver', paint:String(o.paint??'glacier').slice(0,24), ready:false, connected:true, withdrawn:false, vote:null, lastSequence:0, lastUpload:-Infinity });
    if(!this.view.host) this.view.host=c.sessionId;
    this.publish();
  }
  private seat(c: Client) { return this.seats.find(s=>s.id===c.sessionId)!; }
  private publish() {
    this.idleSince=Date.now();
    this.view.drivers=this.seats.map(({id,name,paint,ready,connected,withdrawn,vote})=>({id,name,paint,ready,connected,withdrawn,vote}));
    this.broadcast('room',this.view);
  }
  /** A typed error for one seat (src/duels/errors.ts); the client decides where it is shown. */
  private fail(c: Client, reason: DuelReason, detail?: string) { c.send('error', duelError(reason, detail)); }
  private sync(c: Client) {
    c.send('room',this.view);
    const seat=this.seat(c);
    if(seat?.samples) c.send('ownLine',{samples:seat.samples.map(p=>[p.x,p.z,p.time]),sequence:seat.lastSequence});
    if(this.race) { c.send('frame',this.frame()); const i=this.seats.indexOf(seat),st=this.race.racers[i]?.state; if(st) c.send('cooldowns',{round:this.view.round,hopReadyAt:st.hopReadyAt,thrustReadyAt:st.thrustReadyAt}); }
  }
  private lockLine(c: Client,data: {round?:number;samples?:unknown}) {
    const seat=this.seat(c);
    if(this.view.phase!=='drawing' || data?.round!==this.view.round || seat.ready) return;
    if(Date.now()-seat.lastUpload<800) { this.fail(c,'line-too-soon'); return; }
    seat.lastUpload=Date.now();
    const samples=readStroke(data.samples,this.track);
    if(!samples) { this.fail(c,'line-unreadable'); return; }
    const result=compileRoute(samples,this.track);
    if(!result.ok) { this.fail(c,'line-invalid',result.message); return; }
    seat.route=result.route; seat.samples=samples; seat.ready=true;
    if(this.seats.every(s=>s.ready)) this.startRace(); else this.publish();
  }
  private startRace() {
    this.race=new LocalRace(this.seats.map(s=>s.route!),this.track,this.view.laps);
    this.seats.forEach(s=>s.sentCooldowns=undefined);
    this.countdown=180; this.accumulator=0; this.events=[]; this.view.phase='countdown';
    this.publish(); this.broadcast('frame',this.frame());
  }
  private frame() {
    const race=this.race!;
    const order=race.standings().sort((a,b)=>Number(this.seats[a.player].withdrawn)-Number(this.seats[b.player].withdrawn));
    let rank=0, last:number|null=null;
    order.forEach((s,i)=>{if(this.seats[s.player].withdrawn) {s.rank=0; s.finished=false; s.finishTime=null;} else if(s.finished){const t=Math.round(s.finishTime!*100); if(t!==last)rank=i+1; s.rank=rank; last=t;} else s.rank=i+1;});
    return packFrame({round:this.view.round,tick:race.tick,countdown:this.countdown,cars:race.racers.map(r=>r.state),order,events:this.events});
  }
  private advance(dt:number) {
    if(!this.race || (this.view.phase!=='countdown' && this.view.phase!=='racing')) {
      if(Date.now()-this.idleSince>15*60_000) void this.disconnect(); return;
    }
    this.accumulator+=Math.min(250,dt);
    while(this.accumulator>=tickMs) {
      this.accumulator-=tickMs;
      if(this.countdown>0) {
        this.countdown--; if(!this.countdown){this.view.phase='racing';this.publish();}
      } else {
        const began=performance.now(); this.race.step(); recordStep(performance.now()-began); this.events.push(...this.race.drainEvents()); this.settleAbilities();
        if(this.race.time>15*60) this.seats.forEach((s,i)=>{if(!this.race!.racers[i].state.finished)this.withdraw(s);});
        if(this.race.finished) {this.view.phase='results';this.broadcast('frame',this.frame());this.events=[];this.publish();return;}
      }
      if((this.countdown||this.race.tick)%3===0) { this.broadcast('frame',this.frame()); this.events=[]; this.sendCooldowns(); }
    }
  }
  /** Replies to commands the last step evaluated (in press order); each seat hears only its own. */
  private settleAbilities(){
    if(!this.awaiting.length||!this.race)return;
    this.awaiting=this.awaiting.filter(a=>{
      if(a.round!==this.view.round)return false;
      const outcome=this.race!.racers[this.seats.indexOf(a.seat)]?.takeOutcome(a.ability);
      if(!outcome)return true;
      this.clients.find(c=>c.sessionId===a.seat.id)?.send('ability-result',{round:a.round,sequence:a.sequence,ability:a.ability,outcome,tick:this.race!.tick} satisfies AbilityResult);
      return false;
    });
  }
  /** Each seat's own Thrust/Hop readiness, sent only to that seat and only when it changes (protocol 2). */
  private sendCooldowns(force=false) {
    if(!this.race)return;
    this.seats.forEach((seat,i)=>{
      const s=this.race!.racers[i]?.state;if(!s)return;
      const message={round:this.view.round,hopReadyAt:s.hopReadyAt,thrustReadyAt:s.thrustReadyAt},key=message.round+':'+message.hopReadyAt+':'+message.thrustReadyAt;
      if(!force&&seat.sentCooldowns===key)return;
      const client=this.clients.find(c=>c.sessionId===seat.id);
      if(client){client.send('cooldowns',message);seat.sentCooldowns=key;}
    });
  }
  private withdraw(s:Seat) {
    const car=this.race?.racers[this.seats.indexOf(s)];
    if(car && !car.state.finished) {s.withdrawn=true;car.clearCommands();car.state.finished=true;}
  }
  async onDrop(c:Client) {
    // A driver the host removed gets no reconnect window.
    if(this.removed.has(c.sessionId)){this.removed.delete(c.sessionId);return;}
    this.reserved.add(c.sessionId); this.seat(c).connected=false; this.publish();
    try {await this.allowReconnection(c,30);} catch { /* onLeave finalizes the seat */ }
  }
  onReconnect(c:Client) { this.reserved.delete(c.sessionId); this.seat(c).connected=true; this.publish(); }
  onLeave(c:Client) {
    this.reserved.delete(c.sessionId); const s=this.seat(c); if(!s)return;
    s.connected=false;
    if(!this.race) {
      this.seats=this.seats.filter(other=>other!==s);
      if(this.view.phase==='drawing' && this.seats.length<2) {
        this.view.phase='lobby';this.seats.forEach(seat=>{seat.ready=false;seat.route=undefined;seat.samples=undefined;}); void this.unlock();
      }
    } else this.withdraw(s);
    if(this.view.host===s.id) this.view.host=(this.seats.find(x=>x.connected)??this.seats[0])?.id??'';
    if(this.view.phase==='drawing' && this.seats.every(x=>x.ready)) this.startRace();
    else if(this.view.phase==='results') this.checkVotes();
    else this.publish();
  }
  /**
   * Resolves the results vote with the same rule as local play (src/core/rematch-vote.ts): once
   * every connected driver has voted, any redraw means fresh lines, otherwise the same lines.
   * Seats still inside their 30-second reconnect window keep the vote open; seats that leave
   * (Home or an expired reconnect) drop out of it. Another race needs at least two drivers.
   */
  private checkVotes() {
    const remaining=this.seats.filter(s=>s.connected), outcome=resolveBallot(remaining.map(s=>s.vote));
    if(remaining.length>=2 && !this.reserved.size && outcome!=='pending') {
      const redraw=outcome==='redraw'||this.forceRedraw;this.forceRedraw=false;this.seats=remaining;this.view.round++;this.race=undefined;this.awaiting=[];
      for(const s of remaining){s.vote=null;s.withdrawn=false;s.lastSequence=0;s.ready=!redraw;if(redraw){s.samples=undefined;s.route=undefined;}}
      if(!redraw){this.startRace();return;}
      this.view.phase='drawing';this.drawingSince=Date.now();
    }
    this.publish();
  }
  onDispose() { if(this.counted) rooms--; }
}
