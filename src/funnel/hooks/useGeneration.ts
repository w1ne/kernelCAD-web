// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  parseSseStream,
  startGeneration,
  type Artifact,
  type GenerateEvent,
  type GenerateRequest,
  type GenerationPartial,
} from '../lib/generateClient';

/** Codes emitted by the client when generation fails outside the server's
 *  own error stream. Server-relayed `error` events carry their own codes
 *  (relayed through verbatim), so the wire shape stays open. */
export type FunnelClientErrorCode =
  | 'network'
  | 'rate_limited'
  | 'no_body'
  | 'missing_generation_id'
  | 'stream_closed'
  /** The user stopped waiting for the run (`cancel()`). */
  | 'cancelled';

export type FunnelErrorCode = FunnelClientErrorCode | `http_${number}` | (string & {});

export type GenerationPhase =
  | { state: 'idle' }
  | { state: 'running'; generationId?: string; anonId?: string; lastEvent: GenerateEvent }
  | { state: 'done'; generationId: string; anonId: string; artifact: Artifact; partial?: GenerationPartial }
  | { state: 'error'; code: FunnelErrorCode; message: string; generationId?: string };

async function consumeGenerationStream(
  body: ReadableStream<Uint8Array>,
  setEvents: Dispatch<SetStateAction<GenerateEvent[]>>,
  setPhase: Dispatch<SetStateAction<GenerationPhase>>,
): Promise<boolean> {
  let generationId = '';
  let anonId = '';
  for await (const e of parseSseStream(body)) {
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
        return false;
      }
      setPhase({
        state: 'done',
        generationId: finalId,
        anonId: finalAnon,
        artifact: e.artifact,
        ...(e.partial ? { partial: e.partial } : {}),
      });
      return false;
    } else if (e.kind === 'error') {
      setPhase({ state: 'error', code: e.code, message: e.message, generationId: e.generationId || generationId });
      return false;
    } else {
      setPhase({ state: 'running', generationId, anonId, lastEvent: e });
    }
  }
  return true;
}

/** POST the request and return its event stream, or set the error phase
 *  and return null. Returns null without a phase change once aborted. */
async function openGenerationStream(
  req: GenerateRequest,
  signal: AbortSignal,
  setPhase: Dispatch<SetStateAction<GenerationPhase>>,
): Promise<ReadableStream<Uint8Array> | null> {
  let res: Response;
  try {
    res = await startGeneration(req, signal);
  } catch (err) {
    if (signal.aborted) return null;
    const message = err instanceof Error ? err.message : String(err);
    setPhase({ state: 'error', code: 'network', message });
    return null;
  }
  if (signal.aborted) return null;

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
    return null;
  }

  if (!res.body) {
    setPhase({ state: 'error', code: 'no_body', message: 'Server returned empty response' });
    return null;
  }
  return res.body;
}

export function useGeneration() {
  const [phase, setPhase] = useState<GenerationPhase>({ state: 'idle' });
  const [events, setEvents] = useState<GenerateEvent[]>([]);
  // The in-flight request. `cancel()` aborts it; a new `submit()` replaces it.
  const controllerRef = useRef<AbortController | null>(null);

  const submit = useCallback(async (
    prompt: string,
    currentCode?: string,
    mesh?: GenerateRequest['mesh'],
    referenceImage?: GenerateRequest['referenceImage'],
  ) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setEvents([]);
    setPhase({
      state: 'running',
      lastEvent: { kind: 'status', phase: 'running' },
    });

    const body = await openGenerationStream({ prompt, currentCode, mesh, referenceImage }, controller.signal, setPhase);
    if (!body) return;

    let exhausted: boolean;
    try {
      exhausted = await consumeGenerationStream(body, setEvents, setPhase);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ state: 'error', code: 'network', message });
      return;
    }
    if (!exhausted || controller.signal.aborted) return;

    // Stream ended without a `done` or `error` event (e.g., upstream timeout
    // or proxy buffering). Surface this instead of silently leaving phase in
    // `running` — otherwise a stale phase can later coerce navigation to
    // `/g/undefined`.
    setPhase({ state: 'error', code: 'stream_closed', message: 'Connection closed before generation finished.' });
  }, []);

  /** Stop waiting for the running generation. The phase becomes a
   *  `cancelled` error; the events seen so far stay for the log. */
  const cancel = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controllerRef.current = null;
    controller.abort();
    setPhase(prev => prev.state === 'running'
      ? {
          state: 'error',
          code: 'cancelled',
          message: 'Stopped.',
          ...(prev.generationId ? { generationId: prev.generationId } : {}),
        }
      : prev);
  }, []);

  return { phase, events, submit, cancel };
}
