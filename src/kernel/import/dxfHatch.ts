// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// DXF HATCH boundaries. A HATCH declares its filled area explicitly: group
// code 91 counts the boundary paths, and each path is a closed loop. Unlike
// loose LINE/LWPOLYLINE geometry, the fill says which loop is a hole, so a
// multi-path HATCH becomes profiles WITH holes rather than flat loops.
//
// Which area is filled follows the hatch style (group code 75):
//   0 normal  odd parity: a loop at even nesting depth is filled, and the
//             loops directly inside it are its holes; an island inside a
//             hole is filled again and returned as its own profile
//   1 outer   only the outermost loops are filled, minus the loops directly
//             inside them; deeper loops lie inside those holes
//   2 ignore  only the outermost loops are filled; inner loops are not holes
//
// Nesting depth is decided geometrically with an exact point-in-loop test
// for line and bulge-arc boundaries. Only planar polyline paths are read;
// edge-based paths and out-of-plane hatches are refused.

import type { ImportFace, ImportSegment } from './contourAssembly';
import { DxfParseError, entityVector, get, num, polylineSegments, type EntityBlock, type Pair, type PolyVertex } from './dxfPairs';

export interface HatchSegments {
  closed: ImportSegment[][];
  open: ImportSegment[];
  faces: ImportFace[];
}

function hatchPathCount(b: EntityBlock): { pathCountIndex: number; pathCount: number } {
  const pathCountIndex = b.body.findIndex(pair => pair.code === 91);
  const pathCountPair = pathCountIndex < 0 ? undefined : b.body[pathCountIndex];
  if (!pathCountPair) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: required group code 91 is missing.`);
  }
  const pathCount = num(pathCountPair, 'HATCH', 91);
  if (!Number.isInteger(pathCount) || pathCount < 1) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: group code 91 must be a positive integer.`);
  }
  return { pathCountIndex, pathCount };
}

function validateHatchPlane(b: EntityBlock, pathCountIndex: number): void {
  const header = b.body.slice(0, pathCountIndex);
  const elevation = entityVector(header, 'HATCH', [10, 20, 30], [0, 0, 0]);
  const extrusion = entityVector(header, 'HATCH', [210, 220, 230], [0, 0, 1]);
  const zeroVector = (vector: number[]) => vector.every(value => Math.abs(value) <= 1e-9);
  const positiveZ = Math.abs(extrusion[0]) <= 1e-9 && Math.abs(extrusion[1]) <= 1e-9 &&
    Math.abs(extrusion[2] - 1) <= 1e-9;
  if (!zeroVector(elevation) || !positiveZ) {
    throw new DxfParseError(
      'unsupported-entity',
      `HATCH at line ${b.line}: only a zero-elevation XY boundary with extrusion direction +Z can become a 2D Sketch.`,
    );
  }
}

type HatchPolylinePath = { pairs: Pair[]; vertexCount: number; hasBulges: number; nextIndex: number };

function hatchPathFlags(b: EntityBlock, start: number): void {
  const pathFlagPair = b.body[start];
  if (!pathFlagPair || pathFlagPair.code !== 92) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: boundary path data must start with group code 92.`);
  }
  const pathFlags = num(pathFlagPair, 'HATCH', 92);
  if (!Number.isInteger(pathFlags) || pathFlags < 0) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: boundary path flags must be a non-negative integer.`);
  }
  if ((pathFlags & 2) === 0) {
    throw new DxfParseError(
      'unsupported-entity',
      `HATCH at line ${b.line}: edge-based boundary paths are not supported; re-export the boundary as a closed polyline.`,
    );
  }
}

