import{expect,test}from'vitest';
import{productionCrown,productionFacade,PRODUCTION_KIT}from'../../src/presentation/production-kit';
import{cityBuildings}from'../../src/content/golden-city';
test('native production crowns and bays stay inside their existing authored building envelopes',()=>{
 for(const[i,b]of cityBuildings.entries())for(const g of[productionCrown(b.x,b.z,b.width,b.depth,b.height*.74,b.height,'#aa7755','#eeeedd',i),productionFacade(b.x,b.z,b.width,b.depth,b.height*.74,'#eeeedd',i)]){
  for(let k=0;k<g.positions.length;k+=3){expect(Math.abs(g.positions[k]-b.x)).toBeLessThanOrEqual(b.width/2+.0001);expect(Math.abs(g.positions[k+2]-b.z)).toBeLessThanOrEqual(b.depth/2+.0001);expect(g.positions[k+1]).toBeLessThanOrEqual(Math.max(2.75,b.height)+.0001);}
  expect(g.triangleCount).toBeLessThanOrEqual(PRODUCTION_KIT.maxCrownTriangles);
 }
});
