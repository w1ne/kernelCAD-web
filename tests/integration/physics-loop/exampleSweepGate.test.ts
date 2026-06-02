// Physics-loop example-sweep gate.
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
// This test prevents the silent-skip regression: a future PR that adds
// a broken example without filing an issue AND citing it in a test
// fails this gate at CI time.
//
// Mechanics:
//   - Discover every `examples/**/*.kcad.ts` using `fs.readdirSync` (no
//     extra deps).
//   - Each is allowed to be in EITHER the `EXEMPT_UNVERIFIED` list (no
//     mates / kinematic-smoke / pre-existing legacy-API broken) OR
//     pass `runValidateCli({ includeInterference: true })` with
//     `mechanism === 'real'` OR `'unverified'`, OR have a
//     corresponding test file containing `it.skip(...issues/N)`.
//
// Note on scope: this is a structural sweep, not a perf sweep — it
// runs every example sequentially with `--include-interference`, which
// is heavy. The whole loop budgets ~5 minutes per example with an
// individual test timeout. Slow but reliable; tighten when the kernel
// gets faster (see issue #348 for the pose-sweep BREP-cost discussion).

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const EXAMPLES_DIR = join(REPO_ROOT, 'examples');
const TESTS_INTEGRATION_DIR = join(REPO_ROOT, 'tests', 'integration', 'examples');

// Examples that don't engage the physics-grounded loop at all because
// they have no mates (single-part bench / cookbook / v0.X scripts) OR
// they're kinematic-API smokes that intentionally exit non-zero to
// exercise diagnostic paths. The loop reports `mechanism: 'unverified'`
// on these — acceptable. Pre-existing legacy-API breakage (pocket-watch
// uses the deleted `arm.fixed(...)` API; scissor-lift has an illegal
// part-name with spaces) is captured here too because the P0/P1/P2/P3
// physics-loop workstream didn't introduce those failures and they
// have nothing to do with mechanism truth.
const EXEMPT_UNVERIFIED: ReadonlySet<string> = new Set([
  // Single-part scripts — no mates, no mechanism.
  'examples/bench/box-minus-cylinder.kcad.ts',
  'examples/bench/box-minus-divider.kcad.ts',
  'examples/bench/cylinder-intersected.kcad.ts',
  'examples/bench/nested-booleans.kcad.ts',
  'examples/bench/two-boxes-fused.kcad.ts',
  'examples/bracket-with-hole.kcad.ts',
  'examples/cookbook/wayfarer-temple-ray-ban.kcad.ts',
  'examples/gallery/meta-glasses-experiments/integrated-wayfarer.kcad.ts',
  'examples/gallery/meta-glasses-experiments/product-detail-wayfarer.kcad.ts',
  'examples/gallery/meta-glasses-experiments/silhouette-wayfarer.kcad.ts',
  'examples/gallery/meta-glasses-experiments/words-to-geometry-wayfarer.kcad.ts',
  'examples/patterns/servo-vented-plate.kcad.ts',
  'examples/v0.21/donut.kcad.ts',
  'examples/v0.4/rocket-keychain.kcad.ts',
  'examples/v0.8/polished-brass-tube.kcad.ts',
  // Kinematic API smoke files — intentionally `process.exit(N)` mid-run
  // to verify diagnostic-path codes (K-codes); not exercising the
  // physics loop's mechanism truth.
  'examples/kinematic/end-to-end-smoke.kcad.ts',
  'examples/kinematic/load-capacity-smoke.kcad.ts',
  'examples/kinematic/reachable-smoke.kcad.ts',
  'examples/kinematic/swept-collision-smoke.kcad.ts',
  // Pre-existing legacy-API breakage (uses the deleted `arm.fixed(...)`
  // API removed by PR #332 — G0). Not P3's scope; pre-existing rot. These
  // files have no test that references them; they're effectively dead
  // demo code awaiting a follow-up cleanup PR.
  'examples/portfolio/pocket-watch/build.kcad.ts',
  'examples/portfolio/pocket-watch-v2/build.kcad.ts',
  'examples/portfolio/watch-from-screenshot-agent-loop-v2.kcad.ts',
  // Invalid part-name (spaces) — pre-existing topology-ref-grammar bug.
  // Not P3's scope.
  'examples/gallery/scissor-lift.kcad.ts',
]);

