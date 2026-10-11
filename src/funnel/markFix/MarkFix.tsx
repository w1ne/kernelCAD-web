// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * "Mark & fix" in the ChatGPT embed: tap the model to drop up to five
 * numbered pins, say what to change, and send it back into the chat with a
 * precise target (feature, part, face, surface, point, normal, revision).
 *
 * `useMarkFix` owns the state and returns two nodes: `canvas` goes inside the
 * viewer's <Canvas> (tap raycast + pins), `overlay` sits over it (the button
 * and the panel). Both are null unless the hosting widget said hello for this
 * instance, so an older widget never shows a button that goes nowhere.
 */
import { useCallback, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import type { GeometryResult } from '../../shared/worker/geometryEngine';
import { rendererSnapshot } from '../../studio/components/viewer/rendererSnapshot';
import { addPick, buildEditRequest, newRequestId, removePick, sendBlocker, type EditPick } from './editRequest';
import { MarkFixLauncher, MarkFixPanel, type SendState } from './MarkFixPanel';
import { markScreenshot, type ScreenPin } from './markScreenshot';
import { MarkTapTool } from './MarkTapTool';
import { postEditRequest, useWidgetAcceptsEdits } from './widgetChannel';

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

export function useMarkFix(args: {
  target: MarkFixTarget | undefined;
  geometries: readonly GeometryResult[];
  displayed: boolean;
}): { canvas: ReactNode; overlay: ReactNode } {
  const { target, geometries, displayed } = args;
  const accepts = useWidgetAcceptsEdits(target?.instanceId);
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

  if (!target || !accepts) return { canvas: null, overlay: null };

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
