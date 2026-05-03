import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ViewerPane } from './ViewerPane';
import { TerminalPane } from './TerminalPane';
import { TitleCard } from './TitleCard';
import { AnimationEngine } from './AnimationEngine';
import { CameraController } from './CameraController';
import type { FeatureEvent } from '../../compute/featureEvents';
import type { TerminalLine } from './TerminalPane';

export interface DemoPlayerWindow {
  isFrameReady(): boolean;
  onEvent(event: FeatureEvent): void;
  setRotatePhase(durationMs: number): void;
  setTerminalLines(lines: readonly TerminalLine[]): void;
  startTerminalClock(originMs: number): void;
  setTitleCard(spec: { title: string; tagline: string; durationMs: number } | null): void;
  advance(dtMs: number): void;
  /** Set kernelCAD module version string for watermark, e.g. "v0.21". */
  setVersion(v: string): void;
}

declare global {
  interface Window {
    __demoPlayer?: DemoPlayerWindow;
  }
}

const VIEWER_W = 1280;
const VIEWER_H = 1080;
const TERMINAL_W = 640;
const TERMINAL_H = 1080;

export function DemoPlayerPage(): React.JSX.Element {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
  } | null>(null);
  const animEngineRef = useRef<AnimationEngine | null>(null);
  const cameraCtrlRef = useRef<CameraController | null>(null);
  const elapsedMsRef = useRef(0);
  const terminalOriginRef = useRef(0);
  const [version, setVersion] = useState('v0.21');
  const [terminalLines, setTerminalLines] = useState<readonly TerminalLine[]>([]);
  const [titleCard, setTitleCard] = useState<{ title: string; tagline: string; durationMs: number } | null>(
    null,
  );

  const handleSceneReady = (ctx: NonNullable<typeof sceneRef.current>) => {
    sceneRef.current = ctx;
    animEngineRef.current = new AnimationEngine(ctx.scene);
    cameraCtrlRef.current = new CameraController(ctx.camera, ctx.scene);
  };

  useEffect(() => {
    if (!animEngineRef.current || !cameraCtrlRef.current) return;
    window.__demoPlayer = {
      isFrameReady: () => !!animEngineRef.current?.isFrameReady(),
      onEvent: (event) => {
        animEngineRef.current?.enqueue(event);
        if (event.kind === 'feature.compiled') {
          cameraCtrlRef.current?.nudgeTo(event.featureId, 300, elapsedMsRef.current);
        }
      },
      setRotatePhase: (durationMs) => {
        cameraCtrlRef.current?.startRotate(durationMs, elapsedMsRef.current);
      },
      setTerminalLines: (lines) => setTerminalLines(lines),
      startTerminalClock: (originMs) => {
        terminalOriginRef.current = originMs;
      },
      setTitleCard: (spec) => setTitleCard(spec),
      advance: (dtMs) => {
        elapsedMsRef.current += dtMs;
        animEngineRef.current?.advance(dtMs);
        cameraCtrlRef.current?.update(elapsedMsRef.current);
      },
      setVersion: (v) => setVersion(v),
    };
    return () => {
      delete window.__demoPlayer;
    };
  }, []);

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
      {titleCard ? (
        <TitleCard title={titleCard.title} tagline={titleCard.tagline} />
      ) : (
        <>
          <TerminalPane
            lines={terminalLines}
            width={TERMINAL_W}
            height={TERMINAL_H}
            getElapsedMs={() => Math.max(0, elapsedMsRef.current - terminalOriginRef.current)}
          />
          <ViewerPane
            version={version}
            width={VIEWER_W}
            height={VIEWER_H}
            onSceneReady={handleSceneReady}
          />
        </>
      )}
    </div>
  );
}
