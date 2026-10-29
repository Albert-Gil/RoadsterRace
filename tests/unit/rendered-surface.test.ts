import{expect,test}from'vitest';
import{RenderedSurface}from'../../src/presentation/rendered-surface';

test('visible height follows the real mesh triangles, not a bilinear approximation',()=>{
 const s=new RenderedSurface(),p=[0,0,0,1,0,0,0,0,1,1,1,1],indices=[0,2,1,2,3,1];
 s.setGrid({p,indices,minX:0,minZ:0,cell:1,cols:2,rows:2});
 expect(s.height(.25,.25)).toBeCloseTo(0);expect(s.height(.75,.75)).toBeCloseTo(.5);expect(s.height(2,2)).toBeUndefined();
 expect(s.patch(.1,.1,.9,.9)).toHaveLength(2);
});
test('the visible road wins over a lower shoulder or terrain, including shared edges',()=>{
 const s=new RenderedSurface();s.add([0,2,0,2,2,0,0,2,2],[0,2,1]);s.add([0,1,0,2,1,0,0,1,2],[0,2,1]);
 expect(s.height(.4,.7)).toBe(2);expect(s.height(1,1)).toBe(2);expect(s.height(3,3)).toBeUndefined();
});
test('double-sided skins and multiple spatial buckets do not duplicate shadow triangles',()=>{
 const s=new RenderedSurface(.25);s.add([0,0,0,1,0,0,0,0,1],[0,2,1,0,1,2],true);
 expect(s.height(.2,.2)).toBe(0);expect(s.patch(0,0,1,1)).toHaveLength(1);
});

test('a projected shadow has valid transparent-sort bounds from its first update',async()=>{
 const{NullEngine}=await import('@babylonjs/core/Engines/nullEngine'),{Scene}=await import('@babylonjs/core/scene'),{StandardMaterial}=await import('@babylonjs/core/Materials/standardMaterial'),{ContactShadow}=await import('../../src/presentation/contact-shadow');
 const engine=new NullEngine(),scene=new Scene(engine);
 try{
  const shadow=new ContactShadow(scene,new StandardMaterial('test-shadow',scene),32),surface=new RenderedSurface();
  surface.add([-5,0,-5,5,0,-5,-5,2,5,5,2,5],[0,2,1,2,3,1]);
  shadow.update({x:0,z:0,heading:0},1,.2,0,1,.01,surface);
  const sub=shadow.mesh.subMeshes[0],bounds=sub.getBoundingInfo();
  expect(sub.indexCount).toBe(6);expect(bounds).toBeDefined();
  expect(Number.isFinite(bounds.boundingSphere.centerWorld.y)).toBe(true);
  expect(bounds.boundingSphere.radiusWorld).toBeGreaterThan(0);
 }finally{scene.dispose();engine.dispose();}
});
