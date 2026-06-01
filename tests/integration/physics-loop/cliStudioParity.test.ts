// Physics-loop CLI / Studio parity sentinel.
//
// Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P1)
// Plan: docs/plans/2026-06-01-physics-loop-P1-surface-convergence.md
//
// PR #341's failure mode was a surface split: the legacy CLI
// `kernelcad validate` returned "clean" while the Studio runtime
// surfaced a broken mechanism. The physics-grounded loop (P0)
// introduced a single source of truth — `mechanism: 'real' | 'broken'`
// on `RecomputeResult` — but P0 only wired the engine field. P1's job
// is to make every consumer surface read it.
//
// This sentinel test asserts that both the CLI validate handler and
// the Studio reviewCad path (which `/__kernelcad/review` exposes)
// report the SAME mechanism verdict and the SAME failure codes for
// the canonical broken fixture. If a future PR re-opens the split
// (e.g. wires the probe into only one surface), this test fails in
// CI before the PR can merge.

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

const VEC3_SPRING_BROKEN_FIXTURE = resolve(
  __dirname,
  '../../fixtures/mechanism/vec3-spring-broken.kcad.ts',
);
const CLEVIS_HINGE_REAL_FIXTURE = resolve(
  __dirname,
  '../../fixtures/mechanism/clevis-hinge-real.kcad.ts',
);

describe('CLI / Studio parity for mechanism truth', () => {
  it(
    'vec3-spring fixture: CLI and Studio both report mechanism: broken with the same failure codes',
    async () => {
      // CLI side: invoke the validate handler in JSON mode so we can
      // parse the structured mechanism field straight off stdout.
      const cliResult = await captureValidateJson({
        file: VEC3_SPRING_BROKEN_FIXTURE,
        includeInterference: true,
      });
      expect(cliResult.mechanism).toBe('broken');
      const cliCodes = sortedCodes(cliResult.mechanismFailures ?? []);
      expect(cliCodes).toContain('mechanism.disconnect');

      // Studio side: reviewCad is the server-side handler /__kernelcad/review
      // calls. Its output now carries the same `mechanism` field — the
      // Validity panel reads it via reviewToValidity().
      const review = await reviewCadTool({
        file: VEC3_SPRING_BROKEN_FIXTURE,
        includeInterference: true,
      });
      const studioMechanism = (review as { mechanism?: string }).mechanism;
      const studioFailures = (review as { mechanismFailures?: Array<{ code: string }> })
        .mechanismFailures ?? [];

      expect(studioMechanism).toBe('broken');
      const studioCodes = sortedCodes(studioFailures);
      expect(studioCodes).toEqual(cliCodes);
    },
    180000,
  );

  it(
    'clevis-hinge fixture: CLI and Studio both report mechanism: real',
    async () => {
      const cliResult = await captureValidateJson({
        file: CLEVIS_HINGE_REAL_FIXTURE,
        includeInterference: true,
      });
      expect(cliResult.mechanism).toBe('real');
      expect(cliResult.mechanismFailures ?? []).toEqual([]);

      const review = await reviewCadTool({
        file: CLEVIS_HINGE_REAL_FIXTURE,
        includeInterference: true,
      });
      const studioMechanism = (review as { mechanism?: string }).mechanism;
      const studioFailures = (review as { mechanismFailures?: Array<{ code: string }> })
        .mechanismFailures ?? [];

      expect(studioMechanism).toBe('real');
      expect(studioFailures).toEqual([]);
    },
    180000,
  );
});

interface CapturedCliResult {
  mechanism?: string;
  mechanismFailures?: Array<{ code: string }>;
}

async function captureValidateJson(input: {
  file: string;
  includeInterference: boolean;
}): Promise<CapturedCliResult> {
  // runValidateCli writes its JSON output to console.log. We intercept
  // it so the test can read the structured mechanism field without
  // shelling out.
  const captured: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };
  try {
    await runValidateCli({
      file: input.file,
      json: true,
      includeInterference: input.includeInterference,
      epsilon: 0.01,
      physical: false,
    });
  } finally {
    console.log = originalLog;
  }
  const stdout = captured.join('\n');
  // The JSON object should be the entire stdout (in --json mode there
  // are no other writes).
  const parsed = JSON.parse(stdout) as CapturedCliResult & {
    mechanism?: string;
    mechanismFailures?: Array<{ code: string }>;
  };
  return parsed;
}

function sortedCodes(failures: ReadonlyArray<{ code: string }>): string[] {
  return failures.map((f) => f.code).sort();
}
