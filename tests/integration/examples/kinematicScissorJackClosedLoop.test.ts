// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Keep the true closed-loop scissor-jack example green through the full
// evaluate_script mechanism probe, including its sampled lift-angle sweep.
import { readFile } from 'node:fs/promises';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';

const EXAMPLE_URL = new URL(
  '../../../src/agent/skills/kernelcad-kinematic/cookbook/04-scissor-jack-swept.kcad.ts',
  import.meta.url,
);

beforeAll(async () => {
  await initOcct();
}, 60_000);

beforeEach(() => {
  clearActiveMcpSession();
});

describe('kinematic scissor-jack cookbook — mechanism=real', () => {
  it('closes at rest, has realized connector frames, and sweeps cleanly', async () => {
    const code = await readFile(EXAMPLE_URL, 'utf8');
    const result = await evaluateScriptTool({ code });
    const messages = result.diagnostics.map((d) => `${d.code}: ${d.message}`);

    expect(result.mechanism, messages.join('\n')).toBe('real');
    expect(result.ok, messages.join('\n')).toBe(true);
    expect(result.diagnostics.filter((d) => [
      'assembly.solver.did-not-converge',
      'assembly.mechanical.connector-not-in-solid',
      'mechanism.dof-mismatch',
      'mechanism.interpenetration',
      'mechanism.joint-mesh-gap',
      'mechanism.mate-gap',
      'mechanism.mate-unsatisfied',
    ].includes(d.code))).toEqual([]);
  }, 60_000);
});
