// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Segmented loft implementation for `OcctBackend.loftSegmentedFromSketches`.
 *
 * Kept out of `occtBackend.ts` so that file stays inside the repo's size
 * ratchet, and split into range/build/fuse steps so each stays inside the
 * complexity budget.
 */
import { getOC } from 'replicad';
import type { OcctBackend } from './occtBackend';

type LoftPlane = { plane: 'XY' | 'YZ' | 'XZ'; origin: [number, number, number]; rotationDeg?: number };

export interface SegmentedLoftOptions {
  ruled?: boolean;
  startPoint?: [number, number, number];
  endPoint?: [number, number, number];
  twistCenter?: [number, number];
  spanSize: number;
}

/** Overlapping station ranges: each span shares its boundary station with
 *  the next so adjacent span solids meet on an identical wire. */
function spanRanges(stationCount: number, spanSize: number): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (let start = 0; start < stationCount - 1; start += spanSize - 1) {
    const end = Math.min(start + spanSize - 1, stationCount - 1);
    ranges.push([start, end]);
    if (end === stationCount - 1) break;
  }
  return ranges;
}

function buildSpan(
  backend: typeof import('./occtBackend').OcctBackend,
  sketches: OcctBackend[],
  planes: LoftPlane[],
  range: [number, number],
  index: number,
  lastIndex: number,
  opts: SegmentedLoftOptions,
): OcctBackend {
  const [start, end] = range;
  try {
    return backend.loftFromSketches(
      sketches.slice(start, end + 1),
      planes.slice(start, end + 1),
      {
        ...(opts.ruled === undefined ? {} : { ruled: opts.ruled }),
        ...(index === 0 && opts.startPoint !== undefined ? { startPoint: opts.startPoint } : {}),
        ...(index === lastIndex && opts.endPoint !== undefined ? { endPoint: opts.endPoint } : {}),
        ...(opts.twistCenter !== undefined ? { twistCenter: opts.twistCenter } : {}),
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`span ${index} (stations ${start}..${end}) failed: ${msg}`);
  }
}

function fuseSpans(spans: readonly OcctBackend[]): OcctBackend {
  let acc = spans[0];
  for (let i = 1; i < spans.length; i++) {
    try {
      acc = acc.union(spans[i]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`fusing span ${i} failed: ${msg}`);
    }
  }
  return acc;
}

/** Segmented loft entry point. See the static method's JSDoc. */
export function loftSegmentedFromSketches(
  backend: typeof import('./occtBackend').OcctBackend,
  sketches: OcctBackend[],
  planes: LoftPlane[],
  opts: SegmentedLoftOptions,
): OcctBackend {
  if (!Number.isInteger(opts.spanSize) || opts.spanSize < 2) {
    throw new Error(`loftSegmentedFromSketches: spanSize must be an integer >= 2 (got ${opts.spanSize})`);
  }
  if (sketches.length < 2 || planes.length !== sketches.length) {
    throw new Error('loftSegmentedFromSketches: need >= 2 sections and one plane per section');
  }
  const ranges = spanRanges(sketches.length, opts.spanSize);
  if (ranges.length < 2) {
    throw new Error(
      `loftSegmentedFromSketches: ${sketches.length} station(s) with spanSize ${opts.spanSize} produced fewer than two spans`,
    );
  }
  const spans = ranges.map((range, i) =>
    buildSpan(backend, sketches, planes, range, i, ranges.length - 1, opts));
  return fuseSpans(spans);
}

/** One lateral face whose skin does not reach the requested grade. */
export interface LoftContinuityShortfall {
  /** Index in the shape's face list. */
  faceIndex: number;
  /** What OCCT reports for the face surface across the stations. */
  got: string;
}

/**
 * Check a single-skin loft against the requested station-join grade.
 *
 * `BRepOffsetAPI_ThruSections` (non-ruled) builds one face per section edge
 * that spans every station, so the station joins live INSIDE each face's
 * B-spline surface; its continuity across the stations (the V direction,
 * U runs along the section) is the join grade. G1 needs at least G1/C1,
 * G2 at least G2/C2. Faces that report a lower class are returned; an
 * unreadable face is reported as `got: 'unknown'` rather than passed.
 */
export function loftSkinContinuityShortfalls(
  shape: OcctBackend,
  grade: 'G1' | 'G2',
): LoftContinuityShortfall[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- replicad-opencascadejs has no exported OC type
  const oc = getOC() as any;
  const G = oc.GeomAbs_Shape;
  const need: number = grade === 'G2' ? G.GeomAbs_G2.value : G.GeomAbs_G1.value;
  const names: Record<number, string> = {
    [G.GeomAbs_C0.value]: 'C0', [G.GeomAbs_G1.value]: 'G1', [G.GeomAbs_C1.value]: 'C1',
    [G.GeomAbs_G2.value]: 'G2', [G.GeomAbs_C2.value]: 'C2', [G.GeomAbs_C3.value]: 'C3',
    [G.GeomAbs_CN.value]: 'CN',
  };
  const faces = (shape.getReplicadShape() as unknown as { faces: Array<{ wrapped: unknown }> }).faces;
  const out: LoftContinuityShortfall[] = [];
  faces.forEach((face, faceIndex) => {
    let got: number | undefined;
    let adaptor: { VContinuity: () => { value?: number } | number; delete?: () => void } | undefined;
    try {
      adaptor = new oc.BRepAdaptor_Surface_2(face.wrapped, true) as NonNullable<typeof adaptor>;
      const raw = adaptor.VContinuity();
      got = typeof raw === 'number' ? raw : raw.value;
    } catch {
      got = undefined;
    } finally {
      // Free the wrapper on the failure path too, so repeated recomputes
      // that hit an unreadable face do not leak OCCT objects.
      adaptor?.delete?.();
    }
    if (got === undefined) out.push({ faceIndex, got: 'unknown' });
    else if (got < need) out.push({ faceIndex, got: names[got] ?? String(got) });
  });
  return out;
}
