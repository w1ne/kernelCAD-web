// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingSections.ts
//
// `options.sections` for the svg-drawing exporter: a real OCCT half-space
// cut (not a render-time visual clip) through the assembled compound,
// projected through the same HLR pipeline as every other view, plus the
// true cross-section face(s) filled with a 45° hatch — the ASME convention
// for "this is solid material that got cut through".
//
// Scope: any cutting plane. `'xy'|'xz'|'yz'` and an `{ origin, normal }`
// whose normal is within ~2.5° of a world axis take the axis-aligned path,
// which reuses the standard front/top/left cameras. Every other normal takes
// the oblique path: the half-space box is rotated onto the plane, the kept
// half is projected through an auxiliary camera looking straight at the cut
// (true shape), and the indicator is drawn as the plane's trace on the
// standard view closest to edge-on. A zero normal still fails
// `feature.invalid-args`.
//
// Pipeline per section:
//   1. Resolve the cutting axis + position (bbox midpoint for the literal
//      plane names, `origin`'s component for the object form).
//   2. Reject a position outside the compound's bounding box on that axis
//      (`drawing.section.plane-misses-body`) — a plane that misses the body
//      would silently render an empty section otherwise.
//   3. Boolean-intersect the compound with a half-space box (BIG on every
//      side, positioned so it covers the far-from-viewer half — the ASME
//      convention of "remove the near material, look straight at the cut").
//   4. HLR-project the kept half through the axis's section camera (already
//      defined by `drawingProjection.ts` — 'top' for a z-cut, 'front' for a
//      y-cut, 'left' for an x-cut) exactly like `exportSvgDrawing` does for
//      the standard views.
//   5. `resolveFaceQuery` picks the planar face(s) that landed exactly on
//      the cutting plane (the true cross-section) and their wires become
//      the 45°-hatch fill boundary (outer + inner wires, evenodd fill-rule
//      — an inner wire is a hole the section plane sliced through).
//   6. A cutting-plane indicator (dashed line, arrows, letter) is drawn on
//      the "parent" view where the plane appears edge-on.

import type { Vec3 } from '../../../shared/intent/types';
import { KernelError } from '../../../shared/intent/kernelError';
import { OcctBackend } from './occtBackend';
import { resolveFaceQuery } from './edgeQueries';
import type { Face } from 'replicad';
import {
  makeAuxiliaryCamera,
  makeDrawingCamera,
  projectShapeForDrawing,
  viewBasis,
} from './drawingProjection';
import {
  dedupPolylineClasses,
  viewBoxOfPolylines,
  type DrawingViewName,
  type Polyline2,
  type Pt2,
  type ViewBox2,
  type ViewPlacement,
} from './drawingLayout';
import { modelToSheet } from './drawingAnnotations';

export type SectionPlane = 'xy' | 'xz' | 'yz' | { origin: Vec3; normal: Vec3 };

export interface DrawingSectionSpec {
  plane: SectionPlane;
  /** Section letter, e.g. `'A'` → cutting-plane indicator "A" and the
   *  section-view caption "SECTION A-A". */
  label: string;
}

type Axis = 'x' | 'y' | 'z';

interface AxisInfo {
  /** View whose camera looks straight along this axis — reused verbatim to
   *  HLR-project the kept half. */
  sectionView: DrawingViewName;
  /** View where the cutting plane appears edge-on, to host the indicator. */
  parentView: DrawingViewName;
  orientation: 'horizontal' | 'vertical';
  /** Sheet direction (+1 or −1 along the perpendicular sheet axis) the
   *  indicator's arrows point — the section's viewing direction. */
  arrowDir: 1 | -1;
  /** Keep the half where this axis's world coordinate is >= position
   *  (true) or <= position (false) — the far-from-viewer half. */
  keepGE: boolean;
}

const AXIS_INFO: Record<Axis, AxisInfo> = {
  z: { sectionView: 'top', parentView: 'front', orientation: 'horizontal', arrowDir: 1, keepGE: false },
  y: { sectionView: 'front', parentView: 'top', orientation: 'horizontal', arrowDir: -1, keepGE: true },
  x: { sectionView: 'left', parentView: 'front', orientation: 'vertical', arrowDir: 1, keepGE: true },
};

