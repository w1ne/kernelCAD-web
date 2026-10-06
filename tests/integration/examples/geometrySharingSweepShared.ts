// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Guard against a wrong geometry hash merging different parts: every example
// assembly in which two parts share a geometry key is built with sharing OFF
// and ON, and every part must have the same volume, area and world bbox
// (1e-6 relative). Examples with no repeated key are skipped (visibly) before
// any lowering. The sweep asserts that at least one example really exercises
// sharing, so it can never pass vacuously. Errors are never swallowed.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { discoverAllExamples, REPO_ROOT } from '../physics-loop/exampleSweepShared';
import { runScript } from '../../../src/composition/runScript';
import { buildModel } from '../../../src/composition/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';
import { computeGeometryKeys, setGeometrySharingForTests } from '../../../src/modeling/compute/geometryIdentity';
import { planSharedLowering } from '../../../src/modeling/compute/sharedLowering';
import { OcctLowerer } from '../../../src/modeling/backends/occt/occtLowerer';
import { meshFeaturesPerFeature, type FeatureMesh } from '../../../src/modeling/capture/featureMeshing';

interface PartFacts { volume: number; area: number; min: number[]; max: number[] }

export const SHARD_COUNT = 6;

export const assemblyExamples = discoverAllExamples().filter((p) => readFileSync(join(REPO_ROOT, p), 'utf8').includes('assembly('));
const exercised: string[] = [];
// Examples whose parts the planner really aliases. A shard fails if one of its own
// members stops exercising sharing, so detection cannot silently regress.
export const KNOWN_SHARING: readonly string[] = [
  'examples/bom/panel-with-fasteners.kcad.ts',
  'examples/cookbook-parity/countersunk-flat-head-screw.kcad.ts',
  'examples/cookbook-parity/engineering-material-presets-mass.kcad.ts',
  'examples/exploded/enclosure.kcad.ts',
  'examples/kinematic/load-capacity-smoke.kcad.ts',
  'examples/kinematic/static-hold-smoke.kcad.ts',
  'examples/robot-arm/desktop-3axis-mates.kcad.ts',
  'examples/robot-arm/skill-built-supported-arm-01-colliding.kcad.ts',
  'examples/robot-arm/skill-built-supported-arm.kcad.ts',
  'examples/plant/rack-row.kcad.ts',
  'examples/plant/roller-conveyor.kcad.ts',
];
// Examples that cannot be captured at all in the test environment, for reasons
// unrelated to sharing. Only these may fail to capture; every other error is
// rethrown. Each entry is reported as a visible skip.
const UNBUILDABLE: ReadonlyMap<string, string> = new Map([
  ['examples/community/esp32-ereader.kcad.ts', 'needs the remote parts catalog (no partsBaseUrl)'],
  ['examples/community/open-source-ring.kcad.ts', 'needs the remote parts catalog (no partsBaseUrl)'],
  ['examples/community/thermal-iolink-machine-health.kcad.ts', 'needs the remote parts catalog (no partsBaseUrl)'],
  ['examples/gallery/scissor-lift.kcad.ts', 'pre-existing: illegal part-name with spaces'],
  ['examples/kinematic/end-to-end-smoke.kcad.ts', 'diagnostic smoke: throws unknown joint by design'],
  ['examples/kinematic/swept-collision-smoke.kcad.ts', 'diagnostic smoke: throws unknown joint by design'],
  ['examples/portfolio/pocket-watch/build.kcad.ts', 'pre-existing: uses the deleted arm.fixed API'],
  ['examples/portfolio/watch-from-screenshot-agent-loop-v2.kcad.ts', 'pre-existing: uses the deleted arm.fixed API'],
]);
const skipped: string[] = [];
// Plant-scale examples (~1,000 parts) are swept at a reduced repeat count:
// the sharing-OFF build lowers every part on its own, which at full scale
// costs minutes per example (each perforated door is ~6 s of booleans).
// Every unique shape and every placement (`at` and `rotate`) is still
// built, so sharing is checked for all of them; only the copy count drops.
// The rack row keeps one ladder section (with its two brackets) at two racks.
const SCALED_DOWN: ReadonlyMap<string, ReadonlyArray<readonly [string, string]>> = new Map([
  ['examples/plant/rack-row.kcad.ts', [
    ['const RACKS = 40;', 'const RACKS = 2;'],
    ['const SECTIONS = Math.floor(RACKS / 5);', 'const SECTIONS = 1;'],
  ]],
  ['examples/plant/roller-conveyor.kcad.ts', [['const SEGMENTS = 20;', 'const SEGMENTS = 2;']]],
]);

