import type {LapSummary} from './types';

export const MEDALS=['finish','clean','rival'] as const;
export type Medal=typeof MEDALS[number];
export interface Progression {version:1;medals:Record<string,Medal[]>;cups:string[]}
export const emptyProgression=():Progression=>({version:1,medals:{},cups:[]});
export const CUPS=[
 {id:'pacific',name:'Pacific Cup',rounds:['coastal-launch','santa-monica','golden-gate']},
 {id:'frontier',name:'Frontier Cup',rounds:['canyon-south-rim','capitan-yosemite','snowy-tahoe']},
 {id:'fleet',name:'Fleet Cup',rounds:['orbital-launchyard','la-nights','san-diego-fleet']},
] as const;
export const REWARDS=[
 {id:'reward-pearl',kind:'finish',name:'Pearl White',medals:3},
 {id:'explorer',kind:'badge',name:'Explorer',medals:5},
 {id:'reward-obsidian',kind:'finish',name:'Obsidian',medals:8},
 {id:'reward-copper',kind:'finish',name:'Copper Alloy',medals:15},
 {id:'precision',kind:'badge',name:'Precision',medals:15},
 {id:'reward-titanium',kind:'finish',name:'Champagne Titanium',medals:24},
 {id:'master',kind:'badge',name:'Master',medals:30},
] as const;
export const medalCount=(p:Progression)=>Object.values(p.medals).reduce((sum,m)=>sum+m.length,0);
export const unlockedRewards=(p:Progression)=>REWARDS.filter(r=>medalCount(p)>=r.medals);
export const badgeChoices=(p:Progression)=>[{id:'none',name:'No badge'},...unlockedRewards(p).filter(r=>r.kind==='badge').map(r=>({id:r.id,name:r.name})),...CUPS.filter(c=>p.cups.includes(c.id)).map(c=>({id:`cup-${c.id}`,name:c.name}))];
export const paintUnlocked=(id:string,p:Progression)=>!id.startsWith('reward-')||unlockedRewards(p).some(r=>r.kind==='finish'&&r.id===id);

/** Union-only updates: retries, repeated finish events and shared human results cannot duplicate awards. */
export function mergeProgression(a:Progression,b:Progression):Progression{
 const medals:Record<string,Medal[]>={};for(const id of new Set([...Object.keys(a.medals),...Object.keys(b.medals)]))medals[id]=MEDALS.filter(m=>a.medals[id]?.includes(m)||b.medals[id]?.includes(m));
 return{version:1,medals,cups:CUPS.filter(c=>a.cups.includes(c.id)||b.cups.includes(c.id)).map(c=>c.id)};
}
export interface ProgressEvidence {trackId:string;human:boolean;source:'live'|'tutorial'|'practice'|'ghost';mode:string;difficulty?:string;lap?:LapSummary;finished?:boolean;rank?:number;cupId?:string;cupComplete?:boolean}
export function awardProgression(state:Progression,e:ProgressEvidence):Progression{
 if(!e.human||e.source!=='live'||!['solo-race','multiplayer','time-trial'].includes(e.mode))return state;
 const earned:Medal[]=[];
 if(e.lap&&e.lap.duration>0&&e.lap.barrierContacts===0&&e.lap.carContacts===0&&e.lap.recoveries===0)earned.push('clean');
 if(e.finished)earned.push('finish');
 if(e.finished&&e.mode==='solo-race'&&['normal','hard'].includes(e.difficulty??'')&&e.rank===1)earned.push('rival');
 const cups=e.cupComplete&&CUPS.some(c=>c.id===e.cupId)?[e.cupId!]:[];
 return mergeProgression(state,{version:1,medals:earned.length?{[e.trackId]:earned}:{},cups});
}
export function newAwards(before:Progression,after:Progression){
 return [...Object.entries(after.medals).flatMap(([id,ms])=>ms.filter(m=>!before.medals[id]?.includes(m)).map(m=>`${m[0].toUpperCase()+m.slice(1)} medal`)),
 ...unlockedRewards(after).filter(r=>!unlockedRewards(before).some(b=>b.id===r.id)).map(r=>`${r.name} unlocked`),
 ...CUPS.filter(c=>after.cups.includes(c.id)&&!before.cups.includes(c.id)).map(c=>`${c.name} badge`)];
}