const AXIS_INDEX: Record<Axis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };
const round3 = (n: number): string => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

type ResolvedPlane =
  | { kind: 'axis'; axis: Axis; position: number }
  | { kind: 'oblique'; origin: Vec3; normal: Vec3 };

function resolvePlane(
  plane: SectionPlane,
  bbox: { min: Vec3; max: Vec3 },
  role: string,
): ResolvedPlane {
  if (plane === 'xy') return { kind: 'axis', axis: 'z', position: (bbox.min[2] + bbox.max[2]) / 2 };
  if (plane === 'xz') return { kind: 'axis', axis: 'y', position: (bbox.min[1] + bbox.max[1]) / 2 };
  if (plane === 'yz') return { kind: 'axis', axis: 'x', position: (bbox.min[0] + bbox.max[0]) / 2 };
  const { origin, normal } = plane;
  const mag = Math.hypot(normal[0], normal[1], normal[2]);
  if (!(mag >= 1e-9)) {
    throw new KernelError(
      'feature.invalid-args',
      `${role}: plane.normal must be a non-zero vector.`,
      undefined,
      'Pass a non-zero [x, y, z] normal.',
    );
  }
  const [nx, ny, nz] = [Math.abs(normal[0]) / mag, Math.abs(normal[1]) / mag, Math.abs(normal[2]) / mag];
  const AXIS_COS_MIN = 0.999; // ~2.5 degrees off-axis
  if (nx > AXIS_COS_MIN) return { kind: 'axis', axis: 'x', position: origin[0] };
  if (ny > AXIS_COS_MIN) return { kind: 'axis', axis: 'y', position: origin[1] };
  if (nz > AXIS_COS_MIN) return { kind: 'axis', axis: 'z', position: origin[2] };
  return {
    kind: 'oblique',
    origin,
    normal: [normal[0] / mag, normal[1] / mag, normal[2] / mag],
  };
}

/** Boolean-intersect `compound` with a half-space box covering the
 *  far-from-viewer side of the cutting plane. */
function buildKeptHalf(compound: OcctBackend, axis: Axis, position: number): OcctBackend {
  const bb = compound.boundingBox();
  const diag = Math.hypot(
    bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2],
  ) || 1;
  const BIG = diag * 4 + 1000;
  const idx = AXIS_INDEX[axis];
  const center: Vec3 = [
    (bb.min[0] + bb.max[0]) / 2,
    (bb.min[1] + bb.max[1]) / 2,
    (bb.min[2] + bb.max[2]) / 2,
  ];
  center[idx] = AXIS_INFO[axis].keepGE ? position + BIG / 2 : position - BIG / 2;
  const box = OcctBackend.box(BIG, BIG, BIG, true).translate(center[0], center[1], center[2]);
  return compound.intersect(box);
}

function wireToSheetPath(
  wire: { pointAt(t: number): { x: number; y: number; z: number } },
  view: DrawingViewName,
  placement: ViewPlacement,
  scale: number,
  samples = 64,
): string {
  const pts: string[] = [];
  for (let i = 0; i < samples; i++) {
    const p = wire.pointAt(i / samples);
    const [sx, sy] = modelToSheet([p.x, p.y, p.z], view, placement, scale);
    pts.push(`${i === 0 ? 'M' : 'L'} ${round3(sx)} ${round3(sy)}`);
  }
  pts.push('Z');
  return pts.join(' ');
}

/** Filled arrowhead at `tip` pointing along the unit vector (dx, dy). */
function arrowhead(tip: Pt2, dx: number, dy: number): string {
  const L = 3;
  const W = 0.6;
  const bx = tip[0] - dx * L;
  const by = tip[1] - dy * L;
  const px = -dy, py = dx;
  return (
    `<path d="M ${round3(tip[0])} ${round3(tip[1])} L ${round3(bx + px * W)} ${round3(by + py * W)} ` +
    `L ${round3(bx - px * W)} ${round3(by - py * W)} Z" fill="#000" stroke="none"/>`
  );
}

const OVERSHOOT = 6; // sheet mm the cutting-plane line runs past the parent view's bbox

