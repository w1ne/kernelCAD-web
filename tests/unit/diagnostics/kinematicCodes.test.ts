// tests/unit/diagnostics/kinematicCodes.test.ts
//
// Per-code shape gate for the kinematic-grounding slice (T1).
// Asserts the kinematic.* codes (K1-K9 plus #537 pose.out-of-limits) are
// registered with non-empty hint + valid nextAction + group: 'kinematic' +
// severity in the canonical set.

import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics/registry';

const KINEMATIC_CODES = [
  'kinematic.collision.swept',
  'kinematic.collision.swept.sample-density-warning',
  'kinematic.unreachable',
  'kinematic.reachability.iteration-cap-hit',
  'kinematic.solver.unsupported-config',
  'kinematic.load-exceeds-yield',
  'kinematic.load.beam-not-applicable',
  'kinematic.no-material-declared',
  'kinematic.mounting-hole.diameter-mismatch',
  // #537 — advisory warning when a solve()/solvedModel() pose exceeds a
  // joint's declared limitsDeg/limitsMm.
  'kinematic.pose.out-of-limits',
] as const;

// Per the cumulative-findings discipline (item #56), every nextAction kind
// must come from the pre-existing canonical union — no new kinds for this
// slice. The spec's "restructure-mate-graph" / "relax-arg" / "tighten-arg"
// flavours map onto the canonical kinds below.
const CANONICAL_NEXT_ACTION_KINDS = new Set([
  'retry-with-smaller-param',
  'call-introspection-tool',
  'rewrite-feature',
  'reorder-pipeline',
  'fix-arg',
  'inspect-message',
  'rename',
  'add-return',
  'check-cli-args',
  'check-file-path',
]);

describe('kinematic-grounding diagnostic codes', () => {
  it('registers exactly 10 kinematic.* codes', () => {
    const kinCodes = Object.keys(DIAGNOSTIC_REGISTRY).filter((c) =>
      c.startsWith('kinematic.'),
    );
    expect(kinCodes.sort()).toEqual([...KINEMATIC_CODES].sort());
  });

  it('every kinematic code carries non-empty hintTemplate', () => {
    for (const code of KINEMATIC_CODES) {
      const spec =
        DIAGNOSTIC_REGISTRY[code as keyof typeof DIAGNOSTIC_REGISTRY];
      expect(spec, `missing registry entry for ${code}`).toBeDefined();
      expect(
        spec.hintTemplate.trim().length,
        `empty hint for ${code}`,
      ).toBeGreaterThan(0);
    }
  });

  it('every kinematic code uses a canonical nextAction kind', () => {
    for (const code of KINEMATIC_CODES) {
      const spec =
        DIAGNOSTIC_REGISTRY[code as keyof typeof DIAGNOSTIC_REGISTRY];
      expect(
        CANONICAL_NEXT_ACTION_KINDS.has(spec.nextAction.kind),
        `${code}: nextAction.kind '${spec.nextAction.kind}' is not canonical`,
      ).toBe(true);
    }
  });

  it("every kinematic code declares group: 'kinematic'", () => {
    for (const code of KINEMATIC_CODES) {
      const spec =
        DIAGNOSTIC_REGISTRY[code as keyof typeof DIAGNOSTIC_REGISTRY];
      expect(spec.group, code).toBe('kinematic');
    }
  });

  it('every kinematic code declares a known severity (info|warn|error)', () => {
    for (const code of KINEMATIC_CODES) {
      const spec =
        DIAGNOSTIC_REGISTRY[code as keyof typeof DIAGNOSTIC_REGISTRY];
      expect(['info', 'warn', 'error'], code).toContain(spec.defaultSeverity);
    }
  });
});
