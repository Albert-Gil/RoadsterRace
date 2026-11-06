import{createTournament}from'../../src/core/tournament';
import{parseTournament}from'../../src/presentation/tournament-storage';
import{circuits}from'../../src/content/circuits';
import {expect,test} from 'vitest';
import {awardProgression,emptyProgression,medalCount,newAwards,mergeProgression,paintUnlocked,badgeChoices} from '../../src/core/progression';
import {ProgressionStore,parseProgression,PROGRESSION_KEY} from '../../src/presentation/progression-storage';
import {compileRoute,createPracticeSamples} from '../../src/core/route';
import {RaceSimulation} from '../../src/core/simulation';
import {cumulative} from '../../src/core/geometry';
import type{TrackDefinition}from'../../src/core/types';
const evidence={trackId:'golden-gate',human:true,source:'live' as const,mode:'solo-race',difficulty:'normal',finished:true,rank:1};
const lap={lap:1,duration:20,barrierContacts:0,carContacts:0,recoveries:0};
test('independent medals are monotonic, human-owned and exactly once',()=>{
 const first=awardProgression(emptyProgression(),{...evidence,lap});expect(first.medals['golden-gate']).toEqual(['finish','clean','rival']);expect(medalCount(first)).toBe(3);
 expect(newAwards(first,awardProgression(first,{...evidence,lap}))).toEqual([]);expect(paintUnlocked('reward-pearl',first)).toBe(true);expect(paintUnlocked('reward-obsidian',first)).toBe(false);
 for(const source of['tutorial','practice','ghost'] as const)expect(medalCount(awardProgression(emptyProgression(),{...evidence,source,lap}))).toBe(0);
 expect(medalCount(awardProgression(emptyProgression(),{...evidence,human:false,lap}))).toBe(0);
});
test('clean accepts drifting/abilities but each real incident blocks the medal; Easy has no Rival',()=>{
 for(const key of['barrierContacts','carContacts','recoveries'] as const)expect(awardProgression(emptyProgression(),{...evidence,finished:false,lap:{...lap,[key]:1}}).medals).toEqual({});
 expect(awardProgression(emptyProgression(),{...evidence,difficulty:'easy'}).medals['golden-gate']).toEqual(['finish']);
 expect(awardProgression(emptyProgression(),{...evidence,mode:'multiplayer',lap}).medals['golden-gate']).toEqual(['finish','clean']);
 expect(awardProgression(emptyProgression(),{...evidence,mode:'time-trial',finished:false,lap}).medals['golden-gate']).toEqual(['clean']);
});
test('cups require completion; merged shared-seat awards retain all existing venues',()=>{
 const a=awardProgression(emptyProgression(),{...evidence,cupId:'pacific',cupComplete:true});expect(badgeChoices(a).some(b=>b.id==='cup-pacific')).toBe(true);
 const b=awardProgression(emptyProgression(),{...evidence,trackId:'coastal-launch'});expect(medalCount(mergeProgression(a,b))).toBe(4);
 expect(awardProgression(a,{...evidence,cupId:'frontier',cupComplete:false}).cups).toEqual(['pacific']);
});
test('storage keeps historical awards, deduplicates, and survives unavailable or full storage',()=>{
 const saved={version:1,medals:{'older-venue':['clean','clean','bogus']},cups:['pacific','pacific','bad']};expect(parseProgression(JSON.stringify(saved))).toEqual({version:1,medals:{'older-venue':['clean']},cups:['pacific']});
 expect(parseProgression('{')).toEqual(emptyProgression());expect(parseProgression('{"version":99}')).toEqual(emptyProgression());
 const unavailable={getItem(){throw Error('unavailable');},setItem(){throw Error('full');}};const s=new ProgressionStore(unavailable);s.record(evidence);expect(medalCount(s.state)).toBe(2);expect(s.persistent).toBe(false);
 const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);}};
 const one=new ProgressionStore(storage),two=new ProgressionStore(storage);one.record(evidence);two.record({...evidence,trackId:'coastal-launch'});one.record({...evidence,lap});expect(medalCount(one.state)).toBe(5);expect(memory.has(PROGRESSION_KEY)).toBe(true);
});
test('fixed-step lap incident snapshots reset at the lap boundary, separately from sounds',()=>{
 const centerline=Array.from({length:129},(_,i)=>({x:Math.sin(i/128*Math.PI*2)*40,z:Math.cos(i/128*Math.PI*2)*40})),distances=cumulative(centerline);
 const t:TrackDefinition={id:'lap-fixture',version:1,name:'Lap fixture',centerline,distances,length:distances.at(-1)!,roadWidth:16,carWidth:2.9095,carLength:6.877,start:centerline[0],barriers:[]};
 const c=compileRoute(createPracticeSamples(t,12),t);if(!c.ok)throw Error(c.message);const sim=new RaceSimulation(c.route,t,2);sim.markLapIncident('carContacts');const summaries=[];
 for(let i=0;i<18000&&!sim.state.finished;i++){sim.step();for(const e of sim.drainEvents())if(e.lapSummary)summaries.push(e.lapSummary);}
 expect(summaries).toHaveLength(2);expect(summaries[0].carContacts).toBe(1);expect(summaries[1]).toMatchObject({barrierContacts:0,carContacts:0,recoveries:0});
});

test('CPU, tutorial and practice evidence never writes a progression record',()=>{let writes=0;const store=new ProgressionStore({getItem:()=>null,setItem:()=>{writes++;}});for(const source of['tutorial','practice','ghost']as const)store.record({...evidence,source,lap});store.record({...evidence,human:false});expect(writes).toBe(0);expect(store.state).toEqual(emptyProgression());});

test('curated cups retain actual saved schedules and driver badges on resume',()=>{
 const ids=['coastal-launch','santa-monica','golden-gate'],rounds=ids.map(id=>({circuitId:id,trackVersion:circuits.find(c=>c.id===id)!.track.version})),state=createTournament(rounds,2,1),snapshot={state,cupId:'pacific',cupVersion:1,drivers:[{name:'A',paint:'glacier',badge:'explorer'},{name:'B',paint:'crimson'}],options:{mode:'multiplayer',difficulty:'normal',seed:11}};
 const restored=parseTournament(JSON.stringify(snapshot));expect(restored?.cupId).toBe('pacific');expect(restored?.state.rounds).toEqual(rounds);expect(restored?.drivers[0].badge).toBe('explorer');
 const reversed={...snapshot,state:{...state,rounds:[...rounds].reverse()}};const custom=parseTournament(JSON.stringify(reversed));expect(custom?.state.rounds).toEqual(reversed.state.rounds);expect(custom?.cupId).toBeUndefined();
});
