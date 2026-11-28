// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { initOcct, OcctBackend } from './occtBackend';
import { importStlBytes } from './importStl';
import { cavityHosts } from './stlCavities';
import { manifoldTopology, readStlTriangles, weldTriangles } from './stlTopology';

// Blender 4.0.2 output (make-fixture.py): 32-sided prism float, 3 mm walls around a sealed void.
const floatFixture = resolve(process.cwd(), 'examples/interoperability/stl-sealed-cavity/sealed-float.stl');
const prismArea = (radius: number): number => 16 * radius * radius * Math.sin(Math.PI / 16);
const FLOAT_VOLUME = prismArea(15) * 40 - prismArea(12) * 34;

type Point = [number, number, number];

function cube(min: number, max: number, inward = false, shift: Point = [0, 0, 0]): Point[][] {
  const v: Point[] = [
    [min, min, min], [max, min, min], [max, max, min], [min, max, min],
    [min, min, max], [max, min, max], [max, max, max], [min, max, max],
  ].map(([x, y, z]) => [x + shift[0], y + shift[1], z + shift[2]]);
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  return faces.map(([a, b, c]) => (inward ? [v[a], v[c], v[b]] : [v[a], v[b], v[c]]));
}

function asciiStl(triangles: Point[][]): Uint8Array {
  const facets = triangles.map((triangle) =>
    `facet normal 0 0 0\nouter loop\n${triangle.map((p) => `vertex ${p.join(' ')}`).join('\n')}\nendloop\nendfacet`);
  return new TextEncoder().encode(['solid cavities', ...facets, 'endsolid cavities'].join('\n'));
}

function hostsOf(bytes: Uint8Array): Int32Array | null {
  const mesh = weldTriangles(readStlTriangles(bytes)!, 1e-6)!;
  return cavityHosts(mesh, manifoldTopology(mesh)!);
}

function count(shape: replicad.AnyShape, kind: 'TopAbs_SOLID' | 'TopAbs_SHELL'): number {
  const oc = getOC() as any;
  const explorer = new oc.TopExp_Explorer_2(shape.wrapped, oc.TopAbs_ShapeEnum[kind], oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  let n = 0;
  try {
    for (; explorer.More(); explorer.Next()) n += 1;
    return n;
  } finally {
    explorer.delete?.();
  }
}

function validBrep(shape: replicad.AnyShape): boolean {
  const oc = getOC() as any;
  const analyzer = new oc.BRepCheck_Analyzer(shape.wrapped, false, false);
  try {
    return Boolean(analyzer.IsValid_2());
  } finally {
    analyzer.delete?.();
  }
}

/** Cut a true cylinder along +Z through the imported shape and return the result. */
function bore(backend: OcctBackend, radius: number, at: Point, height: number): replicad.Shape3D {
  const tool = replicad.makeCylinder(radius, height, at, [0, 0, 1]);
  return (backend.getReplicadShape() as replicad.Shape3D).cut(tool);
}

beforeAll(async () => {
  await initOcct();
});

describe('sealed cavities in a multi-shell STL', () => {
  it('imports a hollow float as one solid whose void is an inner shell', () => {
    const imported = importStlBytes(new Uint8Array(readFileSync(floatFixture)));
    const backend = imported.backend as OcctBackend;
    const shape = backend.getReplicadShape();

    expect(imported.isSolid).toBe(true);
    expect(imported.triangleCount).toBe(248);
    expect(count(shape, 'TopAbs_SOLID')).toBe(1);
    expect(count(shape, 'TopAbs_SHELL')).toBe(2);
    expect(validBrep(shape)).toBe(true);
    // Binary STL stores float32 corners, hence the 1e-2 mm^3 tolerance on 12810 mm^3.
    expect(backend.volume()).toBeCloseTo(FLOAT_VOLUME, 2);
    const bounds = backend.boundingBox();
    expect(bounds.min[2]).toBeCloseTo(0, 5);
    expect(bounds.max[2]).toBeCloseTo(40, 5);
    expect(bounds.max[0]).toBeCloseTo(15, 5);
  });

  it('cuts only wall material when a bore crosses the void', () => {
    const imported = importStlBytes(new Uint8Array(readFileSync(floatFixture)));
    // An axial 6 mm bore meets the 3 mm floor and the 3 mm lid; the 34 mm between them is void.
    const bored = bore(imported.backend as OcctBackend, 3, [0, 0, -5], 50);
    const result = new OcctBackend(bored);

    expect(result.volume()).toBeCloseTo(FLOAT_VOLUME - Math.PI * 9 * 6, 2);
    expect(count(bored, 'TopAbs_SOLID')).toBe(1);
    expect(validBrep(bored)).toBe(true);
  });

  it('gives a nested island its own void and keeps it a separate solid', () => {
    // 40 mm block, 30 mm void, 20 mm island floating in the void, 10 mm void in the island.
    const imported = importStlBytes(asciiStl([
      ...cube(0, 40),
      ...cube(5, 35, true),
      ...cube(10, 30),
      ...cube(15, 25, true),
    ]));
    const backend = imported.backend as OcctBackend;
    const shape = backend.getReplicadShape();
    const volume = 40 ** 3 - 30 ** 3 + 20 ** 3 - 10 ** 3;

    expect(imported.isSolid).toBe(true);
    expect(count(shape, 'TopAbs_SOLID')).toBe(2);
    expect(count(shape, 'TopAbs_SHELL')).toBe(4);
    expect(validBrep(shape)).toBe(true);
    expect(backend.volume()).toBeCloseTo(volume, 6);

    // The bore meets four 5 mm walls: block floor and lid, island floor and lid.
    const bored = bore(backend, 2, [20, 20, -5], 50);
    expect(new OcctBackend(bored).volume()).toBeCloseTo(volume - Math.PI * 4 * 20, 6);
    expect(count(bored, 'TopAbs_SOLID')).toBe(2);
    expect(validBrep(bored)).toBe(true);
  });

  it('assigns each void to the smallest outward shell around it', () => {
    const hosts = hostsOf(asciiStl([
      ...cube(15, 25, true),
      ...cube(0, 40),
      ...cube(10, 30),
      ...cube(5, 35, true),
    ]));
    expect(Array.from(hosts!)).toEqual([2, -1, -1, 1]);
  });

  it('leaves separate bodies and unhosted inward shells alone', () => {
    expect(hostsOf(asciiStl([...cube(0, 10), ...cube(0, 10, false, [20, 0, 0])]))).toBeNull();
    // An inward shell beside the block, and one whose bounds touch the block's own.
    expect(hostsOf(asciiStl([...cube(0, 10), ...cube(0, 5, true, [20, 0, 0])]))).toBeNull();
    expect(hostsOf(asciiStl([...cube(0, 10), ...cube(0, 5, true)]))).toBeNull();

    const imported = importStlBytes(asciiStl([...cube(0, 10), ...cube(0, 10, false, [20, 0, 0])]));
    expect(imported.isSolid).toBe(true);
    expect(count(imported.backend.getReplicadShape(), 'TopAbs_SOLID')).toBe(2);
    expect(imported.backend.volume()).toBeCloseTo(2000, 6);
  });
});
