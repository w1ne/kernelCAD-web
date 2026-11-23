// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// lookup_api answers the names an author reaches for as well as the names the API has.
import { describe, it, expect } from 'vitest';
import { listApiTool, type ListApiOutput } from '../../../src/agent/mcp/tools/listApi';
import { API_IDIOMS } from '../../../src/shared/intent/apiIdioms';
import { TOOLS } from '../../../src/agent/mcp/toolRegistry';

function entryNames(r: ListApiOutput): string[] {
  return [
    r.globals, r.shapeMethods, r.shapeListMethods, r.sketchMethods, r.pathBuilderMethods, r.paramRefMethods,
    r.sceneMethods, r.scenePartProperties, r.surfaceMethods, r.curve3dMethods, r.curve3dAnalyticsMethods,
  ].flatMap((group) => (group ?? []).map((e) => e.name));
}

describe('lookup_api idioms', () => {
  it.each([
    ['cboreHole', 'counterbore-countersink-hole', ['hole', 'holes']],
    ['polarArray', 'point-arrays', ['patternCircular', 'holes']],
    ['pushPoints rarray', 'point-arrays', ['holes', 'patternGrid']],
    ['arcTo', 'path-arcs', ['threePointsArc', 'sagittaArc']],
    ['slot2D', 'slot', ['slot', 'cutout']],
    ['workplane', 'workplane', ['path', 'cutout']],
    ['extrude both directions', 'extrude-both-directions', ['extrude']],
    ['faces(">Z").edges()', 'edges-of-a-face', ['fillet', 'chamfer']],
    ['edges("|Z").fillet(3)', 'string-selectors', ['selectEdges', 'fillet']],
  ])('"%s" brings up %s and its entries', async (query, idiom, entries) => {
    const r = await listApiTool({ query });
    expect(r.idioms?.map((i) => i.idiom)).toContain(idiom);
    const hit = r.idioms!.find((i) => i.idiom === idiom)!;
    expect(hit.example).toBeTruthy();
    expect(entryNames(r)).toEqual(expect.arrayContaining(entries));
  });

  it('drops prose-only noise once a name matches', async () => {
    const r = await listApiTool({ query: 'arcTo' });
    expect(r.globals ?? []).toEqual([]);
    expect((r.pathBuilderMethods ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('lists every idiom compactly, without examples, when there is no query', async () => {
    const r = await listApiTool({});
    expect(r.idioms).toHaveLength(API_IDIOMS.length);
    expect(r.idioms!.every((i) => i.example === undefined)).toBe(true);
  });

  it('every idiom entry names a real lookup_api entry', async () => {
    const names = new Set(entryNames(await listApiTool({})));
    for (const idiom of API_IDIOMS) {
      for (const entry of idiom.entries) {
        expect(names.has(entry), `${idiom.id} -> ${entry}`).toBe(true);
      }
    }
  });

  it('the tool schema declares the query it accepts', () => {
    const tool = TOOLS.find((t) => t.name === 'lookup_api')!;
    const schema = tool.inputSchema as { properties: Record<string, { type: string }> };
    expect(schema.properties.query.type).toBe('string');
  });
});
