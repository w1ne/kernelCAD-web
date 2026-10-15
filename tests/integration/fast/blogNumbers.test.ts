// SPDX-License-Identifier: MIT
// Compare quoted blog dimensions with the real kernel's evaluation output.
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { evaluateWithEnvelope, evaluateJsonOutput } from '../../../src/agent/cli/commands/evaluate';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const REPO_ROOT = resolve(__dirname, '../../..');

describe('blog numbers match kernel output', () => {
  it('dimensions-measure-drawings declared dimensions match evaluation', async () => {
    const result = await evaluateWithEnvelope({ file: resolve(REPO_ROOT, 'examples/gallery/mounting-bracket-dimensioned.kcad.ts') });
    expect(result.exitCode, JSON.stringify(result.diagnostics)).toBe(0);
    const json = evaluateJsonOutput(result) as { dimensions?: Array<{ text: string }> };
    const actual = new Set((json.dimensions ?? []).map((d) => d.text));
    for (const quoted of ['hole spacing X 40', 'hole spacing Y 18', 'thickness 6', 'bolt hole Ø5']) expect(actual).toContain(quoted);
  }, 4_500);

  it('plywood-organizer quoted volume and bounds match evaluation', async () => {
    const result = await evaluateScriptTool({ file: 'examples/plywood-organizer/organizer.kcad.ts' });
    expect(result.ok).toBe(true);
    expect(result.sceneSummary.valid).toBe(true);
    expect(result.sceneSummary.volume).toBe(256_800);
    result.sceneSummary.size?.forEach((value, axis) => expect(value).toBeCloseTo([150, 100, 46][axis], 6));
  }, 4_500);
});
