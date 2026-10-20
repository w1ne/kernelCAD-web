// tests/integration/examples/luxoLampClevis.mjcf.test.ts
//
// Split out of luxoLampClevis.test.ts for CI shard balance (per-file
// vitest sharding). Hosts the P11 Slice 1 MJCF emission test for
// `examples/kinematic/luxo-lamp.kcad.ts` — a different computation
// (runScript + assemblyToMjcf) than the validate-loop assertions, which
// live in luxoLampClevis.validate.test.ts.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P5-luxo-geometric-rebuild.md

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

describe('Luxo lamp — passes the physics-grounded loop', () => {
  it('P11 Slice 1: emitted MJCF contains one <mesh> + one <geom type="mesh"> per part', async () => {
    // The lamp builds 4 parts via `arm.part('base' | 'lower-arm' |
    // 'upper-arm' | 'lamp-head', ...)`. Post-Slice 1, every part
    // contributes one inline `<asset><mesh>` and one
    // `<geom type="mesh">` inside its `<body>` — MuJoCo's drop-test
    // becomes collision-aware. Asserting the counts guards against a
    // regression that silently drops the geom emit for one body.
    await initOcct();
    const absPath = resolve(LUXO_SCRIPT_PATH);
    const code = readFileSync(absPath, 'utf8');
    const run = await runScript({
      code,
      fileName: LUXO_SCRIPT_PATH,
      scriptDir: dirname(absPath),
    });
    const arms = Array.from(run.session.assemblies.values()) as readonly Assembly[];
    expect(arms.length).toBeGreaterThan(0);
    const lamp = arms[0];
    const { mjcf } = await assemblyToMjcf(lamp);
    const meshAssetCount = (mjcf.match(/<mesh name="part-/g) ?? []).length;
    const geomMeshCount = (mjcf.match(/<geom type="mesh"/g) ?? []).length;
    expect(meshAssetCount).toBe(4);
    expect(geomMeshCount).toBe(4);
    expect(mjcf).toMatch(/<size nconmax="500"\/>/);
    // P11 Slice 1: every mate emits one `<contact><exclude>`. The
    // lamp has 3 revolute mates (shoulder, elbow, wrist) — without the
    // excludes, the clevis fork-tongue mesh overlap at every joint
    // would generate spurious contact forces strong enough to fling
    // the chain apart in the drop-test integrator. (Tendon emission is
    // separate from the mate count; tendons emit `<spatial>`, not
    // `<exclude>`.)
    expect(mjcf).toMatch(/<contact>/);
    const excludeCount = (mjcf.match(/<exclude /g) ?? []).length;
    expect(excludeCount).toBe(3);
  }, 240_000);
});
