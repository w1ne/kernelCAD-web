// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/sendToPrinter.ts
//
// Protocol dispatcher for the `send_to_printer` capability. One real
// upload path per protocol — no placeholder/simulated success.

import { uploadToOctoPrint } from './octoprintUpload';
import { uploadToMoonraker } from './moonrakerUpload';
import { uploadToBambu } from './bambuUpload';
import { resolvePrinterProfile } from '../export/gcode/printerProfiles';
import type { PrinterProtocol, UploadOutcome, UploadRequest } from './types';

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

/**
 * Check an optional `printer` profile id against the upload protocol before
 * any file is read or sent. Returns the refusal message, or `undefined` when
 * the pair is fine. An unknown id is refused with the list of valid ids;
 * `bambu-lan` needs a Bambu Lab profile, and a Bambu Lab profile needs
 * `bambu-lan` (stock firmware serves neither OctoPrint nor Moonraker).
 * `generic-fdm` pairs with any protocol.
 */
export function printerProtocolError(printer: string | undefined, protocol: PrinterProtocol): string | undefined {
  if (printer === undefined) return undefined;
  let profile;
  try {
    profile = resolvePrinterProfile(printer);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  if (profile.slicer === 'generic') return undefined;
  const isBambu = profile.slicer === 'bambu';
  if (protocol === 'bambu-lan' && !isBambu) {
    return `printer '${profile.name}' (${profile.label}) is not a Bambu Lab printer; protocol 'bambu-lan' needs a Bambu Lab profile.`;
  }
  if (protocol !== 'bambu-lan' && isBambu) {
    return `printer '${profile.name}' (${profile.label}) takes protocol 'bambu-lan', not '${protocol}'.`;
  }
  return undefined;
}
