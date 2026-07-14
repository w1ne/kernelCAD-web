// tests/integration/mcp/listApi.test.ts
import { describe, it, expect } from 'vitest';
import { listApiTool, GLOBALS } from '../../../src/agent/mcp/tools/listApi';
import { SUPPORTED_CONSTRAINT_TYPES } from '../../../src/agent/mcp/tools/constraints';

describe('list_api MCP tool', () => {
  it('returns globals including box, path, selectEdges, helix', async () => {
    const r = await listApiTool({});
    expect(r.ok).toBe(true);
    const globalNames = r.globals!.map(g => g.name);
    expect(globalNames).toContain('box');
    expect(globalNames).toContain('cylinder');
    expect(globalNames).toContain('sphere');
    expect(globalNames).toContain('path');
    expect(globalNames).toContain('selectEdges');
    expect(globalNames).toContain('selectEdge');
    expect(globalNames).toContain('helix');
    expect(globalNames).toContain('param');
  });

  it('returns shapeMethods including fillet, chamfer, shell, lower, translate', async () => {
    const r = await listApiTool({});
    const methodNames = r.shapeMethods!.map(m => m.name);
    expect(methodNames).toContain('fillet');
    expect(methodNames).toContain('chamfer');
    expect(methodNames).toContain('shell');
    expect(methodNames).toContain('lower');
    expect(methodNames).toContain('translate');
  });

  it('returns sketchMethods including extrude, revolve, sweep', async () => {
    const r = await listApiTool({});
    const sketchMethodNames = r.sketchMethods!.map(m => m.name);
    expect(sketchMethodNames).toContain('extrude');
    expect(sketchMethodNames).toContain('revolve');
    expect(sketchMethodNames).toContain('sweep');
  });

  it('returns edgeQueryKeys and faceQueryKeys', async () => {
    const r = await listApiTool({});
    expect(r.edgeQueryKeys).toContain('atZ');
    expect(r.edgeQueryKeys).toContain('parallel');
    expect(r.edgeQueryKeys).toContain('convex');
    expect(r.faceQueryKeys).toContain('atZ');
    expect(r.faceQueryKeys).toContain('parallelTo');
    expect(r.faceQueryKeys).toContain('inPlane');
  });

  it('globals signatures for faceLabels-accepting kinds mention opts and faceLabels', () => {
    const FACE_LABEL_KINDS = ['box', 'cylinder', 'extrudeRect', 'extrudeCircle', 'extrudePolygon', 'extrudeRoundedRect'];
    for (const kind of FACE_LABEL_KINDS) {
      const entry = GLOBALS.find(g => g.name === kind);
      expect(entry, `GLOBALS entry for ${kind} should exist`).toBeDefined();
      expect(entry!.signature, `${kind}.signature should mention opts`).toContain('opts');
      expect(entry!.description, `${kind}.description should mention faceLabels`).toContain('faceLabels');
    }
  });

  it('sphere global does NOT advertise faceLabels in its description', () => {
    const sphereEntry = GLOBALS.find(g => g.name === 'sphere');
    expect(sphereEntry).toBeDefined();
    expect(sphereEntry!.description).not.toContain('faceLabels');
  });

  it('list_api output includes featureKindFaceLabels with accepting kinds and FaceQuery description', async () => {
    const r = await listApiTool({});
    expect(r.featureKindFaceLabels).toBeDefined();
    const fkfl = r.featureKindFaceLabels!;

    // All accepting kinds present
    const acceptingKinds = ['box', 'cylinder', 'extrudeRect', 'extrudeCircle', 'extrudePolygon', 'extrudeRoundedRect'];
    for (const kind of acceptingKinds) {
      expect(fkfl.acceptingKinds, `acceptingKinds should include ${kind}`).toContain(kind);
    }

    // sphere NOT in accepting kinds
    expect(fkfl.acceptingKinds).not.toContain('sphere');

    // description mentions canonical face names AND FaceQuery
    expect(fkfl.description).toMatch(/top|bottom|left|right|front|back/);
    expect(fkfl.description).toContain('FaceQuery');
  });

  it('returns constrained-sketch MCP tool discovery with supported constraint types', async () => {
    const r = await listApiTool({});
    expect(r.constraints).toBeDefined();
    expect(r.constraints!.tools).toEqual(['list_constraints', 'add_constraint', 'solve_sketch']);
    expect(r.constraints!.supportedTypes).toEqual(SUPPORTED_CONSTRAINT_TYPES);
  });

  it('advertises the articulated rest-pose clearance option to agents', () => {
    const dfm = GLOBALS.find((entry) => entry.name === 'dfmSpec');

    expect(dfm?.signature).toContain('includeArticulatedMates?: boolean');
    expect(dfm?.description).toContain('non-fastened mate pairs');
    expect(dfm?.description).toContain('rest pose');
  });
});
