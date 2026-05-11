// Integration test for the v0.6 SO-100 mate-graph hero
// (`examples/robot-arm/so100/so100-mates.kcad.ts`).
//
// Two complementary checks:
//   1. Run the script via `evaluateAndBuildScript`, the same harness the
//      `kernelcad evaluate` CLI uses. This exercises STEP import, capture,
//      and lowering end-to-end; the harness flips the validate-gate default
//      to `'error'`, so any error-severity diagnostic would surface as a
//      non-zero exitCode + a CompilerDiagnostic. Zero diagnostics here means
//      the validator agrees the assembly is consistent.
//   2. Run the script via `runScript` (which preserves the script's return
//      value) and inspect the returned `Scene.warnings`. The hero passes
//      `validate: 'warn'` explicitly, so the Scene carries the full
//      diagnostic chain. We assert `warnings.length === 0` — the spec's
//      acceptance criterion for T12.

import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/cli/commands/evaluate';
import { runScript } from '../../../src/script-runtime/runScript';
import { Scene } from '../../../src/intent/scene';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PATH = 'examples/robot-arm/so100/so100-mates.kcad.ts';
const EXAMPLE_ABSOLUTE = resolvePath(__dirname, '../../..', EXAMPLE_PATH);

describe('so100 mate-graph hero (v0.6)', () => {
  it('evaluates end-to-end with zero diagnostics', async () => {
    const result = await evaluateAndBuildScript({ file: EXAMPLE_PATH });

    expect(result.evaluation.exitCode).toBe(0);
    expect(result.evaluation.diagnostics).toEqual([]);

    const records = result.model?.records ?? [];
    const importedSteps = records.filter((r) => r.kind === 'importedStep');
    const parts = records.filter((r) => r.kind === 'assemblyPart');

    // Same part inventory as the v0.5 hero: four STEP imports (two
    // STS3215 servos, the passive horn, the moving jaw) plus two locally-
    // authored plates (base + bracket) → six assemblyParts under the
    // 'so100-mates' assembly.
    expect(importedSteps.length).toBe(4);
    expect(parts.length).toBe(6);

    // Mates are not their own FeatureRecord (they ride on the assembly
    // capture state) — the only assembly-level record this hero emits is
    // the trailing solvedAssembly.
    expect(records.at(-1)?.kind).toBe('solvedAssembly');
  }, 120_000);

  it('returns a Scene with zero validator warnings', async () => {
    // `runScript` (vs `evaluateAndBuildScript`) preserves the script's
    // return value, which is the Scene from `arm.solvedModel({validate:'warn'})`.
    // Under `warn` mode the validator runs and attaches the full diagnostic
    // chain to `scene.warnings`; a clean assembly returns an empty chain.
    const code = await readFile(EXAMPLE_ABSOLUTE, 'utf8');
    const { returnValue } = await runScript({
      code,
      fileName: EXAMPLE_ABSOLUTE,
      scriptDir: dirname(EXAMPLE_ABSOLUTE),
    });

    expect(returnValue).toBeInstanceOf(Scene);
    const scene = returnValue as Scene;
    // Acceptance criterion for T12 of the v0.6 assembly mates plan:
    // every part participates in the mate graph, no over-/under-constrained
    // diagnostics, solver returns 'solved'. Warnings === 0.
    expect(scene.warnings).toHaveLength(0);
    expect(scene.parts.length).toBe(6);
    expect(scene.mates?.length).toBe(5);
  }, 120_000);
});
