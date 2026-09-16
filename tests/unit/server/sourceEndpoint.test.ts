import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { createSourceEndpoint } from '../../../src/server/middleware/sourceEndpoint';
import { createFakeRes } from './testHelpers/fakeHttp';

function putRaw(url: string, raw: string) {
  const stream = Readable.from([raw]);
  return Object.assign(stream, { url, method: 'PUT' });
}

function putReq(url: string, body: unknown) {
  return putRaw(url, JSON.stringify(body));
}

describe('sourceEndpoint', () => {
  it('returns source for a valid examples script without building a session', async () => {
    const readFile = vi.fn(async () => 'return box(1, 1, 1);');
    const handler = createSourceEndpoint({
      resolveScript: (s) => (s === 'examples/ok.kcad.ts' ? '/abs/examples/ok.kcad.ts' : null),
      readFile,
    });
    const res = createFakeRes();

    await handler({ url: '/__kernelcad/source?script=examples%2Fok.kcad.ts' }, res);

    expect(res.statusCode).toBe(200);
    expect(readFile).toHaveBeenCalledWith('/abs/examples/ok.kcad.ts', 'utf8');
    expect(JSON.parse(res.body)).toEqual({ source: 'return box(1, 1, 1);' });
  });

  it('returns 400 when script resolution fails', async () => {
    const handler = createSourceEndpoint({
      resolveScript: () => null,
      readFile: vi.fn(),
    });
    const res = createFakeRes();

    await handler({ url: '/__kernelcad/source?script=..%2Fsecret.kcad.ts' }, res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/examples/);
  });

  it('PUT writes source atomically through a tmp file + rename', async () => {
    const writeFile = vi.fn<
      (path: string, data: string, encoding: BufferEncoding) => Promise<void>
    >(async () => {});
    const renameFile = vi.fn<(oldPath: string, newPath: string) => Promise<void>>(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile,
    });
    const res = createFakeRes();

    await handler(
      putReq('/__kernelcad/source?script=examples%2Fok.kcad.ts', { source: 'return box(2, 2, 2);' }),
      res,
    );

    const tmpPath = writeFile.mock.calls[0][0];
    expect(res.statusCode).toBe(200);
    expect(tmpPath).toMatch(
      new RegExp(`^/abs/examples/ok\\.kcad\\.ts\\.tmp-${process.pid}-[\\da-f-]{36}$`),
    );
    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(tmpPath, 'return box(2, 2, 2);', 'utf8');
    expect(renameFile).toHaveBeenCalledTimes(1);
    expect(renameFile).toHaveBeenCalledWith(tmpPath, '/abs/examples/ok.kcad.ts');
    expect(JSON.parse(res.body)).toEqual({
      ok: true,
      bytes: Buffer.byteLength('return box(2, 2, 2);', 'utf8'),
    });
  });

  it('PUT rejects unresolved script paths without writing', async () => {
    const writeFile = vi.fn(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => null,
      readFile: vi.fn(),
      writeFile,
      renameFile: vi.fn(),
    });
    const res = createFakeRes();

    await handler(
      putReq('/__kernelcad/source?script=..%2Fsecret.kcad.ts', { source: 'evil();' }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/examples/);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('PUT returns 400 for a body that is not valid JSON', async () => {
    const writeFile = vi.fn(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile: vi.fn(),
    });
    const res = createFakeRes();

    await handler(putRaw('/__kernelcad/source?script=examples%2Fok.kcad.ts', '{ not json'), res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'body is not valid JSON' });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('PUT returns 400 when source is not a non-empty string', async () => {
    const writeFile = vi.fn(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile: vi.fn(),
    });
    const res = createFakeRes();

    await handler(putReq('/__kernelcad/source?script=examples%2Fok.kcad.ts', { source: 42 }), res);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({
      error: 'body must include a non-empty "source" string',
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('PUT returns 413 when the body exceeds the size cap', async () => {
    const writeFile = vi.fn(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile: vi.fn(),
    });
    const res = createFakeRes();

    await handler(
      putRaw('/__kernelcad/source?script=examples%2Fok.kcad.ts', `"${'x'.repeat(1_000_001)}"`),
      res,
    );

    expect(res.statusCode).toBe(413);
    expect(JSON.parse(res.body).error).toMatch(/too large/);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('PUT unlinks the tmp file and returns 500 when the rename fails', async () => {
    const writeFile = vi.fn<
      (path: string, data: string, encoding: BufferEncoding) => Promise<void>
    >(async () => {});
    const renameFile = vi.fn<(oldPath: string, newPath: string) => Promise<void>>(async () => {
      throw new Error('rename exploded');
    });
    const unlinkFile = vi.fn<(path: string) => Promise<void>>(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile,
      unlinkFile,
    });
    const res = createFakeRes();

    await handler(
      putReq('/__kernelcad/source?script=examples%2Fok.kcad.ts', { source: 'return box(2, 2, 2);' }),
      res,
    );

    const tmpPath = writeFile.mock.calls[0][0];
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('rename exploded');
    expect(unlinkFile).toHaveBeenCalledTimes(1);
    expect(unlinkFile).toHaveBeenCalledWith(tmpPath);
  });

  it('PUT attempts tmp cleanup and returns 500 when the write fails', async () => {
    const writeFile = vi.fn<
      (path: string, data: string, encoding: BufferEncoding) => Promise<void>
    >(async () => {
      throw new Error('disk full');
    });
    const unlinkFile = vi.fn<(path: string) => Promise<void>>(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile: vi.fn(),
      unlinkFile,
    });
    const res = createFakeRes();

    await handler(
      putReq('/__kernelcad/source?script=examples%2Fok.kcad.ts', { source: 'return box(2, 2, 2);' }),
      res,
    );

    const tmpPath = writeFile.mock.calls[0][0];
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toBe('disk full');
    expect(unlinkFile).toHaveBeenCalledTimes(1);
    expect(unlinkFile).toHaveBeenCalledWith(tmpPath);
  });

  it('returns 405 for methods other than GET/PUT before reading the body', async () => {
    const writeFile = vi.fn(async () => {});
    const handler = createSourceEndpoint({
      resolveScript: () => '/abs/examples/ok.kcad.ts',
      readFile: vi.fn(),
      writeFile,
      renameFile: vi.fn(),
    });
    const res = createFakeRes();

    await handler({ url: '/__kernelcad/source?script=examples%2Fok.kcad.ts', method: 'DELETE' }, res);

    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: 'GET or PUT only' });
    expect(writeFile).not.toHaveBeenCalled();
  });
});
