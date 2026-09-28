// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// tests/unit/kernel/backends/occt/export3mfSlicer.test.ts
//
// Slicer-ready 3MF gate: the model XML is parsed with a real namespace-aware
// XML parser and checked structurally (core namespace, basematerials
// resource, object-level pid/pindex, build items), part colours round-trip
// through the materials, `arrange: 'plate'` packs parts on Z=0 without XY
// overlap, `orient` puts the largest flat face down, `arrange: 'assembled'`
// keeps relative positions, and the `slicer` sidecars match the model.

import { describe, it, expect, beforeAll } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { JSDOM } from 'jsdom';
import { initOcct, OcctBackend } from '../../../../../src/kernel/backends/occt/occtBackend';
import { sceneToWorldFrameParts } from '../../../../../src/kernel/backends/occt/sceneToWorldFrame';
import { export3mfAsync, type Export3mfOptions } from '../../../../../src/kernel/backends/occt/export3mf';
import { runAndExport } from '../../../../../src/agent/script-runtime/export';
import { Transform } from '../../../../../src/shared/runtime/se3';
import type { SceneBackend, SceneBackendPart } from '../../../../../src/kernel/backends/sceneBackend';

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';

function scene(parts: SceneBackendPart[]): SceneBackend {
  return { target: 'export-occt', assemblyName: 'demo', _kind: 'scene', parts };
}

/** Three distinct parts spread far apart in world space. */
function trio(): SceneBackend {
  return scene([
    { name: 'plate', shape: OcctBackend.box(60, 40, 4), worldTransform: Transform.translation(-300, 50, 20), color: '#888888' },
    { name: 'bracket', shape: OcctBackend.box(20, 20, 12), worldTransform: Transform.translation(500, -80, -40), color: '#cc4444' },
    { name: 'cap', shape: OcctBackend.cylinder(4, 5), worldTransform: Transform.translation(0, 0, 100), color: 'tool' },
  ]);
}

interface ParsedObject {
  id: string;
  name: string;
  pid: string | null;
  pindex: string | null;
  vertices: Array<[number, number, number]>;
  components: string[];
}

interface Parsed3mf {
  entries: Record<string, Uint8Array>;
  doc: Document;
  bases: Array<{ name: string; color: string }>;
  basematerialsId: string;
  objects: Map<string, ParsedObject>;
  items: Array<{ objectId: string; t: [number, number, number] }>;
}

function parseXml(text: string): Document {
  // jsdom throws on malformed XML in XML mode — a real well-formedness gate.
  return new JSDOM(text, { contentType: 'application/xml' }).window.document;
}

function parse(bytes: Uint8Array): Parsed3mf {
  const entries = unzipSync(bytes);
  const doc = parseXml(strFromU8(entries['3D/3dmodel.model']));
  const el = (root: Document | Element, tag: string) => [...root.getElementsByTagNameNS(CORE_NS, tag)];
  const bm = el(doc, 'basematerials')[0];
  const bases = el(bm, 'base').map((b) => ({ name: b.getAttribute('name')!, color: b.getAttribute('displaycolor')! }));
  const objects = new Map<string, ParsedObject>();
  for (const o of el(doc, 'object')) {
    const vertices = el(o, 'vertex').map((v): [number, number, number] => [
      Number(v.getAttribute('x')), Number(v.getAttribute('y')), Number(v.getAttribute('z')),
    ]);
    objects.set(o.getAttribute('id')!, {
      id: o.getAttribute('id')!,
      name: o.getAttribute('name')!,
      pid: o.getAttribute('pid'),
      pindex: o.getAttribute('pindex'),
      vertices,
      components: el(o, 'component').map((c) => c.getAttribute('objectid')!),
    });
  }
  const items = el(doc, 'item').map((it) => {
    const m = (it.getAttribute('transform') ?? '1 0 0 0 1 0 0 0 1 0 0 0').split(' ').map(Number);
    return { objectId: it.getAttribute('objectid')!, t: [m[9], m[10], m[11]] as [number, number, number] };
  });
  return { entries, doc, bases, basematerialsId: bm.getAttribute('id')!, objects, items };
}

