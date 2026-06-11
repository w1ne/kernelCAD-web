// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;
beforeEach(() => {
  vi.resetModules();
  dir = mkdtempSync(join(tmpdir(), 'kc-tel-idx-'));
  process.env.KERNELCAD_CONFIG_HOME = dir;
  delete process.env.KERNELCAD_TELEMETRY;
  delete process.env.KERNELCAD_TELEMETRY_DISABLED;
  delete process.env.DO_NOT_TRACK;
  delete process.env.CI;
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('recordToolCall', () => {
  it('builds a tool_call event with the running tool and outcome', async () => {
    const sent: unknown[] = [];
    const mod = await import('./index');
    mod.__setEmitterForTest({ enqueue: (e: unknown) => sent.push(e), flush: async () => {} });
    mod.recordToolCall({ toolName: 'extrude', mode: 'local', outcome: 'ok', durationMs: 5, sessionId: 's' });
    expect(sent).toHaveLength(1);
    expect((sent[0] as { event_type: string }).event_type).toBe('tool_call');
    expect((sent[0] as { tool_name: string }).tool_name).toBe('extrude');
    expect((sent[0] as { install_id: string }).install_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('records NOTHING when telemetry is disabled', async () => {
    process.env.DO_NOT_TRACK = '1';
    const sent: unknown[] = [];
    const mod = await import('./index');
    mod.__setEmitterForTest({ enqueue: (e: unknown) => sent.push(e), flush: async () => {} });
    mod.recordToolCall({ toolName: 'extrude', mode: 'local', outcome: 'ok', durationMs: 5, sessionId: 's' });
    expect(sent).toHaveLength(0);
  });
});

describe('maybeShowFirstRunNotice', () => {
  it('prints once then sets notified, and is silent thereafter', async () => {
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const mod = await import('./index');
    mod.maybeShowFirstRunNotice();
    expect(err).toHaveBeenCalledTimes(1);
    err.mockClear();
    mod.maybeShowFirstRunNotice();
    expect(err).not.toHaveBeenCalled();
  });
});
