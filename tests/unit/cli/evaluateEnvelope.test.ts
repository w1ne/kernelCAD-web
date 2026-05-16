// tests/unit/cli/evaluateEnvelope.test.ts
//
// Task 7 of pose-envelope review-loop closure: `kernelcad evaluate`
// `--envelope` / `--samples-per-mate <n>` / `--combinatorial` flags.
//
// Predecessor (Task 6): `Assembly.solvedModel(poses, {posesGate:'envelope'})`
// already runs `reviewPoseEnvelope` and throws under `validate:'error'`. This
// task wires CLI flags so the harness gate fires on the script's captured
// assemblies even when the script never calls `solvedModel(...)` (e.g.
// returns `arm.model()`).

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateWithEnvelope } from '../../../src/cli/commands/evaluate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('kernelcad evaluate --envelope', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('kernelcad evaluate --envelope exits 2 when pose-envelope has an error diagnostic', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'out-of-limits.kcad.ts');
    writeFileSync(file, `
      const arm = assembly('rig');
      arm.part('base', box(10, 10, 10))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.part('link', box(5, 5, 5))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
        pose: 120,
        limitsDeg: [-90, 90],
      });
      return arm.model();
    `);

    const result = await evaluateWithEnvelope({ file, envelope: true });
    expect(result.exitCode).toBe(2);
    const errCodes = result.envelopeDiagnostics?.filter((d) => d.severity === 'error').map((d) => d.code) ?? [];
    expect(errCodes).toContain('assembly.pose.out-of-limits');
  }, 60000);

  it('kernelcad evaluate (no flag) exits 0 on the same script', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'out-of-limits.kcad.ts');
    writeFileSync(file, `
      const arm = assembly('rig');
      arm.part('base', box(10, 10, 10))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.part('link', box(5, 5, 5))
        .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
      arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', {
        pose: 120,
        limitsDeg: [-90, 90],
      });
      return arm.model();
    `);

    const result = await evaluateWithEnvelope({ file, envelope: false });
    expect(result.exitCode).toBe(0);
  }, 60000);

  it('kernelcad evaluate --samples-per-mate 4 without --envelope exits 1 with diagnostic', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    writeFileSync(file, `
      const b = box(10, 10, 10);
      return b;
    `);

    const result = await evaluateWithEnvelope({ file, envelope: false, samplesPerMate: 4 });
    expect(result.exitCode).toBe(1);
    expect(result.misuseMessage).toMatch(/--samples-per-mate has no effect without --envelope/);
  }, 60000);

  it('kernelcad evaluate --envelope --samples-per-mate 4 propagates sampling to the gate', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'single-part.kcad.ts');
    // Per task: "if too brittle [to construct a clean multi-part envelope
    // under includeInterference: true], just verify that the CLI accepts the
    // flag and exits 0 on a clean script — coverage is in the unit tests,
    // integration just confirms wiring." Single-part assembly: no mates, so
    // no per-mate samples are added; only the 'current' sample runs. No
    // pairwise interference is possible with one part. exit 0 confirms the
    // CLI parses --samples-per-mate without crashing.
    writeFileSync(file, `
      const arm = assembly('rig');
      arm.part('base', box(10, 10, 10));
      return arm.model();
    `);

    const result = await evaluateWithEnvelope({ file, envelope: true, samplesPerMate: 4 });
    expect(result.exitCode).toBe(0);
    expect(result.envelopeSampleCount).toBe(1);
  }, 60000);

  it('returns exitCode 0 with no envelope output when --envelope set but script has no assemblies', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'noasm.kcad.ts');
    writeFileSync(file, `
      const b = box(10, 10, 10);
      return b;
    `);

    const result = await evaluateWithEnvelope({ file, envelope: true });
    expect(result.exitCode).toBe(0);
    expect(result.envelopeDiagnostics ?? []).toEqual([]);
  }, 60000);

  it('kernelcad evaluate --combinatorial without --envelope exits 1 with diagnostic', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-test-'));
    const file = join(tmp, 'demo.kcad.ts');
    writeFileSync(file, `
      const b = box(10, 10, 10);
      return b;
    `);

    const result = await evaluateWithEnvelope({ file, envelope: false, combinatorial: true });
    expect(result.exitCode).toBe(1);
    expect(result.misuseMessage).toMatch(/--combinatorial has no effect without --envelope/);
  }, 60000);
});
