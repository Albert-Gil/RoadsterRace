import { expect, test } from 'vitest';
import { circuits } from '../../src/content/circuits';
import { computerRoute, stepComputers } from '../../src/core/computer';
import { LocalRace } from '../../src/core/local-race';
import type { Difficulty } from '../../src/core/session';
import { RULES } from '../../src/core/simulation';
import { FixedStepClock } from '../../src/core/simulation';

test.each(circuits)('$id computer plans are safe, deterministic and finish six laps',({track})=>{
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

    expect(routes.filter(r=>r.jumps?.length).length).toBe(track.jumps?.length?(difficulty==='easy'?0:difficulty==='normal'?1:2):0);
  }
  expect(medians[0]).toBeGreaterThan(medians[1]);expect(medians[1]).toBeGreaterThan(medians[2]);
}, 180000);

test.each(circuits)('$id computer contact and thrust share the human simulation',({track})=>{
  const routes=[0,0,1,2].map(i=>computerRoute(track,'normal',i,92)),race=new LocalRace(routes,track,2);
  for(let tick=0;tick<24000&&!race.finished;tick++){if(tick%300===0)race.pressThrust(0);stepComputers(race,'normal');race.step();}
  expect(race.finished).toBe(true);expect(race.racers.slice(1).some(r=>r.state.thrustCount>0)).toBe(true);
  expect(race.racers.every(r=>Number.isFinite(r.state.finishTime))).toBe(true);
});

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
