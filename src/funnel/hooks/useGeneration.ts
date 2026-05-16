import { useCallback, useState } from 'react';
import { parseSseStream, startGeneration, type Artifact, type GenerateEvent } from '../lib/generateClient';

export type GenerationPhase =
  | { state: 'idle' }
  | { state: 'running'; generationId?: string; anonId?: string; lastEvent: GenerateEvent }
  | { state: 'done'; generationId: string; anonId: string; artifact: Artifact }
  | { state: 'error'; code: string; message: string; generationId?: string };

export function useGeneration() {
  const [phase, setPhase] = useState<GenerationPhase>({ state: 'idle' });
  const [events, setEvents] = useState<GenerateEvent[]>([]);

  const submit = useCallback(async (prompt: string) => {
    setEvents([]);
    setPhase({
      state: 'running',
      lastEvent: { kind: 'status', phase: 'running' },
    });

    let res: Response;
    try {
      res = await startGeneration({ prompt });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ state: 'error', code: 'network', message });
      return;
    }

    if (!res.ok) {
      setPhase({
        state: 'error',
        code: res.status === 429 ? 'rate_limited' : 'http_' + res.status,
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
        generationId = e.generationId;
        anonId = e.anonId;
        setPhase({ state: 'running', generationId, anonId, lastEvent: e });
      } else if (e.kind === 'done') {
        setPhase({ state: 'done', generationId: e.generationId, anonId: e.anonId, artifact: e.artifact });
        return;
      } else if (e.kind === 'error') {
        setPhase({ state: 'error', code: e.code, message: e.message, generationId: e.generationId });
        return;
      } else {
        setPhase({ state: 'running', generationId, anonId, lastEvent: e });
      }
    }
  }, []);

  return { phase, events, submit };
}
