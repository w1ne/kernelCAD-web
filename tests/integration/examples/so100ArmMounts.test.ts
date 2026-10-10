// examples/robot-arm/so100/so100-arm.kcad.ts is the landing hero.
// Default `kernelcad validate` only checks the mate graph. The example
// sweep is over the solid-check budget, so it never opens this file's
// geometry. A servo mount at the link origin used to pass both while it
// sat off the servo body. This test runs the physical solid check.

import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { PER_EXAMPLE_TIMEOUT_MS } from '../physics-loop/exampleSweepShared';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100-arm.kcad.ts';

describe('SO-100 arm servo mounts sit on the servo body', () => {
  it('reports no servo mount off its solid', async () => {
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
    // The two remaining points are the shoulder and wrist joint frames.
    // Each one sits in its servo, past the printed shell. Moving the frame
    // would shift the arm. The elbow and wrist bosses are separate parts
    // on those axes; their own connectors sit inside the boss solid.
    expect(offSolid).toEqual(['lower-arm.wrist', 'shoulder.lift']);
  }, PER_EXAMPLE_TIMEOUT_MS);
});
