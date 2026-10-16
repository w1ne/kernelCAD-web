// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `{ face }` as an edge selector takes no other key. Extra keys used to be
// dropped silently — fillet([{ edges: { face: 'top', byNormal: '+Z',
// region: 'temple' }, radius: 1 }]) filleted every top edge — in the single
// form and in the array-of-entries form of fillet / chamfer alike.
import { describe, expect, it } from 'vitest';
import { runScript } from '../../../src/modeling/runtime/runScript';

async function captureError(code: string): Promise<string | undefined> {
  try {
    await runScript({ code, fileName: 'sel.kcad.ts' });
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

describe('edge selector { face } rejects unknown keys', () => {
  it.each([
    ['fillet single form', "return box(20,20,10).fillet(1, { face: 'top', byNormal: '+Z', region: 'temple' });"],
    ['fillet entries form', "return box(20,20,10).fillet([{ edges: { face: 'top', byNormal: '+Z', region: 'temple' }, radius: 1 }]);"],
    ['chamfer entries form', "return box(20,20,10).chamfer([{ edges: { face: 'top', bogus: 1 }, distance: 1 }]);"],
  ])('%s', async (_name, code) => {
    const err = await captureError(code);
    expect(err).toMatch(/unknown key/);
    expect(err).toMatch(/only the key face/);
  });

  it('a bare { face } and a FaceQuery inside face still capture', async () => {
    expect(await captureError("return box(20,20,10).fillet([{ edges: { face: 'top' }, radius: 1 }]);")).toBeUndefined();
    expect(await captureError("return box(20,20,10).fillet(1, { face: { byNormal: '+Z' } });")).toBeUndefined();
  });
});
