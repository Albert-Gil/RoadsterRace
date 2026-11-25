import { describe, expect, test } from 'vitest';
import references from '../fixtures/duel-reference.json';
import { findCircuit } from '../../src/content/circuits';
import { compileRoute } from '../../src/core/route';
import { LocalRace } from '../../src/core/local-race';

describe('portable private-duel reference races',()=>{
  for(const ref of references) test(ref.circuit,()=>{
    const track=findCircuit(ref.circuit).track;
    const routes=ref.lines.map(line=>{
      const result=compileRoute(line.map(([x,z,time])=>({x,z,time})),track);
      if(!result.ok)throw new Error(result.message);
      return result.route;
    });
    const race=new LocalRace(routes,track,1);
    const events:typeof ref.events=[];
    for(const checkpoint of ref.checkpoints){
      while(race.tick<checkpoint.tick && !race.finished){
        for(const command of ref.inputs.filter(c=>c.tick===race.tick)){
          if(command.ability==='hop')race.pressHop(command.player);
          else race.pressThrust(command.player);
        }
        race.step();for(const e of race.drainEvents())if(['finish','car-impact','recovery','takeoff','landing','splash'].includes(e.type))events.push({tick:race.tick,player:e.player,type:e.type});
      }
      expect(race.tick).toBe(checkpoint.tick);
      race.racers.forEach(({state},i)=>{
        const [x,z,y]=checkpoint.positions[i];
        expect(state.position.x).toBeCloseTo(x,4);expect(state.position.z).toBeCloseTo(z,4);expect(state.elevation).toBeCloseTo(y,4);
      });
    }
    expect(events).toEqual(ref.events);
    expect(race.standings().map(s=>s.player)).toEqual(ref.order);
    expect(race.racers.map(r=>r.state.finishTime)).toEqual(ref.finish);
  });
});
