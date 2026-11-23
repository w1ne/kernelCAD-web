// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// A call to a name the API does not have is answered with the name that does.

import { describe, expect, it, beforeAll } from 'vitest';
import { buildModel } from '../../../src/modeling/buildModel';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { idiomForMissingName, matchApiIdioms } from '../../../src/shared/intent/apiIdioms';

async function failure(code: string): Promise<{ message: string; hint: string }> {
  try {
    await buildModel({ fileName: 'm.kcad.ts', code });
  } catch (e) {
    const err = e as { message: string; hint?: string };
    return { message: err.message, hint: err.hint ?? '' };
  }
  throw new Error('script did not fail');
}

describe('missing member hints', () => {
  beforeAll(async () => { await initOcct(); });

  it('names the path arc methods when arcTo does not exist', async () => {
    const f = await failure(`return path().moveTo(0, 0).lineTo(10, 0).arcTo(10, 10).close().extrude(2);`);
    expect(f.message).toMatch(/arcTo is not a function/);
    expect(f.hint).toMatch(/threePointsArc/);
    expect(f.hint).toMatch(/sagittaArc/);
  });

  it('suggests the near name for a typo of a real method', async () => {
    const f = await failure(`return box(1, 1, 1).filet(0.2);`);
    expect(f.hint).toMatch(/fillet/);
  });

  it('names the pattern API when a global from another vocabulary is called', async () => {
    const f = await failure(`return polarArray(10, 0, 360, 6);`);
    expect(f.message).toMatch(/polarArray is not defined/);
    expect(f.hint).toMatch(/patternCircular/);
  });

  it('keeps the Shape-method hint for a method written as a global', async () => {
    const f = await failure(`return fillet(2);`);
    expect(f.message).toMatch(/fillet is a Shape method/);
  });

  it('leaves an unrelated TypeError alone', async () => {
    const f = await failure(`const o = {}; return o.nothing();`);
    expect(f.message).toMatch(/not a function/);
    expect(f.hint).not.toMatch(/Example:/);
  });
});

describe('api idioms', () => {
  it('matches an alias on its compact form', () => {
    expect(idiomForMissingName('cbore_Hole')?.id).toBe('counterbore-countersink-hole');
    expect(matchApiIdioms('how do I do a polar array of holes').map((i) => i.id)).toContain('point-arrays');
    expect(matchApiIdioms('faces(">Z").workplane()').map((i) => i.id)).toEqual(expect.arrayContaining(['workplane', 'string-selectors']));
  });

  it('does not match short aliases inside longer words', () => {
    expect(matchApiIdioms('cutlery rack').map((i) => i.id)).not.toContain('booleans');
  });

  it('returns nothing for a blank query', () => {
    expect(matchApiIdioms('   ')).toEqual([]);
  });
});
