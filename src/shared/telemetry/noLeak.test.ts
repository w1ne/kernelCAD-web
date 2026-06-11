// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { TelemetryEmitter } from './emitter';
import type { TelemetryEvent } from './types';

describe('telemetry never leaks content', () => {
  it('drops prompt/code/token/path-shaped fields regardless of caller mistakes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const e = new TelemetryEmitter({ batchSize: 1, fetchImpl: fetchMock });
    const dirty = {
      event_type: 'tool_call', tool_name: 'extrude', outcome: 'ok',
      diagnostic_code: '', cli_version: '0', kernel_version: '0', os: 'linux',
      node_version: '0', mode: 'local', schema_version: 1, session_id: 's',
      op_types: '', install_id: 'i', duration_ms: 1, feature_count: 0,
      interference_count: 0, eval_ok: 0, tool_calls_in_session: 0,
      // forbidden extras a careless caller might attach:
      prompt: 'make me a 50mm gear',
      code: 'sketch().extrude(10)',
      token: 'kc_live_supersecret',
      filePath: '/home/user/secret.kcad.ts',
    } as unknown as TelemetryEvent;
    e.enqueue(dirty);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const wire = fetchMock.mock.calls[0][1].body as string;
    for (const needle of ['make me', 'extrude(10)', 'kc_live', 'secret.kcad.ts', 'prompt', 'token', 'filePath']) {
      expect(wire).not.toContain(needle);
    }
  });
});
