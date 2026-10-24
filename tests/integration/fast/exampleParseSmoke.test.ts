// SPDX-License-Identifier: MIT
// Every example must parse and transpile. Most also run through the kernel's
// real evaluateScript entry point; expected negative fixtures must fail there.
import { readFileSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ hookTimeout: 60_000, testTimeout: 60_000 });
import ts from 'typescript';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const EXAMPLES_ROOT = resolve(REPO_ROOT, 'examples');
const examples = globSync('**/*.kcad.ts', { cwd: EXAMPLES_ROOT }).map(file => resolve(EXAMPLES_ROOT, file)).sort();
const relativeExample = (file: string) => `examples/${file.slice(EXAMPLES_ROOT.length + 1)}`;

// These authored models exceed the 4.5 s budget in local corpus measurement.
// Reasons: imported mesh assemblies (e46, hatchback, robots, grinder), very
// detailed swept geometry (GT2 belt, threaded jar, spice dispenser), or the
// full tube/rocket routing and collision computation. Parse and TS-transpile
// checks still run for every one so malformed source cannot hide here.
const HEAVY: ReadonlyMap<string, string> = new Map([
  ['examples/cookbook-parity/gt2-timing-belt-drive.kcad.ts', 'detailed timing-belt sweeps'],
  ['examples/cookbook-parity/gridfinity-bin.kcad.ts', '0.8 s local evaluate; bin booleans approach the per-test budget'],
  ['examples/cookbook/wayfarer-temple-ray-ban.kcad.ts', '1.0 s local detailed temple model evaluation'],
  ['examples/cookbook-parity/iso-metric-bolt-and-nut.kcad.ts', 'detailed helical thread geometry'],
  ['examples/from-reference/e46-sedan/e46-sedan.kcad.ts', 'large imported/conformal car assembly'],
  ['examples/from-reference/hatchback/hatchback.kcad.ts', 'large detailed car assembly'],
  ['examples/gallery/gearfinity-planetary-stage.kcad.ts', 'detailed planetary gear geometry'],
  ['examples/gallery/hand-coffee-grinder.kcad.ts', 'complex multi-part grinder assembly'],
  ['examples/gallery/meta-glasses-experiments/words-to-geometry-wayfarer.kcad.ts', '0.8 s local optical-frame feature chain'],
  ['examples/gallery/make-no-mistakes-keycap/model.kcad.ts', 'detailed keycap model'],
  ['examples/gallery/turbojet-engine.kcad.ts', 'detailed multi-part turbine geometry'],
  ['examples/robot-arm/compact-supported-arm.kcad.ts', 'mesh-heavy robot assembly'],
  ['examples/robot-arm/desktop-3axis-mates.kcad.ts', 'mesh-heavy robot assembly'],
  ['examples/robot-arm/so100/so100-arm.kcad.ts', '13 imported STL solids'],
  ['examples/robot-arm/so100/so100.kcad.ts', '13 imported STL solids'],
  ['examples/robot-hand/functional-clevis-robot-hand.kcad.ts', 'detailed articulated hand geometry'],
  ['examples/robot-hand/workflow-candidates-comparison.kcad.ts', '0.8 s local multi-candidate comparison board'],
  ['examples/rocket-engine-lines/engine-bare.kcad.ts', 'full engine assembly and tube clearance'],
  ['examples/rocket-engine-lines/engine-routed-twin.kcad.ts', 'full engine assembly and tube clearance'],
  ['examples/rocket-engine-lines/engine-routed.kcad.ts', 'full engine assembly and tube clearance'],
  ['examples/spice-dispenser-carousel.kcad.ts', 'complex carousel and swept geometry'],
  ['examples/threads/threaded-jar-and-lid.kcad.ts', 'detailed helical thread geometry'],
  ['examples/tube-routing-engine/engine-lines-branch.kcad.ts', 'branch tube routing and clearance'],
  ['examples/tube-routing-engine/engine-lines-broken.kcad.ts', '2.0 s local five-line routing gate; tiny routed regression asserts the intended clearance failure and STEP refusal'],
  ['examples/tube-routing-engine/engine-lines.kcad.ts', '2.0 s local five-line routing and clearance evaluation'],
]);

