// tests/integration/examples/connectorTopoRefBinding.test.ts
//
// F-surface Task F4: capture-time `partRef.connector(name, opts)` accepts
// opts.origin as a @kc[<part>/<kind>/<name>] string ref. The string normalises
// to the existing structured topology-query shape so downstream solvers,
// inspect_assembly, and validate_assembly see no change. Closes the long-
// standing `kernelcad_assembly_topology_binding_gap` memory item.

import { beforeAll, describe, expect, it } from 'vitest';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

describe('Connector.origin accepts @kc[...] strings (F-surface F4)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('captures and resolves @kc[<part>/face/top] as a topology origin', async () => {
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', {
          type: 'frame',
          origin: '@kc[base/face/top]',
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const ev = await evaluateScriptTool({ code });
    expect(ev.ok).toBe(true);

    const r = await inspectAssemblyTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const conn = r.parts[0].connectors.find((c) => c.name === 'mount');
    expect(conn).toBeDefined();
    expect(conn!.originKind).toBe('topology');
    expect(conn!.origin).toBe('@kc[base/face/top]');
    expect((conn as { resolved?: number[] }).resolved).toBeDefined();
  });

  it('round-trip: declare @kc[...] origins on two parts, mate via the connectors, evaluates clean', async () => {
    // This is the kernelcad_assembly_topology_binding_gap memory-item scenario:
    // both connectors bind by topology (face refs) and mate succeeds without
    // any numeric coordinate triple ever leaving the user's script.
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', {
          type: 'frame',
          origin: '@kc[base/face/top]',
          normal: [0, 0, 1],
        });
      arm.part('bracket', box(10, 10, 5))
        .connector('flange', {
          type: 'frame',
          origin: '@kc[bracket/face/bottom]',
          normal: [0, 0, 1],
        });
      arm.mate('attach', 'base.mount', 'bracket.flange', 'fastened');
      return arm.model();
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(true);
  });

  it('connector @kc[...] origin resolves on a translated shape (lineage path)', async () => {
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10).translate(5, 0, 0))
        .connector('mount', {
          type: 'frame',
          origin: '@kc[base/face/top]',
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const r = await inspectAssemblyTool({ code });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    const conn = r.parts[0].connectors.find((c) => c.name === 'mount');
    expect(conn).toBeDefined();
    expect((conn as { resolved?: number[] }).resolved).toBeDefined();
    const v = (conn as { resolved: number[] }).resolved;
    // box(20,20,10) is corner-anchored at the world origin → top-face center is
    // at [10, 10, 10]; translate(5,0,0) shifts the centroid to [15, 10, 10].
    expect(v[0]).toBeCloseTo(15, 1);
    expect(v[1]).toBeCloseTo(10, 1);
    expect(v[2]).toBeCloseTo(10, 1);
  });

  it('still accepts the existing structured ConnectorOrigin form', async () => {
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
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(true);
  });

  it('still accepts a structured vec3 origin', async () => {
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', {
          type: 'frame',
          origin: { kind: 'vec3', value: [0, 0, 5] },
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(true);
  });

  it('rejects a non-@kc bare string origin with a structured diagnostic', async () => {
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', {
          type: 'frame',
          origin: 'top',
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(false);
  });

  it('rejects a @kc ref whose owner does not match the part name', async () => {
    const code = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', {
          type: 'frame',
          origin: '@kc[other/face/top]',
          normal: [0, 0, 1],
        });
      return arm.model();
    `;
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(false);
  });
});