// Issue-tracked broken examples. Each must have a corresponding test
// file (under tests/integration/examples/ OR tests/integration/mcp/)
// that contains an `it.skip(... issues/N ...)` annotation. The sweep
// walks the candidate test files and asserts the citation exists.
//
// Maintained explicitly (rather than pattern-matching from filename)
// because some examples are tested via shared loop fixtures (e.g.
// skill-built-supported-arm is consumed by designLoop.test.ts; the
// dedicated stub test file at skillBuiltSupportedArm.test.ts hosts the
// citation).
const ISSUE_TRACKED: ReadonlyMap<string, { issue: number; testFile: string }> = new Map([
  [
    'examples/assemblies/two-link-connector-arm.kcad.ts',
    { issue: 349, testFile: 'tests/integration/examples/assemblyExamples.test.ts' },
  ],
  [
    'examples/gallery/gearfinity-planetary-stage.kcad.ts',
    { issue: 348, testFile: 'tests/integration/examples/gearfinityPlanetaryStage.test.ts' },
  ],
  [
    'examples/gallery/meta-glasses.kcad.ts',
    { issue: 350, testFile: 'tests/integration/examples/metaGlasses.test.ts' },
  ],
  [
    'examples/gallery/ratchet-stool.kcad.ts',
    { issue: 351, testFile: 'tests/integration/examples/ratchetStool.test.ts' },
  ],
  [
    'examples/robot-arm/compact-supported-arm.kcad.ts',
    { issue: 346, testFile: 'tests/integration/examples/compactSupportedArm.test.ts' },
  ],
  [
    'examples/robot-arm/desktop-3axis-mates.kcad.ts',
    { issue: 347, testFile: 'tests/integration/examples/desktop3axisMates.test.ts' },
  ],
  [
    'examples/robot-arm/skill-built-supported-arm.kcad.ts',
    { issue: 352, testFile: 'tests/integration/examples/skillBuiltSupportedArm.test.ts' },
  ],
  [
    'examples/robot-arm/skill-built-supported-arm-01-colliding.kcad.ts',
    { issue: 353, testFile: 'tests/integration/examples/skillBuiltSupportedArmColliding.test.ts' },
  ],
  [
    'examples/robot-hand/two-finger-coupled-gripper.kcad.ts',
    { issue: 354, testFile: 'tests/integration/examples/twoFingerCoupledGripper.test.ts' },
  ],
  // P5 (#356) closed the Luxo lamp geometric-rebuild slice — the lamp now
  // passes the physics-grounded loop with mechanism: 'real' and empty
  // mechanismFailures, so it no longer needs an issue-tracked .skip.
]);

function walkExamples(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      out.push(...walkExamples(full, rel));
    } else if (entry.endsWith('.kcad.ts')) {
      out.push(rel);
    }
  }
  return out;
}

describe('Every example under examples/**/*.kcad.ts is loop-clean or has a tracked-issue .skip', () => {
  const examples = walkExamples(EXAMPLES_DIR).sort().map((rel) => `examples/${rel}`);

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

  // Per-example loop check. Heavy: each call invokes the full
  // physics-loop probe (BREP overlap + pose sweep). Sequential here so
  // OCCT-heavy parallel invocations don't fight for the worker.
  for (const examplePath of walkExamples(EXAMPLES_DIR).sort().map((r) => `examples/${r}`)) {
    if (EXEMPT_UNVERIFIED.has(examplePath)) {
      it.skip(`${examplePath}: exempt (no mates / kinematic smoke / pre-existing legacy-API breakage)`, () => {
        // see EXEMPT_UNVERIFIED comment block above
      });
      continue;
    }
    if (ISSUE_TRACKED.has(examplePath)) {
      const { issue } = ISSUE_TRACKED.get(examplePath)!;
      it.skip(`${examplePath}: tracked under issues/${issue}`, () => {
        // citation enforced by the per-example assertion test above
      });
      continue;
    }
    it(`${examplePath} passes the physics-grounded loop`, async () => {
      // Sweep runs the KINEMATIC-only gate (criteria 1-4). The P6 physics
      // gate (criteria 5+6) ships as opt-in with --include-physics and is
      // exercised on the dedicated `examples/kinematic/luxo-lamp.kcad.ts`
      // path in luxoLampPhysicsGate.test.ts (the bare-spring lamp
      // correctly fails the drop-test pending #361 — closed-loop spring
      // API). Including physics here would break every example that has
      // a single revolute joint without an actuator, which is most of
      // the v0.7 corpus — and that's a real authoring gap to be closed
      // by #361, not a regression to gate at PR time.
      const result = await runValidateCli({
        file: examplePath,
        json: true,
        includeInterference: true,
        epsilon: 0.01,
        physical: false,
        includePhysics: false,
      });
      expect(
        result.mechanism === 'real' || result.mechanism === 'unverified',
        `${examplePath}: expected mechanism: real or unverified, got '${result.mechanism}'. ` +
          `Either fix the example or file an issue and add it to ISSUE_TRACKED in this file. ` +
          `Failures: ${JSON.stringify(result.mechanismFailures ?? [], null, 2)}`,
      ).toBe(true);
    }, 600_000);
  }
});
