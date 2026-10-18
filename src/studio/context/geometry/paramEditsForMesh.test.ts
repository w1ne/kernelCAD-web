// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meshParamEdits, paramEditsForMesh } from './paramEditsForMesh';
import { mergeHostedMeshPayload } from './useMeshFetch';

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

function postedBody(fetchMock: ReturnType<typeof vi.spyOn>, callIndex: number): Record<string, unknown> {
  return JSON.parse((fetchMock.mock.calls[callIndex - 1]![1] as RequestInit).body as string) as Record<string, unknown>;
}

describe('meshParamEdits partial payloads', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('claims held fingerprints via have and folds a partial response into the state', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 40); return box(w, 1, 1);";
    mergeHostedMeshPayload(source, { features: [feature('base', HEX_A)] });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [feature('patched', HEX_B)],
        trailer: { unchangedIds: ['base'], removedIds: [] },
      }),
    } as Response);

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(postedBody(fetchMock, 1)).toEqual({
      source,
      params: { Width: 60 },
      have: { base: HEX_A },
    });
    expect(payload.features.map((f) => f.featureId)).toEqual(['base', 'patched']);
  });

  it('retries once without have when the trailer names an unknown unchanged id', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 41); return box(w, 1, 1);";
    mergeHostedMeshPayload(source, { features: [feature('base', HEX_A)] });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [], trailer: { unchangedIds: ['ghost'], removedIds: [] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [feature('fresh', HEX_B)] }),
      } as Response);

    const payload = await meshParamEdits(source, { Width: 60 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(postedBody(fetchMock, 1).have).toEqual({ base: HEX_A });
    expect(postedBody(fetchMock, 2)).not.toHaveProperty('have');
    expect(payload.features.map((f) => f.featureId)).toEqual(['fresh']);
  });

  it('omits have when the state holds no hex16 fingerprint to claim', async () => {
    stubHostedApp();
    const source = "const w = param('Width', 42); return box(w, 1, 1);";
    mergeHostedMeshPayload(source, { features: [feature('unfingerprinted')] });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [feature('unfingerprinted')] }),
    } as Response);

    await meshParamEdits(source, { Width: 60 });

    expect(postedBody(fetchMock, 1)).not.toHaveProperty('have');
  });
});
