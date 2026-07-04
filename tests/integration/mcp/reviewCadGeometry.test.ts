// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// review_cad exposes a deterministic geometric contact graph so the design
// loop can gate floating/disconnected bodies on geometry rather than the
// agent's prose. The fixture below is the case every OTHER gate misses: a
// valid revolute mate, no interference, poses in range — yet the two bodies
// sit 30 mm apart in space (mate-graph connected, geometrically floating).

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';

describe('review_cad geometric contact graph', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('flags a mate-connected but geometrically floating body', async () => {
    const r = await reviewCadTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
        // link's axis is 40 mm off its own body centre; mating it onto base's
        // origin translates the whole link body 40 mm away -> a 30 mm air gap.
        arm.part('link', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [40, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });
        return arm.model();
      `,
    });

    expect(r.geometry).toBeDefined();
    expect(r.geometry?.objectCount).toBe(2);
    expect(r.geometry?.floatingParts).toContain('link');
  });

  it('reports a single connected body when parts abut', async () => {
    const r = await reviewCadTool({
      code: `
        const arm = assembly('rig');
        arm.part('base', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [5, 0, 0] }, axis: [0, 0, 1] });
        arm.part('link', box(10, 10, 10, true))
          .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [-5, 0, 0] }, axis: [0, 0, 1] });
        arm.mate('yaw', 'base.axis', 'link.axis', 'revolute', { limitsDeg: [-90, 90] });
        return arm.model();
      `,
    });

    expect(r.geometry?.objectCount).toBe(1);
    expect(r.geometry?.floatingParts).toEqual([]);
  });
});
