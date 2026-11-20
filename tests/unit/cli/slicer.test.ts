// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runOpenSlicerCli, slicerCommand } from '../../../src/agent/cli/commands/slicer';
import { openFileInSlicer } from '../../../src/kernel/export/gcode/slicerCli';
import { guardCliCommand } from '../../../src/agent/cli/lib/sandboxCli';
import { buildProgram } from '../../../src/agent/cli/program';
import { enableSandbox, disableSandboxForTest } from '../../../src/shared/sandbox/enable';
import { isSandboxError } from '../../../src/shared/sandbox/errors';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../../../src/kernel/export/gcode/slicerCli', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/kernel/export/gcode/slicerCli')>();
  return { ...actual, openFileInSlicer: vi.fn() };
});

describe('runOpenSlicerCli', () => {
  it('rejects an unsupported extension with exit code 2', async () => {
    const r = await runOpenSlicerCli({ file: '/tmp/part.stl' });
    expect(r.exitCode).toBe(2);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('.stl');
  });

  it('rejects a missing file with exit code 2', async () => {
    const r = await runOpenSlicerCli({ file: '/nonexistent/path/part.step' });
    expect(r.exitCode).toBe(2);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Cannot read file');
  });
});

describe('slicer open command', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let tmpDir: string;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    tmpDir = mkdtempSync(join(tmpdir(), 'kcad-cli-slicer-'));
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    process.exitCode = 0;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('opens a 3mf and reports success', async () => {
    const file = join(tmpDir, 'part.3mf');
    writeFileSync(file, '3MF');
    vi.mocked(openFileInSlicer).mockResolvedValueOnce({
      ok: true,
      file,
      binary: '/usr/bin/orca-slicer',
    });
    await slicerCommand().parseAsync(['open', file], { from: 'user' });
    expect(process.exitCode).toBe(0);
    expect(logSpy.mock.calls.flat().join('\n')).toContain(`Requested /usr/bin/orca-slicer to open ${file}`);
  });

  it('emits a typed no-slicer result as JSON and exits 1', async () => {
    const file = join(tmpDir, 'part.step');
    writeFileSync(file, 'ISO-10303-21;');
    vi.mocked(openFileInSlicer).mockResolvedValueOnce({
      ok: false,
      file,
      error: 'no-slicer',
      message: 'No slicer found.',
    });
    await slicerCommand().parseAsync(['open', file, '--json'], { from: 'user' });
    expect(process.exitCode).toBe(1);
    const envelope = JSON.parse(logSpy.mock.calls.flat().join('\n'));
    expect(envelope).toEqual({
      ok: false,
      file,
      error: 'no-slicer',
      message: `No slicer found. The file remains at ${file}.`,
    });
  });

  it('prints a human error on spawn failure', async () => {
    const file = join(tmpDir, 'part.step');
    writeFileSync(file, 'ISO-10303-21;');
    vi.mocked(openFileInSlicer).mockResolvedValueOnce({
      ok: false,
      file,
      binary: '/usr/bin/orca-slicer',
      error: 'spawn-failed',
      message: 'exec format error',
    });
    await slicerCommand().parseAsync(['open', file], { from: 'user' });
    expect(process.exitCode).toBe(1);
    expect(errSpy.mock.calls.flat().join('\n')).toContain('Slicer failed to start');
  });
});

describe('slicer open sandbox guard', () => {
  let ws: string;

  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), 'kc-slicer-sbx-'));
    enableSandbox({ workspace: ws, env: { ...process.env }, installGuards: false });
  });

  afterEach(() => {
    disableSandboxForTest();
    rmSync(ws, { recursive: true, force: true });
  });

  it('is refused outright in sandbox mode', () => {
    const program = buildProgram();
    const slicer = program.commands.find(c => c.name() === 'slicer')!;
    const open = slicer.commands.find(c => c.name() === 'open')!;
    (open as unknown as { processedArgs: unknown[] }).processedArgs = [join(ws, 'part.step')];

    let err: unknown;
    try {
      guardCliCommand(open);
    } catch (e) {
      err = e;
    }

    expect(isSandboxError(err)).toBe(true);
    expect((err as { code: string }).code).toBe('cli.sandbox-command-refused');
    expect((err as { message: string }).message).toContain('slicer open');
  });
});
