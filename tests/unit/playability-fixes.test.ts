import {expect,test} from 'vitest';
import {goldenGateTrack as golden} from '../../src/core/tracks/golden-gate';
import {orbitalTrack as launch} from '../../src/core/tracks/orbital';
import {compileRoute,createPracticeSamples} from '../../src/core/route';
import {RaceSimulation} from '../../src/core/simulation';
import {assessHopShortcuts,permittedHopBarriers} from '../../src/core/hop-shortcuts';
import {barrierContact} from '../../src/core/barriers';
import {yosemiteTrack} from '../../src/core/tracks/yosemite';
import {yosemiteCanoes,canoePose} from '../../src/presentation/yosemite-river-life';
import {yosemiteRivers} from '../../src/core/tracks/yosemite-water';
import {insideBarrier} from '../../src/core/barriers';
import {transformPoint} from '../../src/presentation/landscape/mesh';
import {jumpCoordinates} from '../../src/core/support';
import {pavedHopLanes} from '../../src/presentation/lanes';

test('Golden Gate T4 is a real low planter: six clean hops, physical impact without Hop',()=>{
 const r=compileRoute(createPracticeSamples(golden,7,'quayside-hop'),golden);expect(r.ok).toBe(true);if(!r.ok)return;
 expect(pavedHopLanes(golden)).not.toContainEqual(golden.hopShortcuts![0]);
 expect(r.route.hopShortcuts?.map(v=>v.id)).toEqual(['quayside-hop']);expect(r.route.hazards??[]).toEqual([]);
 const main=compileRoute(createPracticeSamples(golden),golden);expect(main.ok).toBe(true);if(main.ok){expect(main.route.hopShortcuts).toBeUndefined();expect(main.route.length-r.route.length).toBeGreaterThan(15);}
 for(const hop of[true,false]){
  const sim=new RaceSimulation(r.route,golden,hop?6:1);let armed=true;
  for(let i=0;i<24000&&!sim.state.finished;i++){
   const s=sim.state;if(s.position.z<0)armed=true;
   if(hop&&armed&&s.position.x>52&&s.position.x<70&&s.position.z<38&&s.position.z>34&&s.velocity.z< -3){sim.pressHop();armed=false;}sim.step();
  }
  expect(sim.state.finished).toBe(true);
  if(hop){expect(sim.state.hopCount).toBe(6);expect(sim.state.collisionCount).toBe(0);expect(sim.state.recoveryCount).toBe(0);}else expect(sim.state.collisionCount).toBeGreaterThan(0);
 }
});

test('Launchsite accepts hand-drawn diagonal crossings near T2, without exempting the tank parcel',()=>{
 const lane=launch.hopShortcuts!.find(v=>v.id==='utility-wing-hop')!;
 const diagonal=[{x:-4,z:30},{x:-2,z:36},{x:1,z:42},{x:2,z:46},{x:-3,z:51}];
 const traversal=assessHopShortcuts(diagonal,launch);expect(traversal.obstacles).toEqual([lane.obstacleId]);
 expect(assessHopShortcuts([...diagonal].reverse(),launch).obstacles).toEqual([]);
 const r=compileRoute(createPracticeSamples(launch,7,lane.id),launch);expect(r.ok).toBe(true);if(!r.ok)return;
 const sim=new RaceSimulation(r.route,launch),s=sim.state,t=r.route.hopShortcuts![0];
 Object.assign(s,{position:{x:3,z:42},distance:(t.entryDistance+t.exitDistance)/2,movement:'airborne',flightOrigin:'hop',speed:25,heading:.35,velocity:{x:8,z:24},elevation:5});
 const allowed=permittedHopBarriers(s,r.route,launch);expect(allowed).toContain(lane.obstacleId);
 expect(barrierContact(s.position,s.heading,launch,0,5,true,allowed)).toBeNull();
 expect(barrierContact({x:-13,z:41},0,launch,0,8,true,allowed)?.barrier.id).toBe('utility-storage-tower');
 expect(barrierContact(s.position,s.heading,launch,0,0,true,allowed)?.barrier.id).toBe(lane.obstacleId);
});

test('bridge shore abutments stop at the road edges instead of intruding 1.5 metres',()=>{
 for(const b of golden.barriers.filter(b=>b.id.includes('abutment'))){const zs=b.footprint.map(p=>p.z);expect(Math.max(...zs)<=34||Math.min(...zs)>=50).toBe(true);}
});

test('moving canoes remain on the river and clear of rocks and race takeoffs throughout their cycle',()=>{
 const river=yosemiteRivers(yosemiteTrack)[0],boats=yosemiteCanoes(yosemiteTrack);
 for(const boat of boats){
  expect(Math.hypot(canoePose(boat,8).position.x-boat.position.x,canoePose(boat,8).position.z-boat.position.z)).toBeGreaterThan(4);
  const violation=(()=>{for(let t=0;t<48;t+=.5){const pose=canoePose(boat,t);
   for(let i=0;i<boat.geometry.vertexCount;i++){
    const q=boat.geometry.positions.slice(i*3,i*3+3),[x,,z]=transformPoint(q[0],q[1],q[2],{...pose.position,y:boat.level,heading:pose.heading}),p={x,z};
    if(!insideBarrier(p,{id:river.id,height:0,footprint:river.footprint}))return{t,p,reason:'bank'};
    if(yosemiteTrack.barriers.some(b=>insideBarrier(p,b)))return{t,p,reason:'solid'};
    for(const j of yosemiteTrack.jumps!){const c=jumpCoordinates(p,j);if(!(c.along< -j.rampLength-5||c.along>j.corridorLength+5||Math.abs(c.across)>j.width/2+5))return{t,p,reason:j.id};}
   }
  }})();expect(violation).toBeUndefined();
 }
},60000);
