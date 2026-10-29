import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { computerRoute, stepComputers, computerPaceLimit, computerTraffic, shouldComputerThrust } from '../../src/core/computer';
import { LocalRace } from '../../src/core/local-race';
import type { Difficulty } from '../../src/core/session';
import { RULES } from '../../src/core/simulation';
import { FixedStepClock } from '../../src/core/simulation';
import { sampleRoute } from '../../src/core/route';

function decisionRace(){
  const track=circuits[0].track,route=computerRoute(track,'normal',0,92),race=new LocalRace(Array(4).fill(route),track,1);
  race.tick=240;
  race.racers.forEach((r,i)=>{r.state.position={x:1000+i*100,z:1000};r.state.time=4;});
  const s=race.racers[1].state,p=sampleRoute(route,8);
  Object.assign(s,{position:{x:p.x,z:p.z},distance:8,heading:p.heading,speed:12,velocity:{x:Math.sin(p.heading)*12,z:Math.cos(p.heading)*12}});
  return race;
}

test('CPU brakes for same-level traffic ahead, ignoring adjacent and elevated cars',()=>{
  const race=decisionRace(),s=race.racers[1].state,other=race.racers[0].state,dx=Math.sin(s.heading),dz=Math.cos(s.heading);
  other.position={x:s.position.x+dx*9,z:s.position.z+dz*9};other.speed=5;other.velocity={x:dx*5,z:dz*5};
  expect(computerTraffic(race,1)).not.toBeNull();expect(computerPaceLimit(race,1)).toBeLessThan(s.speed);expect(shouldComputerThrust(race,1)).toBe(false);
  other.elevation=8;expect(computerTraffic(race,1)).toBeNull();
  other.elevation=0;other.position.x+=dz*4;other.position.z-=dx*4;expect(computerTraffic(race,1)).toBeNull();
});

test('CPU predicts the burst and braking room before a corner',()=>{
  const race=decisionRace(),route=race.routes[1];
  route.points.forEach(p=>{p.curvature=0;});expect(shouldComputerThrust(race,1)).toBe(true);
  route.points.filter(p=>p.distance>25&&p.distance<40).forEach(p=>{p.curvature=.12;});
  expect(shouldComputerThrust(race,1)).toBe(false);
});

test('CPU lifts during a slide and releases its recovery cap once aligned',()=>{
  const race=decisionRace(),s=race.racers[1].state;
  s.speed=26;s.slipAngle=.5;expect(computerPaceLimit(race,1)).toBe(18);expect(shouldComputerThrust(race,1)).toBe(false);
  s.slipAngle=0;s.lineError=0;expect(computerPaceLimit(race,1)).toBe(Infinity);
});

for(const{id,track}of circuits)test(`${id} computer plans are safe, deterministic and finish six laps`,()=>{
  const medians:number[]=[];
  for(const difficulty of ['easy','normal','hard'] as Difficulty[]){
    const routes=[0,1,2].map(i=>computerRoute(track,difficulty,i,71));
    expect(computerRoute(track,difficulty,0,71)).toEqual(routes[0]);
    const times=routes.map(route=>{
      const race=new LocalRace([route],track,6);
      for(let i=0;i<54000&&!race.finished;i++)race.step();
      expect(race.finished).toBe(true);
      expect(race.racers[0].state.recoveryCount).toBe(0);
      expect(race.racers[0].state.speed).toBeLessThanOrEqual(RULES.maxSpeed);
      return race.racers[0].state.finishTime!;
    }).sort((a,b)=>a-b);
    medians.push(times[1]);

    expect(routes.filter(r=>r.jumps?.length).length).toBe(track.sections||track.jumps?.some(j=>j.mandatory)?3:track.jumps?.length?(difficulty==='easy'?0:difficulty==='normal'?1:2):0);
  }
  expect(medians[0]).toBeGreaterThan(medians[1]);expect(medians[1]).toBeGreaterThan(medians[2]);
// Nine six-lap races on the alpine heightfield are bounded by simulation ticks;
// give shared test hosts enough wall time without weakening any driving checks.
}, track.terrain ? 360000 : 180000);

test.each(circuits)('$id computer contact and thrust share the human simulation',({track})=>{
  const routes=[0,0,1,2].map(i=>computerRoute(track,'normal',i,92)),race=new LocalRace(routes,track,2);
  for(let tick=0;tick<24000&&!race.finished;tick++){if(tick%300===0)race.pressThrust(0);stepComputers(race,'normal');race.step();}
  expect(race.finished).toBe(true);expect(race.racers.slice(1).some(r=>r.state.thrustCount>0)).toBe(true);
  expect(race.racers.every(r=>Number.isFinite(r.state.finishTime))).toBe(true);
// Completion is bounded by simulation ticks; shared-host speed is not the assertion.
},90000);

test('recorded human commands and CPU decisions are identical across render rates',()=>{
  const track=circuits[0].track,routes=[0,0,1,2].map(i=>computerRoute(track,'normal',i,502));
  const results=[30,60,120].map(fps=>{
    const race=new LocalRace(routes,track,2),clock=new FixedStepClock();
    for(let frame=0;frame<fps*120&&!race.finished;frame++)clock.advance(1/fps,()=>{if(race.tick%300===0)race.pressThrust(0);stepComputers(race,'normal');race.step();});
    expect(race.finished).toBe(true);
    return race.racers.map(r=>({finish:r.state.finishTime,thrust:r.state.thrustCount,contacts:r.state.collisionCount}));
  });
  expect(results[0]).toEqual(results[1]);expect(results[1]).toEqual(results[2]);
});
