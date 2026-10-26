// Development tool page (not shipped): a circuit's landscape (landscape/) seen from any angle, lit
// like the game. /tools/landscape-preview/index.html?x=-104&z=-18&radius=40&alpha=-1.2&beta=0.9
// x/z target the view, radius is the camera distance, alpha the azimuth and beta the angle from
// straight down (radians, as Babylon's ArcRotateCamera). Add &race to show the road surface.
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { orbitalTrack } from '../../src/core/tracks/orbital';
import { buildLaunchsiteLandscape } from '../../src/presentation/launchsite';
import { sceneryPalettes, sceneryLighting } from '../../src/presentation/themes';

const params = new URLSearchParams(location.search), num = (key: string, fallback: number) => Number(params.get(key) ?? fallback);
const engine = new Engine(document.getElementById('preview') as HTMLCanvasElement, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine); scene.clearColor = Color4.FromHexString(`${sceneryPalettes.spaceport.sky}ff`);
const target = new Vector3(num('x', 0), 0, num('z', 0));
const camera = new ArcRotateCamera('camera', num('alpha', -Math.PI / 2), num('beta', 0.85), num('radius', 60), target, scene); camera.fov = 0.5; camera.minZ = 0.5; camera.maxZ = 3000;
const lighting = sceneryLighting.spaceport, ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
ambient.diffuse = Color3.FromHexString(lighting.ambient); ambient.groundColor = Color3.FromHexString(lighting.ground); ambient.intensity = 0.62;
const sun = new DirectionalLight('sun', new Vector3(0.55, -1, 0.45).normalize(), scene); sun.diffuse = Color3.FromHexString(lighting.sun); sun.intensity = 1.05;
sun.position = target.add(new Vector3(-55, 100, -45)); sun.shadowMinZ = 1; sun.shadowMaxZ = 400;
const shadows = new ShadowGenerator(2048, sun); shadows.usePercentageCloserFiltering = true; sun.shadowFrustumSize = Math.max(80, num('radius', 60) * 2.2); sun.autoUpdateExtends = false;
const materials = new Map<string, StandardMaterial>(), terrain = new StandardMaterial('terrain', scene);
terrain.diffuseColor = Color3.FromHexString(sceneryPalettes.spaceport.terrain); terrain.specularColor.setAll(0.04); materials.set('terrain', terrain);
if (params.has('race')) { const road = MeshBuilder.CreateTube('road', { path: orbitalTrack.centerline.map(p => new Vector3(p.x, 0.05, p.z)), radius: 0.4 }, scene); road.material = new StandardMaterial('road', scene); }
const landscape = buildLaunchsiteLandscape(scene, orbitalTrack, materials);
landscape.terrain.receiveShadows = true;
let ready = false;
void landscape.shadowCasters.then(meshes => { for (const m of meshes) shadows.addShadowCaster(m); ready = true; });
Object.assign(window, { previewReady: () => ready && scene.isReady() });
engine.runRenderLoop(() => scene.render());
