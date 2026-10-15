// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { PassThrough, Readable } from 'node:stream';
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

  it('rejects a clear if the model generation changes while the request body is arriving', async () => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate('clear-race');
    const handler = createSelectionEndpoint({ pool });
    const req = Object.assign(new PassThrough(), {
      url: `/?session=${entry.token}`, method: 'POST',
    });
    let body = '';
    const res = { statusCode: 200, setHeader() {}, end(s = '') { body = s; } };
    const response = handler(req, res);

    await pool.rebuildByScript('clear-race');
    const currentSelection = { shapeIndex: 0, kind: 'edge', id: 7, featureId: 'new-generation' } as const;
    entry.selection = currentSelection;
    req.end(JSON.stringify({ selection: null, model_generation: 0 }));

    await response;
    expect(res.statusCode).toBe(409);
    expect(entry.selection).toEqual(currentSelection);
  });

  it.each([
    ['edge', { shapeIndex: 0, kind: 'edge', id: 3, featureId: 'locked-edge' }],
    ['clear', null],
  ] as const)('%s writes wait for the rebuild lock and commit before releasing it', async (_name, selection) => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate(`locked-${_name}`);
    const before = { shapeIndex: 0, kind: 'edge', id: 8, featureId: 'before' } as const;
    entry.selection = before;

    let release!: () => void;
    let entered!: () => void;
    const enteredLock = new Promise<void>(resolve => { entered = resolve; });
    const holdLock = new Promise<void>(resolve => { release = resolve; });
    const heldLock = pool.runExclusive(async () => {
      entered();
      await holdLock;
    });
    await enteredLock;

    const handler = createSelectionEndpoint({ pool });
    const req = Object.assign(Readable.from([JSON.stringify({ selection, model_generation: 0 })]), {
      url: `/?session=${entry.token}`, method: 'POST',
    });
    let output = '';
    const res = { statusCode: 200, setHeader() {}, end(s = '') { output = s; } };
    let completed = false;
    const response = handler(req, res).then(() => { completed = true; });

    await Promise.resolve();
    expect(completed).toBe(false);
    expect(entry.selection).toEqual(before);

    release();
    await Promise.all([heldLock, response]);
    expect(res.statusCode, output).toBe(200);
    expect(entry.selection).toEqual(selection);
    expect(entry.selectionRevision).toBe(1);
  });

  it('hides a face during rebuild, exposes pending signature only to Studio, and rejects stale generations', async () => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate('face-model');
    const signature = { owner:'extrude_1', surface:'plane', area:0.5, centroid:[1/3,1/3,0], normal:[0,0,1], bounds:[0,0,0,1,1,0] };
    const handler = createSelectionEndpoint({ pool, resolveFaceSignature: async (currentEntry, selection) => ({
      signature: selection?.kind === 'face' ? signature : null,
      remappedSelection: currentEntry.selectionPendingSignature ? { shapeIndex: 0, kind: 'face', id: 2, featureId: 'extrude_1' } : selection,
    }) });
    async function post(body: unknown) {
      const req = Object.assign(Readable.from([JSON.stringify(body)]), { url:`/?session=${entry.token}&studio_remap=1`, method:'POST' });
      let output=''; const res={statusCode:200,setHeader(){},end(s=''){output=s;}};
      await handler(req,res); return {status:res.statusCode,body:JSON.parse(output)};
    }
    async function get(studio=false) {
      const req=Object.assign(Readable.from([]),{url:`/?session=${entry.token}${studio?'&studio_remap=1':''}`,method:'GET'});
      let output='';const res={statusCode:200,setHeader(){},end(s=''){output=s;}};
      await handler(req,res);return JSON.parse(output);
    }
    const face={shapeIndex:0,kind:'face',id:2,featureId:'extrude_1'};
    expect((await post({selection:face,face_signature:signature,model_generation:0})).status).toBe(200);
    await pool.rebuildByScript('face-model');
    expect((await get()).selection).toBeNull();
    expect((await get()).error).toBe('selection pending rebuild');
    expect((await get(true)).pendingSignature).toEqual(signature);
    expect((await post({selection:face,model_generation:0})).status).toBe(409);
    const forged = { ...signature, owner: 'other_feature' };
    expect((await post({selection:face,face_signature:forged,model_generation:1})).status).toBe(409);
    expect((await post({selection:{...face,id:3},face_signature:signature,model_generation:1})).status).toBe(409);
    expect((await get(true)).pendingSignature).toEqual(signature);
    expect((await post({selection:face,face_signature:signature,model_generation:1})).status).toBe(200);
    expect((await get()).selection).toEqual(face);
    entry.model = { session: {} } as BuiltModel;
    await pool.rebuildByScript('face-model');
    expect((await get(true)).pendingSignature).toEqual(signature);
  });

  it('captures a missing face signature during locked verification for agent writes', async () => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate('agent-face');
    const signature = { owner: 'feature', surface: 'plane', area: 1, centroid: [0, 0, 0], normal: [0, 0, 1], bounds: [0, 0, 0, 1, 1, 0] } as const;
    let lockHeld = false;
    const originalRunExclusive = pool.runExclusive.bind(pool);
    pool.runExclusive = (async <T>(callback: () => Promise<T>) => {
      const result = await originalRunExclusive(callback);
      return result;
    }) as typeof pool.runExclusive;
    const face = { shapeIndex: 0, kind: 'face' as const, id: 1, featureId: 'feature' };
    const handler = createSelectionEndpoint({ pool, resolveFaceSignature: async () => {
      lockHeld = true;
      return { signature, remappedSelection: face };
    } });
    const req = new PassThrough() as PassThrough & { url: string; method: string };
    req.url = `/?session=${entry.token}`;
    req.method = 'POST';
    let output = '';
    const res = { statusCode: 200, setHeader() {}, end(value = '') { output = value; } };
    const response = handler(req, res);
    req.end(JSON.stringify({ selection: face, model_generation: 0, face_signature: null }));
    await response;
    expect(res.statusCode, output).toBe(200);
    expect(lockHeld).toBe(true);
    expect(entry.selectionFaceSignature).toEqual(signature);
  });

  it('keeps face verification and commit inside the rebuild lock', async () => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate('face-atomic');
    let release!: () => void;
    let entered!: () => void;
    const verifying = new Promise<void>(resolve => { entered = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    const signature = { owner:'feature', surface:'plane', area:1, centroid:[0,0,0], normal:[0,0,1], bounds:[0,0,0,1,1,0] } as const;
    const face = { shapeIndex:0, kind:'face' as const, id:1, featureId:'feature' };
    const handler = createSelectionEndpoint({ pool, resolveFaceSignature: async () => {
      entered(); await hold; return { signature, remappedSelection:face };
    } });
    const req = Object.assign(Readable.from([JSON.stringify({ selection:face, face_signature:signature, model_generation:0 })]),
      { url:`/?session=${entry.token}`, method:'POST' });
    let output=''; const res={statusCode:200,setHeader(){},end(s=''){output=s;}};
    const response = handler(req,res);
    await verifying;
    let rebuilt = false;
    const rebuild = pool.rebuildByScript('face-atomic').then(() => { rebuilt = true; });
    await Promise.resolve();
    expect(rebuilt).toBe(false);
    release();
    await Promise.all([response,rebuild]);
    expect(res.statusCode).toBe(409);
    expect(entry.selection).toBeNull();
    expect(entry.selectionModelGeneration).toBe(1);
  });

  it('commits a verified face before releasing the exclusive lock', async () => {
    const pool = createSessionPool({ build: async () => ({ session: {} }) as BuiltModel, ttlMs: 10000 });
    const entry = await pool.getOrCreate('face-commit-lock');
    const signature = { owner:'feature', surface:'plane', area:1, centroid:[0,0,0], normal:[0,0,1], bounds:[0,0,0,1,1,0] } as const;
    const face = { shapeIndex:0, kind:'face' as const, id:1, featureId:'feature' };
    const originalRunExclusive = pool.runExclusive.bind(pool);
    let selectionWasCommittedBeforeUnlock = false;
    pool.runExclusive = (async <T>(callback: () => Promise<T>) => originalRunExclusive(async () => {
      const result = await callback();
      selectionWasCommittedBeforeUnlock = JSON.stringify(entry.selection) === JSON.stringify(face);
      return result;
    })) as typeof pool.runExclusive;
    const handler = createSelectionEndpoint({ pool, resolveFaceSignature: async () => ({ signature, remappedSelection:face }) });
    const req = Object.assign(Readable.from([JSON.stringify({ selection:face, face_signature:signature, model_generation:0 })]),
      { url:`/?session=${entry.token}`, method:'POST' });
    let output=''; const res={statusCode:200,setHeader(){},end(s=''){output=s;}};
    await handler(req,res);
    expect(res.statusCode, output).toBe(200);
    expect(selectionWasCommittedBeforeUnlock).toBe(true);
  });
});
