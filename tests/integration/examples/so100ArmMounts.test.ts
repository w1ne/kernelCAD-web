// examples/robot-arm/so100/so100-arm.kcad.ts is the landing hero.
// Default `kernelcad validate` only checks the mate graph. The example
// sweep is over the solid-check budget, so it never opens this file's
// geometry. This test runs the physical solid check: every mate connector
// must sit on the part it belongs to. Where the parts themselves sit is
// checked against the URDF in so100ArmUrdf.test.ts; the two live in
// separate files because one process cannot hold the arm's meshes twice.

import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { PER_EXAMPLE_TIMEOUT_MS } from '../physics-loop/exampleSweepShared';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100-arm.kcad.ts';

describe('SO-100 arm mate connectors sit on their parts', () => {
  it('reports no mate connector off its solid', async () => {
    const result = await runValidateCli({
      file: EXAMPLE_PATH,
      json: true,
      includeInterference: false,
      epsilon: 0.01,
      physical: true,
      includePhysics: false,
    });
    const offSolid = (result.physicalDiagnostics ?? [])
      .filter((diagnostic) => diagnostic.code === 'assembly.mechanical.connector-not-in-solid')
      .map((diagnostic) => diagnostic.connectorRef)
      .sort();
    expect(offSolid).toEqual([]);
  }, PER_EXAMPLE_TIMEOUT_MS);
});
