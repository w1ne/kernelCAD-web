// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/sendToPrinter.ts
//
// Protocol dispatcher for the `send_to_printer` capability. One real
// upload path per protocol — no placeholder/simulated success.

import { uploadToOctoPrint } from './octoprintUpload';
import { uploadToMoonraker } from './moonrakerUpload';
import { uploadToBambu } from './bambuUpload';
import type { UploadOutcome, UploadRequest } from './types';

export type { UploadOutcome, UploadRequest, PrinterProtocol } from './types';

export async function sendToPrinter(req: UploadRequest): Promise<UploadOutcome> {
  switch (req.protocol) {
    case 'octoprint': return uploadToOctoPrint(req);
    case 'moonraker': return uploadToMoonraker(req);
    case 'bambu-lan': return uploadToBambu(req);
    default:
      return { ok: false, kind: 'upload-failed', message: `Unknown protocol: ${String(req.protocol)}. Valid: octoprint, moonraker, bambu-lan.` };
  }
}
