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
// for line and bulge-arc boundaries.
//
// A boundary path is a polyline (path flag bit 2) or a chain of edges. Line
// and circular-arc edges are read exactly: an arc edge becomes a bulge
// segment. A clockwise arc edge (group code 73 = 0) stores its angles as
// complementary angles (360 - angle), so it runs clockwise from -50 to -51.
// Writers do not all emit each edge in the direction of travel, so an edge
// whose end, not its start, meets the previous edge is reversed. Edges that
// do not join, elliptic-arc and spline edges, and out-of-plane hatches are
// refused.

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

/** Whether the path that starts at `start` is a polyline (true) or an edge chain (false). */
function isPolylinePath(b: EntityBlock, start: number): boolean {
  const pathFlagPair = b.body[start];
  if (!pathFlagPair || pathFlagPair.code !== 92) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: boundary path data must start with group code 92.`);
  }
  const pathFlags = num(pathFlagPair, 'HATCH', 92);
  if (!Number.isInteger(pathFlags) || pathFlags < 0) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: boundary path flags must be a non-negative integer.`);
  }
  return (pathFlags & 2) !== 0;
}

/** Read the polyline path that starts with group code 92 at `start`. */
function hatchPolylinePath(b: EntityBlock, start: number): HatchPolylinePath {
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
  return { pairs: path, vertexCount, hasBulges, nextIndex: skipSourceHandles(b, pathEndIndex) };
}

/** Skip the 97 source-object count at `index` and the handles (330) after it. */
function skipSourceHandles(b: EntityBlock, index: number): number {
  let nextIndex = index + 1;
  while (b.body[nextIndex]?.code === 330) nextIndex++;
  return nextIndex;
}

// ---------------------------------------------------------------------------
// Edge-based paths
// ---------------------------------------------------------------------------

/** Endpoint mismatch allowed between consecutive edges, in millimetres. */
const EDGE_JOIN_TOLERANCE = 1e-6;

const UNSUPPORTED_EDGE: Record<number, string> = { 3: 'elliptic-arc', 4: 'spline' };

/** Read edges in their fixed DXF group-code order; every code is required. */
function edgeReader(b: EntityBlock, start: number) {
  let index = start;
  return {
    take(code: number): number {
      const pair = b.body[index];
      if (!pair || pair.code !== code) {
        throw new DxfParseError(
          'malformed-entity',
          `HATCH at line ${b.line}: expected group code ${code} in a boundary edge` +
            (pair ? `, found ${pair.code} at line ${pair.line}.` : ', found the end of the entity.'),
        );
      }
      index++;
      return num(pair, 'HATCH', code);
    },
    get index() { return index; },
  };
}

