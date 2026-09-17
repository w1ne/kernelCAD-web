// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { ViewerPane } from './ViewerPane';
import { TerminalPane } from './TerminalPane';
import { TitleCard } from './TitleCard';
import { useDemoPlayerApi } from './useDemoPlayerApi';
import { useDemoAutoLoad } from './useDemoAutoLoad';
export type { RenderView, DemoPlayerWindow } from './demoPlayerGeometry';

const VIEWER_W = 1280;
const VIEWER_H = 1080;
const TERMINAL_W = 640;
const TERMINAL_H = 1080;

export function DemoPlayerPage(): React.JSX.Element {
  const {
    handleSceneReady,
    isDemoApiReady,
    version,
    terminalLines,
    titleCard,
    elapsedMsRef,
    terminalOriginRef,
  } = useDemoPlayerApi();
  const { scriptLoadStatus, buildRecord, buildRecordStep } = useDemoAutoLoad(isDemoApiReady, elapsedMsRef);

  // Headless renders (kernelcad render, scoreReference) navigate with
  // ?headless=1. Suppress the TerminalPane so the ViewerPane (and its model)
  // fills the entire viewport. Without this, TerminalPane's 640px sidebar eats
  // half the canvas at 1024×1024 capture → silhouette IoU bimodality.
  const isHeadless = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('headless') === '1';
  // ?nowatermark=1 suppresses the kernelCAD version badge for clean hero
  // artifacts (public posts, gallery entries). Wired to the CLI's
  // --no-watermark flag via headlessRender.
  const noWatermark = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('nowatermark') === '1';
  return (
    <div
      data-testid="demo-player"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {!isHeadless && (
        <TerminalPane
          lines={terminalLines}
          width={TERMINAL_W}
          height={TERMINAL_H}
          getElapsedMs={() => Math.max(0, elapsedMsRef.current - terminalOriginRef.current)}
        />
      )}
      <ViewerPane
        version={version}
        width={isHeadless ? VIEWER_W + TERMINAL_W : VIEWER_W}
        height={VIEWER_H}
        onSceneReady={handleSceneReady}
        noWatermark={noWatermark}
      />
      {scriptLoadStatus.kind !== 'idle' ? (
        <div
          data-testid="demo-player-load-status"
          style={{
            position: 'absolute',
            left: 24,
            bottom: 24,
            maxWidth: 560,
            padding: '10px 12px',
            borderRadius: 6,
            background: scriptLoadStatus.kind === 'error' ? '#7f1d1d' : 'rgba(15, 23, 42, 0.88)',
            color: '#f8fafc',
            font: '13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {scriptLoadStatus.message}
        </div>
      ) : null}
      {buildRecord && buildRecordStep ? (
        <div
          data-testid="build-record-status"
          style={{
            position: 'absolute',
            top: 24,
            left: TERMINAL_W + 24,
            maxWidth: 520,
            padding: '10px 12px',
            borderRadius: 6,
            background: buildRecordStep.status === 'passed' ? 'rgba(22, 101, 52, 0.9)' : 'rgba(127, 29, 29, 0.9)',
            color: '#f8fafc',
            font: '14px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <div>{buildRecord.title}</div>
          <div>{buildRecordStep.id}: {buildRecordStep.title}</div>
        </div>
      ) : null}
      {titleCard ? <TitleCard title={titleCard.title} tagline={titleCard.tagline} /> : null}
    </div>
  );
}
