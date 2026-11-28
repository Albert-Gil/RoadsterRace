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
import { pressTracker } from '../input/press-guard';
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
  /** Where your own car is drawn right now (diagnostics: display error against the server at press time). */
  ownShown?():{x:number;z:number;buffered?:{x:number;z:number}}|undefined;
}
/** Matches the server's DRAWING_GRACE_SECONDS (server/duel-room.ts). */
const DRAWING_GRACE=90;
function el<K extends keyof HTMLElementTagNameMap>(tag:K,content='') {
  const e=document.createElement(tag);e.textContent=content;return e;
}
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
  private pending:{round:number;sequence:number;ability:Ability;at:number;shown?:{x:number;z:number;buffered?:{x:number;z:number}}}[]=[];
  /** Your car's recent server positions by tick, to measure how far the drawn car was from the room. */
  private ownTrail:{tick:number;x:number;z:number;speed:number}[]=[];
  private measuring:{entry:DuelClient['commandLog'][number];shown:{x:number;z:number;buffered?:{x:number;z:number}};tick:number}[]=[];
  /** Development and test diagnostics: every command's outcome, or `unconfirmed` after 1.5 s. Never shown to players. */
  readonly commandLog:{round:number;sequence:number;ability:Ability;outcome:AbilityOutcome|'unconfirmed';roundTripMs?:number;displayErrorTicks?:number;bufferedErrorTicks?:number}[]=[];
  /** Smoothed one-way delay to the room, from command round trips (ms). */
  oneWayMs=0;
  private roundDrawn=0;
  /** Circuits the room server offers; Fleet appears only once /health lists it. */
  private venues=offeredVenues(null);
  private dialog=el('dialog');
  private content=el('section');
  private status=el('p');
  private closed=false;
  private connecting=false;
  private menu=false;
  private disconnected=false;
  private waiting=false;
  /** Entry-screen controls the updating state disables; the invite field and saved seat are left alone. */
  private entry?:{buttons:HTMLButtonElement[];notice:HTMLElement;fillVenues():void};
  private updatingRun=0;
  get overlayOpen(){return this.dialog.open;}
  get seatIndex(){return this.view?.drivers.findIndex(s=>s.id===this.room?.sessionId)??0;}
  constructor(private hooks:Hooks){
    this.dialog.className='duel-dialog';this.status.setAttribute('role','status');
    this.dialog.append(this.content,this.status);
    document.body.append(this.dialog);
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.menu)this.resume();});
    if(import.meta.env.DEV)(window as unknown as {__roadsterDuel?:DuelClient}).__roadsterDuel=this;
  }
  private shownTitle='';
  private show(title:string) {
    // A new screen in the room overlay: presses that began on the previous one cannot act here.
    if(title!==this.shownTitle||!this.dialog.open){pressTracker.nextScreen();this.shownTitle=title;}
    this.content.replaceChildren(el('h2',title));this.status.textContent='';
    if(!this.dialog.open)this.dialog.showModal();
  }
  private button(label:string,action:()=>void,primary=false){
    const b=el('button',label);b.type='button';b.className=primary?'primary-button':'secondary-button';b.onclick=action;
    this.content.append(b);return b;
  }
  open(initialCode='', reclaimed?: Room) {
    this.show('Private Duel');
    const nameLabel=el('label','Driver name');
    const name=el('input');name.value=this.hooks.driver.name;name.maxLength=18;name.setAttribute('autocomplete','nickname');
    nameLabel.append(name);
    const paintLabel=el('label','Car color');
    const paint=el('select');paint.setAttribute('aria-label','Car color');
    for(const finish of this.hooks.finishes)paint.add(new Option(finish.name,finish.id));
    paint.value=this.hooks.driver.paint;paintLabel.append(paint);
    const saveDriver=()=>{
      this.hooks.driver={name:cleanDriverName(name.value,0),paint:paint.value};
      this.hooks.saveDriver(this.hooks.driver);
    };
    this.content.append(nameLabel,paintLabel);
    const circuit=el('select');circuit.setAttribute('aria-label','Circuit');
    const fillVenues=()=>{const keep=circuit.value;circuit.replaceChildren(...this.venues.map(id=>new Option(duelVenues[id as DuelVenue],id)));if(this.venues.includes(keep))circuit.value=keep;};
    fillVenues();
    // Ask the server which circuits it offers; this also starts waking a sleeping free instance.
    if(duelEndpoint)void this.probe(20_000).then(verdict=>{
      if(this.closed)return;
      if(verdict.kind==='ok'){this.venues=verdict.venues;fillVenues();}
      else if(verdict.kind==='updating')void this.enterUpdating(verdict);
    });
    const laps=el('select');laps.setAttribute('aria-label','Race distance');
    for(let i=1;i<=6;i++)laps.add(new Option(i+' lap'+(i===1?'':'s'),String(i)));
    const invite=initialCode?checkRoomCode(initialCode):undefined;
    const code=el('input');code.placeholder='Room code, e.g. TIGER7';code.setAttribute('aria-label','Room code');code.maxLength=8;code.value=invite?.ok?invite.code:'';code.autocapitalize='characters';code.autocomplete='off';
    this.content.append(circuit,laps);
    const notice=el('div');notice.className='duel-updating';notice.setAttribute('role','status');notice.hidden=true;
    this.content.prepend(notice);
    const create=this.button('Create room',()=>{saveDriver();void this.connect('',circuit.value as DuelVenue,Number(laps.value));},true);
    this.content.append(code);
    const join=this.button('Join room',()=>{const check=checkRoomCode(code.value);if(check.ok){saveDriver();void this.connect(check.code);}else this.status.textContent=check.reason==='old-invite'?describeDuelError(duelError('old-invite')):'Enter the room code from your invite, for example TIGER7.';});
    this.button('Home',()=>this.leave());
    this.entry={buttons:[create,join],notice,fillVenues};
    if(invite?.ok&&!reclaimed&&savedSeat(invite.code)){
      // A saved seat whose quick reclaim failed during startup: offer it explicitly.
      const rejoin=this.button('Rejoin race',()=>void this.connect(invite.code),true);notice.after(rejoin);this.entry.buttons.push(rejoin);
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
    const say=(detail:string,action?:HTMLButtonElement)=>{entry.notice.hidden=false;entry.notice.replaceChildren(el('strong','Online play is updating'),el('p',detail),...(action?[action]:[]));};
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
    const action=el('button',newer?'Reload game':'Try again');action.type='button';action.className='primary-button';
    action.onclick=newer?()=>location.reload():()=>{action.disabled=true;void this.probe(RECHECK_WINDOW_MS).then(v=>this.enterUpdating(v.kind==='asleep'?{kind:'updating',ahead:verdict.ahead}:v));};
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
      room.onDrop(()=>{this.disconnected=true;this.pending=[];this.queued=undefined;this.show('Reconnecting…');this.content.append(el('p','Your car is following its line.'));this.button('Home',()=>this.leave());});
      room.onReconnect(()=>{this.disconnected=false;storeSeat(room.reconnectionToken);room.send('sync');});
      // A tab can receive a close callback while navigating away. Retain its
      // credential through reload; the explicit Home action releases the seat.
      room.onLeave((code:number)=>{if(!this.closed){this.show('Room closed');if(code===4002)this.content.append(el('p',describeDuelError(duelError('removed'))));this.button('Home',()=>this.leave(),true);}});
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
  /** Host-only circuit and lap pickers (lobby and results). A new circuit after a race means fresh lines. */
  private hostSettings(view:RoomView){
    if(view.host!==this.room?.sessionId)return;
    const circuit=el('select'),laps=el('select');circuit.setAttribute('aria-label','Circuit');laps.setAttribute('aria-label','Race distance');
    for(const id of new Set([...this.venues,view.circuit]))circuit.add(new Option(duelVenues[id as DuelVenue],id));
    for(let i=1;i<=6;i++)laps.add(new Option(i+' lap'+(i===1?'':'s'),String(i)));
    circuit.value=view.circuit;laps.value=String(view.laps);
    const send=()=>this.room?.send('settings',{circuit:circuit.value,laps:Number(laps.value)});
    circuit.onchange=send;laps.onchange=send;
    this.content.append(circuit,laps);
    if(view.phase==='results')this.content.append(el('p','Changing the circuit means everyone draws new lines.'));
  }
  private present(){
    const view=this.view;if(!view||!this.room||this.disconnected)return;
    const seat=view.drivers[this.seatIndex];
    if(view.phase==='results'){
      this.show('Race results');
      for(const s of this.latest?.order??[]){const driver=view.drivers[s.player];this.content.append(el('p',(driver.withdrawn?'DNF':s.rank+'.')+' '+driver.name+(s.finishTime!=null?' · '+s.finishTime.toFixed(2)+' s':'')));}
      // Same rule as local play: once everyone still here has voted, any "New lines" wins. Votes can change until then.
      const vote=(v:string)=>this.room?.send('rematch',{round:view.round,vote:v}),mine=seat?.vote;
      const again=this.button('Race again',()=>vote('same'),true),redraw=this.button('New lines',()=>vote('redraw'));
      again.setAttribute('aria-pressed',String(mine==='same'));redraw.setAttribute('aria-pressed',String(mine==='redraw'));
      const here=view.drivers.filter(d=>d.connected),waiting=here.filter(d=>!d.vote);
      this.content.append(el('p',here.map(d=>d.name+' · '+(d.vote==='same'?'Race again':d.vote==='redraw'?'New lines':'Choosing')).join(' / ')));
      if(here.length<2)this.content.append(el('p','Another race needs at least two drivers.'));
      else if(waiting.length)this.content.append(el('p','Waiting for '+waiting.map(d=>d.name).join(', ')+'.'));
      this.hostSettings(view);
    }else if(view.phase==='lobby'||view.phase==='drawing'&&(seat?.ready||this.waiting)){
      this.show(view.phase==='lobby'?'Private room':'Waiting for lines');
      this.content.append(el('p',duelVenues[view.circuit]+' · '+view.laps+' lap'+(view.laps===1?'':'s')));
      if(view.phase==='lobby'){
        this.content.append(el('strong',this.room.roomId));
        const link=location.href,share=navigator as Navigator&{share?:(data:ShareData)=>Promise<void>};
        if(typeof share.share==='function')this.button('Share invite',async()=>{try{await share.share!({title:'Roadster Race duel',text:'Race me in Roadster Race. Room '+this.room!.roomId,url:link});}catch{/* Dismissed share sheets need no message. */}},true);
        this.button('Copy link',async()=>{try{await navigator.clipboard.writeText(link);this.status.textContent='Invite link copied.';}catch{this.status.textContent=link;}});
      }
      for(const d of view.drivers)this.content.append(el('p',d.name+(d.id===this.room.sessionId?' (you)':'')+' · '+(!d.connected?'Reconnecting':view.phase==='lobby'?'Joined':d.ready?'Ready':'Drawing')));
      if(view.phase==='lobby')this.hostSettings(view);
      if(view.phase==='lobby'&&view.host===this.room.sessionId)this.button('Start drawing',()=>this.room?.send('start'),true).disabled=view.drivers.length<2||view.drivers.some(s=>!s.connected);
      if(view.phase==='drawing'&&view.host===this.room.sessionId){
        const waited=(performance.now()-this.drawingShownAt)/1000;
        for(const d of view.drivers.filter(d=>!d.ready&&d.id!==this.room?.sessionId)){
          if(waited>=DRAWING_GRACE)this.button('Remove '+d.name,()=>this.room?.send('remove',{id:d.id}));
          else if(this.graceTimer===undefined)this.graceTimer=window.setTimeout(()=>{this.graceTimer=undefined;this.present();},Math.max(500,(DRAWING_GRACE-waited)*1000+200));
        }
      }
    }else if(this.menu){this.show('Race menu');this.content.append(el('p','The race continues.'));this.button('Resume',()=>this.resume(),true);}
    else {this.dialog.close();return;}
    this.button('Home',()=>this.leave());
  }
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
      if(this.dialog.open)this.present();
      if(!this.dialog.open||this.content.querySelector('h2')?.textContent==='Waiting for lines'){this.show('Check your line');this.button('Return to drawing',()=>this.dialog.close(),true);}
      this.status.textContent=text;
    }else if(error.category==='lobby'){if(this.view?.phase==='lobby'||this.view?.phase==='results')this.status.textContent=text;}
    else this.connectionError(error);
  }
  /** Connection errors on the entry screen, with the action that fits (Create/Join stay available for a new code). */
  private connectionError(error:DuelError,retry?:()=>void){
    this.status.replaceChildren(describeDuelError(error));
    const action=duelErrorAction(error);
    if(action==='updating'){void this.probe(20_000).then(v=>this.enterUpdating(v.kind==='updating'?v:{kind:'updating',ahead:'server'}));return;}
    if(action==='retry'&&retry){const b=el('button','Try again');b.type='button';b.className='secondary-button';b.onclick=()=>{this.status.textContent='';retry();};this.status.append(' ',b);}
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
    this.closed=true;this.probes.abort();this.dialog.remove();storeSeat(null);
    if(this.room)void this.room.leave().catch(()=>{});
    const url=new URL(location.href);url.searchParams.delete('duel');url.searchParams.delete('duelCircuit');url.searchParams.delete('since');history.replaceState(null,'',url);
    this.hooks.home();
  }
}
