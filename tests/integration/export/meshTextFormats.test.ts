import { beforeAll, describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import type { Mesh } from 'three';
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js';

function objBundle(bytes: Uint8Array): { obj: string; mtl: string } {
  const files = unzipSync(bytes);
  return { obj: strFromU8(files['model.obj']!), mtl: strFromU8(files['model.mtl']!) };
}

/** Load a USDA stage the way three.js viewers do and return its meshes. */
async function loadUsdMeshes(code: string): Promise<Mesh[]> {
  const result = await runAndExport({ code, fileName: 'usd.kcad.ts', format: 'usd' });
  const meshes: Mesh[] = [];
  new USDLoader().parse(new TextDecoder().decode(result.bytes)).traverse(o => {
    if ((o as Mesh).isMesh) meshes.push(o as Mesh);
  });
  return meshes;
}

function cornerNormals(mesh: Mesh): Array<[number, number, number]> {
  const n = mesh.geometry.getAttribute('normal');
  return Array.from({ length: n.count }, (_, i) => [n.getX(i), n.getY(i), n.getZ(i)]);
}

describe('standalone OBJ and USD mesh exports', () => {
  beforeAll(async () => { await initOcct(); });

  it('exports a box as a structured Wavefront OBJ mesh', async () => {
    const result = await runAndExport({ code: 'return box(10, 20, 30);', fileName: 'box.kcad.ts', format: 'obj' });
    const { obj: text, mtl } = objBundle(result.bytes);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(text).toMatch(/^# kernelCAD OBJ mesh export/);
    expect(text).toContain('mtllib model.mtl');
    expect(text).toContain('usemtl part');
    expect(mtl).toContain('newmtl part');
    expect(text).toContain('o part');
    expect(text).toMatch(/^v 0 0 0$/m);
    expect(text).toMatch(/^f \d+ \d+ \d+$/m);
  });

  it('exports a named finish into the OBJ zip and the USD stage', async () => {
    const code = "return box(10, 10, 10).finish('brass');";
    const obj = objBundle((await runAndExport({ code, fileName: 'brass.kcad.ts', format: 'obj' })).bytes);
    const usd = new TextDecoder().decode((await runAndExport({ code, fileName: 'brass.kcad.ts', format: 'usd' })).bytes);
    expect(obj.obj).toContain('usemtl brass');
    expect(obj.mtl).toContain('newmtl brass');
    expect(obj.mtl).toContain('Kd 0.784314 0.635294 0.290196');
    expect(usd).toContain('def Material "brass"');
    expect(usd).toContain('rel material:binding = </Model/Materials/brass>');
  });

  it('exports a box as ASCII USD mesh with declared units and topology', async () => {
    const result = await runAndExport({ code: 'return box(10, 20, 30);', fileName: 'box.kcad.ts', format: 'usd' });
    const text = new TextDecoder().decode(result.bytes);
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(text).toMatch(/^#usda 1\.0/);
    expect(text).toContain('metersPerUnit = 0.001');
    expect(text).toContain('upAxis = "Z"');
    expect(text).toContain('def Mesh "part"');
    expect(text).toContain('int[] faceVertexCounts = [');
    expect(text).toContain('int[] faceVertexIndices = [');
  });

  it('preserves assembly part names and world-space positions in OBJ and USD', async () => {
    const code = `return assembly()
  .part('left', box(2, 2, 2))
  .part('right', box(2, 2, 2), { at: [8, 0, 0] })
  .model();`;
    const obj = objBundle((await runAndExport({ code, fileName: 'assembly.kcad.ts', format: 'obj' })).bytes).obj;
    const usd = new TextDecoder().decode((await runAndExport({ code, fileName: 'assembly.kcad.ts', format: 'usd' })).bytes);
    expect(obj).toContain('o left');
    expect(obj).toContain('o right');
    expect(usd).toContain('def Mesh "left"');
    expect(usd).toContain('def Mesh "right"');
    expect(usd).toContain('(8, 0, 0)');
  });

  it('loads in the three.js USD reader with flat box faces', async () => {
    const meshes = await loadUsdMeshes('return box(10, 20, 30);');
    expect(meshes.map(m => m.name)).toEqual(['part']);
    const normals = cornerNormals(meshes[0]!);
    expect(normals).toHaveLength(36);
    // Each corner normal is a face axis, not the (±0.58, ±0.58, ±0.58)
    // average across the shared box corner.
    for (const n of normals) expect(Math.max(...n.map(Math.abs))).toBeCloseTo(1, 5);
  });

  it('keeps a cylinder side smooth and its caps flat in USD normals', async () => {
    const meshes = await loadUsdMeshes('return cylinder(10, 20);');
    const normals = cornerNormals(meshes[0]!);
    const side = normals.filter(n => Math.abs(n[2]) < 1e-6);
    const caps = normals.filter(n => Math.abs(Math.abs(n[2]) - 1) < 1e-6);
    expect(side.length + caps.length).toBe(normals.length);
    expect(side.every(n => Math.abs(Math.hypot(n[0], n[1]) - 1) < 1e-5)).toBe(true);
    expect(new Set(side.map(n => n.map(v => v.toFixed(4)).join())).size).toBeGreaterThan(32);
  });

  it('authors one face-varying USD normal index per face vertex', async () => {
    const result = await runAndExport({ code: 'return box(10, 20, 30);', fileName: 'box.kcad.ts', format: 'usd' });
    const text = new TextDecoder().decode(result.bytes);
    const list = (name: string): string[] => text.match(new RegExp(`${name} = \\[([^\\]]*)\\]`))![1]!.split(', ');
    expect(text).toContain('interpolation = "faceVarying"');
    expect(list('int\\[\\] primvars:normals:indices')).toHaveLength(list('int\\[\\] faceVertexIndices').length);
  });

  it('loads each usd-isaac link mesh layer in the three.js USD reader with flat box faces', async () => {
    const code = `
const arm = assembly('arm');
const base = arm.part('base', box(40, 40, 20, true), { material: 'steel' });
const link1 = arm.part('link1', box(20, 20, 100, true).translate(0, 0, 60), { material: 'aluminum' });
base.connector('j', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
link1.connector('j', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
arm.mate('j', 'base.j', 'link1.j', 'revolute');
return arm.model();`;
    const result = await runAndExport({ code, fileName: 'arm.kcad.ts', format: 'usd-isaac' });
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.meshes?.map(m => m.relPath).sort()).toEqual(['./meshes/base.usda', './meshes/link1.usda']);
    for (const layer of result.meshes!) {
      const meshes: Mesh[] = [];
      new USDLoader().parse(new TextDecoder().decode(layer.bytes)).traverse(o => {
        if ((o as Mesh).isMesh) meshes.push(o as Mesh);
      });
      expect(meshes, layer.relPath).toHaveLength(1);
      const normals = cornerNormals(meshes[0]!);
      expect(normals, layer.relPath).toHaveLength(36);
      for (const n of normals) expect(Math.max(...n.map(Math.abs))).toBeCloseTo(1, 5);
    }
  });
});
