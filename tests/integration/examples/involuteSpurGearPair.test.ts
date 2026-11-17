// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Physics release check for the cookbook spur pair. `validate
// --include-interference` turns the gravity check on. The tooth-distance
// report is a separate geometry measurement and is not this verdict.
import { describe, expect, it } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const EXAMPLE_PATH = 'examples/cookbook-parity/involute-spur-gear-pair.kcad.ts';

describe('involute spur gear pair example', () => {
  it('examples/cookbook-parity/involute-spur-gear-pair.kcad.ts passes the physics-grounded loop', async () => {
    const lines: string[] = [];
    const log = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map((arg) => String(arg)).join(' '));
    };
    let result: Awaited<ReturnType<typeof runValidateCli>>;
    try {
      result = await runValidateCli({
        file: EXAMPLE_PATH,
        json: true,
        includeInterference: true,
        epsilon: 0.01,
        physical: false,
        includePhysics: true,
      });
    } finally {
      console.log = log;
    }

    expect(result.exitCode).toBe(0);
    expect(result.mechanism).toBe('real');
    expect(result.mechanismFailures ?? []).toEqual([]);

    const payload = lines.map((line) => {
      try {
        return JSON.parse(line) as {
          mechanismSummary?: { checked?: string[] };
        };
      } catch {
        return undefined;
      }
    }).find((parsed) => parsed?.mechanismSummary !== undefined);
    const checked = payload?.mechanismSummary?.checked ?? [];
    expect(checked).toContain('4 poses across 2 joints (each joint at its limits)');
    expect(checked).toContain('all mates satisfied');
    expect(checked).toContain('no collisions');
    expect(checked).toContain('holds under gravity');
  }, 55_000);
});
