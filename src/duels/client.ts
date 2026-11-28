import { Client, type Room } from '@colyseus/sdk';
import { DUEL_PROTOCOL, duelVenues, offeredVenues, unpackFrame, type AbilityOutcome, type AbilityResult, type Cooldowns, type WireFrame, type DuelVenue, type RoomView, type RaceFrame, type DrawingPacket } from './protocol';
import { RULES } from '../core/simulation';
import { COMPILER_VERSION } from '../core/route';
import type { Ability, DrawSample } from '../core/types';
import { duelEndpoint, savedSeat, storeSeat } from './seat';
import { checkRoomCode, decodeSince, encodeSince } from './codes';
import { describeDuelError, duelError, duelErrorAction, DuelFailure, mapConnectionFailure, type DuelError } from './errors';
import { judgeHealth, recheckWhileUpdating, RECHECK_WINDOW_MS, type HealthReply, type HealthVerdict } from './compatibility';
import { newerBuildDeployed } from '../app/stale-build';
import { Paddock, type EntryForm } from './paddock';
import { duelScreen } from './screen';
import { CoachCards } from './coach';
import { cleanDriverName } from '../presentation/race-settings';

interface Hooks {
  driver: { name: string; paint: string };
  finishes: readonly { id: string; name: string; color: string }[];
  saveDriver(driver: { name: string; paint: string }): void;
  versions: Record<string,number>;
  draw(view:RoomView):void;
  frame(frame:RaceFrame,view:RoomView):void;
  ownLine(samples:DrawSample[]):void;
  home():void;
  /** The circuit's artwork URL for the paddock background. */
  circuitArt?(circuit:string):string|undefined;
  /** The 3D scene can draw the room's circuit (course and grid); until then a racing room shows Loading circuit. */
  sceneReady?():boolean;
  /** Where your own car is drawn right now (diagnostics: display error against the server at press time). */
  ownShown?():{x:number;z:number;buffered?:{x:number;z:number};display?:Record<string,unknown>}|undefined;
}
/** Matches the server's DRAWING_GRACE_SECONDS (server/duel-room.ts). */
const DRAWING_GRACE=90;
export class DuelClient {
  private room?: Room;
  view?:RoomView;
  latest?:RaceFrame;
  private sequence=0;
  private drawingShownAt=0;
  private graceTimer?:number;
  private cooldowns?:Cooldowns;
  /** A press made in the last countdown beat, sent with the first racing frame. */
  private queued?:Ability;
  /** Sent commands awaiting the server's private reply, matched by round and sequence. */
  private pending:{round:number;sequence:number;ability:Ability;at:number;shown?:{x:number;z:number;buffered?:{x:number;z:number};display?:Record<string,unknown>}}[]=[];
  /** Your car's recent server positions by tick, to measure how far the drawn car was from the room. */
  private ownTrail:{tick:number;x:number;z:number;speed:number}[]=[];
  private measuring:{entry:DuelClient['commandLog'][number];shown:{x:number;z:number;buffered?:{x:number;z:number};display?:Record<string,unknown>};tick:number}[]=[];
  /** Development and test diagnostics: every command's outcome, or `unconfirmed` after 1.5 s. Never shown to players. */
  readonly commandLog:{round:number;sequence:number;ability:Ability;outcome:AbilityOutcome|'unconfirmed';roundTripMs?:number;displayErrorTicks?:number;bufferedErrorTicks?:number;display?:Record<string,unknown>}[]=[];
  /** Smoothed one-way delay to the room, from command round trips (ms). */
  oneWayMs=0;
  private roundDrawn=0;
  /** Circuits the room server offers; Fleet appears only once /health lists it. */
  private venues=offeredVenues(null);
  private paddock:Paddock;
  private coach=new CoachCards();
  private get status(){return this.paddock.status;}
  private closed=false;
  private connecting=false;
  private menu=false;
  private disconnected=false;
  private waiting=false;
  /** Entry-screen controls the updating state disables; the invite field and saved seat are left alone. */
  private entry?:{buttons:HTMLButtonElement[];notice:HTMLElement;fillVenues():void;form:EntryForm};
  private updatingRun=0;
  get overlayOpen(){return this.paddock.open;}
  /** The paddock hides the whole scene: main skips rendering until it fades out. */
  get covering(){return this.paddock.covering;}
  get seatIndex(){return this.view?.drivers.findIndex(s=>s.id===this.room?.sessionId)??0;}
  constructor(private hooks:Hooks){
    const color=new Map(hooks.finishes.map(f=>[f.id,f.color]));
    this.paddock=new Paddock(paint=>color.get(paint)??'#8a96a3',circuit=>hooks.circuitArt?.(circuit),{
      start:()=>this.room?.send('start'),
      vote:choice=>this.view&&this.room?.send('rematch',{round:this.view.round,vote:choice}),
      settings:(circuit,laps)=>this.room?.send('settings',{circuit,laps}),
      remove:id=>this.room?.send('remove',{id}),
      resume:()=>this.resume(),
      home:()=>this.leave(),
    });
    if(import.meta.env.DEV)(window as unknown as {__roadsterDuel?:DuelClient}).__roadsterDuel=this;
  }
  private venueList(ids:readonly string[]=this.venues){return ids.map(id=>({id,name:duelVenues[id as DuelVenue]??id}));}
  open(initialCode='', reclaimed?: Room) {
    const invite=initialCode?checkRoomCode(initialCode):undefined;
    const form=this.paddock.entry(this.hooks.driver,this.hooks.finishes,this.venueList(),()=>this.leave(),!!invite?.ok);
    const saveDriver=()=>{
      this.hooks.driver={name:cleanDriverName(form.name.value,0),paint:form.paint.value};
      this.hooks.saveDriver(this.hooks.driver);
    };
    const fillVenues=()=>Paddock.fillVenues(form.circuit,this.venueList());
    // Ask the server which circuits it offers; this also starts waking a sleeping free instance.
    if(duelEndpoint)void this.probe(20_000).then(verdict=>{
      if(this.closed)return;
      if(verdict.kind==='ok'){this.venues=verdict.venues;fillVenues();}
      else if(verdict.kind==='updating')void this.enterUpdating(verdict);
    });
    form.code.value=invite?.ok?invite.code:'';
    form.create.onclick=()=>{saveDriver();void this.connect('',form.circuit.value as DuelVenue,Number(form.laps.value));};
    form.join.onclick=()=>{const check=checkRoomCode(form.code.value);if(check.ok){saveDriver();void this.connect(check.code);}else this.status.textContent=check.reason==='old-invite'?describeDuelError(duelError('old-invite')):'Enter the room code from your invite, for example TIGER7.';};
    this.entry={buttons:[form.create,form.join],notice:form.notice,fillVenues,form};
    if(invite?.ok&&!reclaimed&&savedSeat(invite.code)){
      // A saved seat whose quick reclaim failed during startup: offer it explicitly.
      this.entry.buttons.push(form.addAction('Rejoin race',()=>void this.connect(invite.code)));
    }
    if(invite&&!invite.ok)this.status.textContent=invite.reason==='old-invite'?describeDuelError(duelError('old-invite')):'This invite link is not valid. Ask for a new one.';
    if(reclaimed&&invite?.ok)void this.connect(invite.code,undefined,undefined,reclaimed);
  }
  /** Aborts every /health request and recheck in flight when the player leaves. */
  private probes=new AbortController();
  private async probe(timeout:number):Promise<HealthVerdict>{
    const url=new URL(duelEndpoint!);url.protocol=url.protocol==='wss:'?'https:':url.protocol==='ws:'?'http:':url.protocol;
    const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),timeout);
    const leaving=()=>abort.abort();this.probes.signal.addEventListener('abort',leaving);
    let reply:HealthReply;
    try{const response=await fetch(new URL('/health',url),{signal:abort.signal,cache:'no-store'});reply={kind:'http',status:response.status,body:await response.json().catch(()=>null)};}
    catch{reply=abort.signal.aborted?{kind:'timeout'}:{kind:'error'};}
    finally{clearTimeout(timer);this.probes.signal.removeEventListener('abort',leaving);}
    return judgeHealth(reply,{protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,tracks:this.hooks.versions});
  }
  /**
   * "Online play is updating": Create and Join stay disabled while /health is rechecked for up to 15 s. Then
   * Reload game if a newer website build is deployed (this is the entry screen, never drawing or racing),
   * otherwise Try again. The invite in the address and the saved seat are kept for the next attempt.
   */
  private async enterUpdating(first:HealthVerdict){
    const entry=this.entry;if(!entry||this.closed)return;
    const run=++this.updatingRun;
    entry.buttons.forEach(b=>b.disabled=true);this.status.textContent='';
    const say=(detail:string,action?:{label:string;run:(b:HTMLButtonElement)=>void})=>Paddock.updating(entry.notice,detail,action);
    say('Checking again…');
    const stopped=()=>this.closed||run!==this.updatingRun;
    const delay=(ms:number)=>new Promise<void>(r=>{const t=setTimeout(r,ms);this.probes.signal.addEventListener('abort',()=>{clearTimeout(t);r();},{once:true});});
    const verdict=await recheckWhileUpdating({probe:left=>this.probe(left),delay,now:()=>performance.now(),stopped},first);
    if(this.closed||run!==this.updatingRun)return;
    if(verdict.kind!=='updating'){
      entry.buttons.forEach(b=>b.disabled=false);entry.notice.hidden=true;
      if(verdict.kind==='ok'){this.venues=verdict.venues;entry.fillVenues();}
      return;
    }
    const newer=await newerBuildDeployed().catch(()=>false);
    if(this.closed||run!==this.updatingRun)return;
    const action={label:newer?'Reload game':'Try again',run:newer?()=>location.reload():(b:HTMLButtonElement)=>{b.disabled=true;void this.probe(RECHECK_WINDOW_MS).then(v=>this.enterUpdating(v.kind==='asleep'?{kind:'updating',ahead:verdict.ahead}:v));}};
    say(newer?'A newer version of the game is ready.':verdict.ahead==='server'?'Online races need the newest version of the game, which is still being published.':'The race server is being updated. This usually takes a few minutes.',action);
  }
  private async connect(code:string,circuit:DuelVenue='coastal-launch',laps=1,reclaimed?:Room) {
    if(this.connecting||this.closed)return;
    if(!duelEndpoint){this.status.textContent=describeDuelError(duelError('not-configured'));return;}
    this.connecting=true;this.status.textContent='Connecting to the race server…';
    const wake=window.setTimeout(()=>{this.status.textContent='Waking race server… The first room can take a minute.';},2500);
    try {
      let room = reclaimed;
      if (!room) {
        // Wake a sleeping free instance before the SDK starts its shorter seat-reservation timeout.
        const verdict=await this.probe(100_000);
        if(verdict.kind==='asleep')throw new DuelFailure(duelError('server-asleep'));
        if(verdict.kind==='unreachable')throw new DuelFailure(duelError('server-unreachable'));
        if(verdict.kind==='updating'){this.status.textContent='';void this.enterUpdating(verdict);return;}
        this.venues=verdict.venues;
        if(this.closed)return;
        const client=new Client(duelEndpoint);
        // Joining from an invite link names the room it was made for (its creation stamp); a typed code does not.
        const link=new URL(location.href),since=code&&link.searchParams.get('duel')?.toUpperCase()===code?decodeSince(link.searchParams.get('since')):undefined;
        const options={protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:this.hooks.versions,...this.hooks.driver,circuit,laps,...(since!==undefined?{since}:{})};
        const token=code && savedSeat(code);
        if(token){
          try{room=await client.reconnect(token);}
          catch{storeSeat(null);throw new DuelFailure(duelError('seat-expired'));}
        }else if(code){
          try{room=await client.joinById(code,options);}
          catch(error){throw new DuelFailure(mapConnectionFailure(error,'join'));}
        }else{
          try{room=await client.create('private_duel',options);}
          catch(error){throw new DuelFailure(mapConnectionFailure(error,'create'));}
        }
      }
      if(this.closed){await room.leave();return;}
      this.room=room;storeSeat(room.reconnectionToken);
      const address=new URL(location.href);if(address.searchParams.get('duel')!==room.roomId)address.searchParams.delete('since');address.searchParams.set('duel',room.roomId);history.replaceState(null,'',address);
      room.onMessage('room',(view:RoomView)=>this.receive(view));
      room.onMessage('frame',(wire:WireFrame)=>{
        const frame=unpackFrame(wire);
        if(this.closed||!this.view||frame.round!==this.view.round)return;
        const own=frame.cars[this.seatIndex];
        if(own&&this.cooldowns?.round===frame.round){own.hopReadyAt=this.cooldowns.hopReadyAt;own.thrustReadyAt=this.cooldowns.thrustReadyAt;}
        this.latest=frame;
        if(own){this.ownTrail.push({tick:frame.tick,x:own.position.x,z:own.position.z,speed:own.speed});if(this.ownTrail.length>120)this.ownTrail.shift();this.measure();}
        if(this.queued&&!frame.countdown&&this.view.phase==='racing'){const ability=this.queued;this.queued=undefined;this.send(ability);}
        this.expirePending();
        this.hooks.frame(frame,this.view);
        if(this.view.phase==='results')this.present();
      });
      room.onMessage('cooldowns',(c:Cooldowns)=>{this.cooldowns=c;});
      room.onMessage('ability-result',(r:AbilityResult)=>this.settle(r));
      room.onMessage('ownLine',(data:{samples:DrawingPacket;sequence:number})=>{this.sequence=Math.max(this.sequence,data.sequence);this.hooks.ownLine(data.samples.map(([x,z,time])=>({x,z,time})));});
      room.onMessage('error',(error:DuelError)=>this.roomError(error));
      room.onDrop(()=>{this.disconnected=true;this.pending=[];this.queued=undefined;this.present();});
      room.onReconnect(()=>{this.disconnected=false;storeSeat(room.reconnectionToken);room.send('sync');this.present();});
      // A tab can receive a close callback while navigating away. Retain its
      // credential through reload; the explicit Home action releases the seat.
      room.onLeave((code:number)=>{if(!this.closed)this.paddock.message('closed','Room closed',code===4002?describeDuelError(duelError('removed')):undefined,[{label:'Home',action:()=>this.leave(),primary:true}]);});
      room.send('sync');
    }catch(e){if(!this.closed)this.connectionError(mapConnectionFailure(e,code?(savedSeat(code)?'reconnect':'join'):'create'),()=>void this.connect(code,circuit,laps));}
    finally{clearTimeout(wake);this.connecting=false;}
  }
  private receive(view:RoomView) {
    if(this.closed)return;
    if (!this.view && this.room) {
      const invite = new URL(location.href);
      invite.searchParams.set('duelCircuit', view.circuit);
      invite.searchParams.set('since', encodeSince(view.created * 1000));
      history.replaceState(null, '', invite);
    }
    if(view.phase==='lobby'){this.roundDrawn=0;this.waiting=false;}
    if(this.view?.round!==view.round){this.ownTrail=[];this.measuring=[];this.latest=undefined;this.sequence=0;this.waiting=false;this.menu=false;this.queued=undefined;this.pending=[];this.cooldowns=undefined;}
    const previousPhase=this.view?.phase;
    this.view=view;
    if(view.phase==='results' && previousPhase!=='results' && this.latest)this.hooks.frame({...this.latest,events:[]},view);
    if(view.phase==='drawing' && this.roundDrawn!==view.round){
      this.roundDrawn=view.round;this.drawingShownAt=performance.now();this.hooks.draw(view);
    }
    this.present();
  }
  /** Renders the paddock for the room's current state (src/duels/screen.ts decides, src/duels/paddock.ts draws). */
  private present(){
    const view=this.view;if(!view||!this.room)return;
    const screen=duelScreen({view,sessionId:this.room.sessionId,connection:this.disconnected?'reconnecting':'connected',sceneReady:this.hooks.sceneReady?.()??true,sendingLine:this.waiting,menu:this.menu,order:this.latest?.order});
    this.paddock.raceBehind=view.phase==='countdown'||view.phase==='racing';
    if(screen.kind==='race'){this.paddock.close();return;}
    const removable:{id:string;name:string}[]=[];
    if(screen.kind==='waiting'&&screen.isHost){
      const waited=(performance.now()-this.drawingShownAt)/1000;
      for(const d of view.drivers.filter(d=>!d.ready&&d.id!==this.room?.sessionId)){
        if(waited>=DRAWING_GRACE)removable.push({id:d.id,name:d.name});
        else if(this.graceTimer===undefined)this.graceTimer=window.setTimeout(()=>{this.graceTimer=undefined;this.present();},Math.max(500,(DRAWING_GRACE-waited)*1000+200));
      }
    }
    const tip=this.coach.next(screen.kind,screen.isHost);
    this.paddock.room(screen,{code:this.room.roomId,link:location.href,venues:this.venueList(),removable,coach:tip&&{id:tip,dismiss:()=>{this.coach.dismiss(tip);this.present();}}});
  }
  /** While a racing room's scene is still loading, the paddock shows Loading circuit; main calls this once it can draw. */
  sceneChanged(){if(this.view&&(this.view.phase==='countdown'||this.view.phase==='racing'))this.present();}
  lock(samples:DrawSample[]){
    if(!samples.length||!this.room||!this.view)return;
    const start=samples[0].time;this.waiting=true;
    this.room.send('line',{round:this.view.round,samples:samples.map(p=>[p.x,p.z,p.time-start])});this.present();
  }
  /**
   * Room errors by category. Drawing: back to your retained line. Lobby: a status line in the lobby or on
   * Results, keeping selections. Connection errors arrive through connect() instead.
   */
  private roomError(error:DuelError){
    const text=describeDuelError(error);
    if(error.category==='drawing'){
      this.waiting=false;
      if(this.paddock.open)this.present();
      if(!this.paddock.open||this.paddock.shownTitle==='Waiting for lines')this.paddock.message('check-line','Check your line',undefined,[{label:'Return to drawing',action:()=>this.paddock.close(),primary:true}]);
      this.status.textContent=text;
    }else if(error.category==='lobby'){if(this.view?.phase==='lobby'||this.view?.phase==='results')this.status.textContent=text;}
    else this.connectionError(error);
  }
  /** Connection errors on the entry screen, with the action that fits (Create/Join stay available for a new code). */
  private connectionError(error:DuelError,retry?:()=>void){
    this.status.replaceChildren(describeDuelError(error));
    const action=duelErrorAction(error);
    if(action==='updating'){void this.probe(20_000).then(v=>this.enterUpdating(v.kind==='updating'?v:{kind:'updating',ahead:'server'}));return;}
    if(action==='retry'&&retry)Paddock.statusAction(this.status,'Try again',()=>{this.status.textContent='';retry();});
  }
  press(ability:Ability){
    if(this.menu||this.disconnected||!this.latest)return;
    // Within the last countdown beat a press is held and sent at GO; earlier presses are ignored.
    if(this.view?.phase==='countdown'){if(this.latest.countdown>0&&this.latest.countdown<=60)this.queued=ability;return;}
    if(this.view?.phase!=='racing')return;
    this.send(ability);
  }
  private send(ability:Ability){
    if(!this.room||!this.view||!this.latest)return;
    const command={round:this.view.round,ability,sequence:++this.sequence,tick:this.latest.tick};
    this.room.send('ability',command);
    this.pending.push({round:command.round,sequence:command.sequence,ability,at:performance.now(),shown:this.hooks.ownShown?.()});
  }
  private log(entry:DuelClient['commandLog'][number]){this.commandLog.push(entry);if(this.commandLog.length>50)this.commandLog.shift();}
  /** The server's private reply. Button feedback and recharge rings already come from frames and cooldowns. */
  private settle(r:AbilityResult){
    const i=this.pending.findIndex(p=>p.round===r.round&&p.sequence===r.sequence);
    if(i<0)return;
    const [p]=this.pending.splice(i,1),roundTrip=performance.now()-p.at;
    this.oneWayMs=this.oneWayMs?this.oneWayMs*.8+roundTrip/2*.2:roundTrip/2;
    const entry={round:r.round,sequence:r.sequence,ability:r.ability,outcome:r.outcome,roundTripMs:Math.round(roundTrip)} as DuelClient['commandLog'][number];
    this.log(entry);
    // How far (in ticks of travel) the car you saw was from the car the room moved when it applied the press;
    // measured once a frame at or after that tick has arrived.
    if(p.shown){this.measuring.push({entry,shown:p.shown,tick:r.tick});this.measure();}
  }
  private measure(){
    this.measuring=this.measuring.filter(m=>{
      const k=this.ownTrail.findIndex(e=>e.tick>=m.tick),b=this.ownTrail[k],a=this.ownTrail[k-1]??b;
      if(!b)return this.measuring.length<20;
      if(b.speed>1){
        const t=(m.tick-a.tick)/Math.max(1,b.tick-a.tick),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,ticks=(p:{x:number;z:number})=>Math.round(Math.hypot(p.x-x,p.z-z)/b.speed*60*10)/10;
        m.entry.displayErrorTicks=ticks(m.shown);
        // For comparison: where the 100 ms buffer alone would have drawn your car.
        if(m.shown.buffered)m.entry.bufferedErrorTicks=ticks(m.shown.buffered);
        if(m.shown.display)m.entry.display=m.shown.display;
      }
      return false;
    });
  }
  /** Commands with no reply after 1.5 s stay unconfirmed in diagnostics only. */
  private expirePending(){
    const now=performance.now();
    this.pending=this.pending.filter(p=>{if(now-p.at<=1500)return true;this.log({round:p.round,sequence:p.sequence,ability:p.ability,outcome:'unconfirmed'});return false;});
  }
  pause(){this.menu=true;this.present();}
  private resume(){this.menu=false;this.present();}
  leave(){
    this.closed=true;this.probes.abort();this.paddock.remove();storeSeat(null);
    if(this.room)void this.room.leave().catch(()=>{});
    const url=new URL(location.href);url.searchParams.delete('duel');url.searchParams.delete('duelCircuit');url.searchParams.delete('since');history.replaceState(null,'',url);
    this.hooks.home();
  }
}
