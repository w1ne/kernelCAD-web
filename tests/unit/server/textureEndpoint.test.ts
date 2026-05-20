// tests/unit/server/textureEndpoint.test.ts
//
// `/__kernelcad/texture?path=<encoded>` — dev-server route smoke. We bypass
// the connect plumbing and call the handler directly with a stub req/res so
// the unit test runs without booting Vite.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleTextureRequest } from '../../../src/server/middleware/textureEndpoint';
import { __resetTextureCacheForTests } from '../../../src/shared/textures';

const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c62000000000005000150fdb88e0000000049454e44ae426082',
  'hex',
);

interface CapturedRes {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer | string | undefined;
  setHeader(name: string, value: string | number): void;
  end(chunk?: Buffer | string): void;
}

function createRes(): CapturedRes {
  const res: CapturedRes = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = String(value);
    },
    end(chunk) {
      res.body = chunk;
    },
  };
  return res;
}

function createReq(url: string): { url: string } {
  return { url };
}

describe('handleTextureRequest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-texture-route-'));
    __resetTextureCacheForTests();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('streams 200 + image/png for a valid absolute path', async () => {
    const imgPath = join(tmpDir, 'sample.png');
    writeFileSync(imgPath, PNG_1X1);
    const req = createReq(`/?path=${encodeURIComponent(imgPath)}`);
    const res = createRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleTextureRequest(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).length).toBe(PNG_1X1.length);
  });

  it('returns 400 when path query is missing', async () => {
    const req = createReq('/');
    const res = createRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleTextureRequest(req as any, res as any);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.error).toMatch(/missing path/i);
  });

  it('returns 404 when the file does not exist', async () => {
    const req = createReq(`/?path=${encodeURIComponent(join(tmpDir, 'nope.png'))}`);
    const res = createRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleTextureRequest(req as any, res as any);
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body as string);
    expect(body.code).toBe('feature.material.texture-not-found');
  });

  it('returns 415 for an unsupported format (.tga)', async () => {
    const imgPath = join(tmpDir, 'bad.tga');
    writeFileSync(imgPath, PNG_1X1);
    const req = createReq(`/?path=${encodeURIComponent(imgPath)}`);
    const res = createRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleTextureRequest(req as any, res as any);
    expect(res.statusCode).toBe(415);
    const body = JSON.parse(res.body as string);
    expect(body.code).toBe('feature.material.texture-unsupported-format');
  });
});
