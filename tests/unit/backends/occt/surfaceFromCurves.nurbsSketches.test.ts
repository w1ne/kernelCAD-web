// tests/unit/backends/occt/surfaceFromCurves.nurbsSketches.test.ts
//
// Regression + new-path coverage for `buildSkinnedSurface` (the OCCT helper
// behind `surfaceFromCurves`). Slice D Task 3 introduced NURBS-bearing
// sketches whose `_drawing` is null (the replicad 2D pen can't construct
// `spline` / `nurbsSegment` / `hermiteG2_2d` edges) — those sketches carry
// `_hasNurbs = true` plus the raw `_commands`, and the OCCT consumers
// dispatch to `buildNurbsSketchOnPlane`.
//
// Before this fix `buildSkinnedSurface` did a raw `s._drawing` cast and
// would dereference undefined on the new NURBS path, throwing an unhelpful
// `TypeError: Cannot read properties of null/undefined`. The fix branches
// on `_hasNurbs` and lifts the section via `buildNurbsSketchOnPlane`,
// mirroring the existing `OcctBackend.loftFromSketches` dispatch.
//
// Cases:
//   1. All pen sketches (regression — must keep working unchanged).
//   2. All NURBS sketches (the previously-broken path).
//   3. Mixed pen + NURBS — exercises the per-section branch in isolation.
//
// Each case calls `buildSkinnedSurface(sections, planes)` then `thickenFace`
// to assert the resulting skinned surface lifts cleanly to a positive-volume
// closed solid.

import { describe, it, expect, beforeAll } from 'vitest';
import { OcctBackend, initOcct } from '../../../../src/kernel/backends/occt/occtBackend';
import { buildSkinnedSurface, thickenFace } from '../../../../src/kernel/backends/occt/nurbsSurfaceLowerer';
import type { SketchCommand } from '../../../../src/shared/capture/sketchCommand';
import { toParam } from '../../../../src/shared/runtime/editableHelpers';

const mm = (n: number) => toParam(n, 'mm');
const ul = (n: number) => toParam(n, 'unitless');

// Pen-only square (4×4, centered at origin) — lowered via the replicad pen
// path, populates `_drawing`.
const penSquare4x4: SketchCommand[] = [
  { kind: 'moveTo', x: mm(-2), y: mm(-2) },
  { kind: 'lineTo', x: mm(2), y: mm(-2) },
  { kind: 'lineTo', x: mm(2), y: mm(2) },
  { kind: 'lineTo', x: mm(-2), y: mm(2) },
  { kind: 'close' },
];

const penSquare6x6: SketchCommand[] = [
  { kind: 'moveTo', x: mm(-3), y: mm(-3) },
  { kind: 'lineTo', x: mm(3), y: mm(-3) },
  { kind: 'lineTo', x: mm(3), y: mm(3) },
  { kind: 'lineTo', x: mm(-3), y: mm(3) },
  { kind: 'close' },
];

// NURBS-bearing section: a closed loop comprised of two `spline` segments —
// a top arc (lifting up to +y peak) and a bottom arc (mirrored to -y peak),
// closing back to the start. The commands array includes a NURBS segment, so
// `fromSketchCommands` flips `_hasNurbs = true` and leaves `_drawing` null.
//
// Both section A and section B share identical wire topology (two spline
// edges) so `BRepOffsetAPI_ThruSections` can correspond their edges
// cleanly across the loft. They differ only in radius `r`.
function nurbsEllipseCommands(r: number): SketchCommand[] {
  return [
    { kind: 'moveTo', x: mm(-r), y: mm(0) },
    {
      kind: 'spline',
      points: [
        { x: mm(-r), y: mm(0) },
        { x: mm(-r * 0.5), y: mm(r * 0.6) },
        { x: mm(r * 0.5), y: mm(r * 0.6) },
        { x: mm(r), y: mm(0) },
      ],
    },
    {
      kind: 'spline',
      points: [
        { x: mm(r), y: mm(0) },
        { x: mm(r * 0.5), y: mm(-r * 0.6) },
        { x: mm(-r * 0.5), y: mm(-r * 0.6) },
        { x: mm(-r), y: mm(0) },
      ],
    },
    { kind: 'close' },
  ];
}