function exampleSource(path: string): string {
  let code = readFileSync(join(REPO_ROOT, path), 'utf8');
  for (const [from, to] of SCALED_DOWN.get(path) ?? []) {
    if (!code.includes(from)) throw new Error(`${path}: scale-down anchor '${from}' not found`);
    code = code.replace(from, to);
  }
  return code;
}

/** True when the planner would really alias at least one part's lowering. */
async function plansRealSharing(path: string): Promise<boolean> {
  const abs = join(REPO_ROOT, path);
  const run = await runScript({ code: exampleSource(path), fileName: abs, scriptDir: dirname(abs) });
  return planSharedLowering(run.records, computeGeometryKeys(run.records, run.paramTable)).size > 0;
}

interface MeshFacts { triangles: number; vertices: number; min: number[]; max: number[] }
interface BuildFacts { parts: Map<string, PartFacts>; meshes: Map<string, MeshFacts>; partLowerings: number }

function worldBounds(mesh: FeatureMesh): MeshFacts {
  const m = mesh.transform ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  let vertices = 0;
  for (const f of mesh.faces) {
    triangles += f.indices.length / 3;
    vertices += f.vertices.length / 3;
    for (let i = 0; i < f.vertices.length; i += 3) {
      const [x, y, z] = [f.vertices[i], f.vertices[i + 1], f.vertices[i + 2]];
      for (let k = 0; k < 3; k++) {
        const w = m[k] * x + m[4 + k] * y + m[8 + k] * z + m[12 + k];
        min[k] = Math.min(min[k], w);
        max[k] = Math.max(max[k], w);
      }
    }
  }
  return { triangles, vertices, min, max };
}

async function buildFacts(path: string, sharing: boolean): Promise<BuildFacts> {
  setGeometrySharingForTests(sharing);
  const abs = join(REPO_ROOT, path);
  const lower = vi.spyOn(OcctLowerer.prototype, 'lower');
  const model = await buildModel({ code: exampleSource(path), fileName: abs, scriptDir: dirname(abs) });
  const partLowerings = lower.mock.calls.filter((c) => (c[0] as { kind: string }).kind === 'assemblyPart').length;
  lower.mockRestore();
  // Mesh before measuring: an exact bbox / mass query can leave a finer
  // triangulation on the B-rep, which a later mesh pass reuses — measuring
  // first would make the mesh depend on which part was queried, not on sharing.
  const meshed = await meshFeaturesPerFeature(model.records, model.session.paramTable, model.session);
  const meshes = new Map<string, MeshFacts>();
  for (const f of meshed.features) {
    if (f.assemblyPartName !== undefined) meshes.set(f.featureId, worldBounds(f));
  }
  const parts = new Map<string, PartFacts>();
  for (const r of model.records) {
    const s = model.shapes.get(r.id);
    if (!isSceneBackend(s)) continue;
    for (const p of sceneToWorldFrameParts(s)) {
      const bb = p.shape.boundingBox({ exact: true });
      parts.set(`${r.id}/${p.name}`, { volume: p.shape.volume(), area: p.shape.surfaceArea(), min: [...bb.min], max: [...bb.max] });
    }
  }
  return { parts, meshes, partLowerings };
}

