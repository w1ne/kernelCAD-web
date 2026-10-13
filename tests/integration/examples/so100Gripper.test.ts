// examples/robot-arm/so100/so100.kcad.ts is the SO-ARM100 gripper: the
// vendor fixed jaw, its STS3215 and the moving jaw on the servo output.
// The mechanism gate must certify it 'real' with the rest-pose contact
// check on: no two solids share volume, and every mated pair touches.

import { describe, expect, it } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const EXAMPLE_PATH = 'examples/robot-arm/so100/so100.kcad.ts';

describe('SO-100 gripper seats honestly', () => {
  it('evaluates ok with a real mechanism and no rest-pose contact failure', async () => {
    const result = await evaluateScriptTool({ file: EXAMPLE_PATH });
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).not.toContain('mechanism.rest-interpenetration');
    expect(codes).not.toContain('mechanism.mate-gap');
    expect(codes).not.toContain('mechanism.joint-mesh-gap');
    expect(result.parts?.names.sort()).toEqual(['hand', 'hand-servo', 'jaw']);
    expect(result.ok).toBe(true);
    expect((result as { mechanism?: string }).mechanism).toBe('real');
  }, 600_000);
});
