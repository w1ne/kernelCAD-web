// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  configPath, loadConfig, saveConfig, ensureInstallId,
  isTelemetryEnabled, isDebug,
} from './config';

let dir: string;
const ENV_KEYS = ['KERNELCAD_TELEMETRY', 'KERNELCAD_TELEMETRY_DISABLED', 'DO_NOT_TRACK', 'CI', 'KERNELCAD_TELEMETRY_DEBUG', 'KERNELCAD_CONFIG_HOME'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  dir = mkdtempSync(join(tmpdir(), 'kc-tel-'));
  process.env.KERNELCAD_CONFIG_HOME = dir; // test seam for the config dir
});
afterEach(() => {
  for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  rmSync(dir, { recursive: true, force: true });
});

describe('config path + persistence', () => {
  it('writes under the config home', () => {
    expect(configPath()).toBe(join(dir, 'kernelcad', 'telemetry.json'));
    saveConfig({ enabled: true, installId: 'abc', notified: true });
    expect(existsSync(configPath())).toBe(true);
    expect(JSON.parse(readFileSync(configPath(), 'utf8')).installId).toBe('abc');
  });

  it('ensureInstallId is stable across calls', () => {
    const a = ensureInstallId();
    const b = ensureInstallId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('consent resolution — default on, any off-switch wins', () => {
  it('enabled by default when nothing is set', () => {
    expect(isTelemetryEnabled()).toBe(true);
  });
  it.each([
    ['KERNELCAD_TELEMETRY', '0'],
    ['KERNELCAD_TELEMETRY_DISABLED', '1'],
    ['DO_NOT_TRACK', '1'],
    ['CI', 'true'],
  ])('disabled when %s=%s', (k, v) => {
    process.env[k] = v;
    expect(isTelemetryEnabled()).toBe(false);
  });
  it('disabled when config says enabled:false', () => {
    saveConfig({ enabled: false, installId: 'abc', notified: true });
    expect(isTelemetryEnabled()).toBe(false);
  });
  it('KERNELCAD_TELEMETRY=1 does NOT override DO_NOT_TRACK', () => {
    process.env.KERNELCAD_TELEMETRY = '1';
    process.env.DO_NOT_TRACK = '1';
    expect(isTelemetryEnabled()).toBe(false);
  });
});

describe('debug mode', () => {
  it('isDebug true only when env set to 1', () => {
    expect(isDebug()).toBe(false);
    process.env.KERNELCAD_TELEMETRY_DEBUG = '1';
    expect(isDebug()).toBe(true);
  });
});
