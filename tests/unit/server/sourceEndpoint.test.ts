import { describe, expect, it, vi } from 'vitest';
import { createSourceEndpoint } from '../../../src/server/middleware/sourceEndpoint';
import { createFakeRes } from './testHelpers/fakeHttp';

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
});
