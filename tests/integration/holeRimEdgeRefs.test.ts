// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// `hole` and `holes` name the circular edges where the bore meets the body:
// `entry-rim`, `exit-rim` (through holes) and `floor-rim` (blind holes). Before,
// they wrote face refs only, so `chamfer(r, { face: 'pilot.entry-rim' })`, the
// usual way to break the edge of a drilled hole, failed with
// `feature.face-ref.not-resolvable` and the v0.6.3 created-refs demo errored.

import { describe, it, expect, beforeAll } from 'vitest';
import { getOC, type Edge } from 'replicad';
import { initOcct, type OcctBackend } from '../../src/kernel/backends/occt/occtBackend';
import { isValidShape } from '../../src/kernel/backends/occt/booleanRecovery';
import { runScript } from '../../src/modeling/runtime/runScript';
import { RecomputeEngine } from '../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../src/modeling/backends/occt/occtLowerer';
import type { CompilerDiagnostic } from '../../src/shared/diagnostics/diagnostic';
import { readFileSync } from 'node:fs';

async function lower(code: string): Promise<{ solid?: OcctBackend; errors: CompilerDiagnostic[] }> {
  const run = await runScript({ code, fileName: 'test.kcad.ts' });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });
  const errors = (r.diagnostics as CompilerDiagnostic[]).filter((d) => d.severity === 'error');
  const solid = r.shapes.get(run.records[run.records.length - 1].id) as OcctBackend | undefined;
  return { solid, errors };
}

