// tests/integration/mcp/listApi.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateAndBuildScript } from '../../../src/agent/cli/commands/evaluate';
import { TOOLS } from '../../../src/agent/mcp/toolRegistry';
import { listApiTool, GLOBALS } from '../../../src/agent/mcp/tools/listApi';
import { SUPPORTED_CONSTRAINT_TYPES } from '../../../src/agent/mcp/tools/constraints';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORING_SKILL = readFileSync(resolve(__dirname, '../../../src/agent/skills/kernelcad-authoring/SKILL.md'), 'utf8');
const ARTICULATED_DIGIT_EXAMPLE_START = '<!-- ARTICULATED_DIGIT_EXAMPLE:START -->';
const ARTICULATED_DIGIT_EXAMPLE_END = '<!-- ARTICULATED_DIGIT_EXAMPLE:END -->';

function extractArticulatedDigitExample(skill: string): string | undefined {
  const start = skill.indexOf(ARTICULATED_DIGIT_EXAMPLE_START);
  const end = skill.indexOf(ARTICULATED_DIGIT_EXAMPLE_END, start + ARTICULATED_DIGIT_EXAMPLE_START.length);
  if (start < 0 || end < 0) return undefined;

  const markedBlock = skill.slice(start + ARTICULATED_DIGIT_EXAMPLE_START.length, end).trim();
  return markedBlock.match(/^```typescript\r?\n([\s\S]*?)\r?\n```$/)?.[1];
}

const ARTICULATED_DIGIT_EXAMPLE = extractArticulatedDigitExample(AUTHORING_SKILL);

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
    // Every name here must be a LIVE tool. This assertion previously pinned the
    // retired per-entity constraint lister, so it was not protecting agents from
    // a stale name — it was requiring one. Reading folded into `inspect`.
    expect(r.constraints!.tools).toEqual(['inspect', 'add_constraint', 'solve_sketch']);
    const live = new Set(TOOLS.map((t) => t.name));
    for (const name of r.constraints!.tools) expect(live).toContain(name);
    expect(r.constraints!.supportedTypes).toEqual(SUPPORTED_CONSTRAINT_TYPES);
  });

  it('advertises the articulated rest-pose clearance option to agents', () => {
    const dfm = GLOBALS.find((entry) => entry.name === 'dfmSpec');

    expect(dfm?.signature).toContain('includeArticulatedMates?: boolean');
    expect(dfm?.description).toContain('non-fastened mate pairs');
    expect(dfm?.description).toContain('rest pose');
  });

  it('advertises the constraint-first articulated digit generator to agents', async () => {
    const jointEntry = GLOBALS.find(g => g.name === 'joint');
    expect(jointEntry?.signature).toContain('articulatedDigit(arm: Assembly, opts: ArticulatedDigitOptions): ArticulatedDigitResult');
    expect(jointEntry?.description).toContain('clearance-bounded structural links');
    expect(jointEntry?.description).toContain('does not certify payloads or actuation');
    expect(AUTHORING_SKILL).toContain("name: 'index',");
    expect(AUTHORING_SKILL).toContain('dfmSpec({ minClearance, includeArticulatedMates: true });');
    expect(AUTHORING_SKILL).toContain('full `review_cad` review, including pose-envelope clearance');
    expect(AUTHORING_SKILL).toContain('remain outside package keepouts');
    expect(AUTHORING_SKILL).toContain('Dynamics, load, and actuation claims are unverified without explicit evidence');

    expect(ARTICULATED_DIGIT_EXAMPLE).toBeDefined();
    const evaluated = await evaluateAndBuildScript({ code: ARTICULATED_DIGIT_EXAMPLE! });
    expect(evaluated.evaluation.exitCode, JSON.stringify(evaluated.evaluation.diagnostics, null, 2)).toBe(0);
  });
});
