// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface Artifact {
  title: string;
  code: string;
  parameters: Array<{
    name: string;
    defaultValue: number | boolean | string;
    unit?: string;
    kind: 'number' | 'integer' | 'boolean' | 'string';
    min?: number;
    max?: number;
    step?: number;
    description?: string;
  }>;
  suggestions: string[];
}

export type GenerateEvent =
  | { kind: 'generation'; generationId: string; anonId: string }
  | { kind: 'status'; phase: 'running' | 'tool_calling' }
  | { kind: 'tool_call'; name: string; args: unknown }
  | { kind: 'tool_result'; name: string; ok: boolean }
  | { kind: 'done'; artifact: Artifact; generationId: string; anonId: string; durationMs: number }
  | { kind: 'error'; code: 'llm_failed' | 'gate_failed' | 'eval_failed' | 'timeout'; message: string; generationId: string };

/**
 * Parse a Server-Sent Events stream from POST /api/v1/generate into typed events.
 *
 * fetch() -> response.body is a ReadableStream<Uint8Array>; this generator
 * decodes UTF-8 incrementally and emits one event per `event: <name>\ndata: <json>\n\n`
 * block. Robust against chunk boundaries that fall mid-event.
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<GenerateEvent, void, void> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const parsed = parseEventBlock(raw);
        if (parsed) yield parsed;
      }
    }
    const tail = buffer.trim();
    if (tail) {
      const parsed = parseEventBlock(tail);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEventBlock(raw: string): GenerateEvent | null {
  let name = '';
  let dataLine = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) name = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataLine = line.slice(6);
  }
  if (!name || !dataLine) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(dataLine);
  } catch {
    return null;
  }
  return mapToEvent(name, payload);
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function mapToEvent(name: string, p: Record<string, unknown>): GenerateEvent | null {
  switch (name) {
    case 'generation':
      return { kind: 'generation', generationId: asString(p.generationId), anonId: asString(p.anonId) };
    case 'status':
      return { kind: 'status', phase: p.phase as 'running' | 'tool_calling' };
    case 'tool_call':
      return { kind: 'tool_call', name: asString(p.name), args: p.args };
    case 'tool_result':
      return { kind: 'tool_result', name: asString(p.name), ok: Boolean(p.ok) };
    case 'done':
      return {
        kind: 'done',
        artifact: p.artifact as Artifact,
        generationId: asString(p.generationId),
        anonId: asString(p.anonId),
        durationMs: Number(p.durationMs ?? 0),
      };
    case 'error':
      return {
        kind: 'error',
        code: p.code as 'llm_failed' | 'gate_failed' | 'eval_failed' | 'timeout',
        message: asString(p.message),
        generationId: asString(p.generationId),
      };
    default:
      return null;
  }
}

export interface GenerateRequest {
  prompt: string;
}

export async function startGeneration(req: GenerateRequest): Promise<Response> {
  const base = import.meta.env.VITE_API_BASE_URL;
  return fetch(`${base}/api/v1/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}
