// tests/integration/physics-loop/exampleSweepShared.ts
//
// Shared discovery, classification, and per-example assertion for the
// physics-loop example-sweep gate. Extracted from exampleSweepGate.test.ts
// so the heavy per-example `runValidateCli` checks can be partitioned
// across multiple test files (exampleSweepGate.shard{A,B,C,D}.test.ts) and
// thereby distributed across vitest's per-FILE CI shards. The structural
// completeness checks (cheap, no validate) stay in exampleSweepGate.test.ts.
//
// Coverage is unchanged: the same set of examples that ran the LIVE
// `runValidateCli({ includeInterference: true })` check before still do —
// they're just spread across N partition files instead of one loop.
//
// Spec:  docs/specs/2026-06-01-physics-grounded-loop-design.md (slice P3)
// Plan:  docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md (Task 5)

import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '..', '..', '..');
export const EXAMPLES_DIR = join(REPO_ROOT, 'examples');

// Number of partition files the per-example sweep is split across. Each
// shard file runs `discoverSweepExamples().filter((_, i) => i % SHARD_COUNT === K)`.
export const SHARD_COUNT = 4;

// Examples that don't engage the physics-grounded loop at all because
// they have no mates (single-part bench / cookbook / v0.X scripts) OR
// they're kinematic-API smokes that intentionally exit non-zero to
// exercise diagnostic paths. The loop reports `mechanism: 'unverified'`
// on these — acceptable. Pre-existing legacy-API breakage (pocket-watch
// uses the deleted `arm.fixed(...)` API; scissor-lift has an illegal
// part-name with spaces) is captured here too because the P0/P1/P2/P3
// physics-loop workstream didn't introduce those failures and they
// have nothing to do with mechanism truth.
export const EXEMPT_UNVERIFIED: ReadonlySet<string> = new Set([
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
// that contains an `it.skip(...issues/N)` annotation. The sweep
// walks the candidate test files and asserts the citation exists.
//
// Maintained explicitly (rather than pattern-matching from filename)
// because some examples are tested via shared loop fixtures (e.g.
// skill-built-supported-arm is consumed by designLoop.test.ts; the
// dedicated stub test file at skillBuiltSupportedArm.test.ts hosts the
// citation).
export const ISSUE_TRACKED: ReadonlyMap<string, { issue: number; testFile: string }> = new Map([
  [
    'examples/assemblies/two-link-connector-arm.kcad.ts',
    { issue: 349, testFile: 'tests/integration/examples/assemblyExamples.test.ts' },
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
  // P9 (2026-06-02) closed the P8 joint-mesh-continuity gap on the
  // Luxo lamp (extended column + pulled-back head-neck + arm spring
  // posts), so the lamp again passes the mechanism-truth loop with
  // mechanism: 'real' and empty mechanismFailures.
]);

// Examples whose per-example loop check lives in a dedicated test file.
// `run-validate-cli` hosts use the identical live CLI check for CI shard
// balance. `catalog-fixture` hosts are remote-catalog examples: the suite
// deliberately disables remote I/O, so their dedicated test must exercise
// the same assembly, interference, and mechanism surfaces through an
// explicit offline catalog fixture instead. Every entry names both its host
// file and coverage mode so the structural gate can reject a silent drop.
export type DedicatedExampleCoverage = {
  readonly testFile: string;
  readonly coverage: 'run-validate-cli' | 'catalog-fixture';
};

export const HOSTED_IN_DEDICATED_FILE: ReadonlyMap<string, DedicatedExampleCoverage> = new Map([
  [
    'examples/kinematic/luxo-lamp.kcad.ts',
    {
      testFile: 'tests/integration/examples/luxoLampClevis.validate.test.ts',
      coverage: 'run-validate-cli',
    },
  ],
  // gearfinity completes the loop with mechanism: 'unverified' after the
  // BREP-sweep budget skip (issue #348 resolved). Its dedicated file runs
  // the identical runValidateCli check; hosting it there avoids paying the
  // ~1-2 minute validate run twice.
  [
    'examples/gallery/gearfinity-planetary-stage.kcad.ts',
    {
      testFile: 'tests/integration/examples/gearfinityPlanetaryStage.test.ts',
      coverage: 'run-validate-cli',
    },
  ],
  [
    'examples/community/open-source-ring.kcad.ts',
    {
      testFile: 'tests/integration/examples/openSourceRing.test.ts',
      coverage: 'catalog-fixture',
    },
  ],
]);

export function walkExamples(dir: string, prefix = ''): string[] {
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

// All discovered examples, sorted, with the `examples/` prefix. This is
// the canonical ordered universe the structural completeness check walks.
export function discoverAllExamples(): string[] {
  return walkExamples(EXAMPLES_DIR)
    .sort()
    .map((rel) => `examples/${rel}`);
}

// The ordered subset of examples that require the LIVE per-example
// `runValidateCli` sweep check — i.e. NOT exempt, NOT issue-tracked, and
// NOT hosted in a dedicated file. This is exactly the set the original
// sweep loop ran `runValidateCli` on. The partition shard files slice
// this list by index modulo SHARD_COUNT.
export function discoverSweepExamples(): string[] {
  return discoverAllExamples().filter(
    (examplePath) =>
      !EXEMPT_UNVERIFIED.has(examplePath) &&
      !ISSUE_TRACKED.has(examplePath) &&
      !HOSTED_IN_DEDICATED_FILE.has(examplePath),
  );
}

// Runs the per-example physics-grounded loop check and asserts the SAME
// condition the original sweep loop made. Heavy: each call invokes the
// full physics-loop probe (BREP overlap + pose sweep).
export async function assertExampleLoopClean(examplePath: string): Promise<void> {
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
}

// Per-example test timeout (ms) — each call runs the full BREP-heavy probe.
export const PER_EXAMPLE_TIMEOUT_MS = 600_000;

// Registers the live per-example sweep suite for one shard partition.
// Each shard file calls this with its own SHARD_INDEX (0..SHARD_COUNT-1)
// and partition label. The partition is the index-modulo-SHARD_COUNT slice
// of `discoverSweepExamples()`.
//
// Because SHARD_COUNT is fixed but the live-sweep example set grows and
// shrinks, some partitions may be EMPTY (e.g. when there are fewer examples
// than shards). vitest fails a file whose suite registers zero tests
// ("No test found in suite"), so an empty partition would break CI. We guard
// by registering a single skipped placeholder when the partition is empty —
// this keeps every shard file green regardless of example count, with no
// SHARD_COUNT coupling to maintain.
export function registerSweepShard(label: string, shardIndex: number): void {
  const partition = discoverSweepExamples().filter((_, i) => i % SHARD_COUNT === shardIndex);

  describe(`example-sweep gate partition ${label} (live runValidateCli, shard ${shardIndex})`, () => {
    if (partition.length === 0) {
      // No examples land in this partition at the current example count.
      // Register a skipped placeholder so vitest sees a non-empty suite
      // instead of failing with "No test found in suite".
      it.skip(`no examples in shard ${shardIndex} at the current example count`, () => {});
      return;
    }

    for (const examplePath of partition) {
      it(
        `${examplePath} passes the physics-grounded loop`,
        async () => {
          await assertExampleLoopClean(examplePath);
        },
        PER_EXAMPLE_TIMEOUT_MS,
      );
    }
  });
}
