// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __resetParamEditQueueForTests,
  meshParamEdits,
  paramEditsForMesh,
  takeParamEditPayload,
} from './paramEditsForMesh';
import { __resetMeshMergeStatesForTests, mergeMeshPayload } from './meshMergeStore';

const code = [
  "const w = param('Width', 40, { min: 10, max: 80 });",
  "const lid = param('HasLid', true);",
  "const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });",
].join('\n');

describe('paramEditsForMesh', () => {
  it('sends numbers and booleans as overrides and writes text values into the source', () => {
    const { source, params } = paramEditsForMesh(code, { Width: 60, HasLid: false, Screw: 'M5' });
    expect(params).toEqual({ Width: 60, HasLid: false });
    expect(source).toContain("param('Screw', 'M5'");
    expect(source).toContain("param('Width', 40");
  });

  it('leaves the source untouched without text values', () => {
    expect(paramEditsForMesh(code, { Width: 60 }).source).toBe(code);
  });

  it('bakeAll writes every value into the source and sends no overrides', () => {
    const { source, params } = paramEditsForMesh(code, { Width: 60, HasLid: false, Screw: 'M5' }, true);
    expect(params).toEqual({});
    expect(source).toContain("param('Width', 60");
    expect(source).toContain("param('HasLid', false");
    expect(source).toContain("param('Screw', 'M5'");
  });

  it('throws for a param it cannot find', () => {
    expect(() => paramEditsForMesh(code, { Nope: 'x' })).toThrow(/not found/);
  });
});

const HEX_A = '0123456789abcdef';
const HEX_B = 'fedcba9876543210';

const feature = (id: string, fingerprint?: string) => ({
  featureId: id, featureKind: 'box', predecessors: [], faces: [],
  ...(fingerprint === undefined ? {} : { fingerprint }),
});

function stubHostedApp(): void {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  vi.stubGlobal('window', { location: { hostname: 'app.kernelcad.com', pathname: '/' } });
}

/** The JSON body of the `callNumber`-th (1-based) fetch call. */
function postedBodyAt(fetchMock: ReturnType<typeof vi.spyOn>, callNumber: number): Record<string, unknown> {
  return JSON.parse((fetchMock.mock.calls[callNumber - 1]![1] as RequestInit).body as string) as Record<string, unknown>;
}

describe('meshParamEdits partial payloads', () => {
  afterEach(() => {
    __resetParamEditQueueForTests();
    __resetMeshMergeStatesForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('claims held fingerprints via have and folds a partial response into the state', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('base', HEX_A)] });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [feature('patched', HEX_B)],
        trailer: { unchangedIds: ['base'], removedIds: [] },
      }),
    } as Response);

    await meshParamEdits(source, { Width: 60 });

    expect(postedBodyAt(fetchMock, 1)).toEqual({
      source,
      params: { Width: 60 },
      have: { base: HEX_A },
    });
    expect(takeParamEditPayload(source)?.features.map((f) => f.featureId)).toEqual(['base', 'patched']);
  });

  it('retries once without have when the trailer names an unknown unchanged id', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 41); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('base', HEX_A)] });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [], trailer: { unchangedIds: ['ghost'], removedIds: [] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [feature('fresh', HEX_B)] }),
      } as Response);

    await meshParamEdits(source, { Width: 60 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(postedBodyAt(fetchMock, 1).have).toEqual({ base: HEX_A });
    expect(postedBodyAt(fetchMock, 2)).not.toHaveProperty('have');
    expect(takeParamEditPayload(source)?.features.map((f) => f.featureId)).toEqual(['fresh']);
  });

  it('omits have when the state holds no hex16 fingerprint to claim', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 42); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('unfingerprinted')] });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [feature('unfingerprinted')] }),
    } as Response);

    await meshParamEdits(source, { Width: 60 });

    expect(postedBodyAt(fetchMock, 1)).not.toHaveProperty('have');
  });

  it('omits have when every held fingerprint is garbage', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 43); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('base', 'not-a-fingerprint'), feature('other', '0123')] });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [feature('base', HEX_A)] }),
    } as Response);

    await meshParamEdits(source, { Width: 60 });

    expect(postedBodyAt(fetchMock, 1)).not.toHaveProperty('have');
  });

  it('claims exactly the hex16 held fingerprints through have', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 44); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('base', HEX_A), feature('draft', 'not-a-fingerprint')] });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [feature('fresh', HEX_B)] }),
    } as Response);

    await meshParamEdits(source, { Width: 60 });

    expect(postedBodyAt(fetchMock, 1).have).toEqual({ base: HEX_A });
  });

  /** A fetch mock whose responses are released one gate at a time, so
   *  overlap between requests is observable. */
  function gatedFetch(): { fetchMock: ReturnType<typeof vi.spyOn>; gates: Array<(body: unknown) => void> } {
    const gates: Array<(body: unknown) => void> = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      new Promise<Response>((resolve) => {
        gates.push((body) => resolve({ ok: true, json: async () => body } as Response));
      }));
    return { fetchMock, gates };
  }

  it('coalesces overlapping edits into one trailing request that carries the merged params', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    mergeMeshPayload(source, { features: [feature('base', HEX_A)] });
    const { fetchMock, gates } = gatedFetch();

    const first = meshParamEdits(source, { Width: 60 });
    const second = meshParamEdits(source, { Width: 61 });
    const third = meshParamEdits(source, { Width: 62, Height: 9 });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    gates[0]!({ features: [feature('patched', HEX_B)] });
    await first;
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(postedBodyAt(fetchMock, 2).params).toEqual({ Width: 62, Height: 9 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    gates[1]!({ features: [feature('final', HEX_B)] });
    await Promise.all([second, third]);
    expect(takeParamEditPayload(source)?.features.map((f) => f.featureId)).toEqual(['final']);
  });

  it('does not coalesce across codes: a different code starts its own request immediately', async () => {
    stubHostedApp();
    const sourceA = "const w = param('Width', 40); return box(w, 1, 1);";
    const sourceB = "const w = param('Width', 41); return box(w, 1, 1);";
    const { fetchMock, gates } = gatedFetch();

    const first = meshParamEdits(sourceA, { Width: 60 });
    const second = meshParamEdits(sourceB, { Width: 60 });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(postedBodyAt(fetchMock, 1).source).toBe(sourceA);
    expect(postedBodyAt(fetchMock, 2).source).toBe(sourceB);

    gates[0]!({ features: [feature('a', HEX_A)] });
    gates[1]!({ features: [feature('b', HEX_B)] });
    await Promise.all([first, second]);
  });
});
