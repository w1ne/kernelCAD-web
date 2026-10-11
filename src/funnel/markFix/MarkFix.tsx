// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * "Mark & fix" in the host-chat embed (ChatGPT apps, MCP Apps hosts such as
 * Claude): tap the model to drop up to five numbered marks with a precise
 * target (feature, part, face, surface, point, normal, revision).
 *
 * Two modes, picked by the hosting widget's hello:
 *  - `marks-context` (paint only): marking is just marking. Every change is
 *    posted as `kernelcad.marks`; the widget puts it into the host model's
 *    context, so the user types the change in the host chat's own composer
 *    and the next turn applies to the marked spots. The only UI is a compact
 *    bar in the top toolbar row (Done / count / Undo / Clear) and inert pins.
 *  - `edit-request` only (older widgets): the legacy panel with a note box
 *    and "Send to chat", because those widgets cannot carry marks otherwise.
 *
 * `useMarkFix` owns the state and returns two nodes: `canvas` goes inside the
 * viewer's <Canvas> (tap raycast + pins), `overlay` sits over it (the button
 * and the panel). Both are null unless the hosting widget said hello for this
 * instance, so an older widget never shows a button that goes nowhere.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { rendererSnapshot } from '../../studio/components/viewer/rendererSnapshot';
import { addPick, buildEditRequest, buildMarksMessage, newRequestId, removePick, sendBlocker, type EditPick } from './editRequest';
import { MarkFixLauncher, MarkFixPanel, MarkPaintBar, type SendState } from './MarkFixPanel';
import { markScreenshot, type ScreenPin } from './markScreenshot';
import { MarkTapTool } from './MarkTapTool';
import { postEditRequest, postMarks, useWidgetSupport } from './widgetChannel';

export interface MarkFixTarget {
  slug: string;
  instanceId: string;
  revision: number | null;
}

/** Screen positions of the pins on the live canvas, for the screenshot. */
function pinsOnScreen(picks: readonly EditPick[]): { canvas: HTMLCanvasElement | null; pins: ScreenPin[] } {
  const { camera, gl } = rendererSnapshot;
  const canvas = gl?.domElement ?? null;
  if (!camera || !canvas) return { canvas, pins: [] };
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  const v = new THREE.Vector3();
  const pins = picks.map((p) => {
    v.set(p.point[0], p.point[1], p.point[2]).project(camera);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
  });
  return { canvas, pins };
}

function failureText(error: string | undefined): string {
  if (error === 'timeout') return 'The chat did not answer. Try again.';
  return error && error.length > 0 ? error : 'The chat did not take the message.';
}

/** Quiet time before a marks change is posted, so a burst of taps is one update. */
export const MARKS_POST_DELAY_MS = 250;

/**
 * Paint mode: post the current marks to the widget after each change (an
 * empty list once the user clears them). Nothing is posted before the first
 * mark, so merely opening the viewer never touches the host's context.
 */
