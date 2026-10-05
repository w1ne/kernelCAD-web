// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * ViewerPageShell — the model-first page layout for a shared model
 * (/p/<slug>). The model fills the page; one panel tells the rest of the
 * story (what it is, change it, download it, keep it, continue).
 *
 *  - Desktop and tablet (≥ 768 px): a 48 px header, the model on the left and
 *    a 380 px side panel on the right.
 *  - Phone: the header, the model, a bottom sheet with a grab handle (snap
 *    points 30 / 55 / 90 % of the screen) and a fixed action bar.
 *
 * The panel is rendered ONCE and only its box changes with the breakpoint, so
 * nothing in it (the customizer, a running download) mounts twice.
 *
 * `ModelStage` shows the stored render (poster) at once and cross-fades to the
 * live canvas when the first frame of the model is on screen.
 * `LiveModelViewport` is that canvas; it reads the workbench it is mounted in.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type JSX,
  type PointerEvent,
  type ReactNode,
} from 'react';
import Viewer from './components/Viewer';
import { hasNonemptyGeometry } from './components/viewer/hasNonemptyGeometry';
import { BACKGROUND_DARK_HEX } from './components/viewer/sceneBackgroundTexture';
import { useWorkbench } from './context/WorkbenchContext';
import { getMeshNotice, subscribeMeshNotice } from './scriptSource';
import { cx } from '../ui';
import { nearestSnap, snapForKey } from '../ui/sheetModel';

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeDark(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(DARK_QUERY).matches;
}

/** The visitor's colour scheme: vellum (light) unless the system asks for dark. */
// eslint-disable-next-line react-refresh/only-export-components
export function usePreferredTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribeDark, prefersDark, () => false) ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Bottom-sheet heights on a phone, as fractions of the screen height. */
const SHEET_SNAPS: readonly number[] = [0.3, 0.55, 0.9];

export interface ViewerPageShellProps {
  title: ReactNode;
  /** Small status next to the title ("● Live"). */
  titleAside?: ReactNode;
  /** Right side of the header (Open in Studio, Sign in). */
  headerActions?: ReactNode;
  /** The model area. */
  stage: ReactNode;
  /** Side panel (desktop) and bottom sheet (phone) content. */
  panel: ReactNode;
  /** Accessible name of the panel. */
  panelLabel: string;
  /** Fixed bar under the sheet on a phone. */
  actionBar?: ReactNode;
  theme?: 'light' | 'dark';
}

