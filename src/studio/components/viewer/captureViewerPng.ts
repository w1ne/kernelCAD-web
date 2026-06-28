// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Grab the rendered three.js viewer canvas as a base64 PNG (no `data:` prefix).
//
// This mirrors the review-paint brush capture in MarkingOverlay
// (`findRendererCanvas()` + `renderer.toDataURL('image/png')`): the renderer is
// mounted with `preserveDrawingBuffer: true` (see Viewer.tsx) so reading the
// canvas after compositing returns the actual frame instead of a blank PNG.
//
// Returns null if the renderer canvas isn't in the DOM yet or the read fails —
// callers must treat capture as best-effort and never break the viewer on a
// missing/failed grab.

import type * as THREE from 'three';
import { rendererSnapshot } from './rendererSnapshot';

/** Objects tagged with `userData[CAPTURE_HIDDEN_FLAG] === true` are hidden for
 *  the duration of a render-to-image capture and restored immediately after.
 *  Used to keep editing-only scene furniture — the red/green/blue origin
 *  construction planes and the ground grid — out of the captured PNG so it
 *  matches the clean framed model the user reviews, not the authoring view.
 *  Tagged at the group level in Viewer.tsx; see hideCaptureFurniture below. */
export const CAPTURE_HIDDEN_FLAG = 'kcCaptureHidden';

/** Walk the scene and hide every object (and its subtree, implicitly via
 *  three.js visibility inheritance) flagged with CAPTURE_HIDDEN_FLAG. Returns a
 *  restore() that puts every touched object's `.visible` back exactly as it was.
 *  Best-effort: a throw mid-traversal still leaves restore() able to undo what
 *  was already changed. */
function hideCaptureFurniture(scene: THREE.Scene): () => void {
  const touched: Array<{ obj: THREE.Object3D; prev: boolean }> = [];
  scene.traverse((obj) => {
    if ((obj.userData as Record<string, unknown>)?.[CAPTURE_HIDDEN_FLAG] === true) {
      touched.push({ obj, prev: obj.visible });
      obj.visible = false;
    }
  });
  return () => {
    for (const { obj, prev } of touched) obj.visible = prev;
  };
}

/** Find the three.js WebGL canvas in the document. The viewer mounts exactly
 *  one such canvas; the brush overlay's transient 2D canvas is excluded by the
 *  `webgl` context probe. */
export function findRendererCanvas(): HTMLCanvasElement | null {
  const all = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
  return (
    all.find((c) => {
      try {
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
      } catch {
        return false;
      }
    }) ?? null
  );
}

/** Capture the viewer canvas as a base64 PNG with the `data:image/png;base64,`
 *  prefix stripped (the backend render endpoint wants the raw base64). Returns
 *  null on any failure — capture is best-effort.
 *
 *  Forces a fresh render of the live scene/camera right before reading. The
 *  viewer renders on the r3f loop, so an IDLE `toDataURL` reads whatever frame
 *  is left in the preserved drawing buffer — often a stale early frame (pre-mesh
 *  / pre-camera-fit), giving an unframed shot. The brush avoids this only
 *  because it captures right after the user moved the camera. Re-rendering
 *  scene+camera into the preserved buffer makes an idle auto-capture read the
 *  CURRENT view.
 *
 *  The forced render is done with the origin construction planes and ground
 *  grid (tagged CAPTURE_HIDDEN_FLAG in Viewer.tsx) hidden, so the captured PNG
 *  shows the clean framed model the user reviews rather than the authoring view
 *  buried under colored planes. Visibility is restored before returning, so the
 *  on-screen frame the r3f loop paints next is unaffected. */
export function captureViewerPngBase64(): string | null {
  try {
    const { gl, scene, camera } = rendererSnapshot;
    const canvas = gl?.domElement ?? findRendererCanvas();
    if (!canvas) return null;
    if (gl && scene && camera) {
      // Hide editing-only furniture for the captured frame, then restore so the
      // next on-screen r3f frame is identical to before. If gl.render throws we
      // still restore (finally) and fall back to the buffered frame.
      const restore = hideCaptureFurniture(scene);
      try {
        gl.render(scene, camera);
      } catch {
        /* fall back to the buffered frame */
      } finally {
        restore();
      }
    }
    const dataUrl = canvas.toDataURL('image/png');
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    return dataUrl.slice(comma + 1) || null;
  } catch {
    return null;
  }
}
