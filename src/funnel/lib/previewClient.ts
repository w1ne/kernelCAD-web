// SPDX-License-Identifier: MIT
import { getSupabase, isAuthConfigured } from './supabaseClient';

export type PreviewEvent =
  | { kind: 'status'; progress: number }
  | { kind: 'preview_done'; glbUrl: string; costUsd: number | null; taskId: string }
  | { kind: 'error'; code: string; message: string };

export async function* parsePreviewStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<PreviewEvent, void, void> {
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
        const parsed = parseBlock(raw);
        if (parsed) yield parsed;
      }
    }
    const tail = buffer.trim();
    if (tail) { const p = parseBlock(tail); if (p) yield p; }
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(raw: string): PreviewEvent | null {
  let name = '', dataLine = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) name = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataLine = line.slice(6);
  }
  if (!name || !dataLine) return null;
  let p: Record<string, unknown>;
  try { p = JSON.parse(dataLine); } catch { return null; }
  switch (name) {
    case 'status': return { kind: 'status', progress: Number(p['progress'] ?? 0) };
    case 'preview_done': return {
      kind: 'preview_done',
      glbUrl: typeof p['glbUrl'] === 'string' ? p['glbUrl'] : '',
      costUsd: typeof p['costUsd'] === 'number' ? p['costUsd'] : null,
      taskId: typeof p['taskId'] === 'string' ? p['taskId'] : '',
    };
    case 'error': return {
      kind: 'error',
      code: typeof p['code'] === 'string' ? p['code'] : 'error',
      message: typeof p['message'] === 'string' ? p['message'] : '',
    };
    default: return null;
  }
}

export async function startPreview(prompt: string): Promise<Response> {
  const base = import.meta.env.VITE_API_BASE_URL;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isAuthConfigured()) {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    } catch { /* anonymous → server 401 */ }
  }
  return fetch(`${base}/api/v1/preview/text-to-3d`, { method: 'POST', headers, body: JSON.stringify({ prompt }) });
}

/**
 * Tripo's CDN allows localhost origins but sends no CORS headers for real
 * domains, so <model-viewer> cannot fetch the signed GLB directly in prod.
 * Route Tripo asset URLs through the API's relay (which our CORS covers);
 * anything else passes through untouched.
 */
export function proxiedAssetUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!parsed.hostname.endsWith('.data.tripo3d.com')) return url;
  const base = import.meta.env.VITE_API_BASE_URL;
  return `${base}/api/v1/preview/asset?src=${encodeURIComponent(url)}`;
}
