// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { createSelectionEndpoint } from './selectionEndpoint';
import { createSessionPool } from '../sessionPool';
import type { BuiltModel } from '../../composition/buildModel';

describe('shared selection endpoint', () => {
  it('shares a clicked edge with agents, isolates sessions, and clears on rebuild', async () => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const a = await pool.getOrCreate('a');
    const b = await pool.getOrCreate('b');
    const handler = createSelectionEndpoint({ pool });
    async function request(token: string, selection?: unknown, model_generation = 0) {
      const req = Object.assign(Readable.from(selection === undefined ? [] : [JSON.stringify({ selection, model_generation })]), {
        url: `/?session=${token}`, method: selection === undefined ? 'GET' : 'POST',
      });
      let body = '';
      const res = { statusCode: 200, setHeader() {}, end(s = '') { body = s; } };
      await handler(req, res);
      return { status: res.statusCode, body: JSON.parse(body) };
    }
    const edge = { shapeIndex: 0, kind: 'edge', id: 2, featureId: 'box' };
    expect((await request(a.token, edge)).body.selection).toEqual(edge);
    expect((await request(a.token)).body.selection).toEqual(edge);
    expect((await request(b.token)).body.selection).toBeNull();
    expect((await request(a.token, { ...edge, id: -1 })).status).toBe(400);
    expect((await request(a.token)).body.selection).toEqual(edge);
    expect((await request('missing')).status).toBe(404);
    await pool.rebuildByScript('a');
    expect((await request(a.token)).body.selection).toBeNull();
    expect((await request(a.token, edge)).status).toBe(409);
    expect((await request(a.token)).body.selection).toBeNull();
    expect((await request(a.token, null, 1)).body.selection).toBeNull();
  });
});
