import { describe, expect, it } from 'vitest';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

const FILE = 'examples/gallery/hand-coffee-grinder.kcad.ts';

describe('hand coffee grinder gallery example', () => {
  it('evaluates the dual-bearing grinder assembly cleanly', async () => {
    const result = await evaluateScript({ file: FILE });

    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toEqual([]);
    expect(result.featureCount).toBeGreaterThanOrEqual(150);
  }, 600_000);
});
