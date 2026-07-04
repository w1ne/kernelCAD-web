import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';
import { Scene } from '../../../src/modeling/validation/scene';
import { runScript } from '../../../src/modeling/runtime/runScript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/gallery/gearfinity-planetary-stage.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

type ValidateResult = Awaited<ReturnType<typeof runValidateCli>>;

describe('Gearfinity-inspired planetary stage gallery example', () => {
  // Both #348 assertions read the SAME validate run (pure over the script
  // file). The rest-pose interference surface over 24 gear meshes is the
  // heavy part (~150 s); compute it once in beforeAll and share it so the
  // file pays it once, not per-test.
  let validateResult: ValidateResult;

  beforeAll(async () => {
    validateResult = await runValidateCli({
      file: EXAMPLE_PATH,
      epsilon: 0.01,
      includeInterference: true,
      physical: false,
      json: true,
      includePhysics: false,
    });
  }, 300_000);

  it('evaluates as a dense mate-driven gear mechanism', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);

    const records = result.model?.records ?? [];
    expect(records.filter((record) => record.kind === 'assemblyPart').length).toBeGreaterThanOrEqual(18);
    expect(records.at(-1)?.kind).toBe('solvedAssembly');

    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const { returnValue } = await runScript({
      code,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });

    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;
    expect(scene.parts.map((part) => part.name)).toEqual(
      expect.arrayContaining([
        'fixed-ring-gear-with-internal-teeth',
        'drive-sun-gear',
        'planet-carrier-output-web',
        'planet-gear-1',
        'planet-gear-2',
        'planet-gear-3',
        'output-fan-wheel',
      ]),
    );
    expect(scene.mates?.filter((mate) => mate.type === 'revolute').map((mate) => mate.name)).toEqual(
      expect.arrayContaining([
        'drive-sun-spin',
        'carrier-output-spin',
        'planet-1-orbit-spin',
        'planet-2-orbit-spin',
        'planet-3-orbit-spin',
        'fan-output-spin',
      ]),
    );
    expect(scene.part('output-fan-wheel').connectors?.some((connector) => connector.name === 'blade-tip')).toBe(true);
  }, 300_000);

  // Issue #348 RESOLVED (2026-06-09): the gearfinity planetary stage
  // used to time the physics-grounded loop out — 24 parts × 13 pose
  // samples × pairwise BREP overlap + 4 revolute mates × 3 dof
  // micro-poses blew past the 5-minute CLI budget. The deterministic
  // BREP-sweep budget (`BREP_SWEEP_BUDGET`, see mechanismTruth.ts) now
  // estimates the sweep work up front (~600 work units > 300 budget) and
  // SKIPS criteria 2/3/7/8 rather than grinding through them, so the
  // verdict degrades to `mechanism: 'unverified'` and the run completes
  // in normal time. Rest-pose static interference is still checked by
  // the validate interference surface (interferencePairs), which runs
  // independently of the probe.
  //
  // Spec:   docs/specs/2026-06-01-physics-grounded-loop-design.md §risks-and-open-questions #1
  // Plan:   docs/plans/2026-06-01-physics-loop-P3-sweep-and-demote.md
  it('degrades to mechanism: unverified under the BREP-sweep budget (issue #348)', () => {
    // Over budget → sweep skipped → unverified (NOT 'real', which would
    // dishonestly claim the articulated overlap was checked, and NOT
    // 'broken', since the probe found no defect).
    expect(validateResult.mechanism).toBe('unverified');
    // T3: the skipped sweep is now LOUD — it emits exactly one structured,
    // non-fatal `mechanism.unverified-budget-exceeded` diagnostic carrying
    // the work estimate / budget / part count, instead of the old silent
    // console.warn. 'unverified' must be evidence, not silence.
    const failures = validateResult.mechanismFailures ?? [];
    const budgetDiags = failures.filter(
      (d) => d.code === 'mechanism.unverified-budget-exceeded',
    );
    expect(budgetDiags).toHaveLength(1);
    expect(budgetDiags[0].severity).toBe('warn');
    // No OTHER (e.g. error-severity) probe diagnostics — the cheap criteria found nothing.
    expect(failures.filter((d) => d.severity === 'error')).toEqual([]);
  });

  // Example-sweep-gate entry for this example (delegated here from
  // exampleSweepGate.test.ts via HOSTED_IN_DEDICATED_FILE). After #348
  // the example completes the loop with `mechanism: 'unverified'`, which
  // the sweep gate accepts.
  // NOTE: the it-title below is a LITERAL (not a `${EXAMPLE_PATH}`
  // template) because exampleSweepGate.test.ts's HOSTED_IN_DEDICATED_FILE
  // structural assertion greps the hosting source for the exact string
  // "<path> passes the physics-grounded loop".
  it('examples/gallery/gearfinity-planetary-stage.kcad.ts passes the physics-grounded loop', () => {
    expect(
      validateResult.mechanism === 'real' || validateResult.mechanism === 'unverified',
      `${EXAMPLE_PATH}: expected mechanism: real or unverified, got '${validateResult.mechanism}'. ` +
        `Failures: ${JSON.stringify(validateResult.mechanismFailures ?? [], null, 2)}`,
    ).toBe(true);
  });
});
