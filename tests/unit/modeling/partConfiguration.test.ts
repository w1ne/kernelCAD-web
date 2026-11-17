// SPDX-License-Identifier: MIT
// Named part configurations are a file contract: a literal map, typed against
// the source's param() declarations, and hashed into the evaluate-cache key.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateCacheKey } from '../../../src/composition/evaluateCache';
import '../../../src/modeling/runtime/hostFsNode';
import { KernelError } from '../../../src/shared/intent/kernelError';
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

  it('puts the resolved path, configuration name, and part bytes into the part-eval memo key', async () => {
    const bytes = new TextEncoder().encode('return box(1, 1, 1);\n');
    const other = new TextEncoder().encode('return box(2, 2, 2);\n');
    const source = {
      bytes,
      absolutePath: '/parts/a/block.kcad.ts',
      scriptDir: '/parts/a',
      text: 'return box(1, 1, 1);\n',
    };
    const compact = await partEvalMemoKey(source, 'compact', { length: 80 });
    expect(compact).toBeDefined();
    expect(await partEvalMemoKey(source, 'wide', { length: 110 })).not.toBe(compact);
    expect(await partEvalMemoKey({ ...source, bytes: other, text: 'return box(2, 2, 2);\n' }, 'compact', { length: 80 })).not.toBe(compact);
    expect(await partEvalMemoKey(
      { ...source, absolutePath: '/parts/b/block.kcad.ts', scriptDir: '/parts/b' },
      'compact',
      { length: 80 },
    )).not.toBe(compact);
    expect(await partEvalMemoKey(source, 'compact', { length: 80 })).toBe(compact);
  });

  it('does not memo a part whose geometry path is not a literal', async () => {
    const text = "const file = 'block.step';\nreturn await lib.fromSTEP(file);\n";
    expect(await partEvalMemoKey({
      bytes: new TextEncoder().encode(text),
      absolutePath: '/parts/a/block.kcad.ts',
      scriptDir: '/parts/a',
      text,
    }, 'only', {})).toBeUndefined();
  });

  it('changes the memo key when only the geometry file beside the part changes', async () => {
    const dir = join(tmpdir(), `kcad-config-memo-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const text = "configurations({ only: {} });\nreturn await lib.fromSTEP('block.step');\n";
    const step = join(dir, 'block.step');
    writeFileSync(step, 'ISO-10303-21; STEP A;');
    const source = {
      bytes: new TextEncoder().encode(text),
      absolutePath: join(dir, 'part.kcad.ts'),
      scriptDir: dir,
      text,
    };
    const before = await partEvalMemoKey(source, 'only', {});
    writeFileSync(step, 'ISO-10303-21; STEP B;');
    const after = await partEvalMemoKey(source, 'only', {});
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after).not.toBe(before);
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

  it('changes a provable evaluate-cache identity when only the configuration name changes', async () => {
    const dir = join(tmpdir(), `kcad-config-name-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const part = join(dir, 'part.kcad.ts');
    writeFileSync(part, 'configurations({ compact: { length: 80 }, wide: { length: 110 } });\n');
    const compactFile = join(dir, 'compact.kcad.ts');
    const wideFile = join(dir, 'wide.kcad.ts');
    writeFileSync(compactFile, "await arm.instance('block', { source: './part.kcad.ts', configuration: 'compact' });\nreturn arm;\n");
    writeFileSync(wideFile, "await arm.instance('block', { source: './part.kcad.ts', configuration: 'wide' });\nreturn arm;\n");
    const compactKey = await evaluateCacheKey({ file: compactFile });
    const wideKey = await evaluateCacheKey({ file: wideFile });
    expect(compactKey).toBeDefined();
    expect(wideKey).toBeDefined();
    const marker = ':configs:';
    const compactId = compactKey!.slice(compactKey!.indexOf(marker) + marker.length);
    const wideId = wideKey!.slice(wideKey!.indexOf(marker) + marker.length);
    expect(compactId.endsWith('|config:compact')).toBe(true);
    expect(wideId.endsWith('|config:wide')).toBe(true);
    expect(compactId.slice(0, compactId.lastIndexOf('|config:'))).toBe(wideId.slice(0, wideId.lastIndexOf('|config:')));
  });

  it('includes the part path and a changed geometry file beside that part', async () => {
    const root = join(tmpdir(), `kcad-config-assets-${process.pid}`);
    const part = "configurations({ only: {} });\nreturn await lib.fromSTEP('block.step');\n";
    const code = "await arm.instance('block', { source: './part.kcad.ts', configuration: 'only' });\n";
    const dirA = join(root, 'a');
    const dirB = join(root, 'b');
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });
    writeFileSync(join(dirA, 'part.kcad.ts'), part);
    writeFileSync(join(dirB, 'part.kcad.ts'), part);
    writeFileSync(join(dirA, 'block.step'), 'ISO-10303-21; STEP A;');
    writeFileSync(join(dirB, 'block.step'), 'ISO-10303-21; STEP B;');
    const idA = await configurationImportIdentity(code, dirA);
    const idB = await configurationImportIdentity(code, dirB);
    expect(idA).not.toContain('unprovable:');
    expect(idB).not.toContain('unprovable:');
    expect(idA).not.toBe(idB);
    expect(idA).toContain(join(dirA, 'part.kcad.ts'));
    expect(idA).toContain(join(dirA, 'block.step'));
    expect(idB).toContain(join(dirB, 'block.step'));

    writeFileSync(join(dirA, 'block.step'), 'ISO-10303-21; STEP C;');
    const idAChanged = await configurationImportIdentity(code, dirA);
    expect(idAChanged).not.toBe(idA);
    expect(idAChanged).not.toContain('unprovable:');
  });

  it('follows a nested part and hashes the geometry file that nested part reads', async () => {
    const dir = join(tmpdir(), `kcad-config-nested-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'insert.step'), 'ISO-10303-21; INSERT A;');
    writeFileSync(join(dir, 'insert.kcad.ts'), "configurations({ only: {} });\nreturn await lib.fromSTEP('insert.step');\n");
    writeFileSync(join(dir, 'housing.kcad.ts'), "configurations({ only: {} });\nawait arm.instance('insert', { source: './insert.kcad.ts', configuration: 'only' });\n");
    const code = "await arm.instance('housing', { source: './housing.kcad.ts', configuration: 'only' });\n";
    const before = await configurationImportIdentity(code, dir);
    writeFileSync(join(dir, 'insert.step'), 'ISO-10303-21; INSERT B;');
    const after = await configurationImportIdentity(code, dir);
    expect(before).not.toContain('unprovable:');
    expect(after).not.toContain('unprovable:');
    expect(after).not.toBe(before);
    expect(before).toContain(join(dir, 'insert.step'));
  });

  it('does not prove an identity when two part files instance each other', async () => {
    const dir = join(tmpdir(), `kcad-config-cycle-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const cycle = "configurations({ only: {} });\n";
    writeFileSync(join(dir, 'a.kcad.ts'), `${cycle}await arm.instance('b', { source: './b.kcad.ts', configuration: 'only' });\n`);
    writeFileSync(join(dir, 'b.kcad.ts'), `${cycle}await arm.instance('a', { source: './a.kcad.ts', configuration: 'only' });\n`);
    const identity = await configurationImportIdentity(
      "await arm.instance('a', { source: './a.kcad.ts', configuration: 'only' });\n",
      dir,
    );
    expect(identity).toContain('unprovable:');
  });

  it('does not cache an assembly whose part reads a geometry path that is not a literal', async () => {
    const dir = join(tmpdir(), `kcad-config-dynamic-asset-${process.pid}`);
    mkdirSync(dir, { recursive: true });
    const assembly = join(dir, 'assembly.kcad.ts');
    writeFileSync(assembly, "await arm.instance('block', { source: './part.kcad.ts', configuration: 'only' });\nreturn arm;\n");
    writeFileSync(join(dir, 'part.kcad.ts'), "const file = 'block.step';\nconfigurations({ only: {} });\nreturn await lib.fromSTEP(file);\n");
    writeFileSync(join(dir, 'block.step'), 'ISO-10303-21; STEP A;');
    expect(await evaluateCacheKey({ file: assembly })).toBeUndefined();
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