// These intentionally exercise a failing evaluate path. Pin the failure so
// they cannot silently become malformed or stop reaching the expected gate.
const EXPECTED_FAILURE: ReadonlyMap<string, { code: string; message: string }> = new Map([
  ['examples/repair/cutter-misses-body.kcad.ts', { code: 'feature.subtractive-noop', message: 'did not intersect the body' }],
  ['examples/repair/draft-angle-degenerate.kcad.ts', { code: 'feature.draft.failed', message: 'draft' }],
  ['examples/repair/emboss-over-hole.kcad.ts', { code: 'feature.emboss-text.boolean-noop', message: 'glyph tool did not intersect the body' }],
  ['examples/repair/hole-misses-plate.kcad.ts', { code: 'feature.hole.cut-missing', message: 'hole' }],
  ['examples/repair/oversized-fillet.kcad.ts', { code: 'feature.edge-feature.short-edges-skipped', message: 'all' }],
  ['examples/repair/revolve-crosses-axis.kcad.ts', { code: 'feature.revolve.crosses-axis', message: 'axis' }],
  ['examples/repair/shell-too-thick.kcad.ts', { code: 'feature.kernel-failed', message: 'shell' }],
  ['examples/repair/tangency-radius-too-small.kcad.ts', { code: 'sketch.tangency.no-solution', message: 'tangent' }],
]);

// Explicit source/evaluation exclusions with a reason. These files still get
// parser and TypeScript-transpile coverage. Remote catalog and local optional
// tool failures are environment-dependent; legacy examples and negative
// demonstrations are already covered by dedicated tests or are known broken.
const EVALUATION_EXEMPT: ReadonlyMap<string, string> = new Map([
  ['examples/community/esp32-ereader.kcad.ts', 'remote catalog parts are disabled in local tests'],
  ['examples/community/open-source-ring.kcad.ts', 'remote catalog parts are disabled in local tests'],
  ['examples/community/thermal-iolink-machine-health.kcad.ts', 'remote catalog parts are disabled in local tests'],
  ['examples/fastener-installation/l-bracket-mount.kcad.ts', 'remote catalog parts are disabled in local tests'],
  ['examples/fea/shelf-bracket-fea.kcad.ts', 'requires external CalculiX and gmsh tools'],
  ['examples/gallery/meta-glasses-experiments/integrated-wayfarer.kcad.ts', 'existing boolean recompute errors'],
  ['examples/gallery/meta-glasses-experiments/product-detail-wayfarer.kcad.ts', 'existing boolean recompute errors'],
  ['examples/gallery/scissor-lift.kcad.ts', 'existing invalid part name'],
  ['examples/kinematic/end-to-end-smoke.kcad.ts', 'intentional diagnostic-path script exits with unknown-joint error'],
  ['examples/kinematic/luxo-lamp.kcad.ts', 'dedicated validate test covers it; capture validation currently rejects hinge visibility'],
  ['examples/kinematic/swept-collision-smoke.kcad.ts', 'intentional diagnostic-path script exits with unknown-joint error'],
  ['examples/portfolio/pocket-watch/build.kcad.ts', 'uses removed legacy arm.fixed API'],
  ['examples/portfolio/pocket-watch-v2/build.kcad.ts', 'uses removed legacy arm.fixed API'],
  ['examples/portfolio/watch-from-screenshot-agent-loop-v2.kcad.ts', 'uses removed legacy arm.fixed API'],
  ['examples/print-prep/wall-hook.kcad.ts', 'declared FDM gate reports unsupported overhang'],
  ['examples/robot-arm/skill-built-supported-arm-01-colliding.kcad.ts', 'intentionally colliding repair fixture'],
  ['examples/robot-arm/skill-built-supported-arm.kcad.ts', 'dedicated authoring test covers this existing hinge visibility failure'],
]);

