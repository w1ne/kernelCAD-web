// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/octoprintUpload.ts
//
// Real OctoPrint REST upload: POST multipart/form-data to
// /api/files/local with the X-Api-Key header. `select`/`print` in the
// form body ask OctoPrint to start the print immediately after upload —
// OctoPrint's own documented contract, not a kernelCAD invention.
// https://docs.octoprint.org/en/master/api/files.html#upload-file-or-create-folder

import type { UploadOutcome, UploadRequest } from './types';

export async function uploadToOctoPrint(req: UploadRequest): Promise<UploadOutcome> {
  const port = req.port ?? 80;
  const base = `http://${req.host}:${port}`;
  const headers: Record<string, string> = req.apiKey ? { 'X-Api-Key': req.apiKey } : {};

  if (req.dryRun) {
    try {
      const res = await fetch(`${base}/api/version`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        return { ok: false, kind: 'unreachable', message: `OctoPrint reachability check returned HTTP ${res.status}.` };
      }
      return { ok: true, dryRun: true };
    } catch (e) {
      return { ok: false, kind: 'unreachable', message: `Could not reach OctoPrint at ${base}: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  const filename = req.filename ?? 'kernelcad.gcode';
  const form = new FormData();
  form.set('file', new Blob([Buffer.from(req.gcode)], { type: 'text/x.gcode' }), filename);
  if (req.startPrint !== false) {
    form.set('select', 'true');
    form.set('print', 'true');
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/files/local`, {
      method: 'POST',
      headers,
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return { ok: false, kind: 'unreachable', message: `Could not reach OctoPrint at ${base}: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, kind: 'upload-failed', message: `OctoPrint upload failed: HTTP ${res.status} ${body}`.trim() };
  }
  return { ok: true, uploadedPath: `local/${filename}` };
}