/** Read the polyline path that starts with group code 92 at `start`. */
function hatchPolylinePath(b: EntityBlock, start: number): HatchPolylinePath {
  hatchPathFlags(b, start);
  const pathEndIndex = b.body.findIndex((pair, index) => index > start && pair.code === 97);
  if (pathEndIndex < 0) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: required group code 97 is missing after the boundary path.`);
  }
  const path = b.body.slice(start + 1, pathEndIndex);
  const closedPair = get(path, 73);
  const closedFlag = closedPair ? num(closedPair, 'HATCH', 73) : Number.NaN;
  if (closedFlag !== 1) {
    throw new DxfParseError(
      'unsupported-entity',
      `HATCH at line ${b.line}: a polyline boundary path must have the closed flag (group code 73) set to 1.`,
    );
  }
  const bulgePair = get(path, 72);
  const hasBulges = bulgePair ? num(bulgePair, 'HATCH', 72) : Number.NaN;
  if (hasBulges !== 0 && hasBulges !== 1) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: group code 72 must be 0 or 1.`);
  }
  const vertexCountPair = get(path, 93);
  if (!vertexCountPair) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: required group code 93 is missing.`);
  }
  const vertexCount = num(vertexCountPair, 'HATCH', 93);
  if (!Number.isInteger(vertexCount) || vertexCount < 2) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: group code 93 must declare at least 2 vertices.`);
  }
  // The 97 count is followed by that many source-object handles (330).
  let nextIndex = pathEndIndex + 1;
  while (b.body[nextIndex]?.code === 330) nextIndex++;
  return { pairs: path, vertexCount, hasBulges, nextIndex };
}

function hatchPolylineVertices(b: EntityBlock, path: readonly Pair[], scale: number): { vertices: PolyVertex[]; hasBulgeValue: boolean } {
  const vertices: PolyVertex[] = [];
  let hasBulgeValue = false;
  for (let i = 0; i < path.length;) {
    const pair = path[i];
    if (pair.code === 20 || pair.code === 42) {
      throw new DxfParseError(
        'malformed-entity',
        `HATCH at line ${b.line}: group code ${pair.code} at line ${pair.line} has no preceding vertex X coordinate.`,
      );
    }
    if (pair.code !== 10) {
      i++;
      continue;
    }
    const yPair = path[i + 1];
    if (!yPair || yPair.code !== 20) {
      throw new DxfParseError(
        'malformed-entity',
        `HATCH at line ${b.line}: vertex X at line ${pair.line} must be followed by group code 20 (vertex Y).`,
      );
    }
    const x = num(pair, 'HATCH', 10) * scale;
    const y = num(yPair, 'HATCH', 20) * scale;
    const bulge = path[i + 2]?.code === 42 ? num(path[i + 2], 'HATCH', 42) : 0;
    if (path[i + 2]?.code === 42) hasBulgeValue = true;
    vertices.push({ x, y, bulge });
    i += path[i + 2]?.code === 42 ? 3 : 2;
  }
  return { vertices, hasBulgeValue };
}

function validateHatchVertices(
  b: EntityBlock,
  vertices: readonly PolyVertex[],
  vertexCount: number,
  hasBulges: number,
  hasBulgeValue: boolean,
): void {
  if (vertices.length !== vertexCount) {
    throw new DxfParseError(
      'malformed-entity',
      `HATCH at line ${b.line}: group code 93 declares ${vertexCount} vertices, but ${vertices.length} were found.`,
    );
  }
  if (hasBulges === 0 && hasBulgeValue) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: group code 72 says there are no bulges, but group code 42 is present.`);
  }
}

/** Hatch style from group code 75 after the boundary paths; absent means normal. */
function hatchStyle(b: EntityBlock, afterPaths: number): 0 | 1 | 2 {
  const stylePair = get(b.body.slice(afterPaths), 75);
  const style = stylePair ? num(stylePair, 'HATCH', 75) : 0;
  if (style !== 0 && style !== 1 && style !== 2) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: group code 75 (hatch style) must be 0, 1 or 2.`);
  }
  return style;
}

// ---------------------------------------------------------------------------
// Nesting
// ---------------------------------------------------------------------------

/**
 * Exact inside test for a closed loop of lines and bulge arcs. The region is
 * the chord polygon with each arc's circular segment added or removed, so
 * the point is inside when the chord-polygon parity and the number of arc
 * segments that contain it have different parity.
 */
function loopContains(loop: readonly ImportSegment[], x: number, y: number): boolean {
  let inside = false;
  for (const seg of loop) {
    if ((seg.y0 > y) !== (seg.y1 > y) && x < seg.x0 + ((y - seg.y0) * (seg.x1 - seg.x0)) / (seg.y1 - seg.y0)) {
      inside = !inside;
    }
    if (seg.bulge && arcSegmentContains(seg, x, y)) inside = !inside;
  }
  return inside;
}

