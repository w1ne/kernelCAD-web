import { createRequire } from 'node:module';
import { TelemetryEmitter } from './emitter';
import {
  ensureInstallId, isTelemetryEnabled, isDebug, loadConfig, saveConfig,
} from './config';
import { SCHEMA_VERSION, type Mode, type Outcome, type TelemetryEvent } from './types';

interface EmitterLike { enqueue: (e: TelemetryEvent) => void; flush: () => Promise<void>; }

let emitter: EmitterLike | null = null;
function getEmitter(): EmitterLike {
  if (!emitter) emitter = new TelemetryEmitter({ debug: isDebug() });
  return emitter;
}
/** Test seam. */
export function __setEmitterForTest(e: EmitterLike): void { emitter = e; }

const requireFromHere = createRequire(import.meta.url);
function cliVersion(): string {
  for (const rel of ['../../../package.json', '../../package.json']) {
    try { return (requireFromHere(rel) as { version: string }).version; } catch { /* next */ }
  }
  return 'unknown';
}

function base(): Pick<TelemetryEvent,
  'cli_version' | 'kernel_version' | 'os' | 'node_version' | 'schema_version' | 'install_id'> {
  const v = cliVersion();
  return {
    cli_version: v, kernel_version: v, os: process.platform,
    node_version: process.versions.node, schema_version: SCHEMA_VERSION,
    install_id: ensureInstallId(),
  };
}

export interface ToolCallRecord {
  toolName: string; mode: Mode; outcome: Outcome; durationMs: number;
  sessionId: string; diagnosticCode?: string;
}

export function recordToolCall(r: ToolCallRecord): void {
  if (!isTelemetryEnabled()) return;
  getEmitter().enqueue({
    ...base(), event_type: 'tool_call', tool_name: r.toolName, outcome: r.outcome,
    diagnostic_code: r.diagnosticCode ?? '', mode: r.mode, session_id: r.sessionId,
    op_types: '', duration_ms: Math.round(r.durationMs), feature_count: 0,
    interference_count: 0, eval_ok: 0, tool_calls_in_session: 0,
  });
}

export function flushTelemetry(): Promise<void> {
  if (!isTelemetryEnabled()) return Promise.resolve();
  return getEmitter().flush();
}

const FIRST_RUN_NOTICE =
  '\nkernelCAD collects anonymous usage statistics (tool names, success/failure, ' +
  'versions — never your prompts, code, or designs) to improve the product.\n' +
  'Disable any time:  kernelcad telemetry disable   (or KERNELCAD_TELEMETRY=0 / DO_NOT_TRACK=1)\n' +
  'Details: https://github.com/kernelcad/kernelcad/blob/main/TELEMETRY.md\n\n';

export function maybeShowFirstRunNotice(): void {
  try {
    const cfg = loadConfig();
    if (cfg?.notified) return;
    process.stderr.write(FIRST_RUN_NOTICE);
    saveConfig({
      enabled: cfg?.enabled ?? true,
      installId: cfg?.installId ?? ensureInstallId(),
      notified: true,
    });
  } catch { /* never throw */ }
}
