// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/print.ts
//
// `kernelcad print send <gcode-file> --protocol <p> --host <h> ...` — CLI
// front-end for the `send_to_printer` MCP tool's core logic. Real upload
// only: OctoPrint / Moonraker HTTP, or Bambu Lab LAN-mode FTPS+MQTT.

import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { sendToPrinter, type PrinterProtocol } from '../../../kernel/print/sendToPrinter';

export interface PrintSendCliInput {
  gcodeFile: string;
  protocol: PrinterProtocol;
  host: string;
  port?: number;
  apiKey?: string;
  accessCode?: string;
  serial?: string;
  filename?: string;
  startPrint?: boolean;
  dryRun?: boolean;
}

export interface PrintSendCliResult {
  exitCode: number;
  ok: boolean;
  uploadedPath?: string;
  dryRun?: boolean;
  message?: string;
}

export async function printSendScript(input: PrintSendCliInput): Promise<PrintSendCliResult> {
  let gcode: Uint8Array;
  try {
    gcode = await readFile(input.gcodeFile);
  } catch (e) {
    return { exitCode: 2, ok: false, message: `Cannot read ${input.gcodeFile}: ${e instanceof Error ? e.message : String(e)}` };
  }

  const outcome = await sendToPrinter({
    protocol: input.protocol,
    host: input.host,
    port: input.port,
    apiKey: input.apiKey,
    accessCode: input.accessCode,
    serial: input.serial,
    gcode,
    filename: input.filename,
    startPrint: input.startPrint,
    dryRun: input.dryRun,
  });

  if (outcome.ok) {
    return {
      exitCode: 0, ok: true,
      ...(outcome.uploadedPath !== undefined ? { uploadedPath: outcome.uploadedPath } : {}),
      ...(outcome.dryRun ? { dryRun: true } : {}),
    };
  }
  return { exitCode: 1, ok: false, message: `[${outcome.kind}] ${outcome.message}` };
}

export function printCommand(): Command {
  const cmd = new Command('print').description('Send a G-code file to a real network printer');
  cmd
    .command('send')
    .description('Upload a .gcode file to OctoPrint, Moonraker, or a Bambu Lab printer (LAN mode) and start the print')
    .argument('<gcode-file>', 'path to a .gcode file')
    .requiredOption('--protocol <protocol>', "'octoprint' | 'moonraker' | 'bambu-lan'")
    .requiredOption('--host <host>', 'printer hostname or IP')
    .option('--port <port>', 'override the protocol default port', (v) => Number(v))
    .option('--api-key <key>', 'OctoPrint API key')
    .option('--access-code <code>', 'Bambu LAN-mode access code')
    .option('--serial <serial>', 'Bambu printer serial number')
    .option('--filename <name>', "uploaded file name (default: 'kernelcad.gcode')")
    .option('--no-start-print', 'upload without starting the print')
    .option('--dry-run', 'validate connectivity/auth only; never uploads or starts a print')
    .option('--json', 'emit result as JSON')
    .action(async (gcodeFile: string, opts: {
      protocol: string; host: string; port?: number; apiKey?: string; accessCode?: string;
      serial?: string; filename?: string; startPrint?: boolean; dryRun?: boolean; json?: boolean;
    }) => {
      if (opts.protocol !== 'octoprint' && opts.protocol !== 'moonraker' && opts.protocol !== 'bambu-lan') {
        console.error(`Unsupported protocol: ${opts.protocol}. Use one of octoprint, moonraker, bambu-lan.`);
        process.exitCode = 2; return;
      }
      const r = await printSendScript({
        gcodeFile,
        protocol: opts.protocol,
        host: opts.host,
        port: opts.port,
        apiKey: opts.apiKey,
        accessCode: opts.accessCode,
        serial: opts.serial,
        filename: opts.filename,
        startPrint: opts.startPrint,
        dryRun: opts.dryRun,
      });
      if (opts.json) {
        console.log(JSON.stringify(r, null, 2));
      } else if (r.ok) {
        console.log(r.dryRun ? 'Dry run OK: printer reachable.' : `Uploaded${r.uploadedPath ? ` -> ${r.uploadedPath}` : ''}.`);
      } else {
        console.error(r.message);
      }
      process.exitCode = r.exitCode;
    });
  return cmd;
}