function useMarksPublisher(target: MarkFixTarget | undefined, picks: readonly EditPick[], enabled: boolean): void {
  const seq = useRef(0);
  const posted = useRef(false);
  const slug = target?.slug;
  const revision = target?.revision ?? null;
  const instanceId = target?.instanceId;
  useEffect(() => {
    if (!enabled || !slug || !instanceId) return undefined;
    if (picks.length === 0 && !posted.current) return undefined;
    const timer = window.setTimeout(() => {
      const { canvas, pins } = picks.length > 0 ? pinsOnScreen(picks) : { canvas: null, pins: [] };
      seq.current += 1;
      postMarks(buildMarksMessage({
        seq: seq.current,
        slug,
        revision,
        instanceId,
        picks,
        screenshot: picks.length > 0 ? markScreenshot(canvas, pins) : null,
      }));
      posted.current = picks.length > 0;
    }, MARKS_POST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, slug, revision, instanceId, picks]);
}

type MarkFixNodes = { canvas: ReactNode; overlay: ReactNode };
type ModeArgs = { target: MarkFixTarget | undefined; geometries: readonly GeometryResult[]; displayed: boolean; enabled: boolean };

/** Picks for one model revision: a new model (or revision) starts clean. */
function useRevisionPicks(target: MarkFixTarget | undefined, onReset: () => void) {
  const [picks, setPicks] = useState<EditPick[]>([]);
  const modelKey = `${target?.slug ?? ''}@${String(target?.revision ?? '')}`;
  const [picksFor, setPicksFor] = useState(modelKey);
  if (picksFor !== modelKey) {
    setPicksFor(modelKey);
    setPicks([]);
    onReset();
  }
  return [picks, setPicks] as const;
}

/**
 * Host-chat mode: marking is only painting. The marks go to the widget as
 * they change (the publisher also tells it when a new revision drops them);
 * the controls are one compact bar in the top toolbar row.
 */
function usePaintMarks({ target, geometries, displayed, enabled }: ModeArgs): MarkFixNodes {
  const [active, setActive] = useState(false);
  const [picks, setPicks] = useRevisionPicks(target, () => setActive(false));
  useMarksPublisher(target, picks, enabled);

  useEffect(() => {
    if (!enabled || !active) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, active]);

  const showPins = displayed && (active || picks.length > 0);
  return {
    canvas: showPins ? (
      <MarkTapTool
        geometries={geometries}
        picks={picks}
        interactive={active}
        onPick={(pick) => setPicks((prev) => addPick(prev, pick))}
        onRemove={(index) => setPicks((prev) => removePick(prev, index))}
      />
    ) : null,
    overlay: (
      <MarkPaintBar
        active={active}
        count={picks.length}
        disabled={!displayed}
        onStart={() => setActive(true)}
        onDone={() => setActive(false)}
        onUndo={() => setPicks((prev) => prev.slice(0, -1))}
        onClear={() => setPicks([])}
      />
    ),
  };
}

/** Older widgets (edit-request only): note box + "Send to chat" panel. */
function useLegacyPanel({ target, geometries, displayed }: ModeArgs): MarkFixNodes {
  const [active, setActive] = useState(false);
  const [picks, setPicks] = useState<EditPick[]>([]);
  const [note, setNote] = useState('');
  const [send, setSend] = useState<SendState>({ kind: 'idle' });

  const close = useCallback(() => {
    setActive(false);
    setPicks([]);
    setNote('');
  }, []);

  const submit = useCallback(async () => {
    if (!target || sendBlocker({ displayed, picks, note })) return;
    setSend({ kind: 'sending' });
    const { canvas, pins } = pinsOnScreen(picks);
    const message = buildEditRequest({
      requestId: newRequestId(),
      slug: target.slug,
      revision: target.revision,
      instanceId: target.instanceId,
      note,
      picks,
      screenshot: markScreenshot(canvas, pins),
    });
    const outcome = await postEditRequest(message);
    if (outcome.ok) {
      setSend({ kind: 'sent' });
      close();
    } else {
      setSend({ kind: 'failed', message: failureText(outcome.error) });
    }
  }, [target, displayed, picks, note, close]);

  const canvas = active && displayed ? (
    <MarkTapTool
      geometries={geometries}
      picks={picks}
      onPick={(pick) => setPicks((prev) => addPick(prev, pick))}
      onRemove={(index) => setPicks((prev) => removePick(prev, index))}
    />
  ) : null;

  const overlay = active ? (
    <MarkFixPanel
      picks={picks}
      note={note}
      displayed={displayed}
      send={send}
      onNote={setNote}
      onRemove={(index) => setPicks((prev) => removePick(prev, index))}
      onSend={() => { void submit(); }}
      onCancel={() => { close(); setSend({ kind: 'idle' }); }}
    />
  ) : (
    <MarkFixLauncher
      disabled={!displayed}
      sent={send.kind === 'sent'}
      onOpen={() => { setActive(true); setSend({ kind: 'idle' }); }}
    />
  );
  return { canvas, overlay };
}

export function useMarkFix(args: {
  target: MarkFixTarget | undefined;
  geometries: readonly GeometryResult[];
  displayed: boolean;
}): MarkFixNodes {
  const support = useWidgetSupport(args.target?.instanceId);
  const paint = usePaintMarks({ ...args, enabled: support.marksContext });
  const legacy = useLegacyPanel({ ...args, enabled: support.editRequest && !support.marksContext });
  if (!args.target) return { canvas: null, overlay: null };
  if (support.marksContext) return paint;
  if (support.editRequest) return legacy;
  return { canvas: null, overlay: null };
}
