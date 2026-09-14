// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { sendToPrinterTool } from '../tools/sendToPrinter';
import type { ToolRegistryEntry } from './types';

export const printToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'send_to_printer',
      description:
        'Use this when you need to upload a .gcode file (e.g. written by export with target: "model", format: "gcode") to a real network printer and, by default, start the print. ' +
        "protocol: 'octoprint' (POST /api/files/local with an X-Api-Key), 'moonraker' (Klipper's POST /server/files/upload), " +
        "or 'bambu-lan' (Bambu Lab LAN-mode: FTPS implicit-TLS upload on port 990 as user 'bblp' with the printer's LAN access code, " +
        'then an MQTT print-start command on port 8883 — requires access_code and, unless start_print is false, serial). ' +
        'Pass { dry_run: true } to validate connectivity/authentication only, without uploading or starting a print. ' +
        'Never logs or echoes api_key/access_code.',
      inputSchema: {
        type: 'object',
        properties: {
          gcode_path: { type: 'string', description: 'Path to the .gcode file on disk.' },
          protocol: { type: 'string', enum: ['octoprint', 'moonraker', 'bambu-lan'] },
          host: { type: 'string', description: 'Printer hostname or IP.' },
          port: { type: 'number', description: 'Override the protocol default port.' },
          api_key: { type: 'string', description: "OctoPrint API key (Settings -> API)." },
          access_code: { type: 'string', description: 'Bambu LAN-mode access code (printer settings -> LAN Only Mode).' },
          serial: { type: 'string', description: 'Bambu printer serial number (required to start a print unless start_print is false).' },
          filename: { type: 'string', description: "Uploaded file name (default: 'kernelcad.gcode')." },
          start_print: { type: 'boolean', description: 'Start the print immediately after upload (default: true).' },
          dry_run: { type: 'boolean', description: 'Validate connectivity/auth only; never uploads or starts a print.' },
        },
        required: ['gcode_path', 'protocol', 'host'],
      },
    },
    handler: input => sendToPrinterTool(input as unknown as Parameters<typeof sendToPrinterTool>[0]),
  },
];
