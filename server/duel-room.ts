import { randomBytes } from 'node:crypto';
import { Room, ServerError, type Client } from '@colyseus/core';
import { LocalRace } from '../src/core/local-race';
import { compileRoute, COMPILER_VERSION } from '../src/core/route';
import { RULES } from '../src/core/simulation';
import { coastalTrack } from '../src/core/track';
import { goldenGateTrack } from '../src/core/tracks/golden-gate';
import { santaMonicaTrack } from '../src/core/tracks/santa-monica';
import type { CompiledRoute, DrawSample, TrackDefinition } from '../src/core/types';
import { DUEL_PROTOCOL, packFrame, type AbilityCommand, type DriverSeat, type DuelVenue, type RaceFrame, type Rematch, type RoomView } from '../src/duels/protocol';

const tracks = new Map([coastalTrack, goldenGateTrack, santaMonicaTrack].map(track => [track.id, track]));
const tickMs = 1000 / 60;
let rooms = 0;
const creations: number[] = [];
type Options = { protocol: number; physics: number; compiler: number; circuit: DuelVenue; laps: number; name: string; paint: string; versions: Record<string,number> };
interface Seat extends DriverSeat { route?: CompiledRoute; samples?: DrawSample[]; lastSequence: number; lastUpload: number }

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
  private reserved = new Set<string>();
  private countdown = 0;
  private accumulator = 0;
  private idleSince = Date.now();
  private events: RaceFrame['events'] = [];

  async onCreate(options: Options) {
    this.track = tracks.get(options.circuit)!;
    if (!this.track || !Number.isInteger(options.laps) || options.laps < 1 || options.laps > 6) throw new ServerError(400,'Choose a beta circuit and 1–6 laps.');
    this.compatible(options);
    while (creations.length && creations[0] < Date.now()-60_000) creations.shift();
    if (rooms >= 4 || creations.length >= 30) throw new ServerError(429,'The test server is full. Try again shortly.');
    rooms++; this.counted = true; creations.push(Date.now());
    this.roomId = randomBytes(5).toString('hex').toUpperCase();
    await this.setPrivate(true);
    this.view = {phase:'lobby', circuit:options.circuit, laps:options.laps, round:0, host:'', drivers:[], physics:RULES.version, compiler:COMPILER_VERSION, trackVersion:this.track.version};
    this.onMessage('sync', c => this.sync(c));
    this.onMessage('start', c => {
      if (c.sessionId !== this.view.host || this.view.phase !== 'lobby' || this.seats.length < 2 || this.seats.some(s=>!s.connected)) return;
      this.lock(); this.view.phase='drawing'; this.view.round++; this.publish();
    });
    this.onMessage('line', (c,data) => this.lockLine(c,data));
    this.onMessage('ability',(c,command: AbilityCommand) => {
      if (!command || command.round !== this.view.round || this.view.phase !== 'racing' || !this.race) return;
      const i=this.seats.findIndex(s=>s.id===c.sessionId), seat=this.seats[i];
      if (!seat || seat.withdrawn || !Number.isSafeInteger(command.sequence) || command.sequence<=seat.lastSequence || !Number.isInteger(command.tick) || command.tick>this.race.tick || this.race.tick-command.tick>30) return;
      seat.lastSequence=command.sequence;
      if(command.ability==='hop') this.race.pressHop(i);
      if(command.ability==='thrust') this.race.pressThrust(i);
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
    if (o.protocol!==DUEL_PROTOCOL || o.physics!==RULES.version || o.compiler!==COMPILER_VERSION || o.versions?.[this.track.id]!==this.track.version) throw new ServerError(409,'Your game version differs from this room. Refresh and try again.');
  }
  onAuth(_c: Client,o: Options) { this.compatible(o); return true; }
  onJoin(c: Client,o: Options) {
    if(this.view.phase!=='lobby') throw new ServerError(409,'This race has already started.');
    this.seats.push({ id:c.sessionId, name:String(o.name??'Driver').trim().slice(0,24)||'Driver', paint:String(o.paint??'glacier').slice(0,24), ready:false, connected:true, withdrawn:false, vote:null, lastSequence:0, lastUpload:-Infinity });
    if(!this.view.host) this.view.host=c.sessionId;
    this.publish();
  }
  private seat(c: Client) { return this.seats.find(s=>s.id===c.sessionId)!; }
  private publish() {
    this.idleSince=Date.now();
    this.view.drivers=this.seats.map(({id,name,paint,ready,connected,withdrawn,vote})=>({id,name,paint,ready,connected,withdrawn,vote}));
    this.broadcast('room',this.view);
  }
  private sync(c: Client) {
    c.send('room',this.view);
    const seat=this.seat(c);
    if(seat?.samples) c.send('ownLine',{samples:seat.samples.map(p=>[p.x,p.z,p.time]),sequence:seat.lastSequence});
    if(this.race) c.send('frame',this.frame());
  }
  private lockLine(c: Client,data: {round?:number;samples?:unknown}) {
    const seat=this.seat(c);
    if(this.view.phase!=='drawing' || data?.round!==this.view.round || seat.ready) return;
    if(Date.now()-seat.lastUpload<800) { c.send('notice','Wait a moment before submitting again.'); return; }
    seat.lastUpload=Date.now();
    const samples=readStroke(data.samples,this.track);
    if(!samples) { c.send('notice','This drawing exceeds the room limits. Please redraw.'); return; }
    const result=compileRoute(samples,this.track);
    if(!result.ok) { c.send('notice',result.message); return; }
    seat.route=result.route; seat.samples=samples; seat.ready=true;
    if(this.seats.every(s=>s.ready)) this.startRace(); else this.publish();
  }
  private startRace() {
    this.race=new LocalRace(this.seats.map(s=>s.route!),this.track,this.view.laps);
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
        this.race.step(); this.events.push(...this.race.drainEvents());
        if(this.race.time>15*60) this.seats.forEach((s,i)=>{if(!this.race!.racers[i].state.finished)this.withdraw(s);});
        if(this.race.finished) {this.view.phase='results';this.broadcast('frame',this.frame());this.events=[];this.publish();return;}
      }
      if((this.countdown||this.race.tick)%3===0) { this.broadcast('frame',this.frame()); this.events=[]; }
    }
  }
  private withdraw(s:Seat) {
    const car=this.race?.racers[this.seats.indexOf(s)];
    if(car && !car.state.finished) {s.withdrawn=true;car.clearCommands();car.state.finished=true;}
  }
  async onDrop(c:Client) {
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
  private checkVotes() {
    const remaining=this.seats.filter(s=>s.connected);
    if(remaining.length>=2 && !this.reserved.size && remaining.every(s=>s.vote && s.vote===remaining[0].vote)) {
      const redraw=remaining[0].vote==='redraw';this.seats=remaining;this.view.round++;this.race=undefined;
      for(const s of remaining){s.vote=null;s.withdrawn=false;s.lastSequence=0;s.ready=!redraw;if(redraw){s.samples=undefined;s.route=undefined;}}
      if(!redraw){this.startRace();return;}
      this.view.phase='drawing';
    }
    this.publish();
  }
  onDispose() { if(this.counted) rooms--; }
}
