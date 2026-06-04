import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryEmitter } from './emitter';
import type { TelemetryEvent } from './types';

function ev(over: Partial<TelemetryEvent> = {}): TelemetryEvent {
  return {
    event_type: 'tool_call', tool_name: 'extrude', outcome: 'ok',
    diagnostic_code: '', cli_version: '0', kernel_version: '0', os: 'linux',
    node_version: '0', mode: 'local', schema_version: 1, session_id: 's',
    op_types: '', install_id: 'i', duration_ms: 1, feature_count: 0,
    interference_count: 0, eval_ok: 0, tool_calls_in_session: 0, ...over,
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('TelemetryEmitter', () => {
  it('flushes when batch size is reached', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const e = new TelemetryEmitter({ batchSize: 2, flushIntervalMs: 30_000, fetchImpl: fetchMock });
    e.enqueue(ev()); expect(fetchMock).not.toHaveBeenCalled();
    e.enqueue(ev()); // hits batchSize
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toHaveLength(2);
  });

  it('flushes on the interval timer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const e = new TelemetryEmitter({ batchSize: 99, flushIntervalMs: 30_000, fetchImpl: fetchMock });
    e.enqueue(ev());
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('NEVER throws when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    const e = new TelemetryEmitter({ batchSize: 1, flushIntervalMs: 30_000, fetchImpl: fetchMock });
    expect(() => e.enqueue(ev())).not.toThrow();
    await expect(e.flush()).resolves.toBeUndefined();
  });

  it('strips any non-allowlisted field before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const e = new TelemetryEmitter({ batchSize: 1, flushIntervalMs: 30_000, fetchImpl: fetchMock });
    e.enqueue({ ...ev(), prompt: 'SECRET DESIGN', token: 'kc_live_xyz' } as unknown as TelemetryEvent);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)[0];
    expect(sent).not.toHaveProperty('prompt');
    expect(sent).not.toHaveProperty('token');
    expect(JSON.stringify(sent)).not.toContain('SECRET');
  });

  it('debug mode prints to stderr and does NOT fetch', async () => {
    const fetchMock = vi.fn();
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const e = new TelemetryEmitter({ batchSize: 1, flushIntervalMs: 30_000, fetchImpl: fetchMock, debug: true });
    e.enqueue(ev());
    await e.flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
  });
});
