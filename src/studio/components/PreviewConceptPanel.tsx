// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useState } from 'react';
import { useTextTo3dPreview } from '../../funnel/hooks/useTextTo3dPreview';

const MODEL_VIEWER_CDN = 'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js';

/** Lazy-load the model-viewer web component (keeps the ~1MB pkg out of the main bundle).
 *  Mirrors useModelViewer in GallerySection.tsx. */
function useModelViewer(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (window.customElements?.get('model-viewer')) return;
    if (document.querySelector(`script[src="${MODEL_VIEWER_CDN}"]`)) return;
    const s = document.createElement('script');
    s.type = 'module'; s.src = MODEL_VIEWER_CDN;
    try { document.head.appendChild(s); } catch { /* graceful degrade in test/SSR envs */ }
  }, [enabled]);
}

export function PreviewConceptPanel() {
  const { phase, submit } = useTextTo3dPreview();
  const [prompt, setPrompt] = useState('');
  const busy = phase.state === 'running';

  useModelViewer(phase.state === 'done');

  return (
    <section aria-label="Generate concept preview" className="flex flex-col gap-2 border-t border-[#2a2e38] pt-3 mt-1">
      <div className="uppercase tracking-wide text-[10px] text-gray-500">3D Concept Preview</div>
      <textarea
        placeholder="Describe the concept to preview (e.g. a compact ESP32 enclosure)…"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        disabled={busy}
        rows={3}
        className="w-full rounded bg-[#111] border border-[#2a2e38] text-gray-100 p-2 text-[11px] placeholder:text-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50 resize-none font-sans"
      />
      <button
        type="button"
        onClick={() => submit(prompt)}
        disabled={busy || prompt.trim().length === 0}
        className="rounded bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? `Generating… ${phase.state === 'running' ? phase.progress : 0}%` : 'Generate concept (preview)'}
      </button>

      {phase.state === 'upgrade' && (
        <p role="alert" className="text-[11px] text-yellow-400">
          Text-to-3D preview is a paid feature.{' '}
          <a href="/me" className="underline">Upgrade</a>{' '}
          to use it.
        </p>
      )}
      {phase.state === 'error' && (
        <p role="alert" className="text-[11px] text-red-400">
          Preview failed: {phase.message}
        </p>
      )}

      {phase.state === 'done' && (
        <div className="flex flex-col gap-2">
          {/* @ts-expect-error — model-viewer is a custom element registered via CDN script */}
          <model-viewer
            src={phase.glbUrl}
            camera-controls
            auto-rotate
            style={{ width: '100%', height: '360px', background: '#111' }}
          />
          <button
            type="button"
            disabled
            title="Coming soon — rebuilds an exact, manufacturable CAD model from this concept"
            className="rounded bg-[#1a1d24] text-gray-500 border border-[#2a2e38] px-3 py-1.5 text-[11px] font-medium cursor-not-allowed"
          >
            Rebuild as parametric CAD
          </button>
        </div>
      )}
    </section>
  );
}
