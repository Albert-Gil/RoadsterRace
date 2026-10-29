import { expect, test } from 'vitest';
import { grandCanyonTrack as track } from '../../src/core/tracks/grand-canyon';
import { compileRoute, createPracticeSamples, sampleRoute } from '../../src/core/route';
import { RaceSimulation, FixedStepClock, sampleSurface, RULES } from '../../src/core/simulation';
import { drawingRay, locateRoad, roadHeight, roadPoint, supportBelow } from '../../src/core/elevation';
import { vehicleSupported } from '../../src/core/support';
import { vehicleContact } from '../../src/core/vehicle-contact';
import { minimumRadius } from '../../src/core/road-geometry';
import { computerRoute, stepComputers } from '../../src/core/computer';
import { LocalRace } from '../../src/core/local-race';
import { LapRecorder, lapRecordKey, replayPose } from '../../src/core/lap-replay';
import { shortcutProjection } from '../../src/core/hop-shortcuts';

// The shorter trail's seven-second gesture made the required crest approach slower
// than 20 m/s. Keep this successful-lap fixture above that authored minimum for the larger car.
const plan=(branch=false)=>{const r=compileRoute(createPracticeSamples(track,branch?6.5:7,branch?'mesa-service-trail':false),track);if(!r.ok)throw Error(JSON.stringify(r));return r.route;};
test('Grand Canyon is a supported 16 m dirt circuit with a required flight and valid hidden branch',()=>{
 expect(track.length).toBeGreaterThanOrEqual(580);expect(track.length).toBeLessThanOrEqual(610);
 const normal=plan(),short=plan(true);expect(normal.jumps).toContain('canyon-crest');expect(short.hopShortcuts).toHaveLength(1);
 expect(normal.length-short.length).toBeGreaterThanOrEqual(20);expect(normal.length-short.length).toBeLessThanOrEqual(30);
});
test.each([20,30,42].flatMap(speed=>[-20,0,20].map(yaw=>({speed,yaw}))))('automatic crest lands safely at $speed m/s with $yaw degree body yaw',({speed,yaw})=>{
 const route=plan(),sim=new RaceSimulation(route,track),s=sim.state,j=track.jumps![0];
 s.position=roadPoint({x:j.from.x-.1,z:0},track,j.entryProgress+69.9);s.elevation=s.position.y!;s.heading=Math.PI/2+yaw*Math.PI/180;s.velocity={x:Math.cos(.12)*speed,z:Math.sin(.12)*speed};s.speed=speed;
 s.distance=route.points.reduce((best,p)=>Math.abs(p.courseProgress!-(s.position.courseProgress??0))<Math.abs(sampleRoute(route,best).courseProgress!-(s.position.courseProgress??0))?p.distance:best,0);
 s.checkpoint=Math.floor(s.distance/(route.length/8))+1;
 const events:string[]=[];for(let i=0;i<180&&!events.includes('landing');i++){sim.step();events.push(...sim.drainEvents().map(e=>e.type));}
 expect(events).toContain('takeoff');expect(events).toContain('landing');expect(s.recoveryCount).toBe(0);expect(s.elevation).toBeCloseTo(6);expect(s.position.x).toBeGreaterThan(j.from.x+j.gap+track.carLength/2);
});
test('dirt is grippier than loose runoff and does not apply an on-track drag fraction',()=>{
 const p=roadPoint({x:-55,z:-52},track,0);expect(sampleSurface(p,track).grip).toBe(38.4);expect(sampleSurface(p,track).sandAmount).toBe(0);expect(RULES.maxSpeed).toBe(42);
});

test.each([false,true])('six-lap Grand Canyon finishes (hidden trail=%s)',branch=>{
 const route=plan(branch),sim=new RaceSimulation(route,track,6),h=track.hopShortcuts![0];
 const obstacle=shortcutProjection({x:89,z:30},h).progress;
 for(let i=0;i<30000&&!sim.state.finished;i++){
  if(branch){const q=shortcutProjection(sim.state.position,h);if(q.progress>obstacle-12&&q.progress<obstacle-8&&q.distance<2)sim.pressHop();}
  sim.step();
 }
 expect(sim.state.finished,JSON.stringify(sim.state)).toBe(true);expect(sim.state.lapTimes).toHaveLength(6);expect(sim.state.recoveryCount).toBe(0);
},60000);

