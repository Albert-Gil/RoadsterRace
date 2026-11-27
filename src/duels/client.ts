import { Client, type Room } from '@colyseus/sdk';
import { DUEL_PROTOCOL, duelVenues, unpackFrame, type Cooldowns, type WireFrame, type DuelVenue, type RoomView, type RaceFrame, type DrawingPacket } from './protocol';
import { RULES } from '../core/simulation';
import { COMPILER_VERSION } from '../core/route';
import type { Ability, DrawSample } from '../core/types';
import { duelEndpoint, savedSeat, storeSeat } from './seat';
import { checkRoomCode, compareVersions, type ServerVersions } from './codes';
import { cleanDriverName } from '../presentation/race-settings';

interface Hooks {
  driver: { name: string; paint: string };
  finishes: readonly { id: string; name: string; color: string }[];
  saveDriver(driver: { name: string; paint: string }): void;
  versions: Record<string,number>;
  draw(view:RoomView):void;
  frame(frame:RaceFrame,view:RoomView):void;
  ownLine(samples:DrawSample[]):void;
  /** A Thrust/Hop the server never applied (late, or sent while it was recharging). */
  missed(ability:Ability):void;
  home():void;
}
/** Matches the server's DRAWING_GRACE_SECONDS (server/duel-room.ts). */
const DRAWING_GRACE=90;
const REMOVED='The host removed you from the race because your line took too long.';
const OLD_INVITE='This invite is from an older version of the game. Ask your friend for a new invite.';
const SERVER_ASLEEP='The race server did not wake up. Try again in a minute.';
const SERVER_UNREACHABLE='The race server is unreachable right now. Check your connection and try again.';
const SERVER_UPDATING='The race server is updating. Try again in a minute.';
const GAME_OUTDATED='Your game is out of date. Reload the page (or update the app) and join again.';
const SEAT_EXPIRED='Your seat in that race has expired. Join again with the room code.';
const NO_SUCH_ROOM='No open race uses this code. Check it, or ask for a new invite.';
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
  private pending:{ability:Ability;at:number;before?:number}[]=[];
  private roundDrawn=0;
  private dialog=el('dialog');
  private content=el('section');
  private status=el('p');
  private closed=false;
  private connecting=false;
  private menu=false;
  private disconnected=false;
  private waiting=false;
  get overlayOpen(){return this.dialog.open;}
  get seatIndex(){return this.view?.drivers.findIndex(s=>s.id===this.room?.sessionId)??0;}
  constructor(private hooks:Hooks){
    this.dialog.className='duel-dialog';this.status.setAttribute('role','status');
    this.dialog.append(this.content,this.status);
    document.body.append(this.dialog);
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.menu)this.resume();});
  }
  private show(title:string) {
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
    for(const [id,name] of Object.entries(duelVenues)) circuit.add(new Option(name,id));
    const laps=el('select');laps.setAttribute('aria-label','Race distance');
    for(let i=1;i<=6;i++)laps.add(new Option(i+' lap'+(i===1?'':'s'),String(i)));
    const invite=initialCode?checkRoomCode(initialCode):undefined;
    const code=el('input');code.placeholder='Room code';code.setAttribute('aria-label','Room code');code.maxLength=8;code.value=invite?.ok?invite.code:'';code.autocapitalize='characters';code.autocomplete='off';
    this.content.append(circuit,laps);
    this.button('Create room',()=>{saveDriver();void this.connect('',circuit.value as DuelVenue,Number(laps.value));},true);
    this.content.append(code);
    this.button('Join room',()=>{const check=checkRoomCode(code.value);if(check.ok){saveDriver();void this.connect(check.code);}else this.status.textContent=check.reason==='old-invite'?OLD_INVITE:'Enter the 6-character room code.';});
    this.button('Home',()=>this.leave());
    if(invite?.ok&&!reclaimed&&savedSeat(invite.code)){
      // A saved seat whose quick reclaim failed during startup: offer it explicitly.
      const rejoin=this.button('Rejoin race',()=>void this.connect(invite.code),true);this.content.prepend(rejoin);
    }
    if(invite&&!invite.ok)this.status.textContent=invite.reason==='old-invite'?OLD_INVITE:'This invite link is not valid. Ask for a new one.';
    if(reclaimed&&invite?.ok)void this.connect(invite.code,undefined,undefined,reclaimed);
  }
  private async connect(code:string,circuit:DuelVenue='coastal-launch',laps=1,reclaimed?:Room) {
    if(this.connecting||this.closed)return;
    if(!duelEndpoint){this.status.textContent='The private race server is not configured for this build.';return;}
    this.connecting=true;this.status.textContent='Connecting to the race server…';
    const wake=window.setTimeout(()=>{this.status.textContent='Waking race server… The first room can take a minute.';},2500);
    try {
      let room = reclaimed;
      if (!room) {
        const url=new URL(duelEndpoint);url.protocol=url.protocol==='wss:'?'https:':url.protocol==='ws:'?'http:':url.protocol;
        // Wake a sleeping free instance before the SDK starts its shorter seat-reservation timeout.
        const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),100_000);
        let response:Response;
        try{response=await fetch(new URL('/health',url),{signal:abort.signal,cache:'no-store'});}
        catch{throw new Error(abort.signal.aborted?SERVER_ASLEEP:SERVER_UNREACHABLE);}
        finally{clearTimeout(timer);}
        if(!response.ok)throw new Error(SERVER_UNREACHABLE);
        const health=await response.json().catch(()=>null) as Partial<ServerVersions>|null;
        if(health&&typeof health.protocol==='number'&&typeof health.physics==='number'&&typeof health.compiler==='number'){
          const fit=compareVersions({protocol:health.protocol,physics:health.physics,compiler:health.compiler,tracks:health.tracks??{}},{protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,tracks:this.hooks.versions});
          if(fit==='client-outdated')throw new Error(GAME_OUTDATED);
          if(fit==='server-outdated')throw new Error(SERVER_UPDATING);
        }
        if(this.closed)return;
        const client=new Client(duelEndpoint);
        const options={protocol:DUEL_PROTOCOL,physics:RULES.version,compiler:COMPILER_VERSION,versions:this.hooks.versions,...this.hooks.driver,circuit,laps};
        const token=code && savedSeat(code);
        if(token){
          try{room=await client.reconnect(token);}
          catch{storeSeat(null);throw new Error(SEAT_EXPIRED);}
        }else if(code){
          try{room=await client.joinById(code,options);}
          catch(error){throw new Error(error instanceof Error&&/not found|invalid|locked/i.test(error.message)?NO_SUCH_ROOM:error instanceof Error?error.message:NO_SUCH_ROOM);}
        }else room=await client.create('private_duel',options);
      }
      if(this.closed){await room.leave();return;}
      this.room=room;storeSeat(room.reconnectionToken);
      const address=new URL(location.href);address.searchParams.set('duel',room.roomId);history.replaceState(null,'',address);
      room.onMessage('room',(view:RoomView)=>this.receive(view));
      room.onMessage('frame',(wire:WireFrame)=>{
        const frame=unpackFrame(wire);
        if(this.closed||!this.view||frame.round!==this.view.round)return;
        const own=frame.cars[this.seatIndex];
        if(own&&this.cooldowns?.round===frame.round){own.hopReadyAt=this.cooldowns.hopReadyAt;own.thrustReadyAt=this.cooldowns.thrustReadyAt;}
        this.latest=frame;
        if(this.queued&&!frame.countdown&&this.view.phase==='racing'){const ability=this.queued;this.queued=undefined;this.send(ability);}
        this.expirePending();
        this.hooks.frame(frame,this.view);
        if(this.view.phase==='results')this.present();
      });
      room.onMessage('cooldowns',(c:Cooldowns)=>{
        const previous=this.cooldowns;this.cooldowns=c;
        // A changed readiness time confirms that the server fired that ability.
        this.pending=this.pending.filter(p=>!(previous?.round===c.round&&(p.ability==='hop'?c.hopReadyAt!==p.before:c.thrustReadyAt!==p.before)));
      });
      room.onMessage('ownLine',(data:{samples:DrawingPacket;sequence:number})=>{this.sequence=Math.max(this.sequence,data.sequence);this.hooks.ownLine(data.samples.map(([x,z,time])=>({x,z,time})));});
      room.onMessage('notice',(s:string)=>{this.waiting=false;this.present();this.status.textContent=s;if(!this.dialog.open){this.show('Check your line');this.status.textContent=s;this.button('Return to drawing',()=>this.dialog.close(),true);}});
      room.onDrop(()=>{this.disconnected=true;this.show('Reconnecting…');this.content.append(el('p','Your car is following its line.'));this.button('Home',()=>this.leave());});
      room.onReconnect(()=>{this.disconnected=false;storeSeat(room.reconnectionToken);room.send('sync');});
      // A tab can receive a close callback while navigating away. Retain its
      // credential through reload; the explicit Home action releases the seat.
      room.onLeave((code:number)=>{if(!this.closed){this.show('Room closed');if(code===4002)this.content.append(el('p',REMOVED));this.button('Home',()=>this.leave(),true);}});
      room.send('sync');
    }catch(e){if(!this.closed)this.status.textContent=e instanceof Error?e.message:'Could not connect. Check the room code and try again.';}
    finally{clearTimeout(wake);this.connecting=false;}
  }
  private receive(view:RoomView) {
    if(this.closed)return;
    if (!this.view && this.room) {
      const invite = new URL(location.href);
      invite.searchParams.set('duelCircuit', view.circuit);
      history.replaceState(null, '', invite);
    }
    if(view.phase==='lobby'){this.roundDrawn=0;this.waiting=false;}
    if(this.view?.round!==view.round){this.latest=undefined;this.sequence=0;this.waiting=false;this.menu=false;this.queued=undefined;this.pending=[];this.cooldowns=undefined;}
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
    for(const [id,name] of Object.entries(duelVenues))circuit.add(new Option(name,id));
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
  press(ability:Ability){
    if(this.menu||this.disconnected||!this.latest)return;
    // Within the last countdown beat a press is held and sent at GO; earlier presses are ignored.
    if(this.view?.phase==='countdown'){if(this.latest.countdown>0&&this.latest.countdown<=60)this.queued=ability;return;}
    if(this.view?.phase!=='racing')return;
    this.send(ability);
  }
  private send(ability:Ability){
    if(!this.room||!this.view||!this.latest)return;
    this.room.send('ability',{round:this.view.round,ability,sequence:++this.sequence,tick:this.latest.tick});
    this.pending.push({ability,at:performance.now(),before:this.cooldowns?.round===this.view.round?(ability==='hop'?this.cooldowns.hopReadyAt:this.cooldowns.thrustReadyAt):undefined});
  }
  /** Presses with no confirmation after 0.6 s get a "missed" cue instead of silently disappearing. */
  private expirePending(){
    const now=performance.now(),late=this.pending.filter(p=>now-p.at>600);
    if(!late.length)return;
    this.pending=this.pending.filter(p=>now-p.at<=600);
    for(const p of late)this.hooks.missed(p.ability);
  }
  pause(){this.menu=true;this.present();}
  private resume(){this.menu=false;this.present();}
  leave(){
    this.closed=true;this.dialog.remove();storeSeat(null);
    if(this.room)void this.room.leave().catch(()=>{});
    const url=new URL(location.href);url.searchParams.delete('duel');url.searchParams.delete('duelCircuit');history.replaceState(null,'',url);
    this.hooks.home();
  }
}
