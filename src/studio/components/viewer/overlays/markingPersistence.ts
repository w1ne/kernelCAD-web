// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { getEmbedConfig } from '../../../config/embedConfigRef';
import { resolveReviewPaintTargets } from './reviewPaintTargets';
import { struckPartsFromMask } from './markingRaycast';

export interface PersistMarkRefs {
  canvasRef: { current: HTMLCanvasElement | null };
  dirtyRef: { current: boolean };
  noteRef: { current: string };
  tagsRef: { current: string[] };
}

function findRendererCanvas(maskCanvas: HTMLCanvasElement | null): HTMLCanvasElement | null {
  const all = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
  return all.find((c) => c !== maskCanvas) ?? null;
}

function maskAsPng(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

function screenshotAsPng(maskCanvas: HTMLCanvasElement | null): string | null {
  const renderer = findRendererCanvas(maskCanvas);
  if (!renderer) return null;
  return renderer.toDataURL('image/png');
}

// Fire-and-forget save on unmount. Agents pick the packet up via the
// `review_paint_peek_latest` MCP tool (any client) or the UserPromptSubmit
// hook (Claude Code).
//
// Robust against partial state: if the three.js canvas isn't found (e.g.
// user toggled the brush before the kernel was ready and the renderer
// canvas hadn't mounted), we still save the mask — the agent can read
// the red strokes from the mask alone and ask "what's marked here?".
export function persistReviewMark({ canvasRef, dirtyRef, noteRef, tagsRef }: PersistMarkRefs): void {
  console.log('[marking-overlay] persistMark fired, dirty=' + dirtyRef.current);
  if (!dirtyRef.current) {
    console.log('[marking-overlay] nothing painted — skipping save');
    return;
  }
  // The mask canvas is the source of truth for the stroke. If its ref is
  // already detached (e.g. React nulled it during unmount), there's nothing
  // to read — bail rather than throw. The pointer-up debounce path normally
  // persists while still mounted, so this only guards the unmount race.
  const canvas = canvasRef.current;
  if (!canvas) {
    console.warn('[marking-overlay] canvas detached before save — skipping');
    return;
  }
  let screenshot: string | null;
  try {
    screenshot = screenshotAsPng(canvas);
  } catch (err) {
    console.warn('[marking-overlay] screenshot capture threw:', err);
    screenshot = null;
  }
  if (!screenshot) {
    console.warn('[marking-overlay] no renderer canvas found — saving mask only');
  }
  const mask = maskAsPng(canvas);
  const { parts: struckParts, debug: raycastDebug } = struckPartsFromMask(canvas);
  console.log(`[marking-overlay] struck parts:`, struckParts, 'debug:', raycastDebug);
  const scriptParam = new URLSearchParams(window.location.search).get('script');
  // Same env resolution order as apiBase.ts, but NOT session-gated:
  // anonymous brushing on hosted /p pages is the point, so the backend
  // target comes straight from the build env — no Supabase session needed.
  const apiBase =
    import.meta.env.VITE_KERNELCAD_API_BASE ??
    import.meta.env.VITE_API_BASE_URL ??
    undefined;
  const { slug, urls } = resolveReviewPaintTargets(
    window.location.pathname,
    apiBase,
  );
  const meta = {
    // One-line note + preset tags carried with the stroke (WHAT is wrong, not
    // just where). Both optional — backend caps/sanitises and stays
    // backward-compatible when omitted.
    note: noteRef.current.trim(),
    tags: tagsRef.current,
    scriptPath: scriptParam,
    ts: new Date().toISOString(),
    ua: navigator.userAgent,
    screenshotMissing: screenshot === null,
    struckParts,
    raycastDebug,
    // On hosted /p pages the backend keys the packet by project slug so
    // `review_paint_peek_latest {slug}` can fetch it without auth.
    ...(slug ? { projectSlug: slug } : {}),
  };

  // Embed-mode short-circuit: when a host (e.g. proto.cat) supplies
  // `onBrushReport`, deliver the payload directly and skip both the
  // dev-only :5174 save server AND the same-origin fallback. The host
  // owns auth, transport, and storage from here. We read the embed
  // config from the module ref because `persistReviewMark` runs from an
  // unmount cleanup, where React context is no longer reliably available.
  const embed = getEmbedConfig();
  if (embed?.onBrushReport) {
    try {
      embed.onBrushReport({ screenshot: screenshot ?? '', mask, meta });
      console.log('[marking-overlay] mark delivered via embed onBrushReport');
    } catch (err) {
      console.warn('[marking-overlay] onBrushReport threw:', err);
    }
    return;
  }
  // Local dev: POST to the standalone save server (port 5174, auto-spawned
  // by vite as a worker thread) so saves keep working when vite's main
  // thread saturates on OCCT/replicad transforms. Hosted /p pages: POST to
  // the backend first. Either way, same-origin is the fallback.
  //
  // We deliberately do NOT set `keepalive: true`: Chrome silently rejects
  // keepalive fetches with bodies over 64 KB, and a viewport screenshot +
  // mask base64-encoded blows through that cap easily. Without keepalive,
  // the fetch fires as a normal request — the component is unmounting but
  // the request is in flight on the global queue and completes regardless.
  const [saveUrl, fallbackUrl] = urls;
  // mask is always present; screenshot may be empty string if renderer canvas
  // was missing — server stores both keys regardless.
  const body = JSON.stringify({ screenshot: screenshot ?? '', mask, meta });
  console.log(`[marking-overlay] saving mark (${(body.length / 1024).toFixed(0)} KB) to ${saveUrl}`);
  fetch(saveUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[marking-overlay] mark saved (${saveUrl})`);
    })
    .catch((err) => {
      console.warn(`[marking-overlay] save to ${saveUrl} failed, trying fallback:`, err);
      fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      }).catch((err2) => {
        console.warn('[marking-overlay] fallback save also failed:', err2);
      });
    });
}
