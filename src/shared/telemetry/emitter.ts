// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { INGEST_URL, EVENT_FIELD_ALLOWLIST, type TelemetryEvent } from './types';

export interface EmitterOptions {
  batchSize?: number;
  flushIntervalMs?: number;
  timeoutMs?: number;
  url?: string;
  debug?: boolean;
  fetchImpl?: typeof fetch;
}

/** Keep only allowlisted keys — defense-in-depth against accidental PII. */
function sanitize(e: TelemetryEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(e) as (keyof TelemetryEvent)[]) {
    if (EVENT_FIELD_ALLOWLIST.has(k)) out[k as string] = e[k];
  }
  return out;
}

export class TelemetryEmitter {
  private queue: TelemetryEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly url: string;
  private readonly debug: boolean;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: EmitterOptions = {}) {
    this.batchSize = opts.batchSize ?? 20;
    this.flushIntervalMs = opts.flushIntervalMs ?? 30_000;
    this.timeoutMs = opts.timeoutMs ?? 1_000;
    this.url = opts.url ?? INGEST_URL;
    this.debug = opts.debug ?? false;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  enqueue(event: TelemetryEvent): void {
    try {
      this.queue.push(event);
      if (this.queue.length >= this.batchSize) {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        void this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => void this.flush(), this.flushIntervalMs);
        if (typeof this.timer.unref === 'function') this.timer.unref();
      }
    } catch {
      // never throw into the caller's path
    }
  }

  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length).map(sanitize);
    if (this.debug) {
      process.stderr.write(`[kernelcad telemetry] ${JSON.stringify(batch)}\n`);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    if (typeof (t as NodeJS.Timeout).unref === 'function') (t as NodeJS.Timeout).unref();
    try {
      await this.fetchImpl(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(batch),
        signal: ctrl.signal,
      }).catch(() => undefined);
    } catch {
      // swallow — telemetry must never disrupt the tool
    } finally {
      clearTimeout(t);
    }
  }
}