function cuttingPlaneIndicatorSvg(
  axis: Axis,
  position: number,
  parentPlacement: ViewPlacement,
  mainScale: number,
  label: string,
): string {
  const info = AXIS_INFO[axis];
  const planePoint: Vec3 = [0, 0, 0];
  planePoint[AXIS_INDEX[axis]] = position;
  const [sx, sy] = modelToSheet(planePoint, info.parentView, parentPlacement, mainScale);
  const box = parentPlacement.box;
  const parts: string[] = [];
  if (info.orientation === 'horizontal') {
    const y = sy;
    const x0 = box.x - OVERSHOOT;
    const x1 = box.x + box.w + OVERSHOOT;
    parts.push(`<line x1="${round3(x0)}" y1="${round3(y)}" x2="${round3(x1)}" y2="${round3(y)}"/>`);
    const dy = info.arrowDir;
    parts.push(arrowhead([x0, y], 0, dy), arrowhead([x1, y], 0, dy));
    const labelY = y + dy * 5;
    parts.push(
      `<text x="${round3(x0)}" y="${round3(labelY)}" font-size="3.6" text-anchor="middle" fill="#000" stroke="none">${label}</text>`,
      `<text x="${round3(x1)}" y="${round3(labelY)}" font-size="3.6" text-anchor="middle" fill="#000" stroke="none">${label}</text>`,
    );
  } else {
    const x = sx;
    const y0 = box.y - OVERSHOOT;
    const y1 = box.y + box.h + OVERSHOOT;
    parts.push(`<line x1="${round3(x)}" y1="${round3(y0)}" x2="${round3(x)}" y2="${round3(y1)}"/>`);
    const dx = info.arrowDir;
    parts.push(arrowhead([x, y0], dx, 0), arrowhead([x, y1], dx, 0));
    const labelX = x + dx * 5;
    parts.push(
      `<text x="${round3(labelX)}" y="${round3(y0 + 1)}" font-size="3.6" text-anchor="middle" fill="#000" stroke="none">${label}</text>`,
      `<text x="${round3(labelX)}" y="${round3(y1 + 1)}" font-size="3.6" text-anchor="middle" fill="#000" stroke="none">${label}</text>`,
    );
  }
  return (
    `<g class="section-plane-indicator" fill="none" stroke="#000" stroke-width="0.3" ` +
    `stroke-dasharray="9 1.4 1.4 1.4">${parts.join('')}</g>`
  );
}

export interface SectionRenderInput {
  /** The full assembled compound (already world-framed, already combined
   *  across parts) — the same shape the standard views project. */
  compound: OcctBackend;
  sections: readonly DrawingSectionSpec[];
  mainViewPlacements: Record<DrawingViewName, ViewPlacement>;
  mainScale: number;
  /** Top-left of the reserved band under the standard 4-view grid. */
  bandOrigin: Pt2;
  bandWidth: number;
  bandHeight: number;
}

export interface SectionRenderResult {
  /** Cutting-plane indicators (drawn on the parent view) + section-view
   *  cells (geometry + hatch + caption), one `<g>` group per section. */
  svg: string;
  /** True when at least one section rendered a hatch fill — the caller only
   *  needs to emit the `<pattern>` def in that case. */
  usesHatchPattern: boolean;
}

const CELL_PAD = 6;

