import { roadEdges } from '../core/road-geometry';
import { jumpPoint } from '../core/support';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { Point, TrackDefinition } from '../core/types';
import { sunsetAppearance as art, type PresentationTheme } from './themes';
import { surfaceTexture } from './textures';
import { santaMonicaAuthoredBuildings as santaMonicaBuildings } from '../content/santa-monica-art';
import { reflectSantaVenue,SANTA_AMUSEMENT } from '../core/tracks/santa-monica';
import { buildSantaMonicaLandscape } from './santa-monica-landscape';
import { buildSantaBeachLife } from './santa-monica-beach-life';
import { pierRampGeometry,pierLandingGeometry } from './pier-ramp';
import {buildPacificWheel,amusementBoardwalk,amusementAccess,coasterPosition} from './pacific-wheel';
import {bakeLandmark} from './venue-landmarks';
import {pierComposition} from './themes';
import {shoreSurf} from './shore-surf';

/** Original procedural seaside venue. Every pier slab uses a physical support footprint. */
export function buildSantaMonica(scene: Scene, track: TrackDefinition, theme: PresentationTheme, materials: Map<string, StandardMaterial>) {
  // Props remain in a single documented authoring space. Reflect their shared
  // parent into the clockwise physical venue; static batching bakes that transform.
  // The landscape (santa-monica-landscape.ts) is built in world space, after the reflection.
  const worldTrack = track;
  track = reflectSantaVenue(track);
  const before = new Set(scene.meshes), venueRoot = new TransformNode('clockwise-santa-artwork', scene); venueRoot.scaling.z = -1;
  const casters = new Set<StandardMaterial>();
  const mat = (role: string, color: string, casts = true) => { const m = new StandardMaterial(role, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor.setAll(0.08); m.backFaceCulling = false; materials.set(role, m); if (casts) casters.add(m); return m; };
  const sand = mat('terrain', theme.scene.terrain, false), edge = mat('embankment', theme.scene.embankment, false);
  const wood = mat('pier-timber', art.deck), dark = mat('architecture-trim', art.steel), white = mat('architecture', art.ivory), glass = mat('architecture-glass', art.glass);
  const coral = mat('sunset-coral', art.coral), gold = mat('sunset-gold', art.gold); mat('foliage', theme.scene.foliage); mat('foliageLight', theme.scene.foliageLight);
  mat('trunk', theme.scene.trunk); mat('rock', theme.scene.rock);
  const water = mat('water', theme.scene.water, false); water.specularColor.setAll(0.65); water.specularPower = 90;
  water.disableLighting = true; water.emissiveColor = Color3.FromHexString(theme.scene.water);
  const waterTexture = surfaceTexture(scene, 'water'); waterTexture.uScale = waterTexture.vScale = 120; water.diffuseTexture = waterTexture;
  const sandTex = surfaceTexture(scene, 'sand'); sandTex.uScale = sandTex.vScale = 6; sand.diffuseTexture = sandTex;
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) => { const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene); m.position.set(x, y, z); m.material = material; return m; };
  const tube = (name: string, points: Vector3[], radius: number, material: StandardMaterial) => { const m = MeshBuilder.CreateTube(name, { path: points, radius, tessellation: 5 }, scene); m.material = material; return m; };
  const slab = (name: string, footprint: Point[], material: StandardMaterial, y: number, bottom?: number) => {
    const positions = footprint.flatMap(p => [p.x, y, p.z]), indices: number[] = [];
    for (let i = 1; i < footprint.length - 1; i++) indices.push(0, i + 1, i);
    if (bottom !== undefined) for (let i = 0; i < footprint.length; i++) { const a = footprint[i], b = footprint[(i + 1) % footprint.length], base = positions.length / 3; positions.push(a.x, bottom, a.z, b.x, bottom, b.z, b.x, y, b.z, a.x, y, a.z); indices.push(base, base + 1, base + 2, base, base + 2, base + 3); }
    const data = new VertexData(), normals: number[] = []; data.positions = positions; data.indices = indices; VertexData.ComputeNormals(positions, indices, normals);
    for (let i = 0; i < footprint.length; i++) { normals[i * 3] = 0; normals[i * 3 + 1] = 1; normals[i * 3 + 2] = 0; }
    data.normals = normals; data.uvs = positions.flatMap((_, i) => i % 3 ? [] : [positions[i] / (material === sand ? 180 : 5), positions[i + 2] / (material === sand ? 150 : 5)]);
    const m = new Mesh(name, scene); data.applyToMesh(m); material.backFaceCulling = false; m.material = material; return m;
  };
  const sea = MeshBuilder.CreateGround('pacific-ocean', { width: 2000, height: 2000 }, scene); sea.position.y = -2.4; sea.material = water;
  // Pier decks are slabs over their supports; the beach support is the landscape's terrain (level
  // across the corridor, the same shoreline, its wet slope, foam and sand bank into the Pacific).
  for (const s of track.supports!) if (s.id !== 'beach-land') slab(`supported-${s.id}`, s.footprint, wood, 0.025, -0.6);
  for (let i = 0; i < 22; i++) {
    const glint = box('sunset-water-glint', 43 + i % 6 * 22, -2.37, -45 + Math.floor(i / 6) * 32, 6 + i % 4 * 2, 0.01, 0.12, gold); glint.rotation.y = -0.15;
  }
  // Piles and diagonal braces remain beneath the supported deck, outside racing volumes.
  const pierEdges=roadEdges(track.centerline,track.roadWidth-2);
  for(let i=0;i<track.centerline.length-1;i+=12)if(track.centerline[i].x>34)for(const side of [0,1]){
    const p=pierEdges[side][i];box('pier-pile',p.x,-1.5,p.z,0.65,2.8,0.65,dark);
  }
  for(const j of track.jumps??[])for(const along of [0,6,24,36,48,60,72])for(const side of [-1,1]){
    const p=jumpPoint(j,along,side*(j.width/2-1));box('jump-deck-pile',p.x,-1.5,p.z,0.65,2.8,0.65,dark);
  }
  const deck=SANTA_AMUSEMENT.deck;
  for (let x=deck.x+1;x<deck.x+deck.width;x+=8)for(const z of[deck.z+1,deck.z+deck.depth-1])box('amusement-pile',x,-1.45,z,.85,3.1,.85,dark);

  const sign = (text: string, x: number, z: number, width: number, materialRole: string) => {
    const tex = new DynamicTexture(materialRole, { width: 1024, height: 128 }, scene, false), ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = art.steel; ctx.fillRect(0, 0, 1024, 128); ctx.fillStyle = art.gold; ctx.fillRect(0, 112, 1024, 16);
    ctx.font = 'italic bold 66px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = art.ivory; ctx.fillText(text, 512, 83); tex.update();
    const m = mat(materialRole, '#ffffff', false); m.diffuseTexture = tex; m.emissiveColor.setAll(0.3); m.backFaceCulling = false;
    const board = MeshBuilder.CreatePlane(materialRole, { width, height: width / 8 }, scene); board.position.set(x, 3.8, z); board.material = m;
    for (const side of [-1, 1]) box('sign-support', x + side * width * 0.45, 1.8, z, 0.18, 3.6, 0.18, dark);
  };
  sign('SANTA MONICA / SUNSET RUN', -14, -24, 22, 'sunset-title');
  sign('PACIFIC PIER', 95, 39.25, 8, 'pier-title');

  // Beachfront facades sit inside the protected garden footprint; furniture is protected too.
  const facade = [coral, white, gold];
  for (const { x, z, height: h, color } of santaMonicaBuildings.filter(b => b.kind === 'shop')) {
    box('pastel-shop-foundation', x, 0.18, z, 5, 0.4, 7, edge);
    box('pastel-shop', x, h / 2 + 0.35, z, 5, h, 7, facade[color]);
    box('shop-cornice', x, h + 0.5, z, 5.2, 0.25, 7.2, white);
    for (const side of [-1, 1]) {
      box('shop-awning', x, 2, z + side * 3.8, 4.5, 0.18, 1, coral);
      box('shopfront-glazing', x, 1.1, z + side * 3.55, 4.2, 1.5, 0.06, glass);
      for (let j = 0; j < 3; j++) box('upper-shop-window', x - 1.5 + j * 1.5, 3.4, z + side * 3.55, 0.9, 1.1, 0.08, glass);
    }
  }
  // The venue's palms are landscape plants now (SANTA.palms keeps their authored places).
  // Land-backed hotel frontage and promenade, outside the usable runoff.
  for (const { x, z, height: h, color } of santaMonicaBuildings.filter(b => b.kind === 'hotel')) {
    box('beachfront-city-foundation', x, 0.1, z, 11, 0.3, 9, edge); box('beachfront-hotel', x, h / 2 + 0.3, z, 10, h, 8, facade[color]);
    box('hotel-roofline', x, h + 0.4, z, 10.3, 0.25, 8.3, white);
    for (let floor = 1.5; floor < h; floor += 2) for (let c = 0; c < 4; c++) for (const side of [-1, 1]) box('hotel-window', x - 3.2 + c * 2.1, floor + 0.3, z + side * 4.05, 1.15, 1.15, 0.08, glass);
  }
  for (let i = 0; i < 12; i++) {
    const x = -103, z = -52 + i * 10; box('promenade-paving', x, 0.02, z, 4.8, 0.1, 10.1, edge);
    if (i % 2 === 0) { box('promenade-lamp', x + 1.8, 2.5, z, 0.13, 5, 0.13, dark); box('promenade-light', x + 1.8, 5.05, z, 0.6, 0.2, 0.5, white); }
  }
  // Lifeguard cabins and umbrellas are on beach land outside the driving/runoff corridor.
  for (const { x, z, color } of santaMonicaBuildings.filter(b => b.kind === 'lifeguard')) {
    box('lifeguard-cabin', x, 1.7, z, 3.1, 2, 2.4, color ? coral : white); box('lifeguard-roof', x, 2.8, z, 3.8, 0.2, 3.2, gold);
    for (const side of [-1, 1]) box('lifeguard-legs', x + side, 0.5, z, 0.18, 1.1, 0.18, dark);
    const canopy = MeshBuilder.CreateCylinder('beach-umbrella', { diameterTop: 0, diameterBottom: 3.8, height: 0.7, tessellation: 10 }, scene); canopy.position.set(x + 7, 2.3, z - 1); canopy.material = color ? gold : coral;
    box('umbrella-pole', x + 7, 1.1, z - 1, 0.08, 2.2, 0.08, white);
  }
  const {wheelX:wx,wheelZ:wz,wheelY:wy}=pierComposition;
  for(const side of[-1,1])tube('wheel-a-frame',[new Vector3(wx-10,.3,wz+side*2.7),new Vector3(wx,wy,wz),new Vector3(wx+10,.3,wz+side*2.7)],.55,coral);
  const wheel=buildPacificWheel(scene,white);
  bakeLandmark('amusement-boardwalk-district',amusementBoardwalk(),scene,white);
  bakeLandmark('connected-pedestrian-pier-access',amusementAccess(),scene,white);
  const coasterPath = Array.from({ length: 97 }, (_, i) => {
    const p=coasterPosition(i/96*Math.PI*2);return new Vector3(p.x,p.y,p.z);
  });
  for (const side of [-1, 1]) {
    const rail = coasterPath.map(p => {
      const radial = new Vector3(p.x - pierComposition.coaster.x, 0, p.z - pierComposition.coaster.z).normalize().scale(side * .3);
      return p.add(radial);
    });
    tube('sunset-coaster-track', rail, 0.18, gold);
  }
  for (let i = 0; i < 96; i += 3) {
    const p = coasterPath[i], radial = new Vector3(p.x - pierComposition.coaster.x, 0, p.z - pierComposition.coaster.z).normalize().scale(.43);
    tube('coaster-track-tie', [p.subtract(radial), p.add(radial)], .055, white);
  }
  for (let i = 0; i < 96; i += 8) { const p = coasterPath[i]; box('coaster-trestle', p.x, p.y / 2, p.z, 0.18, p.y, 0.18, white); }
  for(let i=0;i<96;i+=6){
    const p=coasterPath[i],q=coasterPath[(i+6)%96],radial=new Vector3(p.x-pierComposition.coaster.x,0,p.z-pierComposition.coaster.z).normalize().scale(.65);
    for(const side of[-1,1]){
      const base=p.add(radial.scale(side));tube('coaster-braced-leg',[new Vector3(base.x,.18,base.z),new Vector3(base.x,p.y-.12,base.z)],.13,dark);
      tube('coaster-lattice-brace',[new Vector3(base.x,.35,base.z),new Vector3(q.x,q.y-.18,q.z)],.075,white);
    }
  }
  const trainParts = Array.from({ length: 5 }, (_, i) => box('coaster-train-car', -i * 1.5, 0, 0, 1.3, 0.9, 1.1, coral));
  const train = Mesh.MergeMeshes(trainParts, true, true)!; train.name = 'animated-coaster-train'; train.metadata = { dynamicScenery: true };

  // The physical ramp remains discoverable without shortcut signs or special paint.
  const jump = track.jumps![0];
  const ramp = new Mesh('physical-jump-ramp',scene),rampGeometry=pierRampGeometry(jump),rampData=rampGeometry.toVertexData();
  rampData.uvs=Float32Array.from({length:rampGeometry.vertexCount*2},(_,i)=>rampGeometry.positions[Math.floor(i/2)*3+(i%2?2:0)]/5);
  rampData.applyToMesh(ramp);ramp.material=wood;
  const landing=new Mesh('timber-jump-landing',scene),landingGeometry=pierLandingGeometry(jump),landingData=landingGeometry.toVertexData();
  landingData.uvs=Float32Array.from({length:landingGeometry.vertexCount*2},(_,i)=>landingGeometry.positions[Math.floor(i/2)*3+(i%2?2:0)]/5);landingData.applyToMesh(landing);landing.material=wood;
  const landingAlong = jump.rampLength + jump.gap;
  for (let along = landingAlong + 25; along < jump.corridorLength; along += 3) {
    const p = jumpPoint(jump, along); box('landing-deck-seam', p.x, 0.115, p.z, 0.04, 0.01, jump.width - 0.7, white);
  }

  for (const mesh of scene.meshes) if (!before.has(mesh) && !mesh.parent) mesh.parent = venueRoot;
  const landscape = buildSantaMonicaLandscape(scene, worldTrack, materials);
  const surf=shoreSurf(scene,{kind:'beach',water:-2.4,shoreX:landscape.layout.shoreX,height:landscape.layout.height});
  // Beach life (v4 structures, crowds, boats, towels) is one world-space batch built from the physical track.
  casters.add(buildSantaBeachLife(scene, worldTrack, landscape.layout, materials).material);
  return { shadowCasterMaterials: casters, lateShadowCasters: landscape.shadowCasters, update(time: number, reduced: boolean) {
    waterTexture.uOffset = reduced ? 0 : time * 0.002;
    wheel.update(time,reduced);
    surf.update(time,reduced);
    const index = reduced ? 0 : time * 7 % 96, i = Math.floor(index), a = coasterPath[i], b = coasterPath[i + 1];
    train.position.copyFrom(Vector3.Lerp(a, b, index - i)); train.position.y += 0.45; train.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  } };
}
