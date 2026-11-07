import{test,expect}from'vitest';
import{sanDiegoFleetTrack as track}from'../../src/core/tracks/san-diego-fleet';
import{navalHull,navalProp,vesselFrame}from'../../src/presentation/fleet-model';
import{carrierDeckSignature,aircraftApron}from'../../src/presentation/fleet-outfit';
import{CompositionShapes}from'../../src/presentation/composition-shapes';
import{fleetAppearance}from'../../src/presentation/themes';
import{hex}from'../../src/presentation/landscape/mesh';
import{onDeck,deckAt}from'../../src/core/decks';
import{projectToPolyline}from'../../src/core/geometry';

test('all eight spinning arrays and helicopter rotors stay within real protected envelopes at every angle',()=>{
 let count=0;
 for(const b of track.barriers.filter(b=>!b.deckSurfaceId&&!b.id.startsWith('fleet-rail'))){
  const moving=new CompositionShapes();navalProp(b,new CompositionShapes(),moving);if(!moving.vertexCount)continue;count++;
  const x=b.footprint.reduce((s,p)=>s+p.x,0)/b.footprint.length,z=b.footprint.reduce((s,p)=>s+p.z,0)/b.footprint.length;
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12)for(let i=0;i<moving.positions.length;i+=3){const dx=moving.positions[i]-x,dz=moving.positions[i+2]-z,p={x:x+dx*Math.cos(angle)+dz*Math.sin(angle),z:z-dx*Math.sin(angle)+dz*Math.cos(angle)};
   expect(onDeck(p,{id:b.id,kind:'carrier',elevation:0,footprint:b.footprint}),b.id).toBe(true);expect(moving.positions[i+1]).toBeLessThanOrEqual(b.baseHeight!+b.height);expect(moving.positions[i+1]).toBeGreaterThanOrEqual(b.baseHeight!);
  }
 }
 expect(count).toBe(8);
});
test('large carrier identification/elevator paint stays on supported deck and outside the racing ribbon',()=>{
 for(const d of track.decks!.filter(d=>d.kind==='carrier')){
  const g=new CompositionShapes();carrierDeckSignature(track,d,vesselFrame(d),g);expect(g.vertexCount).toBeGreaterThan(40);
  for(let i=0;i<g.positions.length;i+=3){const p={x:g.positions[i],z:g.positions[i+2]};expect(onDeck(p,d),d.id).toBe(true);expect(projectToPolyline(p,track.centerline,track.distances).distance,d.id).toBeGreaterThan(track.roadWidth/2+.5);expect(g.positions[i+1]-d.elevation).toBeLessThan(.12);}
 }
 for(const b of track.barriers.filter(b=>b.id.includes('parked-aircraft'))){const g=new CompositionShapes();aircraftApron(b,g);for(let i=0;i<g.positions.length;i+=3){expect(deckAt({x:g.positions[i],z:g.positions[i+2]},track)?.elevation).toBe(b.baseHeight);expect(g.positions[i+1]-b.baseHeight!).toBeLessThan(.12);}}
});

test('carrier lifeboats remain distributed along full hull edges after fine-bow subdivision',()=>{
 const d=track.decks!.find(d=>d.id==='carrier-a')!,details=new CompositionShapes();navalHull(d,new CompositionShapes(),new CompositionShapes(),details);const color=hex(fleetAppearance.rescueOrange),points=[];for(let i=0;i<details.positions.length;i+=3){const k=i/3*4;if(color.every((v,n)=>Math.abs(details.colors[k+n]-v)<1e-6))points.push(vesselFrame(d).local({x:details.positions[i],z:details.positions[i+2]}).x);}expect(points.length).toBeGreaterThan(200);expect(Math.max(...points)-Math.min(...points)).toBeGreaterThan(100);
});
