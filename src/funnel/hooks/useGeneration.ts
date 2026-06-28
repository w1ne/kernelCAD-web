// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState } from 'react';
import { parseSseStream, startGeneration, type Artifact, type GenerateEvent } from '../lib/generateClient';

/** Codes emitted by the client when generation fails outside the server's
 *  own error stream. Server-relayed `error` events carry their own codes
 *  (relayed through verbatim), so the wire shape stays open. */
export type FunnelClientErrorCode =
  | 'network'
  | 'rate_limited'
  | 'no_body'
  | 'missing_generation_id'
  | 'stream_closed';

export type FunnelErrorCode = FunnelClientErrorCode | `http_${number}` | (string & {});

export type GenerationPhase =
  | { state: 'idle' }
  | { state: 'running'; generationId?: string; anonId?: string; lastEvent: GenerateEvent }
  | { state: 'done'; generationId: string; anonId: string; artifact: Artifact }
  | { state: 'error'; code: FunnelErrorCode; message: string; generationId?: string };

export function useGeneration() {
  const [phase, setPhase] = useState<GenerationPhase>({ state: 'idle' });
  const [events, setEvents] = useState<GenerateEvent[]>([]);

  const submit = useCallback(async (prompt: string, currentCode?: string) => {
    setEvents([]);
    setPhase({
      state: 'running',
      lastEvent: { kind: 'status', phase: 'running' },
    });

    let res: Response;
    try {
      res = await startGeneration({ prompt, currentCode });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ state: 'error', code: 'network', message });
      return;
    }

    if (!res.ok) {
      setPhase({
        state: 'error',
        // Agent mode requires a connected account. 401 = anonymous (must sign
        // in); 402 = signed-in but monthly quota exhausted (must upgrade); 429 =
        // legacy rate limit. All route to the same panel, which shows "sign in"
        // vs "upgrade" based on whether there's a session.
        code: res.status === 401 || res.status === 402 || res.status === 429 ? 'rate_limited' : `http_${res.status}`,
        message: await res.text().catch(() => `HTTP ${res.status}`),
      });
      return;
    }

    if (!res.body) {
      setPhase({ state: 'error', code: 'no_body', message: 'Server returned empty response' });
      return;
    }

    let generationId = '';
    let anonId = '';
    for await (const e of parseSseStream(res.body)) {
      setEvents(prev => [...prev, e]);
      if (e.kind === 'generation') {
        if (e.generationId) generationId = e.generationId;
        if (e.anonId) anonId = e.anonId;
        setPhase({ state: 'running', generationId, anonId, lastEvent: e });
      } else if (e.kind === 'done') {
        const finalId = e.generationId || generationId;
        const finalAnon = e.anonId || anonId;
        if (!finalId) {
          setPhase({ state: 'error', code: 'missing_generation_id', message: 'Generation completed but no ID was returned.' });
          return;
        }
        setPhase({ state: 'done', generationId: finalId, anonId: finalAnon, artifact: e.artifact });
        return;
      } else if (e.kind === 'error') {
        setPhase({ state: 'error', code: e.code, message: e.message, generationId: e.generationId || generationId });
        return;
      } else {
        setPhase({ state: 'running', generationId, anonId, lastEvent: e });
      }
    }

    // Stream ended without a `done` or `error` event (e.g., upstream timeout
    // or proxy buffering). Surface this instead of silently leaving phase in
    // `running` — otherwise a stale phase can later coerce navigation to
    // `/g/undefined`.
    setPhase({ state: 'error', code: 'stream_closed', message: 'Connection closed before generation finished.' });
  }, []);

  return { phase, events, submit };
}
