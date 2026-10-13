// The SO-100 hero arm used to paint with links through each other and
// still evaluate ok: its pose sweep is over budget and every parent/child
// pair was on the interference ignore list. The rest-pose contact gate
// runs regardless of budget and ignores that list, so this pins the
// seated meshes (parts/sim-seated/, parts/seat_meshes.py): no shared
// volume above the cap, every mate touching, verdict not 'broken'.
// Own file: one process can build the arm only once (see parts/README.md).

import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100-arm.kcad.ts';

// Hosted here instead of the example-sweep shards (HOSTED_IN_DEDICATED_FILE):
// loading thirteen STL solids and measuring every pair takes longer than the
// shards' 600 s per-example budget, so this file runs the same live
// runValidateCli check under its own cap.
describe('SO-100 arm rest-pose contact', () => {
  it('examples/robot-arm/so100/so100-arm.kcad.ts passes the physics-grounded loop', async () => {
    const result = await runValidateCli({
      file: EXAMPLE_PATH,
      json: true,
      includeInterference: true,
      epsilon: 0.01,
      physical: false,
      includePhysics: false,
    });
    const failures = (result.mechanismFailures ?? []).filter((d) => d.severity === 'error');
    expect(failures.map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(['real', 'unverified']).toContain(result.mechanism);
  }, 1_500_000);
});
