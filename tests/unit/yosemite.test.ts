import{expect,test}from'vitest';
import{yosemiteTrack as track}from'../../src/core/tracks/yosemite';
import{compileRoute,createPracticeSamples,sampleRoute}from'../../src/core/route';
import{RaceSimulation,RULES,sampleSurface}from'../../src/core/simulation';
import{computerRoute}from'../../src/core/computer';
import{groundHeight,supported}from'../../src/core/support';
import{findCircuit,circuits}from'../../src/content/circuits';
import{terrainElevation}from'../../src/core/elevation';
const compiled=compileRoute(createPracticeSamples(track),track);if(!compiled.ok)throw Error(compiled.message);const route=compiled.route;

test('Capitan Yosemite is a distinct eighth venue with real terrain and a main-road creek crossing',()=>{
 expect(findCircuit('yosemite').id).toBe(track.id);expect(circuits.at(-1)!.track).toBe(track);expect(track.version).toBe(1);expect(track.roadWidth).toBe(16);
 expect(track.length).toBeGreaterThan(680);expect(track.length).toBeLessThan(740);
 expect(Math.max(...track.centerline.map(p=>p.y??0))).toBeCloseTo(28,1);expect(track.centerline[0].y).toBe(0);
 expect(route.jumps).toEqual(['valley-creek-crest']);expect(route.hazards).toBeUndefined();
 expect(supported({x:14,z:-70},track)).toBe(false);expect(supported({x:9,z:-70},track)).toBe(true);
});

test('packed earth uses the established dirt profile and unchanged maximum speed',()=>{
 const s=sampleSurface(track.start,track);expect(s.grip).toBe(RULES.dirtGrip);expect(s.sandAmount).toBe(0);expect(track.surface).toBe('packed-dirt');
});

function approach(speed:number,yaw=0){
 const sim=new RaceSimulation(route,track),p=route.points.reduce((a,b)=>Math.abs(b.x-9.5)+Math.abs(b.z+70)<Math.abs(a.x-9.5)+Math.abs(a.z+70)?b:a),sample=sampleRoute(route,p.distance);
 Object.assign(sim.state,{position:{...p,x:9.5,z:-70},distance:p.distance,elevation:groundHeight({x:9.5,z:-70},track),heading:sample.heading+yaw,speed,velocity:{x:speed,z:0}});return sim;
}
test.each([20,30,42])('the natural creek jump lands at %s m/s despite modest body yaw',speed=>{
 for(const yaw of[-Math.PI/9,0,Math.PI/9]){const sim=approach(speed,yaw);let flew=false,landed=false;for(let i=0;i<300;i++){sim.step();flew||=sim.state.flightOrigin==='crest';if(flew&&sim.state.movement==='grounded'){landed=true;break;}}
 expect(flew).toBe(true);expect(landed).toBe(true);expect(sim.state.recoveryCount).toBe(0);expect(sim.state.position.x).toBeGreaterThan(20.4);expect(sim.state.hopCount).toBe(0);expect(sim.state.thrustCount).toBe(0);}
});

test('a disrupted slow crossing falls into the creek and recovers rather than snapping onto its far bank',()=>{
 const sim=approach(4);let splash=false;for(let i=0;i<300;i++){sim.step();splash||=sim.drainEvents().some(e=>e.type==='splash');if(sim.state.recoveryCount)break;}
 expect(sim.state.recoveryCount).toBeGreaterThan(0);expect(splash).toBe(true);expect(sim.state.distance).toBeLessThan(60);
});

test('a stationary manual Hop on the natural uphill lip returns to its actual local surface',()=>{
 const sim=approach(0);sim.state.position={x:5,z:-70};sim.state.elevation=groundHeight(sim.state.position,track);sim.pressHop();let flew=false;
 for(let i=0;i<150;i++){sim.step();flew||=sim.state.movement==='airborne';if(flew&&sim.state.movement==='grounded')break;}
 expect(flew).toBe(true);expect(sim.state.movement).toBe('grounded');expect(sim.state.recoveryCount).toBe(0);expect(sim.state.elevation).toBeCloseTo(groundHeight(sim.state.position,track),7);
});

test('only the full forward timber traversal receives its Hop exemption',()=>{
 const r=compileRoute(createPracticeSamples(track,7,'ranger-timber-trail'),track);expect(r.ok).toBe(true);if(!r.ok)return;
 expect(r.route.hopShortcuts?.map(h=>h.id)).toEqual(['ranger-timber-trail']);expect(r.route.hazards).toBeUndefined();
 for(const p of track.hopShortcuts![0].branch.filter(p=>p.z>0&&p.z<40))expect(terrainElevation(p,track)).toBeCloseTo(0,5);
 const sim=new RaceSimulation(r.route,track);for(let i=0;i<12000&&!sim.state.finished;i++)sim.step();expect(sim.state.finished).toBe(true);expect(sim.state.collisionCount).toBeGreaterThan(0);
},90000);

test.each(['easy','normal','hard']as const)('%s CPU uses the mandatory jump and finishes two laps with no recovery',difficulty=>{
 const r=computerRoute(track,difficulty,0,71);expect(r.jumps).toEqual(['valley-creek-crest']);expect(r.hopShortcuts).toBeUndefined();
 const sim=new RaceSimulation(r,track,2);let jumps=0;for(let i=0;i<14000&&!sim.state.finished;i++){sim.step();jumps+=sim.drainEvents().filter(e=>e.type==='takeoff').length;}
 expect(sim.state.finished).toBe(true);expect(sim.state.recoveryCount).toBe(0);expect(jumps).toBe(2);expect(sim.state.speed).toBeLessThanOrEqual(RULES.maxSpeed);
},120000);
