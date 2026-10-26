import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { loadProps, propMaterial, type PropLibrary } from '../props';
import { Geometry } from './mesh';
import { random } from './noise';
import type { FormationSpec, Formation, LooseRock, RockPalette } from './rocks';
import type { Plant, PlantKind, PlantPalette } from './plants';

/** The generators live in a lazily loaded chunk; a venue's detail module re-exports them. */
export interface LandscapeGenerators {
  buildFormation(spec: FormationSpec, palette: RockPalette, library: PropLibrary | null): Formation;
  looseRocks(rocks: readonly LooseRock[], palette: RockPalette, library: PropLibrary | null): Geometry;
  plantGeometry(plants: readonly Plant[], palette: PlantPalette): Geometry;
}
export interface LandscapeWork {
  generators: LandscapeGenerators;
  /** Painting in frame-sized steps (the venue assigns its finished maps itself). */
  paint?: Generator<void, void>;
  formations: readonly FormationSpec[]; rock: RockPalette;
  loose: readonly LooseRock[]; plants: readonly Plant[]; plantPalette: PlantPalette;
  /** Small plants for flat rock tops (kinds to choose from); none when absent. */
  topPlants?: readonly PlantKind[];
}

/**
 * Runs a venue's landscape after the first frame, one step per frame: painting, each formation,
 * loose rocks, then one rock mesh and one plant mesh (two shared materials, so two draw calls).
 * The scene stays "not ready" (pending data) until they are in. Returns the meshes for shadows.
 */
export function runLandscape(scene: Scene, materials: Map<string, StandardMaterial>, options: { name: string; props: string | null; timings?: Record<string, number>; load: (library: PropLibrary | null) => Promise<LandscapeWork> }) {
  const { name, props, load } = options;
  const plantMaterial = propMaterial(scene, 'landscape-plants'); plantMaterial.backFaceCulling = false; plantMaterial.twoSidedLighting = true; plantMaterial.specularColor.setAll(0.03);
  const rockMaterial = propMaterial(scene, 'landscape-rock'); rockMaterial.specularColor.setAll(0.05);
  materials.set('landscape-plants', plantMaterial); materials.set('landscape-rock', rockMaterial);
  // Main-thread time per step (ms), for development checks.
  const timings = options.timings ?? {}, timed = <T>(step: string, work: () => T) => { const t = performance.now(), result = work(); timings[step] = (timings[step] ?? 0) + Math.round(performance.now() - t); return result; };
  let resolve: (meshes: AbstractMesh[]) => void = () => {};
  const shadowCasters = new Promise<AbstractMesh[]>(r => { resolve = r; });
  const pending = { landscape: name }; scene.addPendingData(pending);
  const yieldFrame = () => new Promise<void>(r => setTimeout(r, 0));
  const build = async (library: PropLibrary | null) => {
    const work = await load(library);
    if (scene.isDisposed) return resolve([]);
    if (work.paint) for (let step = timed('paint', () => work.paint!.next()); !step.done; step = timed('paint', () => work.paint!.next())) { await yieldFrame(); if (scene.isDisposed) return resolve([]); }
    const rock = new Geometry(), tops: Plant[] = [], rand = random(515);
    for (const spec of work.formations) {
      await yieldFrame(); if (scene.isDisposed) return resolve([]);
      const formation = timed('formations', () => work.generators.buildFormation(spec, work.rock, library)); rock.append(formation.geometry);
      if (work.topPlants?.length) for (const p of formation.ledges) if (rand() < 0.6) {
        const kind = work.topPlants[Math.floor(rand() * work.topPlants.length)];
        tops.push({ kind, ...p, size: 0.5 + rand() * 0.7, heading: rand() * 6.28, seed: 50000 + tops.length * 7, dryness: 0.3 + rand() * 0.4 });
      }
    }
    await yieldFrame(); if (scene.isDisposed) return resolve([]);
    timed('loose', () => rock.append(work.generators.looseRocks(work.loose, work.rock, library)));
    const meshes: Mesh[] = [];
    timed('meshes', () => {
      const plants = work.generators.plantGeometry([...work.plants, ...tops], work.plantPalette);
      for (const [geometry, material, suffix] of [[rock, rockMaterial, 'rock'], [plants, plantMaterial, 'plants']] as const) {
        if (!geometry.vertexCount) continue;
        const mesh = new Mesh(`${name}-${suffix}`, scene); geometry.toVertexData().applyToMesh(mesh);
        mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = true; mesh.freezeWorldMatrix(); meshes.push(mesh);
      }
    });
    if (import.meta.env.DEV) Object.assign(window, { __landscapeTimings: { ...((window as unknown as { __landscapeTimings?: object }).__landscapeTimings ?? {}), [name]: { ...timings, triangles: meshes.map(m => m.getTotalIndices() / 3) } } });
    scene.removePendingData(pending); resolve(meshes);
  };
  void (props ? loadProps(props).then(build, () => build(null)) : build(null));
  return { shadowCasters };
}

/** Times synchronous steps (ms) into a record later shown by development tools. */
export function stopwatch() {
  const timings: Record<string, number> = {};
  return { timings, timed: <T>(step: string, work: () => T) => { const t = performance.now(), result = work(); timings[step] = (timings[step] ?? 0) + Math.round(performance.now() - t); return result; } };
}