export function renderSections(input: SectionRenderInput): SectionRenderResult {
  const { compound, sections, mainViewPlacements, mainScale, bandOrigin, bandWidth, bandHeight } = input;
  const bbox = compound.boundingBox();
  const groups: string[] = [];
  let usesHatchPattern = false;
  const slotW = bandWidth / sections.length;

  sections.forEach((spec, i) => {
    const role = `sections[${i}]`;
    const resolved = resolvePlane(spec.plane, bbox, role);
    if (resolved.kind === 'oblique') {
      const oblique = renderObliqueSection({
        compound, spec, role, plane: resolved, mainViewPlacements, mainScale,
        slot: { x: bandOrigin[0] + i * slotW, y: bandOrigin[1], w: slotW, h: bandHeight },
      });
      groups.push(oblique.indicator, oblique.cell);
      if (oblique.hatched) usesHatchPattern = true;
      return;
    }
    const { axis, position } = resolved;
    const min = bbox.min[AXIS_INDEX[axis]];
    const max = bbox.max[AXIS_INDEX[axis]];
    const eps = Math.max((max - min) * 1e-6, 1e-4);
    if (position < min + eps || position > max - eps) {
      throw new KernelError(
        'drawing.section.plane-misses-body',
        `${role}: the cutting plane (axis '${axis}' at ${position}) does not pass through the body ` +
          `(bounding range [${min}, ${max}]).`,
        undefined,
        "Move the plane origin so it passes through the body's interior, or check the plane normal.",
      );
    }

    const info = AXIS_INFO[axis];
    groups.push(cuttingPlaneIndicatorSvg(axis, position, mainViewPlacements[info.parentView], mainScale, spec.label));

    const kept = buildKeptHalf(compound, axis, position);
    const keptShape = kept.getReplicadShape();
    const camera = makeDrawingCamera(info.sectionView);
    const raw = projectShapeForDrawing(keptShape, camera, { withHidden: true });
    const [vSharp, vOutline, vSmooth, hSharp, hOutline] = dedupPolylineClasses([
      raw.visibleSharp, raw.visibleOutline, raw.visibleSmooth, raw.hiddenSharp, raw.hiddenOutline,
    ]);
    const visible: Polyline2[] = [...vSharp, ...vOutline];
    const tangent: Polyline2[] = vSmooth;
    const hidden: Polyline2[] = [...hSharp, ...hOutline];
    const projBox: ViewBox2 = viewBoxOfPolylines([visible, tangent, hidden]) ?? { x: 0, y: 0, w: 1, h: 1 };

    const availW = slotW - 2 * CELL_PAD;
    const availH = bandHeight - 2 * CELL_PAD;
    const cellScale = Math.min(
      mainScale,
      projBox.w > 0 ? availW / projBox.w : mainScale,
      projBox.h > 0 ? availH / projBox.h : mainScale,
    );
    const slotX = bandOrigin[0] + i * slotW;
    const cellW = projBox.w * cellScale;
    const cellH = projBox.h * cellScale;
    const sheetX = slotX + (slotW - cellW) / 2;
    const sheetY = bandOrigin[1] + (bandHeight - cellH) / 2;
    const placement: ViewPlacement = {
      tx: sheetX - projBox.x * cellScale,
      ty: sheetY + (projBox.y + projBox.h) * cellScale,
      box: { x: sheetX, y: sheetY, w: cellW, h: cellH },
    };

    // Cut cross-section face(s): the true hatch boundary.
    const faceQuery = axis === 'x'
      ? { atX: position, ofSurfaceType: 'PLANE' as const }
      : axis === 'y'
        ? { atY: position, ofSurfaceType: 'PLANE' as const }
        : { atZ: position, ofSurfaceType: 'PLANE' as const };
    const cutFaces = resolveFaceQuery(kept, faceQuery);
    const hatchPaths: string[] = [];
    for (const face of cutFaces) {
      // Both `Face.outerWire()` and `Face.innerWires()` self-delete `this`
      // (replicad frees the underlying OCCT handle once the wire is
      // extracted) — call each on its own clone so the second call doesn't
      // find the face already disposed.
      const outer = wireToSheetPath(face.clone().outerWire(), info.sectionView, placement, cellScale);
      const inner = face.clone().innerWires().map(w => wireToSheetPath(w, info.sectionView, placement, cellScale));
      hatchPaths.push([outer, ...inner].join(' '));
    }
    if (hatchPaths.length > 0) usesHatchPattern = true;
    const hatchGroup = hatchPaths.length === 0
      ? ''
      : `<g class="section-hatch">${hatchPaths
        .map(d => `<path d="${d}" fill="url(#kc-section-hatch)" fill-rule="evenodd" stroke="none"/>`)
        .join('')}</g>`;

    const pathGroup = (cls: string, style: string, polylines: Polyline2[]): string => {
      const paths = polylines
        .map(pl => {
          const d = pl.map(([mx, my], k) => {
            const [sx, sy] = [placement.tx + mx * cellScale, placement.ty - my * cellScale];
            return `${k === 0 ? 'M' : 'L'} ${round3(sx)} ${round3(sy)}`;
          }).join(' ');
          return `<path d="${d}"/>`;
        })
        .join('');
      return `<g class="${cls}" ${style}>${paths}</g>`;
    };

    const caption =
      `<text class="view-label" x="${round3(placement.box.x + placement.box.w / 2)}" ` +
      `y="${round3(placement.box.y + placement.box.h + 6)}" font-size="2.6" text-anchor="middle" ` +
      `fill="#555" stroke="none">SECTION ${spec.label}-${spec.label}</text>`;

    groups.push(
      `<g id="view-section-${spec.label}" data-view="section-${spec.label}" fill="none" stroke="#000" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      hatchGroup +
      pathGroup('hidden', 'stroke-width="0.25" stroke-dasharray="1.6 0.8"', hidden) +
      pathGroup('tangent', 'stroke-width="0.13"', tangent) +
      pathGroup('visible', 'stroke-width="0.5"', visible) +
      caption +
      `</g>`,
    );
  });

  return { svg: groups.join(''), usesHatchPattern };
}

// ---------------------------------------------------------------------------
// Oblique cutting planes
// ---------------------------------------------------------------------------

type V3 = [number, number, number];
const dot3 = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: readonly number[], b: readonly number[]): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const sub3 = (a: readonly number[], b: readonly number[]): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a: readonly number[], k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const unit3 = (a: readonly number[]): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [a[0], a[1], a[2]];
};

/**
 * Screen basis of the auxiliary view that looks straight at an oblique cut.
 * The camera direction is the plane normal (viewer on the +normal side);
 * screen-up is world Z projected into the plane, or world Y when the plane is
 * within ~6° of horizontal. For the three axis normals this reproduces the
 * top / front / left cameras exactly, so a near-axis oblique cell reads the
 * same way the standard section cell would.
 */
export function obliqueSectionBasis(normal: readonly number[]): { direction: V3; x: V3; y: V3 } {
  const n = unit3(normal);
  let up = sub3([0, 0, 1], scale3(n, n[2]));
  if (Math.hypot(up[0], up[1], up[2]) < 0.1) up = sub3([0, 1, 0], scale3(n, n[1]));
  up = unit3(up);
  return { direction: n, x: unit3(cross3(up, n)), y: up };
}

/** Keep the half of `compound` behind the plane (the −normal side): a
 *  half-space box rotated so one face lies on the plane, centred on the
 *  body's projection onto the plane so it covers the body in-plane. */
function buildObliqueKeptHalf(compound: OcctBackend, origin: Vec3, n: V3): OcctBackend {
  const bb = compound.boundingBox();
  const diag = Math.hypot(
    bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2],
  ) || 1;
  const BIG = diag * 4 + 1000;
  const centre: V3 = [
    (bb.min[0] + bb.max[0]) / 2,
    (bb.min[1] + bb.max[1]) / 2,
    (bb.min[2] + bb.max[2]) / 2,
  ];
  const onPlane = sub3(centre, scale3(n, dot3(sub3(centre, origin), n)));
  const boxCentre = sub3(onPlane, scale3(n, BIG / 2));
  let box = OcctBackend.box(BIG, BIG, BIG, true);
  const axis = cross3([0, 0, 1], n);
  const sin = Math.hypot(axis[0], axis[1], axis[2]);
  if (sin > 1e-12) {
    box = box.rotate(unit3(axis), (Math.atan2(sin, n[2]) * 180) / Math.PI);
  }
  box = box.translate(boxCentre[0], boxCentre[1], boxCentre[2]);
  return compound.intersect(box);
}

interface EdgeLike {
  geomType?: string;
  pointAt(t: number): { x: number; y: number; z: number };
}

/**
 * Closed polygon of a face wire in model space. Each edge is sampled on its
 * own (straight edges contribute exactly their endpoints, so corners are kept
 * exactly) and the samples are chained end-to-start, because a wire's edge
 * list is not guaranteed to be ordered or consistently oriented.
 */
function sampleWireLoop(wire: { edges: EdgeLike[] }, chainTol: number): V3[] {
  const runs: V3[][] = wire.edges.map(e => {
    const n = e.geomType === 'LINE' ? 1 : 48;
    const pts: V3[] = [];
    for (let k = 0; k <= n; k++) {
      const p = e.pointAt(k / n);
      pts.push([p.x, p.y, p.z]);
    }
    return pts;
  });
  if (runs.length === 0) return [];
  const close = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) <= chainTol;
  const used = new Array<boolean>(runs.length).fill(false);
  used[0] = true;
  const loop: V3[] = [...runs[0]];
  for (let step = 1; step < runs.length; step++) {
    const tail = loop[loop.length - 1];
    let next = -1;
    let reversed = false;
    for (let j = 0; j < runs.length; j++) {
      if (used[j]) continue;
      if (close(runs[j][0], tail)) { next = j; break; }
      if (close(runs[j][runs[j].length - 1], tail)) { next = j; reversed = true; break; }
    }
    if (next === -1) {
      next = used.indexOf(false);
    }
    used[next] = true;
    const run = reversed ? [...runs[next]].reverse() : runs[next];
    loop.push(...run.slice(close(run[0], tail) ? 1 : 0));
  }
  if (loop.length > 1 && close(loop[0], loop[loop.length - 1])) loop.pop();
  return loop;
}

/** Clip the infinite sheet line `q + s·t` to a box; `null` when it misses. */
function clipLineToBox(
  q: Pt2,
  t: Pt2,
  box: { x: number; y: number; w: number; h: number },
): [number, number] | null {
  let s0 = -Infinity;
  let s1 = Infinity;
  const bounds: Array<[number, number, number]> = [
    [q[0], t[0], box.x], [q[0], t[0], box.x + box.w],
    [q[1], t[1], box.y], [q[1], t[1], box.y + box.h],
  ];
  for (let k = 0; k < 4; k += 2) {
    const [p, d, lo] = bounds[k];
    const hi = bounds[k + 1][2];
    if (Math.abs(d) < 1e-12) {
      if (p < lo || p > hi) return null;
      continue;
    }
    const a = (lo - p) / d;
    const b = (hi - p) / d;
    s0 = Math.max(s0, Math.min(a, b));
    s1 = Math.min(s1, Math.max(a, b));
  }
  return s0 <= s1 ? [s0, s1] : null;
}

/**
 * Cutting-plane indicator for an oblique plane: its trace through the body's
 * mid-depth on the standard view closest to edge-on, overshooting the view's
 * outline, with arrows perpendicular to the trace pointing along the viewing
 * direction (−normal) and the section letter beyond each arrow.
 */
function obliqueIndicatorSvg(
  origin: Vec3,
  n: V3,
  bodyCentre: V3,
  placements: Record<DrawingViewName, ViewPlacement>,
  mainScale: number,
  label: string,
): string {
  let parent: DrawingViewName = 'front';
  let best = Infinity;
  for (const v of ['front', 'top', 'left'] as const) {
    const b = viewBasis(v);
    const d = cross3(b.x, b.y);
    const c = Math.abs(dot3(d, n));
    if (c < best - 1e-9) { best = c; parent = v; }
  }
  const basis = viewBasis(parent);
  const d = cross3(basis.x, basis.y);
  const k = dot3(n, d);
  const a = dot3(sub3(origin, bodyCentre), n) / (1 - k * k);
  const q3: V3 = [
    bodyCentre[0] + a * n[0] - a * k * d[0],
    bodyCentre[1] + a * n[1] - a * k * d[1],
    bodyCentre[2] + a * n[2] - a * k * d[2],
  ];
  const t3 = unit3(cross3(n, d));
  const placement = placements[parent];
  const q = modelToSheet(q3, parent, placement, mainScale);
  const tRaw: Pt2 = [dot3(t3, basis.x), -dot3(t3, basis.y)];
  const tLen = Math.hypot(tRaw[0], tRaw[1]) || 1;
  const t: Pt2 = [tRaw[0] / tLen, tRaw[1] / tLen];
  const box = placement.box;
  const span = clipLineToBox(q, t, box) ?? (() => {
    const half = Math.hypot(box.w, box.h) / 2;
    return [-half, half] as [number, number];
  })();
  const p0: Pt2 = [q[0] + t[0] * (span[0] - OVERSHOOT), q[1] + t[1] * (span[0] - OVERSHOOT)];
  const p1: Pt2 = [q[0] + t[0] * (span[1] + OVERSHOOT), q[1] + t[1] * (span[1] + OVERSHOOT)];

  // Viewing direction (−normal) in sheet space, made perpendicular to the trace.
  let sx = -dot3(n, basis.x);
  let sy = dot3(n, basis.y);
  const along = sx * t[0] + sy * t[1];
  sx -= along * t[0];
  sy -= along * t[1];
  let sLen = Math.hypot(sx, sy);
  if (sLen < 1e-9) { sx = -t[1]; sy = t[0]; sLen = 1; }
  sx /= sLen;
  sy /= sLen;

  const parts: string[] = [
    `<line x1="${round3(p0[0])}" y1="${round3(p0[1])}" x2="${round3(p1[0])}" y2="${round3(p1[1])}"/>`,
    arrowhead(p0, sx, sy),
    arrowhead(p1, sx, sy),
  ];
  for (const p of [p0, p1]) {
    parts.push(
      `<text x="${round3(p[0] + sx * 5)}" y="${round3(p[1] + sy * 5 + 1.2)}" font-size="3.6" ` +
      `text-anchor="middle" fill="#000" stroke="none">${label}</text>`,
    );
  }
  return (
    `<g class="section-plane-indicator" data-parent-view="${parent}" fill="none" stroke="#000" ` +
    `stroke-width="0.3" stroke-dasharray="9 1.4 1.4 1.4">${parts.join('')}</g>`
  );
}

interface ObliqueSectionInput {
  compound: OcctBackend;
  spec: DrawingSectionSpec;
  role: string;
  plane: { origin: Vec3; normal: Vec3 };
  mainViewPlacements: Record<DrawingViewName, ViewPlacement>;
  mainScale: number;
  slot: { x: number; y: number; w: number; h: number };
}

function renderObliqueSection(input: ObliqueSectionInput): { indicator: string; cell: string; hatched: boolean } {
  const { compound, spec, role, mainViewPlacements, mainScale, slot } = input;
  const origin = input.plane.origin;
  const n = unit3(input.plane.normal);
  const bb = compound.boundingBox();

  // A plane misses the body when every bounding-box corner lies on one side.
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of [bb.min[0], bb.max[0]]) {
    for (const y of [bb.min[1], bb.max[1]]) {
      for (const z of [bb.min[2], bb.max[2]]) {
        const v = dot3([x, y, z], n);
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  }
  const at = dot3(origin, n);
  const eps = Math.max((hi - lo) * 1e-6, 1e-4);
  if (at < lo + eps || at > hi - eps) {
    throw new KernelError(
      'drawing.section.plane-misses-body',
      `${role}: the cutting plane (normal ${JSON.stringify(n.map(v => Math.round(v * 1e4) / 1e4))} through ` +
        `${JSON.stringify(origin)}) does not pass through the body (offset ${round3(at)}, body spans ` +
        `[${round3(lo)}, ${round3(hi)}] along the normal).`,
      undefined,
      "Move the plane origin so it passes through the body's interior, or check the plane normal.",
    );
  }

  const bodyCentre: V3 = [
    (bb.min[0] + bb.max[0]) / 2,
    (bb.min[1] + bb.max[1]) / 2,
    (bb.min[2] + bb.max[2]) / 2,
  ];
  const indicator = obliqueIndicatorSvg(origin, n, bodyCentre, mainViewPlacements, mainScale, spec.label);

  const kept = buildObliqueKeptHalf(compound, origin, n);
  const keptShape = kept.getReplicadShape();
  const basis = obliqueSectionBasis(n);
  const raw = projectShapeForDrawing(keptShape, makeAuxiliaryCamera(basis.direction, basis.x), { withHidden: true });
  const [vSharp, vOutline, vSmooth, hSharp, hOutline] = dedupPolylineClasses([
    raw.visibleSharp, raw.visibleOutline, raw.visibleSmooth, raw.hiddenSharp, raw.hiddenOutline,
  ]);
  const visible: Polyline2[] = [...vSharp, ...vOutline];
  const tangent: Polyline2[] = vSmooth;
  const hidden: Polyline2[] = [...hSharp, ...hOutline];
  const projBox: ViewBox2 = viewBoxOfPolylines([visible, tangent, hidden]) ?? { x: 0, y: 0, w: 1, h: 1 };

  const cellScale = Math.min(
    mainScale,
    projBox.w > 0 ? (slot.w - 2 * CELL_PAD) / projBox.w : mainScale,
    projBox.h > 0 ? (slot.h - 2 * CELL_PAD) / projBox.h : mainScale,
  );
  const cellW = projBox.w * cellScale;
  const cellH = projBox.h * cellScale;
  const sheetX = slot.x + (slot.w - cellW) / 2;
  const sheetY = slot.y + (slot.h - cellH) / 2;
  const tx = sheetX - projBox.x * cellScale;
  const ty = sheetY + (projBox.y + projBox.h) * cellScale;
  const toSheet = (mx: number, my: number): string =>
    `${round3(tx + mx * cellScale)} ${round3(ty - my * cellScale)}`;

  // True cross-section: planar faces of the kept half lying on the cutting
  // plane with their outward normal along +normal (the cut face looks back
  // at the viewer).
  const diag = Math.hypot(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) || 1;
  const planeTol = Math.max(diag * 1e-6, 1e-3);
  const chainTol = Math.max(diag * 1e-6, 1e-4);
  const faces = (keptShape as unknown as { faces: Face[] }).faces;
  const hatchPaths: string[] = [];
  for (const face of faces) {
    if ((face as unknown as { geomType?: string }).geomType !== 'PLANE') continue;
    const fn = face.normalAt();
    if (dot3([fn.x, fn.y, fn.z], n) < 0.999) continue;
    const c = face.center;
    if (Math.abs(dot3(sub3([c.x, c.y, c.z], origin), n)) > planeTol) continue;
    const loops = [
      sampleWireLoop(face.clone().outerWire() as unknown as { edges: EdgeLike[] }, chainTol),
      ...face.clone().innerWires().map(w => sampleWireLoop(w as unknown as { edges: EdgeLike[] }, chainTol)),
    ];
    hatchPaths.push(loops
      .filter(loop => loop.length >= 3)
      .map(loop => loop
        .map((p, k) => `${k === 0 ? 'M' : 'L'} ${toSheet(dot3(p, basis.x), dot3(p, basis.y))}`)
        .join(' ') + ' Z')
      .join(' '));
  }
  const hatchGroup = hatchPaths.length === 0
    ? ''
    : `<g class="section-hatch">${hatchPaths
      .map(dPath => `<path d="${dPath}" fill="url(#kc-section-hatch)" fill-rule="evenodd" stroke="none"/>`)
      .join('')}</g>`;

  const pathGroup = (cls: string, style: string, polylines: Polyline2[]): string =>
    `<g class="${cls}" ${style}>${polylines
      .map(pl => `<path d="${pl.map(([mx, my], k) => `${k === 0 ? 'M' : 'L'} ${toSheet(mx, my)}`).join(' ')}"/>`)
      .join('')}</g>`;

  const caption =
    `<text class="view-label" x="${round3(sheetX + cellW / 2)}" ` +
    `y="${round3(sheetY + cellH + 6)}" font-size="2.6" text-anchor="middle" ` +
    `fill="#555" stroke="none">SECTION ${spec.label}-${spec.label}</text>`;

  const cell =
    `<g id="view-section-${spec.label}" data-view="section-${spec.label}" ` +
    `data-kc-section-normal="${n.map(round3).join(' ')}" data-kc-cell-scale="${round3(cellScale)}" ` +
    `fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">` +
    hatchGroup +
    pathGroup('hidden', 'stroke-width="0.25" stroke-dasharray="1.6 0.8"', hidden) +
    pathGroup('tangent', 'stroke-width="0.13"', tangent) +
    pathGroup('visible', 'stroke-width="0.5"', visible) +
    caption +
    `</g>`;

  return { indicator, cell, hatched: hatchPaths.length > 0 };
}
