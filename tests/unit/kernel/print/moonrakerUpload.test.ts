// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Moonraker upload against a real local HTTP mock server.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { uploadToMoonraker } from '../../../../src/kernel/print/moonrakerUpload';

let server: Server;
let port: number;
let lastUrl: string | undefined;

function handler(req: IncomingMessage, res: ServerResponse) {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    lastUrl = req.url;
    if (req.url === '/server/info') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ result: { klippy_state: 'ready' } }));
      return;
    }
    if (req.url === '/server/files/upload' && req.method === 'POST') {
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ result: { item: { path: 'kernelcad.gcode' } } }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

beforeAll(async () => {
  server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as { port: number }).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('uploadToMoonraker', () => {
  it('dry run hits /server/info and does not upload', async () => {
    const result = await uploadToMoonraker({
      protocol: 'moonraker', host: '127.0.0.1', port, gcode: new Uint8Array([1]), dryRun: true,
    });
    expect(result).toEqual({ ok: true, dryRun: true });
    expect(lastUrl).toBe('/server/info');
  });

  it('uploads to /server/files/upload and reports the gcodes/ path', async () => {
    const result = await uploadToMoonraker({
      protocol: 'moonraker', host: '127.0.0.1', port, gcode: new Uint8Array([1, 2]), filename: 'part.gcode',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.uploadedPath).toBe('gcodes/part.gcode');
    expect(lastUrl).toBe('/server/files/upload');
  });

  it('reports kind: unreachable when the printer cannot be reached', async () => {
    const result = await uploadToMoonraker({
      protocol: 'moonraker', host: '127.0.0.1', port: 1, gcode: new Uint8Array([1]), dryRun: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('unreachable');
  });
});
