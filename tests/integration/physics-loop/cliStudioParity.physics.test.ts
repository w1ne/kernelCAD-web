// Physics-loop CLI / Studio parity sentinel — P6 --include-physics case.
//
// Split out of cliStudioParity.test.ts for CI shard balance (per-file
// vitest sharding). The kinematic-only parity cases live there; this
// file hosts the heavier drop-test (criteria 5+6) parity check. Shared
// plumbing: cliStudioParityShared.ts.
//
// Spec: docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P1)
// Plan: docs/plans/2026-06-01-physics-loop-P1-surface-convergence.md

import { describe, it, expect } from 'vitest';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import {
  CLEVIS_HINGE_REAL_FIXTURE,
  captureValidateJson,
  sortedCodes,
} from './cliStudioParityShared';

describe('CLI / Studio parity for mechanism truth', () => {
  it(
    'P6: clevis-hinge with --include-physics — CLI and Studio agree the bare hinge drops under gravity',
    async () => {
      // The clevis-hinge fixture passes the kinematic-only gate but, as
      // a single revolute joint with no spring or actuator, it cannot
      // pass the drop-test. Asserting both surfaces emit the same
      // `mechanism.drops-on-release` failure pins the new criterion's
      // wiring at parity.
      const cliResult = await captureValidateJson({
        file: CLEVIS_HINGE_REAL_FIXTURE,
        includeInterference: true,
        includePhysics: true,
      });
      const cliCodes = sortedCodes(cliResult.mechanismFailures ?? []);
      expect(cliResult.mechanism).toBe('broken');
      expect(cliCodes).toContain('mechanism.drops-on-release');

      const review = await reviewCadTool({
        file: CLEVIS_HINGE_REAL_FIXTURE,
        includeInterference: true,
        includePhysics: true,
      });
      const studioMechanism = (review as { mechanism?: string }).mechanism;
      const studioFailures = (review as { mechanismFailures?: Array<{ code: string }> })
        .mechanismFailures ?? [];
      const studioCodes = sortedCodes(studioFailures);
      expect(studioMechanism).toBe('broken');
      expect(studioCodes).toEqual(cliCodes);
    },
    180000,
  );
});
