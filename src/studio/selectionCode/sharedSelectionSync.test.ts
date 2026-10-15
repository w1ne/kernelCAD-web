// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi } from 'vitest';
import { SelectionCodeStore } from './selectionCodeStore';
import { attachSharedSelection } from './sharedSelectionSync';
import type { GeometryResult } from '../../shared/worker/workerTypes';
import { signatureForSelection } from './faceSignature';

describe('Studio selection bridge', () => {
  it('publishes viewer clicks and applies agent picks without echoing them', async () => {
    const store = new SelectionCodeStore();
    let remote: unknown = null;
    const request = vi.fn(async (method: 'GET' | 'POST', selection?: unknown) => {
      if (method === 'POST') remote = selection;
      return { ok: true, selection: remote, revision: 1, modelGeneration: 0 };
    });
    const applyFace = vi.fn();
    const bridge = attachSharedSelection(store, request, applyFace);
    const edge = { shapeIndex: 0, kind: 'edge' as const, id: 2 };
    await bridge.tick();
    store.linkFromGeometry(edge, 'box', null);
    await bridge.tick();
    expect(remote).toEqual({ ...edge, featureId: 'box' });
    remote = { shapeIndex: 1, kind: 'face', id: 3, featureId: 'cut' };
    await bridge.tick();
    expect(store.getSnapshot().link?.pick).toEqual({ shapeIndex: 1, kind: 'face', id: 3 });
    expect(applyFace).toHaveBeenLastCalledWith({ shapeIndex: 1, faceId: 3 });
    await bridge.tick();
    expect(request.mock.calls.filter(([method]) => method === 'POST')).toHaveLength(1);
    store.clearLink();
    await bridge.tick();
    expect(remote).toBeNull();
    bridge.dispose();
  });
  it('does not overwrite a click made while a read is in flight', async () => {
    const store = new SelectionCodeStore();
    let finish!: (value: { ok: boolean; selection: null; revision: number; modelGeneration: number }) => void;
    const request = vi.fn(() => new Promise<{ ok: boolean; selection: null; revision: number; modelGeneration: number }>(resolve => { finish = resolve; }));
    const bridge = attachSharedSelection(store, request, vi.fn());
    const read = bridge.tick();
    store.linkFromGeometry({ shapeIndex: 0, kind: 'edge', id: 1 }, 'box', null);
    finish({ ok: true, selection: null, revision: 0, modelGeneration: 0 });
    await read;
    expect(store.getSnapshot().link?.pick.id).toBe(1);
    bridge.dispose();
  });
});

