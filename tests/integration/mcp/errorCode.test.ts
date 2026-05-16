// tests/integration/mcp/errorCode.test.ts
//
// Verify that MCP tools set `errorCode` not just on script-runtime exceptions
// (rc.7 wired this) but also on lowering-error paths where engine.run()
// produces error diagnostics. Uniform structured-failure protocol across
// the entire MCP surface.
import { describe, it, expect, beforeAll } from 'vitest';
import { getShapeInfoTool } from '../../../src/mcp/tools/getShapeInfo';
import { listFeaturesTool } from '../../../src/mcp/tools/listFeatures';
import { listTopologyTool } from '../../../src/mcp/tools/listTopology';

describe('MCP tools — errorCode on lowering-error path (rc.7 I-4)', () => {
  beforeAll(async () => {
    const { initOcct } = await import('../../../src/kernel/backends/occt/occtBackend');
    await initOcct();
  });

  it('getShapeInfo emits errorCode when lowering produces an error diagnostic', async () => {
    // box.fillet(1, { atZ: 999 }) → no edges match → feature.edge-feature.no-edges-match
    const code = `return box(10, 10, 5).fillet(1, { atZ: 999 });`;
    const r = await getShapeInfoTool({ code });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.selection.no-match');
  });

  it('listFeatures emits error + errorCode on script error (rc.7 I-5)', async () => {
    // Trigger a kernel error (duplicate label).
    const code = `
      return path().moveTo(0,0)
        .lineTo(5,0).label('side')
        .lineTo(5,5).label('side')
        .close().extrude(1);
    `;
    const r = await listFeaturesTool({ code });
    // Old behavior: returned { features: [] } silently. New: surfaces the error.
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
    expect(r.errorCode).toBeDefined();
  });

  it('listTopology emits errorCode on lowering error', async () => {
    const code = `return box(10, 10, 5).fillet(1, { atZ: 999 });`;
    const r = await listTopologyTool({ code });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe('feature.selection.no-match');
  });
});
