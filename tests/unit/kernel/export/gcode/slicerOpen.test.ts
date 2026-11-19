// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openFileInSlicer } from '../../../../../src/kernel/export/gcode/slicerCli';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: vi.fn() };
});

function fakeChildProcess(opts: { error?: Error } = {}) {
  const child = new EventEmitter() as ReturnType<typeof spawn> & EventEmitter;
  child.unref = vi.fn();
  // Emit the event asynchronously to mirror real child_process.spawn behaviour:
  // the returned ChildProcess object reports success or failure via events.
  setImmediate(() => {
    if (opts.error) child.emit('error', opts.error);
    else child.emit('spawn');
  });
  return child as unknown as ReturnType<typeof spawn>;
}

describe('openFileInSlicer', () => {
  const savedEnv = process.env.KERNELCAD_SLICER;
  const savedPath = process.env.PATH;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kcad-slicer-open-'));
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.KERNELCAD_SLICER;
    else process.env.KERNELCAD_SLICER = savedEnv;
    process.env.PATH = savedPath;
    rmSync(tmpDir, { recursive: true, force: true });
    vi.mocked(spawn).mockClear();
  });

  it('returns a typed no-slicer result when nothing is installed', async () => {
    delete process.env.KERNELCAD_SLICER;
    process.env.PATH = '/nonexistent-bin-dir-for-test';
    const result = await openFileInSlicer('/some/file.step');
    expect(result).toMatchObject({
      ok: false,
      file: '/some/file.step',
      error: 'no-slicer',
    });
    expect(result.message).toContain('No slicer found');
  });

  it('spawns the detected slicer with the file and leaves the file untouched', async () => {
    const binary = join(tmpDir, 'fake-slicer');
    writeFileSync(binary, '#!/bin/sh\n');
    chmodSync(binary, 0o755);
    process.env.KERNELCAD_SLICER = binary;
    delete process.env.PATH; // ensure only the env var matters

    const model = join(tmpDir, 'part.step');
    writeFileSync(model, 'ISO-10303-21;');

    vi.mocked(spawn).mockReturnValueOnce(fakeChildProcess());

    const result = await openFileInSlicer(model);
    expect(result.ok).toBe(true);
    expect(result.file).toBe(model);
    expect(result.binary).toBe(binary);

    expect(vi.mocked(spawn)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(binary, [model], { detached: true, stdio: 'ignore' });

    // No-overwrite behavior: the existing file is not modified by the open action.
    expect(statSync(model).size).toBe('ISO-10303-21;'.length);
  });

  it('returns spawn-failed when the slicer cannot be launched', async () => {
    const binary = join(tmpDir, 'fake-slicer');
    writeFileSync(binary, '#!/bin/sh\n');
    chmodSync(binary, 0o755);
    process.env.KERNELCAD_SLICER = binary;

    const model = join(tmpDir, 'part.3mf');
    writeFileSync(model, '3MF');

    vi.mocked(spawn).mockImplementationOnce(() => { throw new Error('exec format error'); });

    const result = await openFileInSlicer(model);
    expect(result).toEqual({
      ok: false,
      file: model,
      binary,
      error: 'spawn-failed',
      message: 'exec format error',
    });
  });

  it('returns spawn-failed when the slicer reports an async spawn error', async () => {
    const binary = join(tmpDir, 'fake-slicer');
    writeFileSync(binary, '#!/bin/sh\n');
    chmodSync(binary, 0o755);
    process.env.KERNELCAD_SLICER = binary;

    const model = join(tmpDir, 'part.step');
    writeFileSync(model, 'ISO-10303-21;');

    const asyncError = new Error('EACCES');
    vi.mocked(spawn).mockReturnValueOnce(fakeChildProcess({ error: asyncError }));

    const result = await openFileInSlicer(model);
    expect(result).toEqual({
      ok: false,
      file: model,
      binary,
      error: 'spawn-failed',
      message: 'EACCES',
    });
  });

  it('unrefs the child only after a successful spawn', async () => {
    const binary = join(tmpDir, 'fake-slicer');
    writeFileSync(binary, '#!/bin/sh\n');
    chmodSync(binary, 0o755);
    process.env.KERNELCAD_SLICER = binary;

    const model = join(tmpDir, 'part.3mf');
    writeFileSync(model, '3MF');

    const child = fakeChildProcess();
    vi.mocked(spawn).mockReturnValueOnce(child);

    await openFileInSlicer(model);
    expect(child.unref).toHaveBeenCalledTimes(1);
  });

  it('does not unref the child when spawn fails asynchronously', async () => {
    const binary = join(tmpDir, 'fake-slicer');
    writeFileSync(binary, '#!/bin/sh\n');
    chmodSync(binary, 0o755);
    process.env.KERNELCAD_SLICER = binary;

    const model = join(tmpDir, 'part.3mf');
    writeFileSync(model, '3MF');

    const child = fakeChildProcess({ error: new Error('ENOENT') });
    vi.mocked(spawn).mockReturnValueOnce(child);

    await openFileInSlicer(model);
    expect(child.unref).not.toHaveBeenCalled();
  });
});
