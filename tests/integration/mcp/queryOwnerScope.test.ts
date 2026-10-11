// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `query` with `@kc[<owner>/face/<label>]` ignored the owner: withLabel
// treated its withFeatureName sub-query as "every face", so `@kc[hA/face/wall]`
// returned every hole's wall and `@kc[hA/face/floor]` could hand back hB's.
// The owner now scopes resolution (a feature name or a printed feature id),
// and an owner that names nothing is query.unknown-id, not every face.

import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { queryTool } from '../../../src/agent/mcp/tools/query';

const CODE = `const hA = box(60, 40, 10).hole('top', { u: -15, v: 0, diameter: 4, depth: 5, name: 'hA' });
const hB = hA.hole('top', { u: 15, v: 0, diameter: 6, depth: 5, name: 'hB' });
return hB;`;

const UNNAMED = `return box(60, 40, 10)
  .hole('top', { u: -15, v: 0, diameter: 4, depth: 5 })
  .hole('top', { u: 15, v: 0, diameter: 6, depth: 5 });`;

type Ok = { ok: true; entities: Array<{ ref: string; snapshot?: { centroid?: number[] } }> };
type Err = { ok: false; errorCode?: string; error: string };

async function q(code: string, query: string, expect?: 'unique'): Promise<Ok | Err> {
  return (await queryTool({ code, query, ...(expect ? { expect } : {}) })) as Ok | Err;
}

function xs(r: Ok | Err): number[] {
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return (r as Ok).entities.map((e) => Math.round(e.snapshot!.centroid![0]));
}

describe('query: the @kc owner scopes face resolution', () => {
  beforeAll(async () => { await initOcct(); }, 60_000);

  it('two named holes: wall and floor resolve to the named hole only', async () => {
    expect(xs(await q(CODE, '@kc[hA/face/wall]'))).toEqual([15]);
    expect(xs(await q(CODE, '@kc[hB/face/wall]'))).toEqual([45]);
    expect(xs(await q(CODE, '@kc[hA/face/floor]'))).toEqual([15]);
    expect(xs(await q(CODE, '@kc[hB/face/floor]'))).toEqual([45]);
    const unique = await q(CODE, '@kc[hA/face/floor]', 'unique');
    expect((unique as Ok).entities[0].ref).toBe('@kc[hA/face/floor]');
  }, 120_000);

  it('unnamed holes are scoped by the feature id their refs print', async () => {
    expect(xs(await q(UNNAMED, '@kc[hole_1/face/wall]'))).toEqual([15]);
    expect(xs(await q(UNNAMED, '@kc[hole_2/face/floor]'))).toEqual([45]);
    const top = await q(UNNAMED, '@kc[box_1/face/top]');
    expect(top.ok && top.entities.map((e) => e.ref)).toEqual(['@kc[box_1/face/top]']);
  }, 120_000);

  it('an owner that names no feature is query.unknown-id, not every face', async () => {
    const r = await q(CODE, '@kc[nope/face/wall]');
    expect(r.ok).toBe(false);
    expect((r as Err).errorCode).toBe('query.unknown-id');
    expect((r as Err).error).toContain("'nope'");
  }, 120_000);
});
