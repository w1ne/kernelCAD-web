import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION, EVENT_FIELD_ALLOWLIST, INGEST_URL, type TelemetryEvent } from './types';

describe('telemetry types', () => {
  it('exposes a stable schema version and ingest url', () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(INGEST_URL).toBe('https://telemetry.kernelcad.com/v1/events');
  });

  it('allowlist contains exactly the documented fields and nothing else', () => {
    expect([...EVENT_FIELD_ALLOWLIST].sort()).toEqual(
      [
        'event_type', 'tool_name', 'outcome', 'diagnostic_code', 'cli_version',
        'kernel_version', 'os', 'node_version', 'mode', 'schema_version',
        'session_id', 'op_types', 'install_id',
        'duration_ms', 'feature_count', 'interference_count', 'eval_ok',
        'tool_calls_in_session',
      ].sort(),
    );
  });

  it('a well-formed event type-checks', () => {
    const e: TelemetryEvent = {
      event_type: 'tool_call', tool_name: 'extrude', outcome: 'ok',
      diagnostic_code: '', cli_version: '0.7.3', kernel_version: '0.7.3',
      os: 'linux', node_version: '22.3.0', mode: 'local', schema_version: 1,
      session_id: 'sess', op_types: '', install_id: 'inst',
      duration_ms: 12, feature_count: 0, interference_count: 0, eval_ok: 0,
      tool_calls_in_session: 0,
    };
    expect(e.event_type).toBe('tool_call');
  });
});
