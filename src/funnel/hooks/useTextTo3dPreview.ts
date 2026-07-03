// SPDX-License-Identifier: MIT
import { useCallback, useState } from 'react';
import { parsePreviewStream, proxiedAssetUrl, startPreview } from '../lib/previewClient';

export type PreviewPhase =
  | { state: 'idle' }
  | { state: 'running'; progress: number }
  | { state: 'done'; glbUrl: string; costUsd: number | null }
  | { state: 'error'; code: string; message: string }
  | { state: 'upgrade' }
  | { state: 'unavailable' };

export function useTextTo3dPreview() {
  const [phase, setPhase] = useState<PreviewPhase>({ state: 'idle' });

  const submit = useCallback(async (prompt: string) => {
    setPhase({ state: 'running', progress: 0 });
    let res: Response;
    try {
      res = await startPreview(prompt);
    } catch (err) {
      setPhase({ state: 'error', code: 'network', message: err instanceof Error ? err.message : String(err) });
      return;
    }
    // 401 = anonymous (sign in), 402 = signed-in free user — both route to the
    // upgrade panel. 503 = the server has no provider key yet (feature dark) —
    // surface a quiet "unavailable" state, not a raw error.
    if (res.status === 401 || res.status === 402) { setPhase({ state: 'upgrade' }); return; }
    if (res.status === 503) { setPhase({ state: 'unavailable' }); return; }
    if (!res.ok || !res.body) {
      setPhase({ state: 'error', code: `http_${res.status}`, message: await res.text().catch(() => `HTTP ${res.status}`) });
      return;
    }
    for await (const e of parsePreviewStream(res.body)) {
      if (e.kind === 'status') setPhase({ state: 'running', progress: e.progress });
      else if (e.kind === 'preview_done') { setPhase({ state: 'done', glbUrl: proxiedAssetUrl(e.glbUrl), costUsd: e.costUsd }); return; }
      else if (e.kind === 'error') { setPhase({ state: 'error', code: e.code, message: e.message }); return; }
    }
    setPhase({ state: 'error', code: 'stream_closed', message: 'Connection closed before the preview finished.' });
  }, []);

  return { phase, submit };
}
