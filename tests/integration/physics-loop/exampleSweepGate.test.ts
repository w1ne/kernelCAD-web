// Physics-loop example-sweep gate — FAST structural classification checks only.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P3)
// Plan:  docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md (Task 5)
//
// This file keeps only the FAST structural classification checks (no validate):
//   - every discovered example is classified into exactly one bucket
//     (EXEMPT_UNVERIFIED / ISSUE_TRACKED / HOSTED_IN_DEDICATED_FILE /
//     fast-smoke path), so a future PR that adds an unclassified example without
//     filing an issue AND citing it in a test fails this gate at CI time;
//   - every ISSUE_TRACKED entry has its citing `it.skip(...issues/N)`;
//   - every HOSTED_IN_DEDICATED_FILE delegation actually runs the check.
//
// The heavy live `runValidateCli({ includeInterference: true })` shard sweep
// was removed. Per-example smoke (parse/transpile all examples; evaluate
// non-heavy examples) lives in tests/integration/fast/exampleParseSmoke.test.ts
// and does NOT run validate --include-interference. Coverage is intentionally
// narrower: structural completeness remains; the multi-minute physics
// validate-per-example gate does not.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  REPO_ROOT,
  EXEMPT_UNVERIFIED,
  ISSUE_TRACKED,
  HOSTED_IN_DEDICATED_FILE,
  discoverAllExamples,
  discoverSweepExamples,
} from './exampleSweepShared';

describe('Every example under examples/**/*.kcad.ts is classified (structural completeness)', () => {
  const examples = discoverAllExamples();

  it('discovers at least one example (smoke)', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  it('every entry in EXEMPT_UNVERIFIED and ISSUE_TRACKED corresponds to an existing example', () => {
    const allListed = new Set<string>([...EXEMPT_UNVERIFIED, ...ISSUE_TRACKED.keys()]);
    for (const listed of allListed) {
      expect(
        examples,
        `${listed} appears in EXEMPT_UNVERIFIED or ISSUE_TRACKED but the file is missing`,
      ).toContain(listed);
    }
    // CI shard balance delegation: every HOSTED_IN_DEDICATED_FILE entry
    // must point at an existing test file that actually references the
    // example — otherwise the per-example check would silently vanish.
    for (const [examplePath, { testFile, coverage }] of HOSTED_IN_DEDICATED_FILE) {
      expect(
        examples,
        `${examplePath} appears in HOSTED_IN_DEDICATED_FILE but the example is missing`,
      ).toContain(examplePath);
      const absTest = join(REPO_ROOT, testFile);
      expect(
        existsSync(absTest),
        `${examplePath}: declared hosting testFile ${testFile} does not exist`,
      ).toBe(true);
      const testSrc = readFileSync(absTest, 'utf8');
      expect(
        testSrc.includes(examplePath),
        `${examplePath}: hosting testFile ${testFile} must reference the example path`,
      ).toBe(true);
      // The hosting file must carry the exact per-example it-title this
      // sweep would have generated. Its required validation surface is
      // coverage-mode specific, so a remote-catalog example cannot quietly
      // regress back into the hermetic live sweep (or lose its offline
      // fixture coverage altogether).
      expect(
        testSrc.includes(`${examplePath} passes the physics-grounded loop`),
        `${examplePath}: hosting testFile ${testFile} must contain the it-title ` +
          `"${examplePath} passes the physics-grounded loop"`,
      ).toBe(true);
      if (coverage === 'run-validate-cli') {
        expect(
          testSrc.includes('runValidateCli'),
          `${examplePath}: hosting testFile ${testFile} must call runValidateCli`,
        ).toBe(true);
      } else {
        for (const fixtureSurface of [
          'await runCatalogFixtureAssemblyValidation()',
          'detectInterferences',
          'validateAssembly',
          'probeAssemblies',
        ]) {
          expect(
            testSrc.includes(fixtureSurface),
            `${examplePath}: catalog-fixture host ${testFile} must exercise ${fixtureSurface}`,
          ).toBe(true);
        }
      }
    }
  });

  it('every ISSUE_TRACKED entry has a citing it.skip in the corresponding test file', () => {
    for (const [examplePath, { issue, testFile }] of ISSUE_TRACKED) {
      const absTest = join(REPO_ROOT, testFile);
      expect(
        existsSync(absTest),
        `${examplePath}: declared testFile ${testFile} does not exist`,
      ).toBe(true);
      const testSrc = readFileSync(absTest, 'utf8');
      // The citation pattern lives in the it.skip(...) description so the
      // sweep can find it via a single regex without parsing TS. Allow
      // either an inline `issues/N` or `issues\/N`. The mate is the
      // exact issue number — silent-skip resistance relies on this
      // matching the registry above.
      const pattern = new RegExp(`it\\.skip\\([^)]*issues\\/${issue}`);
      expect(
        pattern.test(testSrc),
        `${examplePath}: ${testFile} must contain "it.skip(... issues/${issue} ...)"`,
      ).toBe(true);
    }
  });

  it('every discovered example is classified into exactly one bucket (no silent un-tracked example)', () => {
    // Structural completeness: each example is EITHER exempt, issue-tracked,
    // hosted in a dedicated file, OR in the default fast smoke path. The union of the
    // four buckets must equal the full discovered universe, with no overlaps.
    // Anything not exempt/tracked/hosted is covered by the fast smoke evaluate
    // path (or its parse-only heavy classification), not live physics validation.
    const sweep = new Set(discoverSweepExamples());
    for (const examplePath of examples) {
      const buckets = [
        EXEMPT_UNVERIFIED.has(examplePath),
        ISSUE_TRACKED.has(examplePath),
        HOSTED_IN_DEDICATED_FILE.has(examplePath),
        sweep.has(examplePath),
      ].filter(Boolean);
      expect(
        buckets.length,
        `${examplePath} must be classified into exactly one bucket ` +
          `(exempt / issue-tracked / hosted / fast-smoke), got ${buckets.length}`,
      ).toBe(1);
    }
  });
});
