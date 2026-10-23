import { angleDelta, clamp, lerp } from './geometry';
import { COMPILER_VERSION } from './route';
import { RULES } from './simulation';
import type { RaceState, TrackDefinition } from './types';

export interface ReplayFrame { t:number;x:number;z:number;y:number;heading:number;thrust:boolean }
export interface LapRecord { version:1;key:string;duration:number;frames:ReplayFrame[] }
export const lapRecordKey=(track:TrackDefinition)=>`${track.id}:${track.version}:${RULES.version}:${COMPILER_VERSION}`;
function frame(s:RaceState,t:number):ReplayFrame{return {t,x:s.position.x,z:s.position.z,y:s.elevation,heading:s.heading,thrust:s.time<s.thrustUntil};}
export function replayPose(record:LapRecord,time:number):ReplayFrame|null{
  if(time<0||time>record.duration||!record.frames.length)return null;
  const a=record.frames;let lo=0,hi=a.length-1;
  while(lo+1<hi){const m=(lo+hi)>>>1;if(a[m].t<=time)lo=m;else hi=m;}
  const f=a[lo],n=a[hi],u=clamp((time-f.t)/Math.max(1e-9,n.t-f.t),0,1);
  return {t:time,x:lerp(f.x,n.x,u),z:lerp(f.z,n.z,u),y:lerp(f.y,n.y,u),heading:f.heading+angleDelta(f.heading,n.heading)*u,thrust:f.thrust};
}
export class LapRecorder {
  private frames:ReplayFrame[]=[];
  private previous:ReplayFrame|null=null;
  private completed=0;
  private startedAt=0;
  constructor(readonly key:string){}
  sample(s:RaceState):LapRecord|null{
    const current=frame(s,s.time);
    if(!this.previous){this.previous=current;this.frames=[{...current,t:0}];return null;}
    let record:LapRecord|null=null;
    if(s.lapTimes.length>this.completed){
      const duration=s.lapTimes[this.completed],end=this.startedAt+duration,old=this.previous;
      const u=clamp((end-old.t)/Math.max(1e-9,current.t-old.t),0,1);
      const crossing={...current,t:duration,x:lerp(old.x,current.x,u),z:lerp(old.z,current.z,u),y:lerp(old.y,current.y,u),heading:old.heading+angleDelta(old.heading,current.heading)*u};
      this.frames.push(crossing);record={version:1,key:this.key,duration,frames:this.frames};
      this.completed++;this.startedAt=end;this.frames=[{...crossing,t:0}];
    }
    if(!s.finished&&(!this.frames.length||current.t-this.startedAt-this.frames.at(-1)!.t>=1/30-1e-8))this.frames.push({...current,t:current.t-this.startedAt});
    this.previous=current;return record;
  }
}
