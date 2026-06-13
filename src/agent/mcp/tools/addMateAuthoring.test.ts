// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./addMateSource', () => ({ addMateSourceTool: vi.fn(async () => 'mate') }));
vi.mock('./addMateCouplingSource', () => ({ addMateCouplingSourceTool: vi.fn(async () => 'coupling') }));
vi.mock('./addTransmissionSource', () => ({ addTransmissionSourceTool: vi.fn(async () => 'transmission') }));

import { addMateAuthoringTool, type MateRelation } from './addMateAuthoring';
import { addMateSourceTool } from './addMateSource';
import { addMateCouplingSourceTool } from './addMateCouplingSource';
import { addTransmissionSourceTool } from './addTransmissionSource';

describe('add_mate authoring dispatcher', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['mate', 'coupling', 'transmission'] as MateRelation[])(
    "routes relation:'%s' to its source writer",
    async (relation) => {
      const out = await addMateAuthoringTool({ relation, code: 'SRC' });
      expect(out).toBe(relation);
    },
  );

  it("defaults to relation:'mate'", async () => {
    const out = await addMateAuthoringTool({ code: 'SRC', name: 'm', a: 'p.c', b: 'q.d', type: 'revolute' });
    expect(out).toBe('mate');
    expect(addMateSourceTool).toHaveBeenCalledTimes(1);
    expect(addMateCouplingSourceTool).not.toHaveBeenCalled();
    expect(addTransmissionSourceTool).not.toHaveBeenCalled();
  });

  it("does not let transmission's own `kind` collide with the relation discriminator", async () => {
    await addMateAuthoringTool({ relation: 'transmission', code: 'SRC', kind: 'four-bar', name: 't' });
    const arg = (addTransmissionSourceTool as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.kind).toBe('four-bar'); // kind preserved, reaches the transmission writer
    expect(arg).not.toHaveProperty('relation');
  });

  it('rejects an unknown relation', async () => {
    await expect(addMateAuthoringTool({ relation: 'nope' as MateRelation })).rejects.toThrow(/Unknown mate relation: nope/);
  });
});
