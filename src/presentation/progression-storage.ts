import {emptyProgression,mergeProgression,awardProgression,newAwards,MEDALS,CUPS,type Progression,type ProgressEvidence} from '../core/progression';
export const PROGRESSION_KEY='roadster-race.progression.v1';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export function parseProgression(raw:string|null):Progression{
 try{const p=JSON.parse(raw??'null');if(p?.version!==1||!p.medals||typeof p.medals!=='object'||!Array.isArray(p.cups))return emptyProgression();
  const medals:Progression['medals']={};for(const[id,ms]of Object.entries(p.medals).slice(0,500))if(/^[a-z0-9-]{1,64}$/.test(id)&&Array.isArray(ms))medals[id]=MEDALS.filter(m=>ms.includes(m));
  return{version:1,medals,cups:CUPS.filter(c=>p.cups.includes(c.id)).map(c=>c.id)};
 }catch{return emptyProgression();}
}
function browserStorage(){try{return localStorage;}catch{return undefined;}}
/** Browser/app installation collection. No storage call is allowed to interrupt a race. */
export class ProgressionStore{
 state:Progression=emptyProgression();persistent=true;
 constructor(private storage:StorageLike|undefined=browserStorage()){try{this.state=parseProgression(storage?.getItem(PROGRESSION_KEY)??null);this.persistent=!!storage;}catch{this.persistent=false;}}
 record(e:ProgressEvidence){
  if(!e.human||e.source!=='live'||!['solo-race','multiplayer','time-trial'].includes(e.mode))return [];
  const before=this.state;try{this.state=mergeProgression(this.state,parseProgression(this.storage?.getItem(PROGRESSION_KEY)??null));}catch{this.persistent=false;}
  this.state=awardProgression(this.state,e);
  try{if(this.storage)this.storage.setItem(PROGRESSION_KEY,JSON.stringify(this.state));else this.persistent=false;}catch{this.persistent=false;}
  return newAwards(before,this.state);
 }
}
