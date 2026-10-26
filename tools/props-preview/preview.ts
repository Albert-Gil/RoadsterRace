// Development tool page (not shipped): every baked prop of a venue in a row, lit like the game.
// Open /tools/props-preview/index.html?venue=newport on the dev server (re-run tools/bake-props.mjs first).
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { loadProps, propMaterial, propMesh, propVertexData, type PropPlacement } from '../../src/presentation/props';

const params = new URLSearchParams(location.search), venue = params.get('venue') ?? 'newport', heading = Number(params.get('heading') ?? 0.6);
const engine = new Engine(document.getElementById('preview') as HTMLCanvasElement, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine); scene.clearColor = new Color4(0.42, 0.62, 0.7, 1);
const camera = new ArcRotateCamera('camera', -Math.PI / 2.4, 0.9, 60, Vector3.Zero(), scene); camera.fov = 0.6;
new HemisphericLight('fill', new Vector3(0, 1, 0), scene).intensity = 0.75;
const sun = new DirectionalLight('sun', new Vector3(-0.55, -1, 0.35), scene); sun.intensity = 1.6;
const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400 }, scene); ground.position.y = -0.02;
let ready = false;
void loadProps(venue).then(library => {
  const keys = [...library.keys()], columns = Math.ceil(Math.sqrt(keys.length)), spacing = 6;
  const placements: PropPlacement[] = keys.map((key, i) => ({ key, x: (i % columns - (columns - 1) / 2) * spacing, y: 0, z: (Math.floor(i / columns) - (columns - 1) / 2) * spacing, heading, scale: key.startsWith('house') ? 1.8 : 0.9 }));
  propMesh('props', scene, propVertexData(library, placements), propMaterial(scene));
  camera.radius = columns * spacing * 1.25; ready = true;
});
Object.assign(window, { previewReady: () => ready && scene.isReady() });
engine.runRenderLoop(() => scene.render());
