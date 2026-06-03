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

  it('P11 Slice 2: criterion 8 flags the straight springs piercing the arms (RED by design until Slice 3 wrap re-author)', async () => {
    // P9 made the lamp pass the kinematic loop (criteria 1-4 + 7) with
    // `mechanism: real`. P11 Slice 2 adds criterion 8
    // (mechanism.tendon-body-intersect): the three balance springs are
    // still authored as straight `<spatial>` lines, so each cable cuts
    // through the arm body it spans — exactly the "spring goes through
    // the structure" bug. The gate is therefore RED here BY DESIGN; Slice
    // 3 re-authors the springs with wrap geoms and restores `real`. The
    // assertion below pins the intermediate state AND proves the only new
    // breakage is criterion 8 — the kinematic criteria (1-4, 7) remain
    // clean, so the soundness P9 established is intact.
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });
    expect(r.mechanism).toBe('broken');
    const failures = r.mechanismFailures ?? [];
    const tendonHits = failures.filter((f) => f.code === 'mechanism.tendon-body-intersect');
    // At least one spring pierces an arm.
    expect(tendonHits.length).toBeGreaterThan(0);
    // EVERY failure is criterion 8 — no kinematic criterion regressed.
    expect(failures.every((f) => f.code === 'mechanism.tendon-body-intersect')).toBe(true);
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
    // NOTE: the overall verdict is `broken` in Slice 2 because criterion 8
    // (tendon-body-intersect) flags the straight springs — see the
    // dedicated test above. This test's contract is ONLY that criterion 7
    // (joint-mesh-gap) stays clean, which it does. Slice 3's wrap
    // re-author restores `mechanism: real`.
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

  it('still passes the physics gate (criteria 5+6) — only criterion 8 breaks the overall verdict in Slice 2', async () => {
    // P10 (2026-06-03): the lamp's three balance springs are closed-loop
    // `arm.tendon(...)` calls; MuJoCo's <spatial> tendon holds the lamp at
    // qpos=0 against gravity, so the drop-test (criterion 6) and static
    // equilibrium (criterion 5) stay clean.
    //
    // P11 Slice 2: criterion 8 now also runs and is RED (straight springs
    // pierce the arms), so the OVERALL verdict is `broken`. But the
    // PHYSICS criteria themselves are unaffected — this test pins that no
    // `drops-on-release` / `unstable-under-gravity` diagnostic fires, i.e.
    // P10's #361 closure still holds. Slice 3's wrap re-author clears
    // criterion 8 and the overall verdict returns to `real`.
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: true,
    });
    const failures = r.mechanismFailures ?? [];
    const physicsHits = failures.filter(
      (f) => f.code === 'mechanism.drops-on-release' || f.code === 'mechanism.unstable-under-gravity',
    );
    expect(physicsHits).toEqual([]);
    // The only thing keeping the lamp from `real` is criterion 8.
    expect(failures.every((f) => f.code === 'mechanism.tendon-body-intersect')).toBe(true);
  }, 240_000);
});
