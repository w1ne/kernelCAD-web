// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef } from 'react';
import type { PreviewPhase } from '../../funnel/hooks/useTextTo3dPreview';
import { useModelViewer } from '../../funnel/hooks/useModelViewer';

/**
 * Result area for the 3D concept preview. Presentational only — the prompt
 * lives in StudioGenerate's single shared text box; this renders whatever the
 * preview produced (viewer, upgrade CTA, error) plus the Build-as-CAD action
 * that feeds the concept's prompt back into the agent.
 */
export function ConceptResult({
  phase,
  onBuildAsCad,
  buildDisabled,
}: {
  phase: PreviewPhase;
  onBuildAsCad: () => void;
  buildDisabled: boolean;
}) {
  useModelViewer(phase.state === 'done');

  // The viewer lands below the fold in the rail — bring it into view so the
  // user sees the result without hunting for it.
  const viewerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase.state === 'done') viewerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [phase.state]);

  if (phase.state === 'idle' || phase.state === 'running') return null;

  if (phase.state === 'unavailable') {
    return <p className="text-[11px] text-gray-500">Concept preview not available yet — coming soon.</p>;
  }

  if (phase.state === 'upgrade') {
    return (
      <p role="alert" className="text-[11px] text-yellow-400">
        Text-to-3D preview is a paid feature.{' '}
        <a href="/me" className="underline">Upgrade</a>{' '}
        to use it.
      </p>
    );
  }

  if (phase.state === 'error') {
    return (
      <p role="alert" className="text-[11px] text-red-400">
        Preview failed: {phase.message}
      </p>
    );
  }

  return (
    <div ref={viewerRef} className="flex flex-col gap-2">
      {/* @ts-expect-error — model-viewer is a custom element registered via CDN script */}
      <model-viewer
        src={phase.glbUrl}
        camera-controls
        auto-rotate
        style={{ width: '100%', height: '360px', background: '#111' }}
      />
      <button
        type="button"
        onClick={onBuildAsCad}
        disabled={buildDisabled}
        title="Uses the agent to build a real, editable CAD model from this concept's description"
        className="rounded bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Build as parametric CAD →
      </button>
    </div>
  );
}