test.each(['easy','normal','hard'] as const)('four cars finish Grand Canyon on %s difficulty',difficulty=>{
 const route=plan(),race=new LocalRace([route,...[0,1,2].map(i=>computerRoute(track,difficulty,i,42))],track,1);
 for(let i=0;i<18000&&!race.finished;i++){stepComputers(race,difficulty);race.step();}
 expect(race.finished,JSON.stringify(race.racers.map(r=>r.state))).toBe(true);
},60000);

test('both visits to the crossing retain their own height and support',()=>{
 const upper=roadPoint({x:0,z:0},track,track.jumps![0].entryProgress+79),lower=roadPoint({x:0,z:0},track,track.sections!.find(s=>s.id==='lower-crossing')!.from+18);
 expect(upper.sectionId).toBe('air-crossing');expect(upper.y).toBeCloseTo(7);expect(lower.sectionId).toBe('lower-crossing');expect(lower.y).toBe(0);
 expect(vehicleSupported(upper,Math.PI/2,track)).toBe(false);expect(vehicleSupported(lower,Math.PI,track)).toBe(true);expect(supportBelow(upper,14,track)).toBe(0);
 const ray={origin:{x:0,y:40,z:0},direction:{x:0,y:-1,z:0}};
 expect(drawingRay(ray,track,{...upper,courseProgress:upper.courseProgress!-1})?.sectionId).toBe('air-crossing');
 expect(drawingRay(ray,track,{...lower,courseProgress:lower.courseProgress!-1})?.y).toBe(0);
 const body={position:lower,heading:0,velocity:{x:0,z:20}};
 expect(vehicleContact({...body,elevation:13},{...body,elevation:0},track)).toBeNull();expect(vehicleContact({...body,elevation:0},{...body,elevation:0},track)).not.toBeNull();
});

test('skipped progression and reversal are rejected; wrong-level and unsupported cuts are raced as hazards',()=>{
 const raw=createPracticeSamples(track,7);
 expect(compileRoute([...raw.slice(0,150),...raw.slice(350)],track).ok).toBe(false);
 expect(compileRoute([raw[0],...raw.slice(1).reverse()],track).ok).toBe(false);
 const cut=raw.map((p,i)=>i>100&&i<120?{...p,z:p.z+35*Math.sin(Math.PI*(i-100)/20)}:p);
 for(const drawn of [raw.map(p=>p.sectionId==='air-crossing'?{...p,y:0,sectionId:'lower-crossing'}:p),cut]){
  const r=compileRoute(drawn,track);if(!r.ok)throw Error(r.message);
  if(drawn===cut)expect(r.route.hazards?.some(h=>h.kind==='support')).toBe(true);
  const sim=new RaceSimulation(r.route,track,1);for(let i=0;i<60*240&&!sim.state.finished;i++)sim.step();
  expect(sim.state.finished).toBe(true);
 }
 const route=plan();for(const p of route.points)expect(p.y).toBeCloseTo(roadHeight(track,p.courseProgress!),5);
 expect(minimumRadius(track.hopShortcuts![0].branch)).toBeGreaterThan(8.5);
});

test('slow mandatory-jump failure recovers to the upper approach without a water splash or progress',()=>{
 const r=compileRoute(createPracticeSamples(track,24),track);if(!r.ok)throw Error(r.message);const sim=new RaceSimulation(r.route,track),events:string[]=[];
 for(let i=0;i<10000&&!sim.state.recoveryCount;i++){sim.step();events.push(...sim.drainEvents().map(e=>e.type));}
 expect(sim.state.recoveryCount).toBe(1);expect(events).not.toContain('splash');expect(sim.state.position.x).toBeLessThan(-78);expect(sim.state.elevation).toBeGreaterThan(6);
 expect(sim.state.position.courseProgress).toBeLessThanOrEqual(track.jumps![0].entryProgress);expect(sim.state.supportSectionId).not.toBe('lower-crossing');expect(sim.state.speed).toBe(0);
});


