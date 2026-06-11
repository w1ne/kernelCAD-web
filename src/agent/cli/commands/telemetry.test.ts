// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { telemetryCommand } from './telemetry';
import { loadConfig } from '../../../shared/telemetry/config';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'kc-tel-cli-'));
  process.env.KERNELCAD_CONFIG_HOME = dir;
  delete process.env.KERNELCAD_TELEMETRY;
  delete process.env.DO_NOT_TRACK;
  delete process.env.CI;
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

async function run(...argv: string[]) {
  await telemetryCommand().parseAsync(['node', 'kernelcad', ...argv]);
}

describe('kernelcad telemetry', () => {
  it('disable then enable flips the persisted flag', async () => {
    await run('disable');
    expect(loadConfig()?.enabled).toBe(false);
    await run('enable');
    expect(loadConfig()?.enabled).toBe(true);
  });

  it('reset regenerates the install id', async () => {
    await run('enable');
    const first = loadConfig()!.installId;
    await run('reset');
    expect(loadConfig()!.installId).not.toBe(first);
  });

  it('status reports the resolved state without throwing', async () => {
    await expect(run('status')).resolves.toBeUndefined();
  });
});
