import { expect, test } from 'vitest';
import { venueFurniture } from '../../src/presentation/venue-furniture';
import { pierRampGeometry } from '../../src/presentation/pier-ramp';
import { roadsideAppearance, pierRampAppearance, parkedVehicleFacades, sceneryFinishes } from '../../src/presentation/themes';
import { circuits } from '../../src/content/circuits';
import { jumpCoordinates } from '../../src/core/support';

test('parked vehicle paint stays outside the masonry facade roles',()=>{
  for(const index of parkedVehicleFacades)expect(sceneryFinishes['night-city']?.[`la-facade-${index}`]?.kind).not.toBe('brick');
});

for(const circuit of circuits)test(`${circuit.track.name}: native detail clusters stay inside their protected envelope`,()=>{
  const p=roadsideAppearance.palettes[circuit.scenery];
  const kinds=new Set<string>();
  for(let variant=0;variant<6;variant++){
    const {geometry:g,kind}=venueFurniture(circuit.scenery,p,variant,.62);kinds.add(kind);
    expect(g.triangleCount).toBeLessThan(300);
    expect(g.positions.every(Number.isFinite)).toBe(true);
    for(let i=0;i<g.positions.length;i+=3){expect(Math.hypot(g.positions[i],g.positions[i+2])).toBeLessThanOrEqual(1.5);expect(g.positions[i+1]).toBeGreaterThanOrEqual(0);expect(g.positions[i+1]).toBeLessThanOrEqual(.62);}
    expect(g.toVertexData().normals!.every(Number.isFinite)).toBe(true);
  }
  expect(kinds.size).toBeGreaterThan(1);
});

test('Santa Monica timber top follows the physical slope and leaves the water opening clear',()=>{
  const jump=circuits.find(c=>c.id==='santa-monica')!.track.jumps![0],before=JSON.stringify(jump),g=pierRampGeometry(jump);
  expect(g.triangleCount).toBeLessThan(1000);
  for(let i=0;i<g.positions.length;i+=3){
    const q=jumpCoordinates({x:g.positions[i],z:g.positions[i+2]},jump);
    expect(q.along).toBeGreaterThanOrEqual(-1e-5);expect(q.along).toBeLessThanOrEqual(jump.rampLength+.004);
    expect(Math.abs(q.across)).toBeLessThanOrEqual(jump.width/2+1e-5);
    expect(g.positions[i+1]).toBeLessThanOrEqual(q.along*jump.lipHeight/jump.rampLength+pierRampAppearance.surfaceOffset+.003);
  }
  expect(g.toVertexData().normals![1]).toBeGreaterThan(.8);
  expect(JSON.stringify(jump)).toBe(before);
});