/** World-space vertices of a build item (translation-only transforms). */
function itemVertices(p: Parsed3mf, item: { objectId: string; t: [number, number, number] }) {
  const o = p.objects.get(item.objectId)!;
  const own = o.components.length > 0
    ? o.components.flatMap((c) => p.objects.get(c)!.vertices)
    : o.vertices;
  return own.map(([x, y, z]) => [x + item.t[0], y + item.t[1], z + item.t[2]] as [number, number, number]);
}

function bbox(vs: Array<[number, number, number]>) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const v of vs) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], v[a]); max[a] = Math.max(max[a], v[a]); }
  return { min, max };
}

async function exportScene(s: SceneBackend, opts: Partial<Export3mfOptions> = {}) {
  return parse(await export3mfAsync(sceneToWorldFrameParts(s), { format: '3mf', assemblyName: s.assemblyName, ...opts }));
}

describe('export3mfAsync — slicer-ready output', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('is well-formed core 3MF: namespace, basematerials resource, object-level pid/pindex, valid build refs', async () => {
    const p = await exportScene(trio(), { arrange: 'plate', slicer: 'bambu' });
    expect(p.doc.documentElement.namespaceURI).toBe(CORE_NS);
    expect(p.doc.documentElement.getAttribute('unit')).toBe('millimeter');
    expect(p.objects.size).toBe(3);
    for (const o of p.objects.values()) {
      expect(o.pid).toBe(p.basematerialsId);
      expect(Number(o.pindex)).toBeGreaterThanOrEqual(0);
      expect(Number(o.pindex)).toBeLessThan(p.bases.length);
    }
    expect(p.items).toHaveLength(3);
    for (const it of p.items) expect(p.objects.has(it.objectId)).toBe(true);
    const types = strFromU8(p.entries['[Content_Types].xml']);
    expect(types).toContain('Extension="config"');
    // Triangles no longer repeat the object's property per face.
    expect(strFromU8(p.entries['3D/3dmodel.model'])).not.toMatch(/<triangle[^>]*\bp1=/);
  });

  it('names kernelCAD in the core Application and Description metadata', async () => {
    const p = await exportScene(trio());
    const meta = Object.fromEntries(
      [...p.doc.getElementsByTagNameNS(CORE_NS, 'metadata')].map((m) => [m.getAttribute('name'), m.textContent]),
    );
    expect(meta.Application).toMatch(/^kernelCAD \S+ \(https:\/\/kernelcad\.com\)$/);
    expect(meta.Description).toBe('Made with kernelCAD (https://kernelcad.com)');
  });

  it('round-trips each part colour through its object pindex (hex and role token)', async () => {
    const p = await exportScene(trio());
    const colourOf = (name: string) => {
      const o = [...p.objects.values()].find((x) => x.name === name)!;
      return p.bases[Number(o.pindex)].color;
    };
    expect(colourOf('plate')).toBe('#888888FF');
    expect(colourOf('bracket')).toBe('#CC4444FF');
    // Role token resolves through the shared palette ('tool' = #d4683a).
    expect(colourOf('cap')).toBe('#D4683AFF');
  });

  it("arrange: 'plate' puts every part on Z=0 inside the bed with no XY overlap", async () => {
    const p = await exportScene(trio(), { arrange: 'plate' });
    const boxes = p.items.map((it) => bbox(itemVertices(p, it)));
    for (const b of boxes) {
      expect(b.min[2]).toBeCloseTo(0, 6);
      expect(b.min[0]).toBeGreaterThanOrEqual(0);
      expect(b.min[1]).toBeGreaterThanOrEqual(0);
      expect(b.max[0]).toBeLessThanOrEqual(220);
      expect(b.max[1]).toBeLessThanOrEqual(220);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlapX = a.min[0] < b.max[0] && b.min[0] < a.max[0];
        const overlapY = a.min[1] < b.max[1] && b.min[1] < a.max[1];
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it("arrange: 'plate' still packs without overlap when parts overflow one row", async () => {
    const parts: SceneBackendPart[] = Array.from({ length: 9 }, (_, i) => ({
      name: `tile${i}`, shape: OcctBackend.box(60, 30 + i, 8), worldTransform: Transform.identity(),
    }));
    const p = await exportScene(scene(parts), { arrange: 'plate' });
    const boxes = p.items.map((it) => bbox(itemVertices(p, it)));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        expect(a.min[0] < b.max[0] && b.min[0] < a.max[0] && a.min[1] < b.max[1] && b.min[1] < a.max[1]).toBe(false);
      }
    }
  });

  it('orient: true lays a standing slab on its largest flat face', async () => {
    // 4 x 50 x 30 slab standing on its 4 x 50 edge: largest face is the 50 x 30 side.
    const slab = scene([{ name: 'slab', shape: OcctBackend.box(4, 50, 30), worldTransform: Transform.identity() }]);
    const standing = await exportScene(slab, { arrange: 'plate' });
    const lying = await exportScene(slab, { arrange: 'plate', orient: true });
    const h = (p: Parsed3mf) => { const b = bbox(itemVertices(p, p.items[0])); return b.max[2] - b.min[2]; };
    expect(h(standing)).toBeCloseTo(30, 4);
    expect(h(lying)).toBeCloseTo(4, 4);
    expect(bbox(itemVertices(lying, lying.items[0])).min[2]).toBeCloseTo(0, 6);
  });

  it('orient keeps a part that already rests on its largest face', async () => {
    const plate = scene([{ name: 'p', shape: OcctBackend.box(60, 40, 4), worldTransform: Transform.identity() }]);
    const p = await exportScene(plate, { arrange: 'plate', orient: true });
    const b = bbox(itemVertices(p, p.items[0]));
    expect(b.max[0] - b.min[0]).toBeCloseTo(60, 4);
    expect(b.max[2] - b.min[2]).toBeCloseTo(4, 4);
  });

  it("arrange: 'assembled' keeps relative positions as one component object on Z=0", async () => {
    const s = scene([
      { name: 'base', shape: OcctBackend.box(20, 20, 5), worldTransform: Transform.translation(0, 0, 30), color: '#ffffff' },
      { name: 'inlay', shape: OcctBackend.box(10, 10, 2), worldTransform: Transform.translation(5, 5, 35), color: '#000000' },
    ]);
    const p = await exportScene(s, { arrange: 'assembled', slicer: 'orca' });
    expect(p.items).toHaveLength(1);
    const parent = p.objects.get(p.items[0].objectId)!;
    expect(parent.name).toBe('demo');
    expect(parent.components).toHaveLength(2);
    const all = bbox(itemVertices(p, p.items[0]));
    expect(all.min[2]).toBeCloseTo(0, 6);
    const [baseObj, inlayObj] = parent.components.map((c) => p.objects.get(c)!);
    const bb = bbox(baseObj.vertices), ib = bbox(inlayObj.vertices);
    expect(ib.min[0] - bb.min[0]).toBeCloseTo(5, 6);
    expect(ib.min[2] - bb.min[2]).toBeCloseTo(5, 6);
    const cfg = parseXml(strFromU8(p.entries['Metadata/model_settings.config']));
    const partEls = [...cfg.getElementsByTagName('part')];
    expect(partEls.map((e) => e.getAttribute('id'))).toEqual(parent.components);
  });

  it("slicer: 'bambu' writes model_settings.config with one filament slot per distinct colour", async () => {
    const s = scene([
      { name: 'a', shape: OcctBackend.box(10, 10, 10), worldTransform: Transform.identity(), color: '#ff0000' },
      { name: 'b', shape: OcctBackend.box(10, 10, 10), worldTransform: Transform.identity(), color: '#0000ff' },
      { name: 'c', shape: OcctBackend.box(10, 10, 10), worldTransform: Transform.identity(), color: '#ff0000' },
    ]);
    const p = await exportScene(s, { arrange: 'plate', slicer: 'bambu' });
    expect(p.entries['Metadata/project_settings.config']).toBeUndefined();
    const cfg = parseXml(strFromU8(p.entries['Metadata/model_settings.config']));
    const objs = [...cfg.getElementsByTagName('object')].map((o) => ({
      id: o.getAttribute('id'),
      meta: Object.fromEntries([...o.children].filter((c) => c.tagName === 'metadata').map((m) => [m.getAttribute('key'), m.getAttribute('value')])),
    }));
    expect(objs.map((o) => o.id)).toEqual(p.items.map((it) => it.objectId));
    expect(objs.map((o) => o.meta.name)).toEqual(['a', 'b', 'c']);
    expect(objs.map((o) => o.meta.extruder)).toEqual(['1', '2', '1']);
    const instances = [...cfg.getElementsByTagName('model_instance')];
    expect(instances).toHaveLength(3);
  });

  it("slicer: 'prusa' writes Slic3r_PE_model.config volumes covering every triangle", async () => {
    const s = scene([
      { name: 'base', shape: OcctBackend.box(20, 20, 5), worldTransform: Transform.identity(), color: '#ffffff' },
      { name: 'inlay', shape: OcctBackend.box(10, 10, 2), worldTransform: Transform.translation(5, 5, 5), color: '#000000' },
    ]);
    const bytes = await export3mfAsync(sceneToWorldFrameParts(s), { format: '3mf', arrange: 'assembled', slicer: 'prusa' });
    const p = parse(bytes);
    expect(p.objects.size).toBe(1);
    const model = strFromU8(p.entries['3D/3dmodel.model']);
    const triCount = (model.match(/<triangle\b/g) ?? []).length;
    const cfg = parseXml(strFromU8(p.entries['Metadata/Slic3r_PE_model.config']));
    const vols = [...cfg.getElementsByTagName('volume')].map((v) => [Number(v.getAttribute('firstid')), Number(v.getAttribute('lastid'))]);
    expect(vols).toHaveLength(2);
    expect(vols[0][0]).toBe(0);
    expect(vols[1][0]).toBe(vols[0][1] + 1);
    expect(vols[1][1]).toBe(triCount - 1);
    // The inlay's triangles carry their own colour in the core model.
    expect(model).toMatch(/<triangle[^>]*pid="1" p1="1"/);
  });

  it("slicer: 'generic' (default) writes no slicer sidecar and leaves modelled positions alone", async () => {
    const p = await exportScene(trio());
    expect(Object.keys(p.entries).filter((k) => k.endsWith('.config'))).toEqual([]);
    for (const it of p.items) expect(it.t).toEqual([0, 0, 0]);
  });

  it('rejects an unknown arrange / slicer value', async () => {
    const parts = sceneToWorldFrameParts(trio());
    await expect(export3mfAsync(parts, { format: '3mf', arrange: 'grid' as never })).rejects.toThrow(/arrange/);
    await expect(export3mfAsync(parts, { format: '3mf', slicer: 'cura' as never })).rejects.toThrow(/slicer/);
  });

  it('names the base material after the assembly part material (runAndExport)', async () => {
    const code = `
      const a = assembly('keycap');
      a.part('shell', box(18, 18, 8).color('#202020'), { material: 'pla' });
      a.part('legend', box(6, 6, 2).color('#ffffff'), { at: [6, 6, 8], material: 'pla' });
      return a.model();
    `;
    const result = await runAndExport({
      code, fileName: 'keycap.kcad.ts', format: '3mf',
      options: { format: '3mf', arrange: 'assembled', slicer: 'bambu' },
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const p = parse(result.bytes);
    expect(p.bases.map((b) => b.name)).toEqual(['pla', 'pla']);
    expect(p.bases.map((b) => b.color)).toEqual(['#202020FF', '#FFFFFFFF']);
    const parent = p.objects.get(p.items[0].objectId)!;
    expect(parent.name).toBe('keycap');
    const cfg = strFromU8(p.entries['Metadata/model_settings.config']);
    expect(cfg).toMatch(/<part id="1"[\s\S]*?key="extruder" value="1"/);
    expect(cfg).toMatch(/<part id="2"[\s\S]*?key="extruder" value="2"/);
  });
});
