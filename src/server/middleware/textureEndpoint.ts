/**
 * `/__kernelcad/texture?path=<encoded>` — dev-server route for serving texture
 * image bytes off the host filesystem (or sha256-cached from a remote URL).
 *
 * Mirrors the long-standing `/__kernelcad/image` overlay pattern referenced in
 * DemoPlayerPage.tsx: client requests `?path=<encoded>` and gets back a
 * streamed image buffer with the matching content-type. Used by the W1 texture
 * loader when rendering in a browser context — the browser-side helper in
 * `src/shared/textures/index.ts` rewrites local-fs paths to this route.
 *
 * Status codes:
 *   - 200 + bytes (with image/* content-type) on success
 *   - 400 if `path` query is missing
 *   - 404 if the file does not exist (mapped from
 *         `feature.material.texture-not-found`)
 *   - 415 if the extension is not in the supported set (mapped from
 *         `feature.material.texture-unsupported-format`)
 *   - 413 if the texture exceeds the 8192px hard cap (mapped from
 *         `feature.material.texture-oversize-error`)
 *   - 500 on any other failure
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveAndLoadTextureBytes } from '../../shared/textures';
import { isKernelError } from '../../shared/intent/kernelError';
import { readQuery } from './httpUtil';

export async function handleTextureRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const rawPath = readQuery(req.url, 'path');
    if (rawPath === null || rawPath.length === 0) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'missing path query parameter' }));
      return;
    }

    const out = await resolveAndLoadTextureBytes({ path: rawPath }, undefined);
    res.statusCode = 200;
    res.setHeader('content-type', out.contentType);
    res.setHeader('content-length', String(out.buffer.length));
    // Cache aggressively at the browser layer; the same path serves the same
    // bytes for the duration of the dev session.
    res.setHeader('cache-control', 'public, max-age=3600');
    res.end(out.buffer);
  } catch (e) {
    if (isKernelError(e)) {
      let status = 500;
      if (e.code === 'feature.material.texture-not-found') status = 404;
      else if (e.code === 'feature.material.texture-unsupported-format') status = 415;
      else if (e.code === 'feature.material.texture-oversize-error') status = 413;
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: e.message, code: e.code }));
      return;
    }
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}
