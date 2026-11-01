// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Spike (b2b wedge A): the enclosure generated from a board description must
// DERIVE its geometry from that board. Every number asserted here is measured
// on the built BREP with probe booleans, and compared against expectations
// computed in this file from the board JSON alone, not read back from the
// script's own variables.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initOcct, OcctBackend } from '../../../src/kernel/backends/occt/occtBackend';
import type { ShapeBackend } from '../../../src/kernel/backends/backend';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { enclosureSource } from '../../../spike-b2b/enclosure/generate';

interface Comp { ref: string; x: number; y: number; w: number; d: number; h: number; side: 'top' | 'bottom'; port?: boolean }
interface Board { name: string; thickness: number; outline: [number, number][]; holes: { x: number; y: number; d: number }[]; components: Comp[] }

// Knob defaults in enclosure.kcad.ts. The test owns these numbers.
const WALL = 2.0;
const CLEAR = 0.5;
const HEADROOM = 3.0;
const LIP_DEPTH = 1.0;
const SKIRT_H = 2.0;

const BOARDS = ['devboard-65x30', 'controller-100x60'].map(
  n => JSON.parse(readFileSync(`spike-b2b/enclosure/boards/${n}.json`, 'utf8')) as Board,
);

function expected(board: Board) {
  const xs = board.outline.map(p => p[0]);
  const ys = board.outline.map(p => p[1]);
  const bb = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const maxTop = Math.max(0, ...board.components.filter(c => c.side === 'top').map(c => c.h));
  const maxBot = Math.max(0, ...board.components.filter(c => c.side === 'bottom').map(c => c.h));
  const m3 = Math.min(...board.holes.map(h => h.d)) >= 3.1;
  const clearD = m3 ? 3.4 : 2.9;
  const pilotD = m3 ? 2.5 : 2.1;
  const bossR = Math.ceil((clearD + 2 * WALL) * 10) / 20;
  const standoffH = Math.max(4, maxBot + CLEAR + 1);
  const boardZ = WALL + standoffH;
  const boardTop = boardZ + board.thickness;
  const wallTop = boardTop + maxTop + HEADROOM;
  return { bb, clearD, pilotD, bossR, boardZ, boardTop, wallTop, lidTop: wallTop + WALL };
}

async function buildPart(board: Board, view: 'base' | 'lid' | 'pcb'): Promise<ShapeBackend> {
  const code = enclosureSource(board, readFileSync('spike-b2b/enclosure/enclosure.kcad.ts', 'utf8'))
    .replace("const VIEW = 'assembly';", `const VIEW = '${view}';`);
  const { evaluation, model } = await evaluateAndBuildScript({ code });
  expect(evaluation.exitCode, JSON.stringify(evaluation.diagnostics)).toBe(0);
  return model!.rootShape!;
}

function boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): ShapeBackend {
  return OcctBackend.box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
}

function common(a: ShapeBackend, b: ShapeBackend): { volume: number; bbox?: { min: number[]; max: number[] } } {
  let r: ShapeBackend;
  try { r = a.intersect(b); } catch { return { volume: 0 }; }
  const volume = r.volume();
  return volume > 1e-6 ? { volume, bbox: r.boundingBox({ exact: true }) } : { volume: 0 };
}

function removed(region: ShapeBackend, part: ShapeBackend): { volume: number; bbox?: { min: number[]; max: number[] } } {
  const r = region.subtract(part);
  const volume = r.volume();
  return volume > 1e-6 ? { volume, bbox: r.boundingBox({ exact: true }) } : { volume: 0 };
}

type Edge = '-X' | '+X' | '-Y' | '+Y';
function nearestEdge(c: Comp, bb: ReturnType<typeof expected>['bb']): Edge {
  const d: [Edge, number][] = [
    ['-X', c.x - c.w / 2 - bb.minX], ['+X', bb.maxX - c.x - c.w / 2],
    ['-Y', c.y - c.d / 2 - bb.minY], ['+Y', bb.maxY - c.y - c.d / 2],
  ];
  return d.sort((a, b) => a[1] - b[1])[0][0];
}

beforeAll(async () => { await initOcct(); }, 60_000);

