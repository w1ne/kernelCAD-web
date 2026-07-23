// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getSupabase, isAuthConfigured } from './supabaseClient';
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

/** Source-image limits for the Studio photo-reference request. A 4 MiB source
 * file expands to roughly 5.4 MiB as a base64 data URL, which keeps the JSON
 * request bounded while leaving the server responsible for decoding, hashing,
 * and materializing the authoritative asset. */
export const REFERENCE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ReferenceImageMimeType = typeof REFERENCE_IMAGE_MIME_TYPES[number];
export const MAX_REFERENCE_IMAGE_BYTES = 4 * 1024 * 1024;

export function isReferenceImageMimeType(value: string): value is ReferenceImageMimeType {
  return (REFERENCE_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/** A user-supplied, scaled image reference. The server recomputes the SHA-256
 * from `dataUrl`; no client-provided hash is trusted as provenance. */
export interface ReferenceImage {
  dataUrl: string;
  fileName: string;
  mimeType: ReferenceImageMimeType;
  knownDimension: {
    label: string;
    valueMm: number;
  };
}

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
  /** Edit mode: the current editor source the agent should modify (Studio agent
   *  loop). Omit for a fresh generation (funnel/landing). */
  currentCode?: string;
  /** Mesh-conditioned build context: a rendered preview image + normalized
   *  bounding-box proportions of an in-progress mesh-first build. Omit when
   *  there is no mesh context (text-only funnel/landing generation). */
  mesh?: { renderImageUrl?: string | null; proportions?: number[] | null };
  /** A bounded simple-device reference photo plus a real-world scale anchor.
   * The hosted route validates, hashes, and materializes it before authoring. */
  referenceImage?: ReferenceImage;
}

export async function startGeneration(req: GenerateRequest): Promise<Response> {
  const base = import.meta.env.VITE_API_BASE_URL;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Agent mode requires a connected account (every run lands against a plan), so
  // forward the Supabase session token when there is one. Without it the server
  // returns 401 and the UI prompts sign-in. Guarded so an env-less/local build
  // (no auth) doesn't throw — it just sends no token.
  if (isAuthConfigured()) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    } catch {
      // no session / auth unavailable → anonymous → server will 401
    }
  }
  return fetch(`${base}/api/v1/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
}