/** Whether (x, y) lies between a bulge arc and its chord. */
function arcSegmentContains(seg: ImportSegment, x: number, y: number): boolean {
  const bulge = seg.bulge ?? 0;
  const half = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0) / 2;
  const ux = (seg.x1 - seg.x0) / (2 * half), uy = (seg.y1 - seg.y0) / (2 * half);
  // The arc bulges to the right of the chord direction for a positive bulge.
  const sagitta = bulge * half;
  const radius = (half * half + sagitta * sagitta) / (2 * sagitta);
  const cx = (seg.x0 + seg.x1) / 2 + uy * (sagitta - radius);
  const cy = (seg.y0 + seg.y1) / 2 - ux * (sagitta - radius);
  const side = ux * (y - seg.y0) - uy * (x - seg.x0);
  return side * bulge < 0 && Math.hypot(x - cx, y - cy) < Math.abs(radius);
}

/** Vertices and arc mid-points: the probes that decide whether one loop is inside another. */
function probePoints(loop: readonly ImportSegment[]): Array<[number, number]> {
  return loop.flatMap((seg): Array<[number, number]> => {
    if (!seg.bulge) return [[seg.x0, seg.y0]];
    const half = Math.hypot(seg.x1 - seg.x0, seg.y1 - seg.y0) / 2;
    const ux = (seg.x1 - seg.x0) / (2 * half), uy = (seg.y1 - seg.y0) / (2 * half);
    const sagitta = seg.bulge * half;
    return [[seg.x0, seg.y0], [(seg.x0 + seg.x1) / 2 + uy * sagitta, (seg.y0 + seg.y1) / 2 - ux * sagitta]];
  });
}

/** `inside[a][c]` is true when path `a` lies inside path `c`; crossing paths are refused. */
function containment(b: EntityBlock, loops: readonly ImportSegment[][]): boolean[][] {
  const inside = loops.map(() => loops.map(() => false));
  for (let a = 0; a < loops.length; a++) {
    for (let c = 0; c < loops.length; c++) {
      if (a === c) continue;
      const votes = probePoints(loops[a]).map(([x, y]) => loopContains(loops[c], x, y));
      if (votes.some(vote => vote !== votes[0])) throwCrossing(b, a, c);
      inside[a][c] = votes[0];
    }
  }
  for (let a = 0; a < loops.length; a++) {
    for (let c = a + 1; c < loops.length; c++) {
      if (inside[a][c] && inside[c][a]) throwCrossing(b, a, c);
    }
  }
  return inside;
}

function throwCrossing(b: EntityBlock, a: number, c: number): never {
  throw new DxfParseError(
    'unsupported-entity',
    `HATCH at line ${b.line}: boundary paths ${Math.min(a, c) + 1} and ${Math.max(a, c) + 1} cross or touch, ` +
      'so the filled area is not a set of nested loops. Re-export the hatch with non-intersecting boundaries.',
  );
}

/** Group nested paths into filled faces according to the hatch style. */
function hatchFaces(b: EntityBlock, loops: readonly ImportSegment[][], style: 0 | 1 | 2): ImportFace[] {
  const inside = containment(b, loops);
  const depth = inside.map(row => row.filter(Boolean).length);
  const isDirectChild = (child: number, parent: number) => inside[child][parent] && depth[child] === depth[parent] + 1;
  const filled = loops.map((_, i) => (style === 0 ? depth[i] % 2 === 0 : depth[i] === 0));
  return loops.flatMap((outer, i) => {
    if (!filled[i]) return [];
    const holes = style === 2 ? [] : loops.filter((_, j) => isDirectChild(j, i));
    return [{ outer, holes }];
  });
}

/** Import a HATCH whose boundary paths are closed planar polylines. */
export function hatchSegments(b: EntityBlock, scale: number): HatchSegments {
  const { pathCountIndex, pathCount } = hatchPathCount(b);
  validateHatchPlane(b, pathCountIndex);
  const loops: ImportSegment[][] = [];
  let index = pathCountIndex + 1;
  for (let k = 0; k < pathCount; k++) {
    const { pairs, vertexCount, hasBulges, nextIndex } = hatchPolylinePath(b, index);
    const { vertices, hasBulgeValue } = hatchPolylineVertices(b, pairs, scale);
    validateHatchVertices(b, vertices, vertexCount, hasBulges, hasBulgeValue);
    loops.push(polylineSegments(vertices, true, 'HATCH', b.line));
    index = nextIndex;
  }
  const faces = hatchFaces(b, loops, hatchStyle(b, index));
  return {
    closed: faces.filter(face => face.holes.length === 0).map(face => face.outer),
    open: [],
    faces: faces.filter(face => face.holes.length > 0),
  };
}