describe('selection generation', () => {
  it('remaps when the first successful mesh revision arrives after a null baseline', async () => {
    const store = new SelectionCodeStore();
    const geometry: GeometryResult = { featureId:'extrude_1', faces:[{ faceId:4,
      plane:{origin:[0,0,0],normal:[0,0,1]}, vertices:new Float32Array([0,0,0,1,0,0,0,1,0]),
      indices:new Uint32Array([0,1,2]), normals:new Float32Array([0,0,1,0,0,1,0,0,1]) }] };
    const pick = { shapeIndex:0, kind:'face' as const, id:4, featureId:'extrude_1' };
    const signature = signatureForSelection([geometry], pick)!;
    let revision: number | null = null;
    let generation = 0;
    let selected: unknown = pick;
    const request = vi.fn(async (method:'GET'|'POST', selection?:unknown) => {
      if (method === 'POST') { selected = selection; return {ok:true,selection,revision:2,modelGeneration:generation}; }
      return {ok:true,selection:selected,revision:1,modelGeneration:generation,...(generation ? {pendingSignature:signature} : {})};
    });
    const bridge = attachSharedSelection(store, request, vi.fn(), () => [geometry], () => revision);
    await bridge.tick();
    generation = 1; selected = null;
    await bridge.tick();
    expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
    revision = 1;
    await bridge.tick();
    expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(true);
    expect(selected).toEqual(pick);
    bridge.dispose();
  });

  it('drops a pending old-mesh click when the server rejects its generation', async () => {
    const store = new SelectionCodeStore();
    const request = vi.fn(async (method: 'GET' | 'POST') => method === 'GET'
      ? { ok: true, selection: null, revision: 0, modelGeneration: 0 }
      : { ok: false, selection: null, revision: 1, modelGeneration: 1, error: 'rebuilt' });
    const bridge = attachSharedSelection(store, request, vi.fn());
    await bridge.tick();
    store.linkFromGeometry({ shapeIndex: 0, kind: 'edge', id: 1 }, 'box', null);
    await bridge.tick();
    expect(store.getSnapshot().link).toBeNull();
    await bridge.tick();
    expect(request.mock.calls.map(([method]) => method)).toEqual(['GET', 'POST', 'GET']);
    bridge.dispose();
  });

  it('publishes only a uniquely remapped face at the new generation', async () => {
    const store=new SelectionCodeStore();
    const makeGeometry=(x:number):GeometryResult=>({featureId:'extrude_1',faces:[{faceId:4,plane:{origin:[x,0,0],normal:[0,0,1]},vertices:new Float32Array([x,0,0,x+1,0,0,x,1,0]),indices:new Uint32Array([0,1,2]),normals:new Float32Array([0,0,1,0,0,1,0,0,1])}]});
    let meshes=[makeGeometry(0)];
    let meshRevision=10;
    const pick={shapeIndex:0,kind:'face' as const,id:4,featureId:'extrude_1'};
    const signature=signatureForSelection(meshes,pick)!;
    let selected:unknown=pick;
    let generation=0;
    let remapAttempts=0;
    const request=vi.fn(async(method:'GET'|'POST',selection?:unknown,modelGeneration?:number)=>{
      if(method==='POST'){
        if (selection !== null && remapAttempts++ === 0) return {ok:false,selection:null,revision:2,modelGeneration,error:'temporary write failure'};
        if(modelGeneration!==generation)return{ok:false,selection:null,revision:2,modelGeneration:generation,error:'stale'};
        selected=selection; return{ok:true,selection,revision:2,modelGeneration:generation};
      }
      return{ok:true,selection,generation,revision:1,modelGeneration:generation,pendingSignature:generation?signature:null};
    });
    const apply=vi.fn(); const bridge=attachSharedSelection(store,request,apply,()=>meshes,()=>meshRevision);
    // Initial shared state is the selected face; the first read establishes gen 0.
    selected=pick;
    await bridge.tick();
    generation=1; selected=null;
    await bridge.tick(); // capture pending signature and old geometry snapshot
    expect(store.getSnapshot().link).toBeNull();
    meshes=[makeGeometry(0.001)];
    await bridge.tick(); // a geometry ref alone is not proof of a successful mesh refresh
    expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
    meshRevision++;
    await bridge.tick();
    expect(selected).toBeNull(); // failed commit did not publish or discard the pending remap
    await bridge.tick(); // retries remap commit at the same generation
    expect(selected).toMatchObject({shapeIndex:0,kind:'face',id:4,featureId:'extrude_1'});
    expect(store.getSnapshot().link?.pick.id).toBe(4);
    expect(apply).toHaveBeenLastCalledWith({shapeIndex:0,faceId:4});
    bridge.dispose();
  });

  it('clears the shared pick when the pending face has no new match', async () => {
    const store=new SelectionCodeStore();
    const geometry:GeometryResult={featureId:'extrude_1',faces:[{faceId:4,plane:{origin:[0,0,0],normal:[0,0,1]},vertices:new Float32Array([0,0,0,1,0,0,0,1,0]),indices:new Uint32Array([0,1,2]),normals:new Float32Array([0,0,1,0,0,1,0,0,1])}]};
    const pick={shapeIndex:0,kind:'face' as const,id:4,featureId:'extrude_1'};
    const signature=signatureForSelection([geometry],pick)!;
    let meshes:GeometryResult[]=[geometry], generation=0, remote:unknown=pick, meshRevision=3;
    const request=vi.fn(async(method:'GET'|'POST',selection?:unknown,modelGeneration?:number)=>{
      if(method==='POST'){remote=selection;return{ok:true,selection,revision:2,modelGeneration:generation};}
      return{ok:true,selection:remote,revision:1,modelGeneration:generation,...(generation?{pendingSignature:signature}:{})};
    });
    store.linkFromGeometry(pick,'extrude_1',null);
    const bridge=attachSharedSelection(store,request,vi.fn(),()=>meshes,()=>meshRevision);
    await bridge.tick();
    generation=1;remote=null;
    await bridge.tick();
    expect(store.getSnapshot().link).toBeNull();
    meshes=[];
    meshRevision++;
    await bridge.tick();
    expect(remote).toBeNull();
    expect(store.getSnapshot().link).toBeNull();
    expect(request.mock.calls.some(([method,selection])=>method==='POST'&&selection===null)).toBe(true);
    bridge.dispose();
  });

  it('preserves a local click made while the remap write is in flight', async () => {
    const store = new SelectionCodeStore();
    const makeGeometry = (x: number): GeometryResult => ({ featureId: 'extrude_1', faces: [{ faceId: 4,
      plane: { origin: [x, 0, 0], normal: [0, 0, 1] }, vertices: new Float32Array([x, 0, 0, x+1, 0, 0, x, 1, 0]),
      indices: new Uint32Array([0, 1, 2]), normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]) }] });
    let meshes: GeometryResult[] = [makeGeometry(0)];
    let meshRevision = 1;
    const original = { shapeIndex: 0, kind: 'face' as const, id: 4, featureId: 'extrude_1' };
    const signature = signatureForSelection(meshes, original)!;
    let generation = 0;
    let finishPost!: (value: { ok: boolean; selection: unknown; revision: number; modelGeneration: number }) => void;
    let markPostStarted!: () => void;
    const postStarted = new Promise<void>(resolve => { markPostStarted = resolve; });
    const request = vi.fn((method: 'GET' | 'POST', selection?: unknown, modelGeneration?: number) => {
      if (method === 'GET') return Promise.resolve({ ok: true, selection: generation ? null : original, revision: 1,
        modelGeneration: generation, ...(generation ? { pendingSignature: signature } : {}) });
      if (generation === 1 && modelGeneration === 1 && !finishPost) {
        markPostStarted();
        return new Promise<{ ok: boolean; selection: unknown; revision: number; modelGeneration: number }>(resolve => { finishPost = resolve; });
      }
      return Promise.resolve({ ok: true, selection, revision: 2, modelGeneration: generation });
    });
    const bridge = attachSharedSelection(store, request, vi.fn(), () => meshes, () => meshRevision);
    await bridge.tick();
    generation = 1;
    await bridge.tick();
    meshes = [makeGeometry(0.001)];
    meshRevision++;
    const remap = bridge.tick();
    await postStarted;
    store.linkFromGeometry({ shapeIndex: 0, kind: 'edge', id: 9 }, 'extrude_1', null);
    finishPost({ ok: true, selection: null, revision: 2, modelGeneration: 1 });
    await remap;
    await bridge.tick();
    expect(request.mock.calls.some(([method, selection, modelGeneration]) => method === 'POST' && modelGeneration === 1
      && (selection as { kind?: string } | null)?.kind === 'edge')).toBe(true);
    bridge.dispose();
  });
});
