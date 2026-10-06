// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Guard against a wrong geometry hash merging different parts: every example
// assembly in which two parts share a geometry key is built with sharing OFF
// and ON, and every part must have the same volume, area and world bbox
// (1e-6 relative). Examples with no repeated key are skipped (visibly) before
// any lowering. The sweep asserts that at least one example really exercises
// sharing, so it can never pass vacuously. Errors are never swallowed.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { discoverAllExamples, REPO_ROOT } from '../physics-loop/exampleSweepShared';
import { runScript } from '../../../src/composition/runScript';
import { buildModel } from '../../../src/composition/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../../src/kernel/backends/sceneBackend';
import { sceneToWorldFrameParts } from '../../../src/kernel/backends/occt/sceneToWorldFrame';
import { computeGeometryKeys, setGeometrySharingForTests } from '../../../src/modeling/compute/geometryIdentity';

interface PartFacts { volume: number; area: number; min: number[]; max: number[] }

export const SHARD_COUNT = 6;

export const assemblyExamples = discoverAllExamples().filter((p) => readFileSync(join(REPO_ROOT, p), 'utf8').includes('assembly('));
const exercised: string[] = [];
// Examples known to repeat a geometry key. A shard fails if one of its own
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

async function hasRepeatedPartKey(path: string): Promise<boolean> {
  const abs = join(REPO_ROOT, path);
  const run = await runScript({ code: readFileSync(abs, 'utf8'), fileName: abs, scriptDir: dirname(abs) });
  const keys = computeGeometryKeys(run.records, run.paramTable);
  const seen = new Set<string>();
  for (const r of run.records) {
    if (r.kind !== 'assemblyPart') continue;
    const k = keys.get(r.id);
    if (k === undefined) continue;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

async function partFacts(path: string, sharing: boolean): Promise<Map<string, PartFacts>> {
  setGeometrySharingForTests(sharing);
  const abs = join(REPO_ROOT, path);
  const model = await buildModel({ code: readFileSync(abs, 'utf8'), fileName: abs, scriptDir: dirname(abs) });
  const out = new Map<string, PartFacts>();
  for (const r of model.records) {
    const s = model.shapes.get(r.id);
    if (!isSceneBackend(s)) continue;
    for (const p of sceneToWorldFrameParts(s)) {
      const bb = p.shape.boundingBox({ exact: true });
      out.set(`${r.id}/${p.name}`, { volume: p.shape.volume(), area: p.shape.surfaceArea(), min: [...bb.min], max: [...bb.max] });
    }
  }
  return out;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
}

// Capture alone takes ~90 s: pinned to the lightest shard so it does not stack on a busy one.
const HEAVY: ReadonlySet<string> = new Set(['examples/robot-arm/so100/so100-arm.kcad.ts']);

export function registerSharingSweepShard(shard: number): void {
  const mine = assemblyExamples.filter((p, i) => (HEAVY.has(p) ? SHARD_COUNT - 1 : i % SHARD_COUNT) === shard);
  describe(`geometry sharing never changes a part (example sweep, shard ${shard + 1}/${SHARD_COUNT})`, () => {
    beforeAll(async () => { await initOcct(); });
    afterAll(() => { setGeometrySharingForTests(true); });

    it('has examples to sweep', () => {
      expect(assemblyExamples.length).toBeGreaterThanOrEqual(SHARD_COUNT);
      expect(mine.length).toBeGreaterThan(0);
    });

    it.each(mine)('%s', async (path) => {
      const unbuildable = UNBUILDABLE.get(path);
      let repeated: boolean;
      try {
        repeated = await hasRepeatedPartKey(path);
      } catch (e) {
        if (unbuildable === undefined) throw e;
        skipped.push(path);
        console.info(`[sharing sweep] SKIP ${path}: ${unbuildable}`);
        return;
      }
      if (!repeated) {
        skipped.push(path);
        console.info(`[sharing sweep] SKIP ${path}: no repeated geometry key, sharing not exercised`);
        return;
      }
      exercised.push(path);
      const off = await partFacts(path, false);
      const on = await partFacts(path, true);
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
    }, 600_000);

    it('every known-sharing example in this shard exercised sharing', () => {
      const expected = KNOWN_SHARING.filter((p) => mine.includes(p));
      console.info(`[sharing sweep] shard ${shard + 1} exercised ${exercised.length}, skipped ${skipped.length}`);
      for (const p of expected) expect(exercised, `${p} no longer shares geometry`).toContain(p);
    });
  });
}
