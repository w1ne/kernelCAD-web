// SPDX-License-Identifier: MIT
// Compare dimensions and quoted measurements in inexpensive blog posts with
// the actual JSON produced by the kernel's evaluation entry point.
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { evaluateWithEnvelope, evaluateJsonOutput } from '../../../src/agent/cli/commands/evaluate';

const REPO_ROOT = resolve(__dirname, '../../..');
const cases = [
  {
    post: 'dimensions-measure-drawings',
    file: 'examples/gallery/mounting-bracket-dimensioned.kcad.ts',
    checks: [
      { path: 'dimensions', value: (json: Record<string, unknown>) => json.dimensions },
    ],
    expected: (json: Record<string, unknown>) => {
      const dimensions = json.dimensions as Array<{ text: string }>;
      return dimensions.some((d) => d.text === 'hole spacing X 40')
        && dimensions.some((d) => d.text === 'hole spacing Y 18')
        && dimensions.some((d) => d.text === 'thickness 6')
        && dimensions.some((d) => d.text === 'bolt hole Ø5');
    },
  },
  {
    post: 'tubes-how-to',
    file: 'examples/tube-routing-engine/engine-lines.kcad.ts',
    checks: [
      { path: 'tubes.lines.length', value: (json: Record<string, unknown>) => (json.tubes as { lines: unknown[] }).lines.length },
      { path: 'tubes.systems.length', value: (json: Record<string, unknown>) => (json.tubes as { systems: unknown[] }).systems.length },
    ],
    expected: (json: Record<string, unknown>) => {
      const tubes = json.tubes as { lines: Array<{ name: string; bends?: number; cutLength?: number }>; systems: Array<{ system: string; lines: number; cutLength: number }> };
      const fuelA = tubes.lines.find((line) => line.name === 'fuel-a');
      const hydraulic = tubes.systems.find((system) => system.system === 'hydraulic');
      return tubes.lines.length === 5
        && tubes.systems.length === 3
        && fuelA?.bends === 2
        && Math.round((fuelA?.cutLength ?? 0) * 100) / 100 === 309.29
        && hydraulic?.lines === 2
        && Math.round((hydraulic?.cutLength ?? 0) * 100) / 100 === 522.9;
    },
  },
];

describe('blog numbers match kernel output', () => {
  for (const c of cases) it(`${c.post} quoted numbers match actual evaluation`, async () => {
    const result = await evaluateWithEnvelope({ file: resolve(REPO_ROOT, c.file) });
    expect(result.exitCode, JSON.stringify(result.diagnostics)).toBe(0);
    const json = evaluateJsonOutput(result) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(c.expected(json), `${c.post}: unexpected values in ${JSON.stringify(json)}`).toBe(true);
    for (const check of c.checks) expect(check.value(json), `${c.post} ${check.path}`).toBeDefined();
  }, 4_500);
});
