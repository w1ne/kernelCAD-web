// tests/integration/physics-loop/exampleSweepShared.ts
//
// Shared helpers for the physics-loop example classification gate.
// exampleSweepGate.test.ts keeps only the FAST structural classification checks.
// The heavy live runValidateCli shard sweep was removed.
// Per-example smoke (parse/transpile all; evaluate non-heavy) now lives in
// tests/integration/fast/exampleParseSmoke.test.ts and does NOT run
// validate --include-interference. Coverage is intentionally narrower:
// structural completeness remains; the multi-minute physics
// validate-per-example gate does not.
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

// Legacy shard helper constant retained for compatibility with any focused
// local callers; the heavy per-example shard sweep is no longer registered.
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
  // Emitted by drawing_to_cad; pinned by tests/integration/examples/drawingToCadExample.test.ts.
  'examples/drawing-to-cad/motor-mount-bracket.kcad.ts',
  'examples/fea/shelf-bracket-fea.kcad.ts',
  // Multi-part display / BOM / catalog layouts — named assembly().part()
  // rows with no mates or joints, so the mechanism graph is disconnected
  // by design. Not mechanisms; the physics loop's orphan-part gate does
  // not apply.
  //
  // Direct-edit hero: the two parts MUST stay mate-less — the gizmo refuses
  // to drag any part that participates in a mate/joint graph (a local
  // translate would be overwritten by mate-FK) — and the START pose
  // deliberately interpenetrates by ~800 mm³ so the drag-to-clearance
  // rewrite has a real 1 → 0 interference to fix. See
  // docs/demos/direct-edit/README.md and tests/e2e/direct-edit-drag.spec.ts.
  'examples/direct-edit-drag-to-clearance.kcad.ts',
  'examples/bom/panel-with-fasteners.kcad.ts',
  'examples/cookbook-parity/countersunk-flat-head-screw.kcad.ts',
  'examples/cookbook-parity/engineering-material-presets-mass.kcad.ts',
  'examples/cookbook-parity/gt2-timing-belt-drive.kcad.ts',
  'examples/cookbook-parity/gridfinity-bin.kcad.ts',
  'examples/cookbook-parity/involute-spur-gear-pair.kcad.ts',
  'examples/cookbook-parity/iso-metric-bolt-and-nut.kcad.ts',
  'examples/cookbook-parity/tslot-extrusion-and-bracket.kcad.ts',
  'examples/cookbook-parity/wood-joinery-dado-rabbet-mortise.kcad.ts',
  // Stacked exploded/BOM demo: fastened mates exist, but connector origins
  // sit at assembled stack heights in empty space, so the joint-mesh-gap
  // gate fires by design. Render/export of this file uses --no-mechanism-check.
  'examples/exploded/enclosure.kcad.ts',
  'examples/cookbook/wayfarer-temple-ray-ban.kcad.ts',
  'examples/gallery/meta-glasses-experiments/integrated-wayfarer.kcad.ts',
  'examples/gallery/meta-glasses-experiments/product-detail-wayfarer.kcad.ts',
  'examples/gallery/meta-glasses-experiments/silhouette-wayfarer.kcad.ts',
  'examples/gallery/meta-glasses-experiments/words-to-geometry-wayfarer.kcad.ts',
  'examples/patterns/servo-vented-plate.kcad.ts',
  // Gallery car study: 60 named display parts (body, glass, lamp skins,
  // wheels) with no mates. Its conformal skins sit on the body surface by
  // design, and one evaluate takes ~10 min, so the live interference sweep
  // exceeds the 20-minute CI shard budget without testing a mechanism.
  'examples/from-reference/e46-sedan/e46-sedan.kcad.ts',
  // Comparison board: five robot-hand candidate models shown side by side,
  // each drawn as display pieces (floating labels, gapped finger segments,
  // ghost overlays). Genuinely multi-body: every piece is its own named part
  // with no mates, and overlays deliberately overlap the hands they annotate.
  // It is a picture, not a mechanism.
  'examples/robot-hand/workflow-candidates-comparison.kcad.ts',
  // Deliberately broken single-part repair fixtures. They exist to FAIL
  // evaluation so the trace-guided repair walkthrough has something real to
  // fix; tests/integration/examples/repairExamples.test.ts pins that each one
  // starts broken and repairs clean.
  'examples/repair/cutter-misses-body.kcad.ts',
  'examples/repair/hole-misses-plate.kcad.ts',
  'examples/repair/oversized-fillet.kcad.ts',
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
// `run-validate-cli` hosts keep their dedicated live CLI check.
// `catalog-fixture` hosts are remote-catalog examples: the suite
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
  [
    'examples/community/open-source-ring.kcad.ts',
    {
      testFile: 'tests/integration/examples/openSourceRing.test.ts',
      coverage: 'catalog-fixture',
    },
  ],
  [
    'examples/community/esp32-ereader.kcad.ts',
    {
      testFile: 'tests/integration/examples/esp32Ereader.test.ts',
      coverage: 'catalog-fixture',
    },
  ],
  [
    'examples/community/thermal-iolink-machine-health.kcad.ts',
    {
      testFile: 'tests/integration/examples/thermalIoLinkMachineHealth.test.ts',
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

// The ordered structural bucket for examples that are NOT exempt,
// issue-tracked, or hosted in a dedicated file. The fast smoke suite
// parses/transpiles every example and evaluates non-heavy entries; it does
// not run validate --include-interference.
export function discoverSweepExamples(): string[] {
  return discoverAllExamples().filter(
    (examplePath) =>
      !EXEMPT_UNVERIFIED.has(examplePath) &&
      !ISSUE_TRACKED.has(examplePath) &&
      !HOSTED_IN_DEDICATED_FILE.has(examplePath),
  );
}

// Legacy heavy helper retained for dedicated live validation tests. It is
// not registered as a per-example sweep; each call invokes the full
// physics-loop probe (BREP overlap + pose sweep).
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

// Legacy heavy-helper timeout (ms) for focused callers that still invoke it.
export const PER_EXAMPLE_TIMEOUT_MS = 600_000;

// Legacy registration helper retained for focused local callers. The removed
// heavy shard sweep is not registered by the physics-loop gate.
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
