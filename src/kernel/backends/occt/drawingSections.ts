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
// Scope: only axis-aligned cutting planes (`'xy'|'xz'|'yz'`, or an
// `{ origin, normal }` whose normal is within ~1° of a world axis) are
// supported. An oblique plane fails loudly (`feature.invalid-args`) rather
// than being silently approximated — general-normal sections are a bigger
// change (the section camera and the cutting-plane indicator line both
// assume an axis-aligned basis) and are out of scope for this slice.
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
import {
  makeDrawingCamera,
  projectShapeForDrawing,
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

function resolveAxisAndPosition(
  plane: SectionPlane,
  bbox: { min: Vec3; max: Vec3 },
  role: string,
): { axis: Axis; position: number } {
  if (plane === 'xy') return { axis: 'z', position: (bbox.min[2] + bbox.max[2]) / 2 };
  if (plane === 'xz') return { axis: 'y', position: (bbox.min[1] + bbox.max[1]) / 2 };
  if (plane === 'yz') return { axis: 'x', position: (bbox.min[0] + bbox.max[0]) / 2 };
  const { origin, normal } = plane;
  const mag = Math.hypot(normal[0], normal[1], normal[2]);
  if (mag < 1e-9) {
    throw new KernelError(
      'feature.invalid-args',
      `${role}: plane.normal must be a non-zero vector.`,
      undefined,
      'Pass a non-zero [x, y, z] normal.',
    );
  }
  const [nx, ny, nz] = [Math.abs(normal[0]) / mag, Math.abs(normal[1]) / mag, Math.abs(normal[2]) / mag];
  const AXIS_COS_MIN = 0.999; // ~2.5 degrees off-axis
  if (nx > AXIS_COS_MIN) return { axis: 'x', position: origin[0] };
  if (ny > AXIS_COS_MIN) return { axis: 'y', position: origin[1] };
  if (nz > AXIS_COS_MIN) return { axis: 'z', position: origin[2] };
  throw new KernelError(
    'feature.invalid-args',
    `${role}: plane.normal ${JSON.stringify(normal)} is not axis-aligned. Only cutting planes whose ` +
      'normal is within ~2.5° of a world axis are supported.',
    undefined,
    "Use plane: 'xy' | 'xz' | 'yz', or an { origin, normal } form whose normal points along ±X, ±Y or ±Z.",
  );
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
    const { axis, position } = resolveAxisAndPosition(spec.plane, bbox, role);
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
