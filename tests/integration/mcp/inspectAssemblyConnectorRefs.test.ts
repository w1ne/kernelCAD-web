// tests/integration/mcp/inspectAssemblyConnectorRefs.test.ts
//
// F-surface Task F2.3: inspect_assembly emits topology-bound connector origins
// as @kc[<part>/<kind>/<name>] strings paired with the resolved numeric vec3.
// vec3 origins remain a numeric tuple.
import { describe, it, expect, beforeAll } from 'vitest';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';

describe('inspect_assembly — topology connector origin string emission (F-surface F2)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('emits origin as @kc[<part>/face/<name>] for topology-bound connectors', async () => {
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', {
          type: 'frame',
          origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const r = await inspectAssemblyTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const part = r.parts.find((p) => p.name === 'base');
    expect(part).toBeDefined();
    const conn = part!.connectors.find((c) => c.name === 'mount');
    expect(conn).toBeDefined();
    expect(typeof conn!.origin).toBe('string');
    expect(conn!.origin).toBe('@kc[base/face/top]');
    expect(conn!.originRaw).toBeDefined();
    expect((conn as { resolved?: number[] }).resolved).toBeDefined();
    expect((conn as { resolved?: number[] }).resolved!.length).toBe(3);
  });

  it('keeps vec3 origins as their numeric tuple', async () => {
    // Note: the `partRef.connector(name, opts)` capture API takes a structured
    // `ConnectorOrigin`, not a raw Vec3 — the bare-array form from the spec
    // example would fail capture. Use the canonical structured form so the
    // vec3 branch exercises with realistic input.
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(10, 10, 10))
        .connector('flange', {
          type: 'frame',
          origin: { kind: 'vec3', value: [0, 0, 0] },
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const r = await inspectAssemblyTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const conn = r.parts[0].connectors.find((c) => c.name === 'flange');
    expect(conn).toBeDefined();
    expect(Array.isArray(conn!.origin)).toBe(true);
  });
});