function expectSameParts(path: string, off: Map<string, PartFacts>, on: Map<string, PartFacts>): void {
  expect([...on.keys()].sort()).toEqual([...off.keys()].sort());
  for (const [name, a] of off) {
    const b = on.get(name)!;
    expect(close(a.volume, b.volume), `${path} ${name} volume ${a.volume} vs ${b.volume}`).toBe(true);
    expect(close(a.area, b.area), `${path} ${name} area`).toBe(true);
    for (let i = 0; i < 3; i++) {
      expect(close(a.min[i], b.min[i]), `${path} ${name} min[${i}]`).toBe(true);
      expect(close(a.max[i], b.max[i]), `${path} ${name} max[${i}]`).toBe(true);
    }
  }
}

function expectSameMeshes(path: string, off: Map<string, MeshFacts>, on: Map<string, MeshFacts>): void {
  expect([...on.keys()].sort(), `${path} meshed part features`).toEqual([...off.keys()].sort());
  expect(off.size, `${path} meshed no part features`).toBeGreaterThan(0);
  for (const [id, a] of off) {
    const b = on.get(id)!;
    expect(b.triangles, `${path} ${id} triangles`).toBe(a.triangles);
    expect(b.vertices, `${path} ${id} vertices`).toBe(a.vertices);
    for (let i = 0; i < 3; i++) {
      // Float32 vertices: compare the world bbox at 1e-4 relative.
      expect(Math.abs(a.min[i] - b.min[i]) <= 1e-4 * Math.max(1, Math.abs(a.min[i])), `${path} ${id} mesh min[${i}]`).toBe(true);
      expect(Math.abs(a.max[i] - b.max[i]) <= 1e-4 * Math.max(1, Math.abs(a.max[i])), `${path} ${id} mesh max[${i}]`).toBe(true);
    }
  }
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
}

// Slow examples pinned to their own shard (0-based) so they never stack:
// so100 capture alone takes ~90 s; the scaled-down rack row ~55 s.
const PINNED: ReadonlyMap<string, number> = new Map([
  ['examples/robot-arm/so100/so100-arm.kcad.ts', SHARD_COUNT - 1],
  ['examples/plant/rack-row.kcad.ts', 1],
]);

export function registerSharingSweepShard(shard: number): void {
  const mine = assemblyExamples.filter((p, i) => (PINNED.get(p) ?? i % SHARD_COUNT) === shard);
  describe(`geometry sharing never changes a part (example sweep, shard ${shard + 1}/${SHARD_COUNT})`, () => {
    beforeAll(async () => { await initOcct(); });
    afterAll(() => { setGeometrySharingForTests(true); });

    it('has examples to sweep', () => {
      expect(assemblyExamples.length).toBeGreaterThanOrEqual(SHARD_COUNT);
      expect(mine.length).toBeGreaterThan(0);
    });

    it.each(mine)('%s', async (path) => {
      const unbuildable = UNBUILDABLE.get(path);
      let plans: boolean;
      try {
        plans = await plansRealSharing(path);
      } catch (e) {
        if (unbuildable === undefined) throw e;
        skipped.push(path);
        console.info(`[sharing sweep] SKIP ${path}: ${unbuildable}`);
        return;
      }
      if (!plans) {
        skipped.push(path);
        console.info(`[sharing sweep] SKIP ${path}: planner aliases nothing, sharing not exercised`);
        return;
      }
      const off = await buildFacts(path, false);
      const on = await buildFacts(path, true);
      // Real sharing happened: the engine lowered fewer parts with sharing on.
      expect(on.partLowerings, `${path} sharing ON must alias lowerings`).toBeLessThan(off.partLowerings);
      exercised.push(path);
      expectSameParts(path, off.parts, on.parts);
      expectSameMeshes(path, off.meshes, on.meshes);
    }, 600_000);

    it('every known-sharing example in this shard exercised sharing', () => {
      const expected = KNOWN_SHARING.filter((p) => mine.includes(p));
      console.info(`[sharing sweep] shard ${shard + 1} exercised ${exercised.length}, skipped ${skipped.length}`);
      for (const p of expected) expect(exercised, `${p} no longer shares geometry`).toContain(p);
    });
  });
}