describe.each(BOARDS)('spike b2b enclosure: $name', board => {
  const e = expected(board);
  let base: ShapeBackend, lid: ShapeBackend, pcb: ShapeBackend;

  beforeAll(async () => {
    base = await buildPart(board, 'base');
    lid = await buildPart(board, 'lid');
    pcb = await buildPart(board, 'pcb');
  }, 300_000);

  it('outer envelope follows outline + clearance + wall', () => {
    const b = base.boundingBox({ exact: true });
    const ports = board.components.filter(c => c.port).map(c => nearestEdge(c, e.bb));
    const grow = (edge: Edge) => CLEAR + WALL + (ports.includes(edge) ? LIP_DEPTH : 0);
    expect(b.min[0]).toBeCloseTo(e.bb.minX - grow('-X'), 2);
    expect(b.max[0]).toBeCloseTo(e.bb.maxX + grow('+X'), 2);
    expect(b.min[1]).toBeCloseTo(e.bb.minY - grow('-Y'), 2);
    expect(b.max[1]).toBeCloseTo(e.bb.maxY + grow('+Y'), 2);
    expect(b.min[2]).toBeCloseTo(0, 3);
    expect(b.max[2]).toBeCloseTo(e.wallTop, 2);
    expect(lid.boundingBox({ exact: true }).max[2]).toBeCloseTo(e.lidTop, 2);
  });

  it('every edge connector has a wall cut-out whose bbox overlaps its footprint, with a collar lip', () => {
    const ports = board.components.filter(c => c.port);
    expect(ports.length).toBeGreaterThan(0);
    for (const c of ports) {
      const edge = nearestEdge(c, e.bb);
      const xEdge = edge === '-X' || edge === '+X';
      const z0 = c.side === 'top' ? e.boardTop : e.boardZ - c.h;
      const z1 = z0 + c.h;
      const a0 = xEdge ? c.y - c.d / 2 : c.x - c.w / 2;
      const a1 = xEdge ? c.y + c.d / 2 : c.x + c.w / 2;
      const inner = { '-X': e.bb.minX - CLEAR, '+X': e.bb.maxX + CLEAR, '-Y': e.bb.minY - CLEAR, '+Y': e.bb.maxY + CLEAR }[edge];
      const s = edge === '-X' || edge === '-Y' ? -1 : 1;
      const outer = inner + s * WALL;
      const band = (n0: number, n1: number, b0: number, b1: number, zz0: number, zz1: number) => {
        const lo = Math.min(n0, n1), hi = Math.max(n0, n1);
        return xEdge ? boxMM(lo, b0, zz0, hi, b1, zz1) : boxMM(b0, lo, zz0, b1, hi, zz1);
      };
      // Wall band around the port (port span +-4 mm, floor to split plane):
      // whatever is missing from it is the cut-out.
      const wallBand = band(inner, outer, a0 - 4, a1 + 4, WALL + 0.01, e.wallTop - 0.01);
      const cut = removed(wallBand, base);
      expect(cut.volume, `${board.name} ${c.ref}: no cut-out in ${edge} wall`).toBeGreaterThan(0);
      const [ca0, ca1] = xEdge ? [cut.bbox!.min[1], cut.bbox!.max[1]] : [cut.bbox!.min[0], cut.bbox!.max[0]];
      // bbox overlaps the connector footprint (along the wall and in Z) ...
      expect(Math.min(ca1, a1) - Math.max(ca0, a0), `${c.ref} along-wall overlap`).toBeGreaterThan(0);
      expect(Math.min(cut.bbox!.max[2], z1) - Math.max(cut.bbox!.min[2], z0), `${c.ref} Z overlap`).toBeGreaterThan(0);
      // ... in fact contains it with exactly `clearance` per side.
      expect(ca0).toBeCloseTo(a0 - CLEAR, 2);
      expect(ca1).toBeCloseTo(a1 + CLEAR, 2);
      expect(cut.bbox!.min[2]).toBeCloseTo(z0 - CLEAR, 2);
      expect(cut.bbox!.max[2]).toBeCloseTo(z1 + CLEAR, 2);
      // The connector's whole cross-section passes the wall: no base material in it.
      expect(common(base, band(inner + s * 0.2, outer + s * (LIP_DEPTH + 0.5), a0, a1, z0, z1)).volume).toBe(0);
      // Collar: material proud of the outer face around the opening.
      const collar = common(base, band(outer + s * 0.01, outer + s * LIP_DEPTH, a0 - 4, a1 + 4, 0, e.wallTop));
      expect(collar.volume, `${c.ref} collar`).toBeGreaterThan(0);
      expect(collar.bbox!.max[2]).toBeGreaterThan(z1 + CLEAR);
      expect(collar.bbox!.min[2]).toBeLessThan(z0 - CLEAR);
    }
  });

  it('wall, floor and lid thickness equal the wall param (1 x 1 mm probe columns)', () => {
    const portSpans = board.components.filter(c => c.port).map(c => ({ edge: nearestEdge(c, e.bb), c }));
    const zMid = (WALL + e.wallTop) / 2;
    const freeOfBoss = (x: number, y: number) => board.holes.every(h => Math.hypot(h.x - x, h.y - y) > e.bossR + 2);
    const measured: number[] = [];
    for (const edge of ['-X', '+X', '-Y', '+Y'] as Edge[]) {
      const xEdge = edge === '-X' || edge === '+X';
      const [lo, hi] = xEdge ? [e.bb.minY, e.bb.maxY] : [e.bb.minX, e.bb.maxX];
      // Clear of every port opening + collar on this edge (clearance + collar
      // width = wall, + 1 mm margin), inside the straight run of the outline.
      const margin = CLEAR + WALL + 1;
      const along = [0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85].map(f => lo + f * (hi - lo)).find(a =>
        portSpans.filter(p => p.edge === edge).every(({ c }) => {
          const [p0, p1] = xEdge ? [c.y - c.d / 2, c.y + c.d / 2] : [c.x - c.w / 2, c.x + c.w / 2];
          return a < p0 - margin || a > p1 + margin;
        }));
      expect(along, `${board.name}: no port-free spot on ${edge} wall`).toBeDefined();
      const inner = { '-X': e.bb.minX - CLEAR, '+X': e.bb.maxX + CLEAR, '-Y': e.bb.minY - CLEAR, '+Y': e.bb.maxY + CLEAR }[edge];
      const s = edge === '-X' || edge === '-Y' ? -1 : 1;
      // 0.3 mm into the cavity clearance gap (bosses sit further in), 6 mm out.
      const n0 = Math.min(inner - s * 0.3, inner + s * 6), n1 = Math.max(inner - s * 0.3, inner + s * 6);
      const a = along!;
      const probe = xEdge ? boxMM(n0, a - 0.5, zMid - 0.5, n1, a + 0.5, zMid + 0.5)
        : boxMM(a - 0.5, n0, zMid - 0.5, a + 0.5, n1, zMid + 0.5);
      measured.push(common(base, probe).volume);
    }
    // Floor and lid plate, away from bosses.
    const cx = (e.bb.minX + e.bb.maxX) / 2, cy = (e.bb.minY + e.bb.maxY) / 2;
    expect(freeOfBoss(cx, cy)).toBe(true);
    measured.push(common(base, boxMM(cx - 0.5, cy - 0.5, -1, cx + 0.5, cy + 0.5, e.boardZ - 0.5)).volume);
    measured.push(common(lid, boxMM(cx - 0.5, cy - 0.5, e.wallTop - SKIRT_H + 0.5, cx + 0.5, cy + 0.5, e.lidTop + 1)).volume);
    for (const v of measured) expect(v).toBeCloseTo(WALL, 3);
  });

  it('lid bosses and base standoffs share centres with every PCB mounting hole, screw path open', () => {
    const r = e.bossR + 0.2;
    for (const h of board.holes) {
      // Round probe: a square column would clip chamfered cavity corners.
      const col = (z0: number, z1: number) => OcctBackend.cylinder(z1 - z0, r).translate(h.x, h.y, z0);
      const baseBoss = common(base, col(WALL + 0.5, e.boardZ - 0.5));
      const lidBoss = common(lid, col(e.boardTop + 0.5, e.wallTop - SKIRT_H - 0.5));
      expect(baseBoss.volume).toBeGreaterThan(0);
      expect(lidBoss.volume).toBeGreaterThan(0);
      const centre = (b: { min: number[]; max: number[] }) => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
      const [bx, by] = centre(baseBoss.bbox!);
      const [lx, ly] = centre(lidBoss.bbox!);
      expect(bx).toBeCloseTo(h.x, 2); expect(by).toBeCloseTo(h.y, 2);
      expect(lx).toBeCloseTo(bx, 2); expect(ly).toBeCloseTo(by, 2);
      expect(baseBoss.bbox!.max[0] - baseBoss.bbox!.min[0]).toBeCloseTo(2 * e.bossR, 2);
      // Screw path: clearance bore through the lid, PCB hole, pilot in the standoff.
      const pin = (rad: number, z0: number, z1: number) =>
        OcctBackend.cylinder(z1 - z0, rad).translate(h.x, h.y, z0);
      expect(common(lid, pin(e.clearD / 2 - 0.05, e.boardTop - 0.2, e.lidTop + 0.2)).volume).toBe(0);
      expect(common(lid, pin(e.clearD / 2 + 0.3, e.boardTop + 0.5, e.wallTop - 0.5)).volume).toBeGreaterThan(0);
      expect(common(base, pin(e.pilotD / 2 - 0.05, e.boardZ - 3, e.boardZ + 0.1)).volume).toBe(0);
      expect(common(base, pin(e.pilotD / 2 + 0.3, e.boardZ - 3, e.boardZ - 0.5)).volume).toBeGreaterThan(0);
    }
  });

  it('the PCB and its components fit: no overlap with base or lid', () => {
    expect(common(pcb, base).volume).toBe(0);
    expect(common(pcb, lid).volume).toBe(0);
    expect(common(base, lid).volume).toBe(0);
  });
});

describe('same source, different board data', () => {
  it('produces different enclosures and the source differs only inside the BOARD block', () => {
    const tpl = readFileSync('spike-b2b/enclosure/enclosure.kcad.ts', 'utf8');
    const [a, b] = BOARDS.map(bd => enclosureSource(bd, tpl));
    const strip = (s: string) => s.replace(/\/\/ @board-begin[\s\S]*?\/\/ @board-end/, '');
    expect(strip(a)).toBe(strip(b));
    expect(a).not.toBe(b);
  });
});
