// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export const SCHEMA_VERSION = 1 as const;
export const INGEST_URL = 'https://telemetry.kernelcad.com/v1/events';

export type EventType = 'session_start' | 'tool_call' | 'build_complete';
export type Outcome = 'ok' | 'error' | 'quota' | 'rate_limited';
export type Mode = 'local' | 'cloud';

/** Anonymous telemetry event. Strictly structural — NO user content. */
export interface TelemetryEvent {
  // string dimensions (AE blobs)
  event_type: EventType;
  tool_name: string;
  outcome: Outcome | '';
  diagnostic_code: string;
  cli_version: string;
  kernel_version: string;
  os: string;
  node_version: string;
  mode: Mode;
  schema_version: number;
  session_id: string;
  op_types: string;
  install_id: string;
  // numeric measures (AE doubles)
  duration_ms: number;
  feature_count: number;
  interference_count: number;
  eval_ok: number;
  tool_calls_in_session: number;
}

/** The ONLY keys allowed to leave the process. Enforced by the emitter. */
export const EVENT_FIELD_ALLOWLIST: ReadonlySet<keyof TelemetryEvent> = new Set([
  'event_type', 'tool_name', 'outcome', 'diagnostic_code', 'cli_version',
  'kernel_version', 'os', 'node_version', 'mode', 'schema_version',
  'session_id', 'op_types', 'install_id',
  'duration_ms', 'feature_count', 'interference_count', 'eval_ok',
  'tool_calls_in_session',
]);