/** One line or circular-arc edge as a segment in millimetres. */
function hatchEdge(b: EntityBlock, read: ReturnType<typeof edgeReader>, scale: number): ImportSegment[] {
  const type = read.take(72);
  const source = `HATCH (line ${b.line})`;
  if (type === 1) {
    const [x0, y0, x1, y1] = [read.take(10), read.take(20), read.take(11), read.take(21)].map(v => v * scale);
    return [{ x0, y0, x1, y1, source }];
  }
  if (type !== 2) {
    const name = UNSUPPORTED_EDGE[type];
    throw new DxfParseError(
      name ? 'unsupported-entity' : 'malformed-entity',
      name
        ? `HATCH at line ${b.line}: ${name} boundary edges are not supported; re-export the boundary as a closed polyline.`
        : `HATCH at line ${b.line}: boundary edge type (group code 72) must be 1, 2, 3 or 4, found ${type}.`,
    );
  }
  const cx = read.take(10) * scale, cy = read.take(20) * scale, radius = read.take(40) * scale;
  const startAngle = read.take(50), endAngle = read.take(51), ccw = read.take(73);
  if (!(radius > 0) || (ccw !== 0 && ccw !== 1)) {
    throw new DxfParseError(
      'malformed-entity',
      `HATCH at line ${b.line}: an arc edge needs a positive radius (40) and a direction flag (73) of 0 or 1.`,
    );
  }
  const raw = endAngle - startAngle;
  const span = Math.abs(Math.abs(raw) - 360) <= 1e-9 ? 360 : ((raw % 360) + 360) % 360;
  if (span <= 1e-9) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: an arc edge has zero angular span.`);
  }
  // A clockwise edge stores 360 - angle: it runs clockwise from -start to -end.
  const sign = ccw === 1 ? 1 : -1;
  const at = (deg: number): [number, number] => {
    const rad = (sign * deg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  // A full circle is two half arcs: one bulge segment cannot close on itself.
  const pieces = span === 360 ? [[startAngle, startAngle + 180], [startAngle + 180, startAngle + 360]] : [[startAngle, startAngle + span]];
  return pieces.map(([from, to]) => {
    const [x0, y0] = at(from), [x1, y1] = at(to);
    return { x0, y0, x1, y1, bulge: sign * Math.tan(((to - from) * Math.PI) / 720), source };
  });
}

/** Read the edge path that starts with group code 92 at `start` as one closed loop. */
function hatchEdgePath(b: EntityBlock, start: number, scale: number): { loop: ImportSegment[]; nextIndex: number } {
  const read = edgeReader(b, start + 1);
  const edgeCount = read.take(93);
  if (!Number.isInteger(edgeCount) || edgeCount < 1) {
    throw new DxfParseError('malformed-entity', `HATCH at line ${b.line}: group code 93 must declare at least 1 boundary edge.`);
  }
  const edges: ImportSegment[][] = [];
  for (let e = 0; e < edgeCount; e++) edges.push(hatchEdge(b, read, scale));
  for (let e = 1; e < edges.length; e++) {
    const end = edges[e - 1][edges[e - 1].length - 1];
    if (!meets(end, edges[e][0]) && meets(end, reversed(edges[e])[0])) edges[e] = reversed(edges[e]);
    // The first edge has no predecessor to fix its direction; the second edge decides it.
    if (e === 1 && !meets(end, edges[1][0])) {
      const flipped = reversed(edges[0]);
      const flippedEnd = flipped[flipped.length - 1];
      if (meets(flippedEnd, edges[1][0])) edges[0] = flipped;
      else if (meets(flippedEnd, reversed(edges[1])[0])) [edges[0], edges[1]] = [flipped, reversed(edges[1])];
    }
    joinEdges(b, edges[e - 1][edges[e - 1].length - 1], edges[e][0], e + 1, e);
  }
  const loop = edges.flat();
  joinEdges(b, loop[loop.length - 1], loop[0], 1, edgeCount);
  read.take(97);
  return { loop, nextIndex: skipSourceHandles(b, read.index - 1) };
}

function meets(previous: ImportSegment, next: ImportSegment): boolean {
  return Math.hypot(next.x0 - previous.x1, next.y0 - previous.y1) <= EDGE_JOIN_TOLERANCE;
}

/** The same edge traversed the other way: a bulge arc keeps its points with the sign flipped. */
function reversed(edge: readonly ImportSegment[]): ImportSegment[] {
  return edge.map(seg => ({ ...seg, x0: seg.x1, y0: seg.y1, x1: seg.x0, y1: seg.y0, bulge: seg.bulge ? -seg.bulge : seg.bulge })).reverse();
}

/** Require `next` to start where `previous` ends, then make the join exact. */
function joinEdges(b: EntityBlock, previous: ImportSegment, next: ImportSegment, edge: number, previousEdge: number): void {
  if (!meets(previous, next)) {
    const fmt = (x: number, y: number) => `(${+x.toFixed(6)}, ${+y.toFixed(6)})`;
    throw new DxfParseError(
      'malformed-entity',
      `HATCH at line ${b.line}: boundary edge ${edge} does not join edge ${previousEdge}: edge ${previousEdge} ends at ` +
        `${fmt(previous.x1, previous.y1)}, and neither end of edge ${edge} is there. The edges of a boundary path must form one closed chain.`,
    );
  }
  next.x0 = previous.x1;
  next.y0 = previous.y1;
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

/** Import a HATCH whose boundary paths are closed planar polylines or line and arc edges. */
export function hatchSegments(b: EntityBlock, scale: number): HatchSegments {
  const { pathCountIndex, pathCount } = hatchPathCount(b);
  validateHatchPlane(b, pathCountIndex);
  const loops: ImportSegment[][] = [];
  let index = pathCountIndex + 1;
  for (let k = 0; k < pathCount; k++) {
    if (!isPolylinePath(b, index)) {
      const { loop, nextIndex } = hatchEdgePath(b, index, scale);
      loops.push(loop);
      index = nextIndex;
      continue;
    }
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
