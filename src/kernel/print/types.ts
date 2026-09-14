// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/types.ts
//
// Shared types for the `send_to_printer` upload backends.

export type PrinterProtocol = 'octoprint' | 'moonraker' | 'bambu-lan';

export interface UploadRequest {
  protocol: PrinterProtocol;
  host: string;
  /** File name to give the uploaded G-code (default: 'kernelcad.gcode'). */
  filename?: string;
  gcode: Uint8Array;
  /** Start the print immediately after upload succeeds (default: true). */
  startPrint?: boolean;
  /** Validate connectivity/auth only; never uploads or starts a print. */
  dryRun?: boolean;

  // octoprint / moonraker
  port?: number;
  /** OctoPrint X-Api-Key. */
  apiKey?: string;

  // bambu-lan
  /** Bambu LAN-mode access code (printer settings -> LAN Only Mode). */
  accessCode?: string;
  /** Printer serial number, required to address the MQTT print command. */
  serial?: string;
}

export type UploadOutcome =
  | { ok: true; uploadedPath?: string; dryRun?: true }
  | { ok: false; kind: 'unreachable' | 'upload-failed'; message: string };
