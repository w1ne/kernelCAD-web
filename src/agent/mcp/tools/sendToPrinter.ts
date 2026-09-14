// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/sendToPrinter.ts
//
// MCP `send_to_printer` tool: upload a G-code file to a real network
// printer and (by default) start the print. Closes the physical-print
// loop started by `export_model`'s `gcode` format — an agent can go from
// a kernelCAD script to a physical part on a printer with no manual hop.

import { readFile } from 'node:fs/promises';
import { sendToPrinter as sendToPrinterCore, type PrinterProtocol } from '../../../kernel/print/sendToPrinter';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS, HINT_TEMPLATES } from '../../../shared/diagnostics/registry';

export interface SendToPrinterInput {
  /** Path to a .gcode file on disk (e.g. written by export_model with format: 'gcode'). */
  gcode_path: string;
  protocol: PrinterProtocol;
  host: string;
  port?: number;
  /** OctoPrint only. */
  api_key?: string;
  /** Bambu LAN mode only: printer settings -> LAN Only Mode -> Access Code. */
  access_code?: string;
  /** Bambu LAN mode only: printer serial number. */
  serial?: string;
  filename?: string;
  /** Start the print immediately after upload (default: true). */
  start_print?: boolean;
  /** Validate connectivity/auth only; never uploads or starts a print. */
  dry_run?: boolean;
}

export interface SendToPrinterOutput {
  ok: boolean;
  uploaded_path?: string;
  dry_run?: boolean;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

export async function sendToPrinterTool(input: SendToPrinterInput): Promise<SendToPrinterOutput> {
  if (!input.gcode_path || typeof input.gcode_path !== 'string') {
    return { ok: false, error: 'Required: gcode_path' };
  }
  if (!input.protocol) {
    return { ok: false, error: "Required: protocol ('octoprint' | 'moonraker' | 'bambu-lan')" };
  }
  if (!input.host || typeof input.host !== 'string') {
    return { ok: false, error: 'Required: host' };
  }

  let gcode: Uint8Array;
  try {
    gcode = await readFile(input.gcode_path);
  } catch (e) {
    return { ok: false, error: `Cannot read gcode_path '${input.gcode_path}': ${e instanceof Error ? e.message : String(e)}` };
  }

  const outcome = await sendToPrinterCore({
    protocol: input.protocol,
    host: input.host,
    port: input.port,
    apiKey: input.api_key,
    accessCode: input.access_code,
    serial: input.serial,
    gcode,
    filename: input.filename,
    startPrint: input.start_print,
    dryRun: input.dry_run,
  });

  if (outcome.ok) {
    return {
      ok: true,
      ...(outcome.uploadedPath !== undefined ? { uploaded_path: outcome.uploadedPath } : {}),
      ...(outcome.dryRun ? { dry_run: true } : {}),
    };
  }

  const code = outcome.kind === 'unreachable' ? 'tool.send-to-printer.unreachable' as const : 'tool.send-to-printer.upload-failed' as const;
  const diagnostic: CompilerDiagnostic = {
    target: 'export-occt',
    code,
    severity: 'error',
    message: outcome.message,
    hint: HINT_TEMPLATES[code].template,
    nextAction: NEXT_ACTIONS[code],
  };
  return { ok: false, diagnostics: withNextActions([diagnostic]) };
}
