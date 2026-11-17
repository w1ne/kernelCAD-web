// SPDX-License-Identifier: MIT
// Named part configurations are a file contract: a literal map, typed against
// the source's param() declarations, and hashed into the evaluate-cache key.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import '../../../src/modeling/runtime/hostFsNode';
import { KernelError } from '../../../src/shared/intent/kernelError';
import { evaluateCacheKey } from '../../../src/composition/evaluateCache';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { declareConfigurations } from '../../../src/modeling/capture/partDefinition';
import {
  assertConfigurationAssignments,
  configurationByName,
  configurationImportIdentity,
  partEvalMemoKey,
  readConfigurations,
  rewriteParamsForConfiguration,
} from '../../../src/modeling/capture/partConfiguration';

const PART = `
const length = param('length', 80, { min: 70, max: 120, unit: 'mm' });
const width = param('width', 50, { min: 45, max: 90 });
const label = param('label', 'block', { maxLength: 12 });
// configurations({ decoy: { length: 1 } }) is a comment, not a second call.
configurations({
  compact: { length: 80, width: 50 },
  wide: { length: 110, width: 70, label: 'wide' },
});
return box(length, width, 18);
`;

function kernelError(fn: () => void): KernelError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(KernelError);
    return error as KernelError;
  }
  throw new Error('expected KernelError');
}

describe('part configuration source contract', () => {
  it('reads every named literal set and ignores a commented call', () => {
    const sets = readConfigurations(PART);
    expect(sets.map((set) => set.name)).toEqual(['compact', 'wide']);
    expect(configurationByName(sets, 'compact').values).toEqual({ length: 80, width: 50 });
    expect(configurationByName(sets, 'wide').values).toEqual({
      length: 110,
      width: 70,
      label: 'wide',
    });
  });

  it('names the missing configuration and the sets the file actually declares', () => {
    const error = kernelError(() => configurationByName(readConfigurations(PART), 'huge'));
    expect(error.code).toBe('feature.invalid-args');
    expect(error.message).toContain('huge');
    expect(error.message).toContain('compact');
    expect(error.message).toContain('wide');
    expect(error.hint).toContain('invalid-args.assembly.configuration-missing');
  });

  it('rejects a string assigned to a numeric parameter before any geometry runs', () => {
    const sets = readConfigurations(`
      const length = param('length', 10, { min: 5, max: 40 });
      configurations({ ok: { length: 12 }, bad: { length: 'wide' } });
      return box(length, 8, 4);
    `);
    const error = kernelError(() => assertConfigurationAssignments(PART.slice(0, 0) + `
      const length = param('length', 10, { min: 5, max: 40 });
      configurations({ ok: { length: 12 }, bad: { length: 'wide' } });
    `, configurationByName(sets, 'bad')));
    expect(error.hint).toContain('invalid-args.assembly.configuration-invalid-value');
    expect(error.message).toContain('bad');
    expect(error.message).toContain('length');
    expect(error.message).toContain('number');
    expect(error.message).toContain('wide');
  });

  it('rejects a number outside the declared min and max', () => {
    const code = `const length = param('length', 80, { min: 70, max: 120 });
      configurations({ over: { length: 200 } });`;
    const error = kernelError(() => {
      assertConfigurationAssignments(code, configurationByName(readConfigurations(code), 'over'));
    });
    expect(error.hint).toContain('invalid-args.assembly.configuration-invalid-value');
    expect(error.message).toContain('200');
    expect(error.message).toContain('120');
  });

  it('rewrites each configuration from the original source, so the sets cannot cross-talk', () => {
    const source = "const length = param('length', 80, { min: 70, max: 120 });";
    const compact = rewriteParamsForConfiguration(source, { length: 80 });
    const wide = rewriteParamsForConfiguration(source, { length: 110 });
    expect(source).toContain("param('length', 80");
    expect(compact).toContain("param('length', 80");
    expect(wide).toContain("param('length', 110");
    expect(wide).not.toContain("param('length', 80");
  });

  it('puts the configuration name and the part bytes into the part-eval memo key', () => {
    const bytes = new TextEncoder().encode('part-a');
    const other = new TextEncoder().encode('part-b');
    const compact = partEvalMemoKey(bytes, 'compact', { length: 80 });
    expect(partEvalMemoKey(bytes, 'wide', { length: 110 })).not.toBe(compact);
    expect(partEvalMemoKey(other, 'compact', { length: 80 })).not.toBe(compact);
    expect(partEvalMemoKey(bytes, 'compact', { length: 80 })).toBe(compact);
  });

  it('treats a non-literal configuration as an unprovable evaluate-cache dependency', async () => {
    const identity = await configurationImportIdentity(
      "await arm.instance('block', { source: './part.kcad.ts', configuration: cfg });",
      '/tmp',
    );
    expect(identity).toContain('unprovable:');
  });

  it('changes the evaluate-cache key when the instanced part file changes and the assembly file does not', async () => {
    const dir = join(tmpdir(), `kcad-config-cache-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const assembly = join(dir, 'assembly.kcad.ts');
    const part = join(dir, 'part.kcad.ts');
    writeFileSync(assembly, "await arm.instance('block', { source: './part.kcad.ts', configuration: 'compact' });\nreturn arm;\n");
    writeFileSync(part, 'configurations({ compact: { length: 80 } });\n');
    const before = await evaluateCacheKey({ file: assembly });
    writeFileSync(part, 'configurations({ compact: { length: 110 } });\n');
    const after = await evaluateCacheKey({ file: assembly });
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after).not.toBe(before);

    const dynamic = join(dir, 'dynamic.kcad.ts');
    writeFileSync(dynamic, "const name = 'compact';\nawait arm.instance('block', { source: './part.kcad.ts', configuration: name });\n");
    expect(await evaluateCacheKey({ file: dynamic })).toBeUndefined();
  });

  it('checks every configuration on a copy and leaves the live parameter table', () => {
    const session = new CaptureSession();
    session.paramTable.declare('length', 'number', 10, { min: 5, max: 40 });
    declareConfigurations(session, { ok: { length: 12 }, wide: { length: 30 } });
    expect(session.paramTable.get('length').value).toBe(10);
    expect(() => declareConfigurations(session, { again: { length: 12 } })).toThrow(/single configurations/);

    const bad = new CaptureSession();
    bad.paramTable.declare('length', 'number', 10, { min: 5, max: 40 });
    expect(() => declareConfigurations(bad, { ok: { length: 12 }, bad: { length: 'wide' } })).toThrow(KernelError);
    expect(bad.paramTable.get('length').value).toBe(10);
  });
});
