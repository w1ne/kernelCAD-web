// tests/integration/examples/luxoLampClevis.test.ts
//
// Integration test for `examples/kinematic/luxo-lamp.kcad.ts` — the
// canonical Luxo desk lamp built with `joint.clevis(...)` at all three
// revolute joints (shoulder, elbow, wrist) and three `fastened` tension
// springs (one per joint, each parented to the child arm of the joint
// it visually spans).
//
// #356 closed by P5: after P0.2 corrected the rigidity check's FK math,
// the lamp's spring geometry was rebuilt with real Anglepoise-shape
// shafts (no [10,0,0]-exploit alignment) and the head-detachment +
// column-visibility issues were fixed. The lamp now passes the
// physics-grounded loop with `mechanism: 'real'` and empty failures
// at every sampled pose.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P5-luxo-geometric-rebuild.md

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/modeling/runtime/runScript';
import { assemblyToMjcf } from '../../../src/modeling/runtime/mjcfExport';
import type { Assembly } from '../../../src/modeling/capture/assembly';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

describe('Luxo lamp — passes the physics-grounded loop', () => {
  it('script source carries NO ignore[] entries (joint-pair contacts removed by joint.clevis)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The pre-G1 lamp passed `{ ignore: [...] }` to arm.solvedModel(). The
    // G1+P2+P5 rewrites should keep that array empty. We assert no
    // `ignore:` key appears in the script source — the smoking gun that the
    // agent didn't silently re-introduce a workaround.
    expect(source).not.toMatch(/\bignore\s*:/);
  });

  it('declares joint.clevis at every revolute joint (3 calls, 3 mates)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // The lamp's three revolute joints (shoulder, elbow, wrist) are each
    // built via joint.clevis(...). Asserting that the primitive's identity
    // is used at every joint is the structural contract.
    const clevisCalls = source.match(/=\s*joint\.clevis\s*\(/g) ?? [];
    expect(clevisCalls.length).toBe(3);
    // And three revolute mates (one per joint).
    const revoluteMates = source.match(/['"]revolute['"]/g) ?? [];
    expect(revoluteMates.length).toBeGreaterThanOrEqual(3);
  });

  it('passes the kinematic-only mechanism-truth loop: mechanism: real with empty failures (re-enabled by P9 Luxo geometry fix)', async () => {
    // P9 (2026-06-02): with the column extended to COLUMN_TOP_Z, the
    // head-neck pulled back to cover the wrist pivot, and small
    // spring-mounting posts added to each arm, the lamp now passes
    // the full kinematic-only mechanism-truth loop (criteria 1-4 +
    // P8 joint-mesh-continuity criterion 7).
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
  }, 240_000);

  it('P8 joint-mesh-continuity gate sees NO joint-mesh-gap diagnostics on the post-P9 Luxo (GREEN after P9)', async () => {
    // P9 (2026-06-02): with the spring-boss posts on each arm and the
    // extended column / pulled-back head-neck, every mate connector
    // lies inside its body's mesh within 1 mm — no
    // `mechanism.joint-mesh-gap` diagnostics fire.
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });
    const gaps = (r.mechanismFailures ?? []).filter(
      (f) => f.code === 'mechanism.joint-mesh-gap',
    );
    expect(gaps).toEqual([]);
    expect(r.mechanism).toBe('real');
  }, 240_000);

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

  it('passes the physics gate (criteria 5+6) — closed by P10 closed-loop tendon API (closes #361)', async () => {
    // P10 (2026-06-03): the lamp's three balance springs are now
    // closed-loop `arm.tendon(...)` calls. MuJoCo's <spatial> tendon
    // applies the restoring moment that holds the lamp at qpos=0
    // against gravity; the drop-test reports `mechanism: 'real'` with
    // no `mechanism.drops-on-release` diagnostic. Issue #361 closes
    // with this commit.
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: true,
    });
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
  }, 240_000);
});
