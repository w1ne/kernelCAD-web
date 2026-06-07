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
//
// NOTE: companion file cliStudioParity.physics.test.ts was split out for
// CI shard balance (per-file vitest sharding); it hosts the P6
// --include-physics parity case. Shared plumbing: cliStudioParityShared.ts.

import { describe, it, expect } from 'vitest';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import {
  VEC3_SPRING_BROKEN_FIXTURE,
  CLEVIS_HINGE_REAL_FIXTURE,
  captureValidateJson,
  sortedCodes,
} from './cliStudioParityShared';

describe('CLI / Studio parity for mechanism truth', () => {
  it(
    'vec3-spring fixture: CLI and Studio both report mechanism: broken with the same failure codes',
    async () => {
      // CLI side: invoke the validate handler in JSON mode so we can
      // parse the structured mechanism field straight off stdout.
      // Physics OFF here — the parity check pins the kinematic-only
      // verdict (criteria 1-4) which both surfaces have shipped since
      // P1; the dedicated physics-parity case in
      // cliStudioParity.physics.test.ts covers criteria 5+6 separately.
      const cliResult = await captureValidateJson({
        file: VEC3_SPRING_BROKEN_FIXTURE,
        includeInterference: true,
        includePhysics: false,
      });
      expect(cliResult.mechanism).toBe('broken');
      const cliCodes = sortedCodes(cliResult.mechanismFailures ?? []);
      // CLI MUST surface at least one mechanism failure code. The
      // specific code is whichever criterion catches the broken
      // mechanism — pre-P0.2 the displacement-difference rigidity math
      // returned `mechanism.disconnect`; post-P0.2 the FK-aware
      // rigidity check correctly sees zero drift (T_spring = T_lower-arm
      // under the fastened FK), but criterion 3 (DoF-mismatch via
      // micro-pose topology change) still catches the broken
      // mechanism. The parity assertion is the SAME codes across CLI
      // and Studio surfaces — not a specific code.
      expect(cliCodes.length).toBeGreaterThan(0);

      // Studio side: reviewCad is the server-side handler /__kernelcad/review
      // calls. Its output now carries the same `mechanism` field — the
      // Validity panel reads it via reviewToValidity().
      const review = await reviewCadTool({
        file: VEC3_SPRING_BROKEN_FIXTURE,
        includeInterference: true,
        includePhysics: false,
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
        includePhysics: false,
      });
      expect(cliResult.mechanism).toBe('real');
      expect(cliResult.mechanismFailures ?? []).toEqual([]);

      const review = await reviewCadTool({
        file: CLEVIS_HINGE_REAL_FIXTURE,
        includeInterference: true,
        includePhysics: false,
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