/** Labelled edges present on the solid, as { label, z, radius } about the axis (cx, cy). */
function rims(solid: OcctBackend, cx = 0, cy = 0): { label: string; z: number; r: number }[] {
  const edges = (solid.getReplicadShape() as unknown as { edges: Edge[] }).edges;
  const out = new Map<string, { label: string; z: number; r: number }>();
  for (const edge of edges) {
    const hash = ((edge as unknown as { wrapped: { HashCode(n: number): number } }).wrapped.HashCode(2147483647)).toString(16);
    const label = solid.edgeHistoryMap?.get(hash)?.labelName;
    if (!label || !label.endsWith('-rim') || out.has(hash)) continue;
    const p = edge.startPoint;
    out.set(hash, { label, z: round(p.z), r: round(Math.hypot(p.x - cx, p.y - cy)) });
  }
  return [...out.values()].sort((a, b) => a.label.localeCompare(b.label) || a.z - b.z);
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
const valid = (s: OcctBackend) => isValidShape(getOC(), s.getReplicadShape().wrapped);

// Box 100 × 60 × 20 is centred in X/Y by the hole (u, v) frame of 'top'; the
// top face centre is (50, 30, 20).
const BLOCK = `box(100, 60, 20)`;
const CX = 50;
const CY = 30;
// A 45° chamfer of leg c on a circular edge of radius r removes a triangular
// ring: area c²/2 at centroid radius r + c/3 (Pappus).
const chamferRing = (r: number, c: number) => 2 * Math.PI * (r + c / 3) * (c * c) / 2;
// Area centroid of the chamfer cone (frustum, radii r → r + c over height c),
// measured from its narrow end.
const coneCentroid = (r: number, c: number) => round((c * (r + 2 * (r + c))) / (3 * (2 * r + c)));
const BOX = 100 * 60 * 20;
const BORE6 = Math.PI * 9 * 20;

describe('hole rim edge refs', () => {
  beforeAll(async () => {
    await initOcct();
  }, 60_000);

  it('a through hole names its entry and exit rims', async () => {
    const { solid, errors } = await lower(
      `return ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thru' });`,
    );
    expect(errors).toEqual([]);
    expect(rims(solid!, CX, CY)).toEqual([
      { label: 'entry-rim', z: 20, r: 3 },
      { label: 'exit-rim', z: 0, r: 3 },
    ]);
  });

  it('chamfers only the entry rim by name', async () => {
    const { solid, errors } = await lower(
      `return ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thru' })` +
        `.chamfer(0.5, { face: 'thru.entry-rim' });`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    expect(solid!.volume()).toBeCloseTo(BOX - BORE6 - chamferRing(3, 0.5), 3);
    // The chamfer cone sits at the top, not the bottom.
    const cones = solid!.getReplicadShape().faces.filter((f) => f.geomType === 'CONE');
    expect(cones.map((f) => round(f.center.z))).toEqual([round(19.5 + coneCentroid(3, 0.5))]);
  });

  it('chamfers the exit rim at the bottom', async () => {
    const { solid, errors } = await lower(
      `return ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'thru' })` +
        `.chamfer(0.5, { face: 'thru.exit-rim' });`,
    );
    expect(errors).toEqual([]);
    expect(solid!.volume()).toBeCloseTo(BOX - BORE6 - chamferRing(3, 0.5), 3);
    const cones = solid!.getReplicadShape().faces.filter((f) => f.geomType === 'CONE');
    expect(cones.map((f) => round(0.5 - f.center.z))).toEqual([coneCentroid(3, 0.5)]);
  });

  it('a blind hole names its entry and floor rims', async () => {
    const { solid, errors } = await lower(
      `return ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 8, name: 'pilot' });`,
    );
    expect(errors).toEqual([]);
    expect(rims(solid!, CX, CY)).toEqual([
      { label: 'entry-rim', z: 20, r: 3 },
      { label: 'floor-rim', z: 12, r: 3 },
    ]);
  });

  it('a counterbored hole puts the entry rim on the counterbore', async () => {
    const { solid, errors } = await lower(
      `return ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', ` +
        `counterbore: { diameter: 11, depth: 6 }, name: 'cb' });`,
    );
    expect(errors).toEqual([]);
    expect(rims(solid!, CX, CY)).toEqual([
      { label: 'entry-rim', z: 20, r: 5.5 },
      { label: 'exit-rim', z: 0, r: 3 },
    ]);
  });

  it('holes() names one entry rim per position, and the ordinal selector reaches them', async () => {
    const { solid, errors } = await lower(
      `return ${BLOCK}.holes('top', { positions: [{ u: -20, v: 0 }, { u: 20, v: 0 }], diameter: 6, depth: 'through' })` +
        `.chamfer(0.5, { face: 'holes1.entry-rim' });`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    expect(solid!.volume()).toBeCloseTo(BOX - 2 * BORE6 - 2 * chamferRing(3, 0.5), 3);
  });

  it('a label query chamfers the entry rims of every hole on the part at once', async () => {
    const { solid, errors } = await lower(
      `const p = ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 'through', name: 'a' })` +
        `.hole('top', { u: 30, v: 0, diameter: 6, depth: 'through', name: 'b' });` +
        `return p.chamfer(0.5, kc.q.edge(kc.q.derivedFrom(p.id)).and(kc.q.withLabel('entry-rim')));`,
    );
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
    expect(solid!.volume()).toBeCloseTo(BOX - 2 * BORE6 - 2 * chamferRing(3, 0.5), 3);
  });

  it('an unknown slot lists the rim refs in the hint', async () => {
    const { errors } = await lower(
      `return ${BLOCK}.hole('top', { u: 0, v: 0, diameter: 6, depth: 8, name: 'pilot' })` +
        `.chamfer(0.5, { face: 'pilot.rim' });`,
    );
    expect(errors.map((d) => d.code)).toEqual(['feature.face-ref.not-resolvable']);
    expect(errors[0].hint).toContain('entry-rim');
    expect(errors[0].hint).toContain('floor-rim');
  });

  it('the v0.6.3 created-refs demo builds again', async () => {
    const code = readFileSync('docs/demos/v0.6.3/v0.3-created-refs/source.kcad.ts', 'utf8');
    const { solid, errors } = await lower(code);
    expect(errors).toEqual([]);
    expect(valid(solid!)).toBe(true);
  });
});
