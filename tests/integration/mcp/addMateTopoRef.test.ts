// tests/integration/mcp/addMateTopoRef.test.ts
//
// F-surface F3 integration test: `add_mate` accepts the `@kc[part/connector/
// name]` string form on its `a` / `b` slots. Backward-compat: the legacy
// "<partName>.<connectorName>" dot form still works.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { clearActiveMcpSession } from '../../../src/agent/mcp/activeSession';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { addMateTool } from '../../../src/agent/mcp/tools/addMate';

describe('add_mate accepts @kc[...] connector refs (F-surface F3)', () => {
  beforeAll(async () => { await initOcct(); }, 60000);
  beforeEach(() => { clearActiveMcpSession(); });

  it('accepts both connector refs as @kc[part/connector/name]', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] }, normal: [0, 0, 1] });
      arm.part('bracket', box(10, 10, 5))
        .connector('flange', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -2.5] }, normal: [0, 0, 1] });
      return arm.model();
    `;
    const ev = await evaluateScriptTool({ code: setup });
    expect(ev.ok).toBe(true);

    const r = await addMateTool({
      name: 'attach',
      a: '@kc[base/connector/mount]',
      b: '@kc[bracket/connector/flange]',
      type: 'fastened',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    // Normalised back to the legacy dot form so the captured mate matches
    // the existing storage shape.
    expect(r.mate.a).toBe('base.mount');
    expect(r.mate.b).toBe('bracket.flange');
  });

  it('still accepts the legacy "part.connector" form', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] }, normal: [0, 0, 1] });
      arm.part('bracket', box(10, 10, 5))
        .connector('flange', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -2.5] }, normal: [0, 0, 1] });
      return arm.model();
    `;
    await evaluateScriptTool({ code: setup });
    const r = await addMateTool({
      name: 'attach2',
      a: 'base.mount',
      b: 'bracket.flange',
      type: 'fastened',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a malformed @kc[...] connector ref with a structured error', async () => {
    const setup = `
      const arm = assembly('arm');
      arm.part('base', box(20, 20, 10))
        .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 5] }, normal: [0, 0, 1] });
      arm.part('bracket', box(10, 10, 5))
        .connector('flange', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, -2.5] }, normal: [0, 0, 1] });
      return arm.model();
    `;
    await evaluateScriptTool({ code: setup });
    const r = await addMateTool({
      name: 'attach3',
      a: '@kc[base/face/mount]',
      b: '@kc[bracket/connector/flange]',
      type: 'fastened',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected not-ok');
    expect(r.error).toMatch(/connector|kind/);
  });
});
