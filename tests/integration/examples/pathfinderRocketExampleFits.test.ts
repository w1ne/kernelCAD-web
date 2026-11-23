// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/flight/pathfinder-rocket.kcad.ts is the flight-study example, so
// it must pass evaluate_script with `ok: true`. It failed with one
// `mechanism.interpenetration` error: the 30 mm square avionics bay has a
// 21.2 mm half-diagonal and the body tube bore radius is 20.3 mm, so the
// four corners cut 192 mm³ out of the tube wall. The bay is now 28 mm square.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const EXAMPLE = 'examples/flight/pathfinder-rocket.kcad.ts';

describe('pathfinder-rocket example passes evaluate_script', () => {
  it('is ok with no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', { file: EXAMPLE, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).not.toBe('broken');
  }, 180_000);
});
