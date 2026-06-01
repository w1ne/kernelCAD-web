// tests/integration/examples/luxoLampClevis.test.ts
//
// P4 integration smoke: the rebuilt `examples/kinematic/luxo-lamp.kcad.ts`
// passes the physics-grounded loop with `mechanism: 'real'` AND
// `assembly.solvedModel(...)` validates clean (no interference). Closed
// by P4 (#356) — the springs are fastened to BASE via topology connectors
// (`@kc[<owner>/face/<labelName>]`) so the strengthened P0.1 multi-point
// rigidity check resolves drift = 0 (`T_A = identity`, no rotation).
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md
// Plan:  docs/plans/2026-06-01-physics-loop-P4-luxo-topology-rebuild.md

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const LUXO_SCRIPT_PATH = 'examples/kinematic/luxo-lamp.kcad.ts';

describe('Luxo lamp P4 — passes the physics-grounded loop', () => {
  it('script source carries NO ignore[] entries (joint-pair contacts removed by joint.clevis)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    expect(source).not.toMatch(/\bignore\s*:/);
  });

  it('declares joint.clevis at every revolute joint (3 calls, 3 mates)', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    const clevisCalls = source.match(/=\s*joint\.clevis\s*\(/g) ?? [];
    expect(clevisCalls.length).toBe(3);
    const revoluteMates = source.match(/['"]revolute['"]/g) ?? [];
    expect(revoluteMates.length).toBeGreaterThanOrEqual(3);
  });

  it('script source uses topology connectors (@kc[...] refs) for every spring mount, never vec3', () => {
    const source = readFileSync(LUXO_SCRIPT_PATH, 'utf8');
    // Every spring-mount connector origin must be a @kc[...] ref. The
    // older vec3 path (`{ kind: 'vec3', value: [...] }`) was the leaky
    // surface the P0.1 strengthened rigidity gate refused to certify;
    // P4 forbids it for spring mounts.
    const springConnectorRefs = source.match(/@kc\[[a-z-]+-spring\/face\/armMount\]/g) ?? [];
    expect(springConnectorRefs.length).toBeGreaterThanOrEqual(3);
    // And no `arm.fixed(...)` calls (the v0.5 legacy API that doesn't
    // accept topology origins).
    expect(source).not.toMatch(/\barm\.fixed\(/);
  });

  it('passes the physics-grounded loop: mechanism: real with empty failures, CLI exit 0 — #356 closed by P4', async () => {
    const r = await runValidateCli({
      file: LUXO_SCRIPT_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
    });
    expect(r.mechanism).toBe('real');
    expect(r.mechanismFailures ?? []).toEqual([]);
    expect(r.exitCode).toBe(0);
  }, 600_000);
});
