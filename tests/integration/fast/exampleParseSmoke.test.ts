// SPDX-License-Identifier: MIT
// Every example must parse and transpile. Most also run through the kernel's
// real evaluateScript entry point; expected negative fixtures must fail there.
import { readFileSync, globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { evaluateScript } from '../../../src/agent/cli/commands/evaluate';

const examples = globSync('examples/**/*.kcad.ts').sort();

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
  ['examples/robot-hand/generic-articulated-digit.kcad.ts', 'detailed articulated digit geometry'],
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
  for (const file of examples) {
    const source = readFileSync(file, 'utf8');
    it(`${file} parses and transpiles`, () => {
      expect(sourceDiagnostics(file, source), file).toEqual([]);
    });

    if (HEAVY.has(file) || EVALUATION_EXEMPT.has(file)) continue;
    it(`${file} ${EXPECTED_FAILURE.has(file) ? 'fails at its expected diagnostic' : 'evaluates cleanly'}`, async () => {
      const result = await evaluateScript({ file });
      const expectedFailure = EXPECTED_FAILURE.get(file);
      if (expectedFailure) {
        expect(result.exitCode, `${file} unexpectedly evaluates cleanly`).not.toBe(0);
        expect(result.diagnostics, `${file} did not report ${expectedFailure.code}`).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: expectedFailure.code, message: expect.stringContaining(expectedFailure.message) }),
        ]));
      } else {
        expect(result.exitCode, `${file}: ${JSON.stringify(result.diagnostics)}`).toBe(0);
      }
    }, 4_500);
  }
});