test.each([{speed:30,lands:false},{speed:42,lands:true}])('a manual hop near the crest cannot stack the automatic impulse at $speed m/s',({speed,lands})=>{
 const route=plan(),sim=new RaceSimulation(route,track),s=sim.state,j=track.jumps![0];
 // Keep the complete enlarged footprint on the approach before pressing Hop.
 const near=route.points.find(p=>p.courseProgress!>j.entryProgress+70-track.carLength/2-.6)!;
 s.position={...near};s.distance=near.distance;s.elevation=near.y!;s.heading=Math.PI/2;s.velocity={x:speed,z:0};s.speed=speed;s.checkpoint=Math.floor(s.distance/(route.length/8))+1;
 expect(vehicleSupported(s.position,s.heading,track)).toBe(true);sim.pressHop();let peak=0;const events:string[]=[];
 for(let i=0;i<100;i++){sim.step();peak=Math.max(peak,s.elevation);events.push(...sim.drainEvents().map(e=>e.type));}
 expect(events.filter(e=>e==='hop')).toHaveLength(1);expect(events).not.toContain('takeoff');expect(peak).toBeLessThan(16.1);expect(peak).toBeGreaterThan(15.0);
 if(lands){expect(events).toContain('landing');expect(s.recoveryCount).toBe(0);}else{expect(events).not.toContain('landing');expect(s.recoveryCount).toBeGreaterThan(0);}
});

test('missing the hidden trail hop makes a physical impact instead of passing through the rock',()=>{
 const sim=new RaceSimulation(plan(true),track);
 for(let i=0;i<7000&&!sim.state.recoveryCount;i++)sim.step();
 expect(sim.state.collisionCount).toBeGreaterThan(0);expect(sim.state.recoveryCount).toBeGreaterThan(0);expect(sim.state.finished).toBe(false);expect(sim.state.hopCount).toBe(0);
});

test('elevated motion and recorded ghosts agree across render rates',()=>{
 const route=plan(),run=(fps:number)=>{
  const sim=new RaceSimulation(route,track),clock=new FixedStepClock(),recorder=new LapRecorder(lapRecordKey(track));let record:ReturnType<LapRecorder['sample']>=null;
  recorder.sample(sim.state);
  for(let frame=0;frame<fps*90&&!sim.state.finished;frame++)clock.advance(1/fps,()=>{sim.step();record=recorder.sample(sim.state)??record;});
  expect(sim.state.finished).toBe(true);expect(record).not.toBeNull();return {state:sim.state,record:record!};
 };
 const a=run(30),b=run(144);expect(a.state).toEqual(b.state);expect(a.record).toEqual(b.record);
 const high=a.record.frames.reduce((a,b)=>a.y>b.y?a:b);expect(high.y).toBeGreaterThan(13);expect(replayPose(a.record,high.t)?.y).toBeCloseTo(high.y);
 const lower=a.record.frames.filter(f=>Math.abs(f.x)<1&&Math.abs(f.z)<5&&f.y<1);expect(lower.length).toBeGreaterThan(0);
});

test('recovery occupancy distinguishes upper and lower road levels',()=>{
 const route=plan(),race=new LocalRace([route,route],track,1);race.tick=300;
 const point=route.points.find(p=>p.sectionId==='upper-approach'&&p.x>-60)!,upper={...point,...sampleRoute(route,point.distance)};
 const a=race.racers[0],b=race.racers[1];a.gridPending=false;b.gridPending=false;
 Object.assign(a.state,{position:{...upper},elevation:upper.y!,distance:upper.distance,heading:upper.heading,recoveringUntil:5,recoveryWaiting:true});
 Object.assign(b.state,{position:{...upper,y:0,sectionId:'lower-crossing'},elevation:0,recoveringUntil:20});
 // A body on another level never occupies the recovery slot.
 b.state.recoveringUntil=-1;expect(vehicleContact(a.state,b.state,track)).toBeNull();
 b.state.elevation=upper.y!;b.state.position={...upper};b.state.distance=upper.distance;b.state.heading=upper.heading;
 race.step();expect(a.state.recoveryWaiting).toBe(true);expect(a.state.distance).toBe(upper.distance);
});