// A NURBS variant using `nurbsSegment` instead (same topology — two
// closed NURBS edges) so we exercise a different Slice D segment kind.
function nurbsSegmentEllipseCommands(r: number): SketchCommand[] {
  return [
    { kind: 'moveTo', x: mm(-r), y: mm(0) },
    {
      kind: 'nurbsSegment',
      controlPoints: [
        { x: mm(-r), y: mm(0) },
        { x: mm(-r * 0.5), y: mm(r * 0.8) },
        { x: mm(r * 0.5), y: mm(r * 0.8) },
        { x: mm(r), y: mm(0) },
      ],
      degree: ul(3),
    },
    {
      kind: 'nurbsSegment',
      controlPoints: [
        { x: mm(r), y: mm(0) },
        { x: mm(r * 0.5), y: mm(-r * 0.8) },
        { x: mm(-r * 0.5), y: mm(-r * 0.8) },
        { x: mm(-r), y: mm(0) },
      ],
      degree: ul(3),
    },
    { kind: 'close' },
  ];
}

describe('buildSkinnedSurface — NURBS-bearing sketches', () => {
  beforeAll(async () => { await initOcct(); });

  it('regression: all pen sketches still produce a positive-volume thickened solid', () => {
    const s1 = OcctBackend.fromSketchCommands(penSquare4x4);
    const s2 = OcctBackend.fromSketchCommands(penSquare6x6);
    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 20] },
    ];
    const surface = buildSkinnedSurface([s1, s2], planes);
    expect(surface.kind).toBe('skinned');
    const thickened = thickenFace(surface, 2);
    const v = thickened.volume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('NURBS sketches lift via buildNurbsSketchOnPlane and produce a positive-volume thickened solid', () => {
    const s1 = OcctBackend.fromSketchCommands(nurbsEllipseCommands(5));
    const s2 = OcctBackend.fromSketchCommands(nurbsSegmentEllipseCommands(8));
    // Sanity: these are NURBS-bearing — `_drawing` is null on both.
    expect((s1 as unknown as { _drawing: unknown })._drawing).toBeNull();
    expect((s2 as unknown as { _drawing: unknown })._drawing).toBeNull();
    expect((s1 as unknown as { _hasNurbs: boolean })._hasNurbs).toBe(true);
    expect((s2 as unknown as { _hasNurbs: boolean })._hasNurbs).toBe(true);

    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 15] },
    ];
    const surface = buildSkinnedSurface([s1, s2], planes);
    expect(surface.kind).toBe('skinned');
    const thickened = thickenFace(surface, 0.5);
    const v = thickened.volume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });

  it('mixed pen + NURBS sections lift cleanly and thicken to a positive-volume solid', () => {
    // Section 0 is a pen-only square; section 1 is a NURBS ellipse.
    // Both are closed loops, suitable for `BRepOffsetAPI_ThruSections`.
    const s1 = OcctBackend.fromSketchCommands(penSquare4x4);
    const s2 = OcctBackend.fromSketchCommands(nurbsEllipseCommands(5));
    expect((s1 as unknown as { _hasNurbs: boolean })._hasNurbs).toBe(false);
    expect((s2 as unknown as { _hasNurbs: boolean })._hasNurbs).toBe(true);

    const planes: Array<{ plane: 'XY'; origin: [number, number, number] }> = [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, 15] },
    ];
    const surface = buildSkinnedSurface([s1, s2], planes);
    expect(surface.kind).toBe('skinned');
    const thickened = thickenFace(surface, 0.5);
    const v = thickened.volume();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });
});
