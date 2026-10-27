// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRunIdentity, assertRunIdentity, identifyCli } from './runIdentity';

describe('benchmark run identity', () => {
  it('records CLI identity and detects when the selected executable changes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cgb-cli-'));
    const cli = join(dir, 'kernelcad.js');
    writeFileSync(cli, 'first build');
    const before = identifyCli({ KERNELCAD_BIN: cli }, dir);
    expect(before.path).toBe(realpathSync(cli));
    expect(before.sha256).toMatch(/^[0-9a-f]{64}$/);
    writeFileSync(cli, 'second build');
    expect(identifyCli({ KERNELCAD_BIN: cli }, dir).sha256).not.toBe(before.sha256);
  });
  it('detects changed model settings and input bytes before resuming', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cgb-identity-'));
    const image = join(dir, 'input.png');
    writeFileSync(image, 'original drawing');
    const task = { id: '102', type: 'generation' as const, dir, description: 'part', images: [image] };
    const config = { revision: 'sha', mode: 'llm', model: 'model-a', baseUrl: null, gitSha: 'abc', maxAttempts: 3, maxTokens: 100, temperature: null, editFallback: 'none', keepInvalid: false, skillMd: 'instructions' };
    const original = buildRunIdentity([task], config);
    expect(buildRunIdentity([task], config)).toEqual(original);
    expect(() => assertRunIdentity(original, buildRunIdentity([task], { ...config, model: 'model-b' }))).toThrow(/run directory/i);
    writeFileSync(image, 'modified drawing');
    expect(() => assertRunIdentity(original, buildRunIdentity([task], config))).toThrow(/run directory/i);
  });

  it('rejects a prior run without a recorded identity', () => {
    expect(() => assertRunIdentity(undefined, 'new')).toThrow(/run directory/i);
  });

  it('detects changes to externally supplied scripts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cgb-scripts-'));
    const scripts = join(dir, 'scripts');
    mkdirSync(scripts);
    const script = join(scripts, '102.kcad.ts');
    writeFileSync(script, 'return box(1,1,1);');
    const task = { id: '102', type: 'generation' as const, dir, description: 'part', images: [] };
    const config = { revision: 'local', mode: 'scripts-from', model: null, baseUrl: null, gitSha: 'abc', maxAttempts: 3, maxTokens: 100, temperature: null, editFallback: 'none', keepInvalid: false, skillMd: '', scriptsFrom: scripts };
    const original = buildRunIdentity([task], config);
    writeFileSync(script, 'return box(2,2,2);');
    expect(() => assertRunIdentity(original, buildRunIdentity([task], config))).toThrow(/run directory/i);
  });
});