function KernelcadMark(): JSX.Element {
  return (
    <svg className="size-5" viewBox="0 0 84 84" fill="none" aria-hidden="true">
      <path
        d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ViewerPageShell(props: ViewerPageShellProps): JSX.Element {
  const [snap, setSnap] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const fraction = drag ?? SHEET_SNAPS[snap];
  const sheetStyle = { '--kc-sheet-h': `${fraction * 100}dvh` } as CSSProperties;

  return (
    <div
      data-theme={props.theme ?? 'light'}
      data-testid="viewer-page"
      className="fixed inset-0 flex flex-col bg-bg font-sans text-fg"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface-1 px-3 md:gap-3 md:px-4">
        <a
          href="/"
          className="focus-ring flex shrink-0 items-center gap-2 rounded-control text-fg"
          aria-label="kernelCAD home"
        >
          <KernelcadMark />
          <span className="hidden font-serif text-body font-medium lg:inline">
            kernel<span className="text-accent">CAD</span>
          </span>
        </a>
        <span aria-hidden="true" className="hidden text-fg-3 lg:inline">/</span>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="min-w-0 truncate text-ui font-medium text-fg md:text-body">{props.title}</h1>
          {props.titleAside}
        </div>
        {props.headerActions && <div className="flex shrink-0 items-center gap-2">{props.headerActions}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 min-w-0 flex-1">{props.stage}</div>
        <aside
          aria-label={props.panelLabel}
          style={sheetStyle}
          data-testid="project-panel"
          className={cx(
            'relative flex shrink-0 flex-col border-border bg-surface-1',
            // No height transition: every frame of one would resize the
            // WebGL canvas above. Keep a strip of the model in view.
            'h-[var(--kc-sheet-h)] max-h-[calc(100%-4rem)] rounded-t-sheet border-t shadow-e3',
            'md:h-auto md:max-h-none md:w-side-panel md:rounded-none md:border-l md:border-t-0 md:shadow-none',
          )}
        >
          <SheetHandle snap={snap} onSnap={setSnap} onDrag={setDrag} />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{props.panel}</div>
        </aside>
      </div>
      {props.actionBar && (
        <div
          data-testid="project-action-bar"
          className="flex shrink-0 items-center gap-2 border-t border-border bg-surface-1 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
        >
          {props.actionBar}
        </div>
      )}
    </div>
  );
}

/** The phone sheet's grab handle: a vertical slider. Drag it, or use the
 *  arrow keys, Home and End; it settles on the nearest snap point. */
function SheetHandle({ snap, onSnap, onDrag }: {
  snap: number;
  onSnap: (index: number) => void;
  onDrag: (fraction: number | null) => void;
}): JSX.Element {
  const [dragging, setDragging] = useState<{ startY: number; startF: number; f: number } | null>(null);
  // A drag ends with a click event; only a tap (no drag) cycles the height.
  const [dragged, setDragged] = useState(false);
  const onDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = SHEET_SNAPS[snap];
    setDragging({ startY: e.clientY, startF: f, f });
    setDragged(false);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (!dragging || (!dragged && Math.abs(e.clientY - dragging.startY) < 6)) return;
    const f = Math.max(0.12, Math.min(0.92, dragging.startF + (dragging.startY - e.clientY) / window.innerHeight));
    setDragging({ ...dragging, f });
    setDragged(true);
    onDrag(f);
  };
  const onUp = (): void => {
    if (!dragging) return;
    if (dragged) onSnap(nearestSnap(dragging.f, SHEET_SNAPS));
    setDragging(null);
    onDrag(null);
  };
  const pct = (f: number): number => Math.round(f * 100);
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Panel height"
      aria-orientation="vertical"
      aria-valuemin={pct(SHEET_SNAPS[0])}
      aria-valuemax={pct(SHEET_SNAPS[SHEET_SNAPS.length - 1])}
      aria-valuenow={pct(SHEET_SNAPS[snap])}
      aria-valuetext={`${pct(SHEET_SNAPS[snap])} % of the screen`}
      onKeyDown={(e) => {
        const next = snapForKey(e.key, snap, SHEET_SNAPS.length);
        if (next === null) return;
        e.preventDefault();
        onSnap(next);
      }}
      onClick={() => { if (!dragged) onSnap((snap + 1) % SHEET_SNAPS.length); }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      data-testid="sheet-handle"
      className="focus-ring mx-auto flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
    >
      <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border-strong" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model stage
// ---------------------------------------------------------------------------

const STAGE_BACKGROUND = `#${BACKGROUND_DARK_HEX.toString(16).padStart(6, '0')}`;

/** After this long without a model, the status says the build is slow. */
const STAGE_SLOW_MS = 8_000;

export type StagePhase = 'loading' | 'building' | 'displayed' | 'failed';

export interface ModelStageProps {
  /** Stored render shown until the live model is on screen. */
  posterSrc?: string | null;
  posterAlt: string;
  phase: StagePhase;
  /** The shown model is re-building (a customizer edit, a live update). */
  busy?: boolean;
  /** The live canvas (`LiveModelViewport`). */
  children?: ReactNode;
  /** The failure card, shown over the stage when `phase` is `failed`. */
  failure?: ReactNode;
  /** Extra layer over the model (notices). */
  overlay?: ReactNode;
}

/** True once `key` has stayed the same for `ms`. Null never turns slow. */
function useSlow(key: string | null, ms: number): boolean {
  const [slowKey, setSlowKey] = useState<string | null>(null);
  useEffect(() => {
    if (key === null) return undefined;
    const t = window.setTimeout(() => setSlowKey(key), ms);
    return () => window.clearTimeout(t);
  }, [key, ms]);
  return key !== null && slowKey === key;
}

function stageStatus(phase: StagePhase, slow: boolean, meshing = false): string | null {
  if (meshing) return 'Still meshing… the server is still building this model.';
  if (phase === 'loading') return 'Loading the project…';
  if (phase === 'building') return slow ? 'Still building the model. Large models take up to a minute.' : 'Building the model…';
  return null;
}

/** Longest the live canvas waits for the poster before it mounts anyway. */
const POSTER_HEAD_START_MS = 1_200;

/**
 * Mount the live canvas only after the poster had its chance to paint.
 * Creating the WebGL canvas and the scene blocks the main thread for a
 * moment; started first, it holds back the poster that should show at once.
 */
function useCanvasGate(posterState: 'loading' | 'loaded' | 'missing'): boolean {
  const [timedOut, setTimedOut] = useState(false);
  const [painted, setPainted] = useState(false);
  const settled = posterState !== 'loading' || timedOut;
  useEffect(() => {
    if (posterState !== 'loading') return undefined;
    const t = window.setTimeout(() => setTimedOut(true), POSTER_HEAD_START_MS);
    return () => window.clearTimeout(t);
  }, [posterState]);
  useEffect(() => {
    if (!settled) return undefined;
    // Two frames: the poster is on screen before the canvas is created.
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setPainted(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [settled]);
  return painted;
}

type PosterState = 'loading' | 'loaded' | 'missing';

export function ModelStage(props: ModelStageProps): JSX.Element {
  const [posterState, setPosterState] = useState<PosterState>(props.posterSrc ? 'loading' : 'missing');
  const canvasReady = useCanvasGate(posterState);
  const displayed = props.phase === 'displayed';
  const waiting = props.phase === 'loading' || props.phase === 'building';
  const slow = useSlow(waiting ? props.phase : null, STAGE_SLOW_MS);
  const notice = useSyncExternalStore(subscribeMeshNotice, getMeshNotice, getMeshNotice);
  const status = stageStatus(props.phase, slow, notice.meshing);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: STAGE_BACKGROUND }}
      data-testid="model-stage"
      data-phase={props.phase}
    >
      <div
        className={cx(
          'absolute inset-0 transition-opacity duration-[250ms] motion-reduce:transition-none',
          displayed ? 'opacity-100' : 'opacity-0',
        )}
      >
        {canvasReady && props.children}
      </div>
      {props.posterSrc && (
        <StagePoster src={props.posterSrc} alt={props.posterAlt} state={posterState} onState={setPosterState} hidden={displayed} />
      )}
      {waiting && posterState !== 'loaded' && <StagePlaceholder />}
      {(waiting || props.busy || notice.meshing) && <ProgressLine />}
      {status && <StageStatus text={status} />}
      {notice.approximate && !notice.meshing && displayed && (
        <div role="status" data-testid="approximate-preview"
          className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-2xs font-medium text-white backdrop-blur-sm">
          Approximate preview — the full rebuild is not ready yet.
        </div>
      )}
      {props.phase === 'failed' && props.failure}
      {props.overlay}
    </div>
  );
}

/** The stored render. Shown at once (no fade-in: the first painted frame
 *  has it); it fades out as the live model fades in. */
function StagePoster({ src, alt, state, onState, hidden }: {
  src: string;
  alt: string;
  state: PosterState;
  onState: (state: PosterState) => void;
  hidden: boolean;
}): JSX.Element {
  return (
    <img
      src={src}
      alt={alt}
      data-testid="model-poster"
      decoding="async"
      onLoad={() => onState('loaded')}
      onError={() => onState('missing')}
      className={cx(
        'pointer-events-none absolute inset-0 size-full object-contain',
        hidden && 'transition-opacity duration-[250ms] motion-reduce:transition-none',
        state === 'loaded' && !hidden ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

function StageStatus({ text }: { text: string }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4" role="status" aria-live="polite">
      <p
        data-testid="model-stage-status"
        className="rounded-full bg-black/60 px-3 py-1 text-2xs font-medium text-white backdrop-blur-sm"
      >
        {text}
      </p>
    </div>
  );
}

/** A quiet silhouette while there is neither a poster nor a model. */
function StagePlaceholder(): JSX.Element {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="size-40 animate-pulse rounded-[28%] bg-white/[0.06] motion-reduce:animate-none md:size-56" />
    </div>
  );
}

/** Thin indeterminate bar along the top edge of the stage. */
function ProgressLine(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-testid="model-stage-progress"
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/10"
    >
      <div className="h-full w-1/3 animate-[kc-stage-progress_1.4s_ease-in-out_infinite] bg-accent motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
      <style>{'@keyframes kc-stage-progress{from{transform:translateX(-100%)}to{transform:translateX(300%)}}'}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live canvas
// ---------------------------------------------------------------------------

export interface LiveViewportState {
  phase: StagePhase;
  /** Why the build failed, when `phase` is `failed`. */
  error: string | null;
  busy: boolean;
}

/** Wait this long after an empty, error-free build before calling it failed
 *  (the auto-run can report "done" a beat before the meshes land). */
const EMPTY_BUILD_SETTLE_MS = 800;

/**
 * Stage phase of the workbench this is mounted in. A failed re-build over a
 * displayed model keeps the model in view: the side panel reports the
 * error, the model does not vanish.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLiveViewportState(displayReady: boolean): LiveViewportState {
  const { geometries, isReady, isComputing, error } = useWorkbench();
  const nonempty = useMemo(() => hasNonemptyGeometry(geometries), [geometries]);
  // The geometry list that stayed empty for the settle time.
  const [settledEmpty, setSettledEmpty] = useState<unknown>(null);
  const emptyCandidate = !isComputing && isReady && !error && !nonempty;

  useEffect(() => {
    if (!emptyCandidate) return undefined;
    const t = window.setTimeout(() => setSettledEmpty(geometries), EMPTY_BUILD_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [emptyCandidate, geometries]);
  const emptySettled = emptyCandidate && settledEmpty === geometries;

  if (displayReady && nonempty) return { phase: 'displayed', error: null, busy: isComputing };
  if (error) return { phase: 'failed', error, busy: false };
  if (emptyCandidate && emptySettled) {
    return { phase: 'failed', error: 'The build produced no geometry.', busy: false };
  }
  return { phase: 'building', error: null, busy: isComputing };
}

export interface LiveModelViewportProps {
  /** Fired once the first frame of a model is on screen. */
  onDisplayReady: () => void;
  /** Accessible name of the canvas: the title and a short summary. */
  label: string;
}

/** The live 3D canvas of the surrounding workbench, without Studio chrome. */
export function LiveModelViewport({ onDisplayReady, label }: LiveModelViewportProps): JSX.Element {
  const { geometries, previewGeometries, sketchesGeometries, showSketches, viewMode3D } = useWorkbench();
  const onReady = useCallback(() => onDisplayReady(), [onDisplayReady]);
  return (
    <div className="absolute inset-0" role="img" aria-label={label} data-testid="live-model-viewport">
      <Viewer
        geometries={[...geometries]}
        previewGeometries={previewGeometries ?? []}
        sketchesGeometries={sketchesGeometries ?? []}
        showSketches={showSketches ?? false}
        viewMode3D={viewMode3D}
        onDisplayReady={onReady}
      />
    </div>
  );
}
