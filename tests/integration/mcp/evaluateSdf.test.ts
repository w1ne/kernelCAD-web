// tests/integration/mcp/evaluateSdf.test.ts
//
// Acceptance test for the read-only `evaluate_sdf` MCP tool. The handler
// re-runs the supplied script in an isolated session, reads the named
// SdfField binding from session.sdfFields, and samples it at a point.
//
// Plan-vs-API deviation: the plan called for `globalThis['<name>']` binding,
// but the script sandbox in `src/modeling/runtime/isolation.ts` strips
// `globalThis`/`require`/etc to prevent host escape. The slice-1 contract is
// instead `sdf.bind(name, field)` which writes to `session.sdfFields`.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateSdfTool } from '../../../src/agent/mcp/tools/evaluateSdf';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

beforeAll(async () => { await initOcct(); });

describe('evaluate_sdf', () => {
  it("returns 0 on a sphere's surface and negative inside", async () => {
    // Note: the script binds the field but DOES NOT materialize — evaluate_sdf
    // is meant for pre-materialize verification (sampling distance before paying
    // the expensive marching-cubes cost).
    const code = `
      const field = sdf.sphere(10);
      sdf.bind('myField', field);
      return box(1, 1, 1);
    `;
    const onSurface = await evaluateSdfTool({ code, fieldName: 'myField', point: [10, 0, 0] });
    expect(onSurface.ok).toBe(true);
    if (onSurface.ok) {
      expect(onSurface.distance).toBeCloseTo(0, 6);
      expect(onSurface.inside).toBe(false);
      expect(onSurface.kind).toBe('sphere');
    }
    const inside = await evaluateSdfTool({ code, fieldName: 'myField', point: [0, 0, 0] });
    expect(inside.ok).toBe(true);
    if (inside.ok) {
      expect(inside.distance).toBeCloseTo(-10, 6);
      expect(inside.inside).toBe(true);
    }
  });

  it('returns aabb of the field', async () => {
    const code = `
      const field = sdf.box([20, 10, 6]);
      sdf.bind('b', field);
      return box(1, 1, 1);
    `;
    const r = await evaluateSdfTool({ code, fieldName: 'b', point: [0, 0, 0] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.aabb).toEqual({ min: [-10, -5, -3], max: [10, 5, 3] });
    }
  });

  it('fails with field-undefined when the named binding is missing', async () => {
    const code = `return box(1, 1, 1);`;
    const r = await evaluateSdfTool({ code, fieldName: 'doesNotExist', point: [0, 0, 0] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe('feature.sdf.field-undefined');
    }
  });

  it('rejects malformed point input', async () => {
    const code = `sdf.bind('f', sdf.sphere(10)); return box(1, 1, 1);`;
    const r = await evaluateSdfTool({ code, fieldName: 'f', point: [0, 0] as unknown as [number, number, number] });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errorCode).toBe('feature.invalid-args');
    }
  });
});

