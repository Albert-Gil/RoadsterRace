import{expect,test}from'vitest';
import{Matrix,Vector3}from'@babylonjs/core/Maths/math.vector';
import{fitVehicleToSurface,rotateContact}from'../../src/presentation/vehicle-grounding';

const tyres=[{x:-.96,y:.006,z:1.62},{x:.96,y:.006,z:1.62},{x:-.99,y:0,z:-1.77},{x:.99,y:0,z:-1.77}];
test('the contact transform matches the real render matrix on pitched and banked slopes',()=>{
 for(const heading of[0,.7,Math.PI/2,2.5])for(const pitch of[-.65,0,.74])for(const roll of[-.2,.15]){
  const p={x:.9,y:.4,z:1.8},actual=rotateContact(p,heading,pitch,roll),expected=Vector3.TransformCoordinates(new Vector3(p.x,p.y,p.z),Matrix.RotationYawPitchRoll(heading,-pitch,roll));
  expect(actual.x).toBeCloseTo(expected.x,6);expect(actual.y).toBeCloseTo(expected.y,6);expect(actual.z).toBeCloseTo(expected.z,6);
 }
});
test('all four rendered tyre contacts stay on steep inclines and cross-slopes',()=>{
 for(const heading of[0,.7,Math.PI/2,2.5])for(const [a,b]of[[0,0],[.9,0],[0,-.67],[.6,.45]]){
  const h=(x:number,z:number)=>12+a*x+b*z,p={x:5,z:-3,heading},fit=fitVehicleToSurface(p,tyres,h,.13,.22)!;
  expect(fit).not.toBeNull();for(const c of fit.contacts)expect(c.y-h(c.x,c.z)).toBeCloseTo(.13,5);
  for(const corner of[[-1.5,-3],[1.5,3]]){const c=rotateContact({x:corner[0],y:0,z:corner[1]},heading,fit.pitch,fit.roll);expect(fit.surfaceY+c.y).toBeCloseTo(h(p.x+c.x,p.z+c.z),5);}
 }
});
test('small road curvature uses bounded independent visual suspension',()=>{
 const h=(x:number,z:number)=>.6*z+.02*x*z,fit=fitVehicleToSurface({x:0,z:0,heading:0},tyres,h,.13,.22)!;
 for(const c of fit.contacts)expect(Math.abs(c.y-h(c.x,c.z)-.13)).toBeLessThan(.025);
 expect(fit.suspension.some(x=>Math.abs(x)>.005)).toBe(true);expect(fit.suspension.every(x=>Math.abs(x)<=.22)).toBe(true);
});
test('missing support never pulls an airborne or unsupported model onto a fabricated surface',()=>{
 expect(fitVehicleToSurface({x:0,z:0,heading:0},tyres,(x)=>x<0?0:undefined,.13,.22)).toBeNull();
});
