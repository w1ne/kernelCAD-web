// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/moonrakerUpload.ts
//
// Real Moonraker (Klipper) REST upload: POST multipart/form-data to
// /server/files/upload. `print=true` asks Moonraker to start the print
// immediately after upload — Moonraker's own documented contract.
// https://moonraker.readthedocs.io/en/latest/web_api/#file-upload

import type { UploadOutcome, UploadRequest } from './types';

export async function uploadToMoonraker(req: UploadRequest): Promise<UploadOutcome> {
  const port = req.port ?? 7125;
  const base = `http://${req.host}:${port}`;

  if (req.dryRun) {
    try {
      const res = await fetch(`${base}/server/info`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        return { ok: false, kind: 'unreachable', message: `Moonraker reachability check returned HTTP ${res.status}.` };
      }
      return { ok: true, dryRun: true };
    } catch (e) {
      return { ok: false, kind: 'unreachable', message: `Could not reach Moonraker at ${base}: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  const filename = req.filename ?? 'kernelcad.gcode';
  const form = new FormData();
  form.set('file', new Blob([Buffer.from(req.gcode)], { type: 'text/x.gcode' }), filename);
  form.set('root', 'gcodes');
  if (req.startPrint !== false) form.set('print', 'true');

  let res: Response;
  try {
    res = await fetch(`${base}/server/files/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return { ok: false, kind: 'unreachable', message: `Could not reach Moonraker at ${base}: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, kind: 'upload-failed', message: `Moonraker upload failed: HTTP ${res.status} ${body}`.trim() };
  }
  return { ok: true, uploadedPath: `gcodes/${filename}` };
}
