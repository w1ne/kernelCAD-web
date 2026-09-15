// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// OctoPrint upload against a real local HTTP mock server (no network
// stubbing library — a genuine node:http server on 127.0.0.1).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { uploadToOctoPrint } from '../../../../src/kernel/print/octoprintUpload';

let server: Server;
let port: number;
let lastRequest: { method?: string; url?: string; apiKey?: string | string[]; bodyContainsFilename?: boolean } | undefined;
let failUploads = false;

function handler(req: IncomingMessage, res: ServerResponse) {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    lastRequest = {
      method: req.method,
      url: req.url,
      apiKey: req.headers['x-api-key'],
      bodyContainsFilename: body.includes('filename='),
    };
    if (req.url === '/api/version') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ api: '0.1', server: '1.9.0' }));
      return;
    }
    if (req.url === '/api/files/local' && req.method === 'POST') {
      if (failUploads) {
        res.writeHead(500);
        res.end('printer busy');
        return;
      }
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ done: true }));
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

describe('uploadToOctoPrint', () => {
  it('dry run hits /api/version with the X-Api-Key header and does not upload', async () => {
    const result = await uploadToOctoPrint({
      protocol: 'octoprint', host: '127.0.0.1', port, apiKey: 'secret-key',
      gcode: new Uint8Array([1, 2, 3]), dryRun: true,
    });
    expect(result).toEqual({ ok: true, dryRun: true });
    expect(lastRequest?.url).toBe('/api/version');
    expect(lastRequest?.apiKey).toBe('secret-key');
  });

  it('uploads multipart form data to /api/files/local and reports the stored path', async () => {
    const result = await uploadToOctoPrint({
      protocol: 'octoprint', host: '127.0.0.1', port, apiKey: 'secret-key',
      gcode: new Uint8Array([1, 2, 3]), filename: 'part.gcode',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.uploadedPath).toBe('local/part.gcode');
    expect(lastRequest?.url).toBe('/api/files/local');
    expect(lastRequest?.method).toBe('POST');
    expect(lastRequest?.bodyContainsFilename).toBe(true);
  });

  it('surfaces a non-2xx upload response as kind: upload-failed', async () => {
    failUploads = true;
    try {
      const result = await uploadToOctoPrint({
        protocol: 'octoprint', host: '127.0.0.1', port, apiKey: 'secret-key',
        gcode: new Uint8Array([1, 2, 3]),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.kind).toBe('upload-failed');
        expect(result.message).toMatch(/HTTP 500/);
      }
    } finally {
      failUploads = false;
    }
  });

  it('reports kind: unreachable when the printer cannot be reached', async () => {
    const result = await uploadToOctoPrint({
      protocol: 'octoprint', host: '127.0.0.1', port: 1, apiKey: 'k',
      gcode: new Uint8Array([1]), dryRun: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('unreachable');
  });
});
