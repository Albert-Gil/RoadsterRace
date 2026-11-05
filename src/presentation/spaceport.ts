import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { TrackDefinition } from '../core/types';
import type { PresentationTheme } from './themes';
import { buildLaunchsiteLandscape } from './launchsite';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { buildingGeometry } from './building-geometry';
import {assemblyHall,launchTowerDetail,bakeLandmark} from './venue-landmarks';
import {launchOperations} from './venue-signatures';
import {launchFleet} from './landmark-showcase';
import {rocketBoilOff} from './rocket-boiloff';
import { launchsiteRocketStages, launchsiteVessels, launchsiteYardTank } from '../core/tracks/venue-parcels';

/** Original, lightweight launchyard scenery. All substantial structures occupy protected footprints. */
export function buildSpaceport(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  const casters = new Set<StandardMaterial>();
  const mat = (role: string, color: string, casts = true) => {
    const m = new StandardMaterial(role, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.1); m.backFaceCulling = false;
    materials.set(role, m); if (casts) casters.add(m); return m;
  };
  mat('terrain', theme.scene.terrain, false); const concrete = mat('embankment', theme.scene.embankment, false);
  const white = mat('architecture', theme.scene.curb), steel = mat('architecture-trim', theme.scene.structure), glass = mat('architecture-glass', theme.scene.glass);
  const red = mat('architecture-accent', theme.venue.accent), metal = mat('orbital-metal', theme.venue.metal); mat('rock', theme.scene.rock);
  mat('foliage', theme.scene.foliage); mat('foliageLight', theme.scene.foliageLight); mat('trunk', theme.scene.trunk);
  glass.reflectionTexture = scene.environmentTexture; glass.specularColor.setAll(0.8); metal.specularColor.setAll(0.65); metal.specularPower = 96;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = material; return m;
  };
  const cylinder = (name: string, x: number, y: number, z: number, height: number, bottom: number, top: number, material: StandardMaterial) => {
    const m = MeshBuilder.CreateCylinder(name, { height, diameterTop: top, diameterBottom: bottom, tessellation: 20 }, scene); m.position.set(x, y, z); m.material = material; return m;
  };
  const sign = (name: string, text: string, x: number, y: number, z: number, width: number) => {
    const texture = new DynamicTexture(name, { width: 1024, height: 128 }, scene, false), ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = theme.scene.structure; ctx.fillRect(0, 0, 1024, 128); ctx.fillStyle = theme.scene.curb; ctx.font = 'italic bold 65px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 512, 87); texture.update();
    const material = mat(name, theme.scene.curb); material.diffuseTexture = texture; material.emissiveColor.setAll(0.15);
    const mesh = MeshBuilder.CreatePlane(name, { width, height: width / 8 }, scene); mesh.position.set(x, y, z); mesh.material = material;
  };
  // Assembly sector, entirely inside assembly-island.
  box('assembly-plinth', -11, 0.38, -16, 40, 0.16, 14, concrete);
  box('assembly-hangar', -11, 3.7, -14, 37, 7, 10, white);
  bakeLandmark('assembly-hall-roofscape',assemblyHall(),scene,white);
  sign('assembly-sign', 'ORBITAL / ASSEMBLY', -11, 6.4, -19.3, 28);
  box('mission-control', 23, 3, -17, 12, 5.7, 9, white);
  box('mission-control-glass', 23, 3.8, -21.55, 11, 2.3, 0.12, glass);
  box('mission-roof', 23, 6, -17, 13, 0.3, 10, metal);
  cylinder('dish-pedestal', 23, 7.3, -17, 2.3, 0.35, 0.3, steel);
  const dish = MeshBuilder.CreateSphere('communications-dish', { diameter: 3, segments: 8, slice: 0.5 }, scene); dish.position.set(23, 8.8, -17); dish.scaling.y = 0.35; dish.rotation.z = 0.5; dish.material = white;
  // Cantilever start lights: no unmarked outer support in usable runoff.
  box('start-cantilever-column', -43, 3.9, -20, 0.8, 7.8, 0.8, steel);
  box('start-cantilever-arm', -43, 7.5, -31, 0.8, 0.7, 23, steel);
  for (let i = 0; i < 5; i++) box('start-light', -43.5, 6.7, -36.5 - i * 1.2, 0.2, 0.42, 0.42, red);
  // Low service plinth with individual vessels and pipes: no enormous warehouse.
  const tower=track.barriers.find(b=>b.id==='utility-storage-tower')!;
  const storage=new Mesh('utility-storage-body',scene);
  const storageData=buildingGeometry(tower.footprint,tower.height,tower.baseHeight??0).toVertexData();
  // Match the existing box/cylinder attributes so the body joins their static batch.
  storageData.colors=null;storageData.uvs=new Float32Array(storageData.positions!.length/3*2);
  storageData.applyToMesh(storage);storage.material=concrete;
  for(const [i,v] of launchsiteVessels.entries()){
    const base=tower.height, diameter=v.radius*2;
    cylinder(v.id,v.x,base+(v.height-.4)/2,v.z,v.height-.4,diameter,diameter,i%2?metal:white);
    cylinder(`${v.id}-cap`,v.x,base+v.height-.2,v.z,.4,diameter,diameter*.88,white);
    for(const h of [.3,v.height*.38,v.height*.76])cylinder('vessel-weld-band',v.x,base+h,v.z,.09,diameter,diameter,steel);
    box('vessel-service-valve',v.x,base+.7,v.z+v.radius-.35,.65,.55,.65,red);
  }
  // The wing between the hairpin legs is a Hop obstacle drawn with the lane props (hop-obstacles.ts).
  // v10 rocket yard: a low plinth from the S to the launch complex carrying a tall, continuous row
  // (a propellant tank and two unbranded stages on transport stands, all taller than a Hop) that
  // reads as impassable. Its low tip inside the S is a Hop obstacle drawn in hop-obstacles.ts.
  const yard=track.barriers.find(b=>b.id==='rocket-yard');
  if(yard){
    const yardData=buildingGeometry(yard.footprint,yard.height,yard.baseHeight??0).toVertexData(),plinth=new Mesh('rocket-yard-plinth',scene);
    yardData.colors=null;yardData.uvs=new Float32Array(yardData.positions!.length/3*2);yardData.applyToMesh(plinth);plinth.material=concrete;
    const base=yard.height, lying=(name:string,x0:number,x1:number,z:number,y:number,from:number,to:number,material:StandardMaterial)=>{
      const m=cylinder(name,(x0+x1)/2,y,z,x1-x0,from,to,material);m.rotation.z=Math.PI/2;return m;
    };
    for(const s of launchsiteRocketStages){
      const r=s.diameter/2,y=base+s.cradle+r,length=s.to-s.from,stands=s.id==='rocket-yard-booster'?5:3;
      // Transport stands: a wheeled bogie, two legs and a saddle that wraps the lower body.
      for(let i=0;i<stands;i++){
        const x=s.from+length*(stands===5?.08+i*.21:.2+i*.3);
        box('stage-stand-bogie',x,base+.35,s.z,2.4,.7,s.diameter*.9,steel);
        for(const side of [-1,1]){
          box('stage-stand-leg',x,base+(s.cradle+r*.6)/2,s.z+side*r*.62,.7,s.cradle+r*.6,.55,steel);
          for(const dx of [-.75,.75])box('stage-stand-wheel',x+dx,base+.3,s.z+side*r*.72,.6,.6,.35,metal);
        }
        box('stage-stand-saddle',x,base+s.cradle+r*.18,s.z,.9,.5,s.diameter*.86,red);
      }
      if(s.id==='rocket-yard-booster'){
        // Nose end to the west, engines toward the pad.
        lying('booster-interstage',s.from,s.from+2.4,s.z,y,s.diameter*.94,s.diameter*.94,steel);
        lying('booster-tank',s.from+2.4,s.to-5,s.z,y,s.diameter*.99,s.diameter*.99,white);
        for(const t of [.2,.4,.6,.8])lying('booster-weld-band',s.from+2.4+(length-7.4)*t-.07,s.from+2.4+(length-7.4)*t+.07,s.z,y,s.diameter,s.diameter,metal);
        lying('booster-aft-skirt',s.to-5,s.to-1.9,s.z,y,s.diameter*.96,s.diameter,metal);
        lying('booster-heat-shield',s.to-1.9,s.to-1.7,s.z,y,s.diameter*.92,s.diameter*.92,steel);
        for(let k=0;k<9;k++){
          const a=k/8*Math.PI*2,c=k===8?{y:0,z:0}:{y:Math.sin(a)*2.2,z:Math.cos(a)*2.2};
          lying('booster-engine-bell',s.to-1.7,s.to,s.z+c.z,y+c.y,1.3,.65,steel);
        }
      }else{
        lying('stage-nose-cone',s.from,s.from+6,s.z,y,.15,s.diameter,white).rotation.z=-Math.PI/2;
        lying('stage-body',s.from+6,s.to-2,s.z,y,s.diameter*.99,s.diameter*.99,metal);
        for(const x of [s.from+6,s.from+(length+4)/2])lying('stage-band',x,x+.25,s.z,y,s.diameter,s.diameter,steel);
        lying('stage-skirt',s.to-2,s.to-1.1,s.z,y,s.diameter*.96,s.diameter,steel);
        lying('stage-engine-bell',s.to-1.1,s.to,s.z,y,2.2,1.1,steel);
      }
    }
    // Vertical propellant tank closing the row at the tip end.
    const t=launchsiteYardTank,d=t.radius*2;
    cylinder('yard-tank',t.x,base+(t.height-.5)/2,t.z,t.height-.5,d,d,white);
    cylinder('yard-tank-cap',t.x,base+t.height-.25,t.z,.5,d,d*.8,metal);
    for(const h of [.4,t.height*.35,t.height*.7])cylinder('yard-tank-band',t.x,base+h,t.z,.12,d*1.0,d*1.0,steel);
    box('yard-tank-ladder',t.x,base+t.height/2,t.z-t.radius+.12,.5,t.height,.12,steel);
  }
  // Launch landmark beyond the driving apron, protected by launch-complex.
  cylinder('landing-pad', 97, 0.26, 20, 0.12, 18, 18, concrete);
  const ring = MeshBuilder.CreateTorus('pad-ring', { diameter: 14, thickness: 0.15, tessellation: 48 }, scene); ring.position.set(97, 0.36, 20); ring.material = white;
  cylinder('rocket-engine-skirt', 94, 1.7, 19, 2.7, 3.7, 4.8, steel);
  cylinder('rocket-body', 94, 10.5, 19, 15, 4.8, 4.8, white);
  cylinder('rocket-upper-body', 94, 19.2, 19, 2.4, 4.8, 4.2, white);
  cylinder('rocket-nose', 94, 22.2, 19, 3.6, 4.2, 0.05, white);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const fin = box('rocket-fin', 94 + Math.sin(a) * 2, 3, 19 + Math.cos(a) * 2, 0.12, 3.8, 2, steel); fin.rotation.y = a; fin.rotation.x = 0.15;
  }
  for (const x of [101, 104]) for (const z of [23, 26]) box('launch-tower-leg', x, 13, z, 0.55, 25.5, 0.55, red);
  for (let level = 2; level < 26; level += 3) {
    box('tower-floor', 102.5, level, 24.5, 3.7, 0.15, 3.7, metal);
    const brace = box('tower-brace', 102.5, level + 1.4, 22.9, 0.14, 4, 0.14, steel); brace.rotation.z = -0.7;
  }
  box('service-arm', 98.5, 19.5, 24.5, 8, 0.45, 0.6, white);
  // Bring the existing landmark away from the control rail, inside its original parcel.
  const launchParts=new Set(['rocket-engine-skirt','rocket-body','rocket-upper-body','rocket-nose','rocket-fin','launch-tower-leg','tower-floor','tower-brace','service-arm']);
  for(const mesh of scene.meshes)if(launchParts.has(mesh.name))mesh.position.x+=mesh.name.startsWith('rocket-')?1:-4.5;
  for(const mesh of scene.meshes)if(mesh.name==='landing-pad'||mesh.name==='pad-ring')mesh.position.x-=2;
  bakeLandmark('launch-tower-cross-bracing',launchTowerDetail(),scene,white);
  bakeLandmark('connected-launch-operations',launchOperations(),scene,white);
  bakeLandmark('launchsite-rocket-fleet',launchFleet(),scene,white);
  const boilOff=rocketBoilOff(scene);
  // Desert landscape: terrain and painted ground, plants, and the solid rock formations (landscape/).
  const landscape = buildLaunchsiteLandscape(scene, track, materials);
  return { shadowCasterMaterials: casters, lateShadowCasters: landscape.shadowCasters, update: (time: number, reduced: boolean) => {boilOff.update(time,reduced);} };
}
