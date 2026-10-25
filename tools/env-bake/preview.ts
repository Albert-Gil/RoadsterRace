// Development tool page (not shipped): shows a baked .env as a skybox with probe spheres.
// Open /tools/env-bake/preview.html?env=sky on the dev server.
// ?sun=x,y,z turns the sky as the game does (brightest direction toward that light) and
// ?view=x,y,z places the camera there looking at a mirror ball, to check the alignment:
// a camera on the sun side sees the sun reflected straight back at the ball's centre.
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Helpers/sceneHelpers';
import '@babylonjs/core/Materials/Textures/Loaders/envTextureLoader';
import { loadSky } from '../../src/presentation/environment';

const params = new URLSearchParams(location.search), name = params.get('env') ?? 'sky';
const vector = (value: string | null) => value ? Vector3.FromArray(value.split(',').map(Number)) : null;
const sun = vector(params.get('sun')), view = vector(params.get('view'));
const engine = new Engine(document.getElementById('preview') as HTMLCanvasElement, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.05, 9, Vector3.Zero(), scene); camera.fov = 1.1;
if (view) { camera.setPosition(view.normalize().scale(4)); camera.fov = 0.5; }
const sky = sun ? loadSky(scene, name, sun.normalize(), () => undefined) : CubeTexture.CreateFromPrefilteredData(`/public/assets/env/${name}.env`, scene);
scene.environmentTexture = sky;
scene.createDefaultSkybox(sky, true, 400, 0.05);
scene.imageProcessingConfiguration.toneMappingEnabled = true;
const probes = view ? [[0, 1]] : [[0, 1], [0.35, 0], [1, 0.05], [0.6, 0.6]];
probes.forEach(([roughness, metallic], i) => {
  const ball = MeshBuilder.CreateSphere(`probe-${i}`, { diameter: 1.6, segments: 48 }, scene); ball.position.x = view ? 0 : (i - 1.5) * 2;
  const m = new PBRMaterial(`probe-${i}`, scene); m.albedoColor = metallic > 0.5 ? new Color3(0.95, 0.95, 0.95) : new Color3(0.6, 0.12, 0.1); m.roughness = roughness; m.metallic = metallic; ball.material = m;
});
Object.assign(window, { previewReady: () => scene.isReady() && (scene.environmentTexture?.isReady() ?? false), skyRotation: () => sky.rotationY });
engine.runRenderLoop(() => scene.render());