function sourceDiagnostics(file: string, source: string): readonly ts.Diagnostic[] {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const parseDiagnostics = (parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  const transpiled = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  });
  return [...parseDiagnostics, ...(transpiled.diagnostics ?? [])];
}

describe('examples evaluate through the kernel', () => {
  it('discovers example files from the repository examples directory', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  it('classifies every discovered example and keeps classification keys current', () => {
    const discovered = new Set(examples.map(relativeExample));
    const heavy = new Set(HEAVY.keys());
    const exempt = new Set(EVALUATION_EXEMPT.keys());
    const expectedFailure = new Set(EXPECTED_FAILURE.keys());
    expect(discovered.size).toBeGreaterThan(0);
    for (const key of heavy) {
      expect(exempt.has(key), `${key} is both heavy and exempt`).toBe(false);
      expect(expectedFailure.has(key), `${key} is both heavy and expected to fail`).toBe(false);
    }
    for (const key of exempt) {
      expect(expectedFailure.has(key), `${key} is both exempt and expected to fail`).toBe(false);
    }
    for (const key of [...heavy, ...exempt, ...expectedFailure]) {
      expect(discovered.has(key), `${key} classification refers to no discovered example`).toBe(true);
    }
    const evaluationExamples = examples.filter(file => !HEAVY.has(relativeExample(file)) && !EVALUATION_EXEMPT.has(relativeExample(file)));
    const evaluated = new Set(evaluationExamples.map(relativeExample));
    expect(discovered.size).toBe(heavy.size + exempt.size + evaluated.size);
  });

  // Every discovered example, including HEAVY and EVALUATION_EXEMPT entries, gets parse+transpile coverage.
  for (const file of examples) {
    const displayFile = relativeExample(file);
    const source = readFileSync(file, 'utf8');
    it(`${displayFile} parses and transpiles`, () => {
      expect(sourceDiagnostics(file, source), displayFile).toEqual([]);
    });
  }

  // The default budget is 15 s: these are correctness/environment gates, and a
  // 4.5 s budget flaked under parallel full-suite load (single examples run in
  // 0.3-4.8 s, some 10x slower when the machine is busy). Heavy examples get
  // a longer one: roboto-01 loads about 40 MB of STL meshes and
  // kspray-facade-robot builds 342 features; four-bar-swept checks collision
  // at 51 crank poses of a closed loop.
  const SLOW_EXAMPLE_TIMEOUT_MS = new Map<string, number>([
    ['examples/gallery/roboto-01.kcad.ts', 30_000],
    ['examples/gallery/kspray-facade-robot.kcad.ts', 30_000],
    ['examples/gallery/kspray-klift.kcad.ts', 30_000],
    ['examples/roadster/roadster.kcad.ts', 30_000],
    ['examples/kinematic/four-bar-swept.kcad.ts', 60_000],
    // Eleven catalog fasteners at the default 'full' detail: 211 modelled
    // thread solids, about 32 s locally and 37 s in CI.
    ['examples/parts/catalog-lineup.kcad.ts', 90_000],
  ]);
  const evaluationExamples = examples.filter(file => !HEAVY.has(relativeExample(file)) && !EVALUATION_EXEMPT.has(relativeExample(file)));
  for (const file of evaluationExamples) {
    const displayFile = relativeExample(file);
    it(`${displayFile} ${EXPECTED_FAILURE.has(displayFile) ? 'fails at its expected diagnostic' : 'evaluates cleanly'}`, async () => {
      const result = await evaluateScript({ file });
      const expectedFailure = EXPECTED_FAILURE.get(displayFile);
      if (expectedFailure) {
        expect(result.exitCode, `${displayFile} unexpectedly evaluates cleanly`).not.toBe(0);
        expect(result.diagnostics, `${displayFile} did not report ${expectedFailure.code}`).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: expectedFailure.code, message: expect.stringContaining(expectedFailure.message) }),
        ]));
      } else {
        expect(result.exitCode, `${displayFile}: ${JSON.stringify(result.diagnostics)}`).toBe(0);
      }
    }, SLOW_EXAMPLE_TIMEOUT_MS.get(displayFile) ?? 15_000);
  }
});
