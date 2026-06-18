// Physics-loop example-sweep gate — STRUCTURAL completeness checks.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P3)
// Plan:  docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md (Task 5)
//
// P3's job is to leave the repo in a state where every example under
// `examples/**/*.kcad.ts` is either:
//   (a) loop-clean — `validate --include-interference` reports
//       `mechanism === 'real'` (or `'unverified'` when the script has
//       no mates / hits a probe error that's a kernel rough-edge, not a
//       broken mechanism), OR
//   (b) loop-broken — but with a tracked GitHub issue cited in the
//       corresponding integration test file's `it.skip(...)` description.
//
// This file holds the FAST structural completeness checks (no validate):
//   - every discovered example is classified into exactly one bucket
//     (EXEMPT_UNVERIFIED / ISSUE_TRACKED / HOSTED_IN_DEDICATED_FILE /
//     live-sweep), so a future PR that adds a broken example without
//     filing an issue AND citing it in a test fails this gate at CI time;
//   - every ISSUE_TRACKED entry has its citing `it.skip(...issues/N)`;
//   - every HOSTED_IN_DEDICATED_FILE delegation actually runs the check.
//
// The HEAVY per-example `runValidateCli({ includeInterference: true })`
// sweep no longer runs here. It was the merge-gate wall-clock floor:
// ~370s sequentially in one file, pinning a single vitest CI shard. It is
// now partitioned across `exampleSweepGate.shard{A,B,C,D}.test.ts`, which
// vitest distributes across its per-FILE CI shards. Coverage is IDENTICAL:
// the same examples that ran the live check before still do — see
// `discoverSweepExamples()` in exampleSweepShared.ts.

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
    for (const [examplePath, { testFile }] of HOSTED_IN_DEDICATED_FILE) {
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
      // sweep would have generated AND actually invoke the validate CLI —
      // otherwise a skip/gut edit to the hosting file would silently drop
      // the example's loop coverage while this gate stays green.
      expect(
        testSrc.includes(`${examplePath} passes the physics-grounded loop`),
        `${examplePath}: hosting testFile ${testFile} must contain the it-title ` +
          `"${examplePath} passes the physics-grounded loop"`,
      ).toBe(true);
      expect(
        testSrc.includes('runValidateCli'),
        `${examplePath}: hosting testFile ${testFile} must call runValidateCli`,
      ).toBe(true);
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
    // hosted in a dedicated file, OR in the live sweep set. The union of the
    // four buckets must equal the full discovered universe, with no overlaps.
    // This is what makes the live-check distribution across shard files safe:
    // anything not exempt/tracked/hosted MUST land in discoverSweepExamples()
    // and therefore in exactly one shard partition.
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
          `(exempt / issue-tracked / hosted / live-sweep), got ${buckets.length}`,
      ).toBe(1);
    }
  });
});
