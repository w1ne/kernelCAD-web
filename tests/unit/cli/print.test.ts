// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
import { printSendScript } from '../../../src/agent/cli/commands/print';

let server: Server;
let port: number;
let tmpDir: string;
let gcodePath: string;

beforeAll(async () => {
  server = createServer((req, res) => {
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
  tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-print-cli-'));
  gcodePath = join(tmpDir, 'part.gcode');
  writeFileSync(gcodePath, '; test\nG28\n');
});

afterAll(() => {
  server.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('kernelcad print send', () => {
  it('exits 2 with a clear message when the gcode file does not exist', async () => {
    const r = await printSendScript({ gcodeFile: '/nonexistent.gcode', protocol: 'octoprint', host: '127.0.0.1' });
    expect(r.exitCode).toBe(2);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Cannot read/);
  });

  it('dry run against a real local OctoPrint mock exits 0', async () => {
    const r = await printSendScript({
      gcodeFile: gcodePath, protocol: 'octoprint', host: '127.0.0.1', port, dryRun: true,
    });
    expect(r).toEqual({ exitCode: 0, ok: true, dryRun: true });
  });

  it('exits 1 with an unreachable message for a closed port', async () => {
    const r = await printSendScript({
      gcodeFile: gcodePath, protocol: 'octoprint', host: '127.0.0.1', port: 1, dryRun: true,
    });
    expect(r.exitCode).toBe(1);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/\[unreachable\]/);
  });
});
