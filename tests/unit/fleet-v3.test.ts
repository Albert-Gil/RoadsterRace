import {expect,test} from 'vitest';
import {sanDiegoFleetTrack as track} from '../../src/core/tracks/san-diego-fleet';
import {onDeck,deckAt,deckElevation,crossingCoords} from '../../src/core/decks';
import {sampleSurface,RULES} from '../../src/core/simulation';
import {fleetGeometry} from '../../src/presentation/fleet';
import {jumpPoint,groundHeight} from '../../src/core/support';
import {cumulative} from '../../src/core/geometry';
import {insideBarrier} from '../../src/core/barriers';

test('cached deck bounds retain exact polygon and receiving-level ownership at edges and across the harbor',()=>{
 const decks=track.decks!,reference=(p:{x:number;z:number},ceiling:number)=>{let result:typeof decks[number]|undefined,height=-Infinity;for(const d of decks){if(!insideBarrier(p,{id:d.id,height:0,footprint:d.footprint}))continue;const h=deckElevation(p,d);if(h<=ceiling+.05&&h>height){result=d;height=h;}}return result;};
 for(const d of decks)for(const p of d.footprint)for(const delta of[-1e-6,0,1e-6]){const q={x:p.x+delta,z:p.z-delta};expect(onDeck(q,d)).toBe(insideBarrier(q,{id:d.id,height:0,footprint:d.footprint}));}
 for(let i=0;i<12000;i++){const p={x:Math.sin(i*17.31)*180,z:Math.cos(i*11.17)*180};for(const ceiling of[15,16,22,24,Infinity])expect(deckAt(p,track,ceiling)?.id).toBe(reference(p,ceiling)?.id);}
});

test('every automatic crossing has a full-width physical raised ramp, and manual entries have none',()=>{
 for(const j of track.jumps!){const d=track.decks!.find(d=>d.rampId===j.id);
  if(j.activation==='hop'){expect(d).toBeUndefined();expect(j.rampLength).toBe(0);continue;}
  expect(d,j.id).toBeDefined();expect(j.rampLength).toBeGreaterThan(12);expect(j.lipHeight).toBe(3);
  for(const fraction of[.05,.5,.95])for(const across of[-7.8,0,7.8]){const p=jumpPoint(j,j.rampLength*fraction,across);expect(onDeck(p,d!)).toBe(true);expect(deckElevation(p,d!)).toBeCloseTo(j.takeoffElevation!+3*fraction);expect(groundHeight(p,track)).toBeCloseTo(j.takeoffElevation!+3*fraction);}
  expect(deckAt(jumpPoint(j,j.rampLength+j.gap*.5),track)).toBeUndefined();
 }
});
test('both slender auxiliary ships offer road grip over the full working deck, without a painted alternate lane',()=>{
 for(const d of track.decks!.filter(d=>d.kind==='support-ship')){
  expect(d.racingSurface).toBe(true);expect(track.barriers.filter(b=>!b.deckSurfaceId&&!b.id.startsWith('fleet-rail')).some(b=>b.footprint.some(p=>onDeck(p,d)))).toBe(false);
  const f=d.vessel!.forward,o=d.vessel!.origin,r={x:f.z,z:-f.x},projection=d.footprint.map(p=>({s:(p.x-o.x)*f.x+(p.z-o.z)*f.z,t:(p.x-o.x)*r.x+(p.z-o.z)*r.z}));
  const beam=Math.max(...projection.map(p=>p.t))-Math.min(...projection.map(p=>p.t)),length=Math.max(...projection.map(p=>p.s))-Math.min(...projection.map(p=>p.s));expect(beam).toBeLessThan(27);expect(length/beam).toBeGreaterThan(3);
  for(const s of[-20,0,20])for(const across of[-7,0,7]){const p={x:o.x+s*f.x+across*r.x,z:o.z+s*f.z+across*r.z};expect(onDeck(p,d)).toBe(true);expect(sampleSurface(p,track)).toMatchObject({sandAmount:0,grip:RULES.asphaltGrip});}
 }
 // No asphalt vertices lie on auxiliary decks: their whole grey surface is the driving area.
 const roads=fleetGeometry(track).road;for(let i=0;i<roads.positions.length;i+=3){const p={x:roads.positions[i],z:roads.positions[i+2]};expect(track.decks!.filter(d=>d.kind==='support-ship').some(d=>onDeck(p,d))).toBe(false);}
});
test('the fleet is staggered and the auxiliary bows align with their automatic exit direction',()=>{
 const a=track.decks!.find(d=>d.id==='carrier-a')!,b=track.decks!.find(d=>d.id==='carrier-b')!,e=track.decks!.find(d=>d.id==='destroyer-a')!;
 const dot=a.vessel!.forward.x*e.vessel!.forward.x+a.vessel!.forward.z*e.vessel!.forward.z;expect(Math.abs(dot)).toBeGreaterThan(.25);expect(Math.abs((b.vessel!.origin.x-a.vessel!.origin.x)*a.vessel!.forward.x+(b.vessel!.origin.z-a.vessel!.origin.z)*a.vessel!.forward.z)).toBeGreaterThan(50);
 for(const d of track.decks!.filter(d=>d.kind==='support-ship')){const j=track.jumps!.find(j=>j.takeoffSurfaceId===d.id)!;expect(j.forward.x*d.vessel!.forward.x+j.forward.z*d.vessel!.forward.z).toBeCloseTo(1);const p=jumpPoint(j,j.rampLength);expect(Math.abs(crossingCoords(p,j).across)).toBeLessThan(.001);}
 const savings=track.hopShortcuts!.reduce((sum,h)=>sum+h.exitProgress-h.entryProgress-cumulative(h.branch).at(-1)!,0);expect(track.length-savings).toBeGreaterThan(630);
});
