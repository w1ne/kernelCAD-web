// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { sendToPrinterTool } from '../../../../src/agent/mcp/tools/sendToPrinter';

let server: Server;
let port: number;
let tmpDir: string;
let gcodePath: string;

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/api/version') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as { port: number }).port;
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-send-to-printer-'));
  gcodePath = join(tmpDir, 'part.gcode');
  writeFileSync(gcodePath, '; test gcode\nG28\n');
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('send_to_printer MCP tool', () => {
  it('rejects a missing gcode_path with a plain error, not a diagnostic', async () => {
    const r = await sendToPrinterTool({ gcode_path: '', protocol: 'octoprint', host: '127.0.0.1' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/gcode_path/);
  });

  it('rejects a nonexistent gcode_path', async () => {
    const r = await sendToPrinterTool({ gcode_path: '/nonexistent/file.gcode', protocol: 'octoprint', host: '127.0.0.1' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Cannot read gcode_path/);
  });

  it('dry-run success against a real local OctoPrint mock returns ok: true, dry_run: true', async () => {
    const r = await sendToPrinterTool({
      gcode_path: gcodePath, protocol: 'octoprint', host: '127.0.0.1', port, api_key: 'k', dry_run: true,
    });
    expect(r).toEqual({ ok: true, dry_run: true });
  });

  it('an unreachable printer returns tool.send-to-printer.unreachable with a hint', async () => {
    const r = await sendToPrinterTool({
      gcode_path: gcodePath, protocol: 'octoprint', host: '127.0.0.1', port: 1, dry_run: true,
    });
    expect(r.ok).toBe(false);
    const diag = r.diagnostics?.[0];
    expect(diag?.code).toBe('tool.send-to-printer.unreachable');
    expect(diag?.hint.length).toBeGreaterThan(10);
  });
});
