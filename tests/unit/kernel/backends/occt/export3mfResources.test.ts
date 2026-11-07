// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { JSDOM } from 'jsdom';
import { export3mfAsync, type Export3mfOptions, type MeshedPart } from '../../../../../src/kernel/backends/occt/export3mf';
import type { OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const CUBE = {
  vertices: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 10, 10],
  triangles: [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7],
};
const PART: MeshedPart = {
  name: 'cube', color: '#ff0000',
  // Pre-meshed input: the writer must not call the shape's mesher.
  shape: undefined as unknown as OcctBackend,
  mesh: CUBE,
};
const PARTS: MeshedPart[] = [PART, {
  ...PART, name: 'inlay', color: '#0000ff',
  mesh: { ...CUBE, vertices: CUBE.vertices.map((v, i) => i % 3 === 0 ? v + 20 : v) },
}];
const MODIFIER = { name: 'dense', mesh: CUBE, settings: { sparse_infill_density: '60%' } };
const cases: Array<{ name: string; parts: MeshedPart[]; options: Partial<Export3mfOptions> }> = [
  { name: 'single part', parts: [PART], options: {} },
  { name: 'plate layout', parts: PARTS, options: { arrange: 'plate', slicer: 'bambu' } },
  { name: 'assembled components', parts: PARTS, options: { arrange: 'assembled' } },
  { name: 'Prusa per-triangle materials', parts: PARTS, options: { arrange: 'assembled', slicer: 'prusa' } },
  ...(['bambu', 'orca', 'prusa'] as const).map((slicer) => ({
    name: `${slicer} modifier volumes`, parts: [PART],
    options: { slicer, modifiers: [MODIFIER] },
  })),
];

function elements(root: Document | Element, tag: string): Element[] {
  return [...root.getElementsByTagNameNS(CORE_NS, tag)];
}

function assertResourceReferences(doc: Document) {
  const resources = [...elements(doc, 'resources')[0].children];
  const ids = resources.map((r) => r.getAttribute('id')!);
  // 3MF Core: objects and property groups share one positive-ID namespace.
  expect(new Set(ids).size, 'resource IDs must be unique across resource types').toBe(ids.length);
  for (const id of ids) {
    expect(Number.isInteger(Number(id))).toBe(true);
    expect(Number(id)).toBeGreaterThan(0);
    expect(Number(id)).toBeLessThan(2 ** 31);
  }
  const byId = new Map(resources.map((r) => [r.getAttribute('id'), r]));
  for (const tag of ['item', 'component']) {
    for (const ref of elements(doc, tag)) {
      expect(byId.get(ref.getAttribute('objectid'))?.localName).toBe('object');
    }
  }
  for (const object of elements(doc, 'object')) {
    if (elements(object, 'mesh').length === 0) continue;
    const material = byId.get(object.getAttribute('pid'))!;
    expect(material?.localName).toBe('basematerials');
    const baseCount = elements(material, 'base').length;
    const pindex = Number(object.getAttribute('pindex'));
    expect(pindex).toBeGreaterThanOrEqual(0);
    expect(pindex).toBeLessThan(baseCount);
    for (const triangle of elements(object, 'triangle')) {
      if (!triangle.hasAttribute('pid')) continue;
      const ownMaterial = byId.get(triangle.getAttribute('pid'))!;
      expect(ownMaterial?.localName).toBe('basematerials');
      const ownCount = elements(ownMaterial, 'base').length;
      for (const key of ['p1', 'p2', 'p3']) {
        if (!triangle.hasAttribute(key)) continue;
        const index = Number(triangle.getAttribute(key));
        expect(Number.isInteger(index)).toBe(true);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(ownCount);
      }
    }
  }
}

function assertClosedMesh(object: Element) {
  const vertexCount = elements(object, 'vertex').length;
  const edges = new Map<string, { count: number; winding: number }>();
  for (const triangle of elements(object, 'triangle')) {
    const indices = ['v1', 'v2', 'v3'].map((key) => Number(triangle.getAttribute(key)));
    expect(new Set(indices).size).toBe(3);
    for (const i of indices) {
      expect(Number.isInteger(i)).toBe(true);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(vertexCount);
    }
    for (let i = 0; i < 3; i++) {
      const a = indices[i], b = indices[(i + 1) % 3];
      const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
      const edge = edges.get(key) ?? { count: 0, winding: 0 };
      edge.count++;
      edge.winding += a < b ? 1 : -1;
      edges.set(key, edge);
    }
  }
  for (const edge of edges.values()) expect(edge).toEqual({ count: 2, winding: 0 });
}

describe('3MF resource namespace', () => {
  it.each(cases)('$name has unique IDs, typed references and closed meshes', async ({ parts, options }) => {
    const bytes = await export3mfAsync(parts, { format: '3mf', ...options });
    const entries = unzipSync(bytes);
    expect(Object.keys(entries)).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model']));
    const doc = new JSDOM(strFromU8(entries['3D/3dmodel.model']), { contentType: 'application/xml' }).window.document;
    expect(doc.documentElement.getAttribute('unit')).toBe('millimeter');
    assertResourceReferences(doc);
    for (const object of elements(doc, 'object')) assertClosedMesh(object);
    if (parts.length === 1 && options.modifiers === undefined) {
      const object = elements(doc, 'object')[0];
      expect(elements(object, 'vertex').flatMap((v) => ['x', 'y', 'z'].map((k) => Number(v.getAttribute(k))))).toEqual(CUBE.vertices);
      expect(elements(object, 'triangle').flatMap((t) => ['v1', 'v2', 'v3'].map((k) => Number(t.getAttribute(k))))).toEqual(CUBE.triangles);
    }
  });
});
