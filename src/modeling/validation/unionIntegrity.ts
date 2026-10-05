// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Union integrity guard: geometry validity for models fused with `union()`.
//
// `assembly()` models get interference (`assembly.interference.overlap`) and
// floating-part (`assembly.mechanical.part-disconnected`) checks from the
// assembly validator. A model fused with `union()` bypassed both, so a tray
// whose cross tubes ran 25 mm into its side rails shipped as "validated".
// This pass closes that gap for every union in the capture graph:
//
//   - `union.disconnected` (error): the union result is more than one solid.
//     Touching operands (shared face, zero gap) fuse into one solid and pass.
//     Edge/point-only contact is a warning. Unions that end up inside an
//     assembly part are skipped: the assembly validator owns floating
//     geometry inside a part (`assembly.mechanical.part-disconnected`).
//   - `union.member-overlap` (error): two operands that each carry their own
//     finish/material (`.finish()` / `.material()`, i.e. `metadata.material`)
//     and the SAME one share more than 1 mm³. Two pieces of the same stock
//     are separate members, cut to fit, never buried in each other.
//     Different materials overlapping (inlay, over-mould, multi-material
//     part) is intentional and passes. Operands without their own finish (a boss or rib merged
//     into a body before `.finish()`) are exempt, so ordinary modelling is
//     unaffected. `.color()` is a display hint in a different slot and does
//     not count.
//
// Unions used only as cutting tools (the cutter side of a subtract or
// intersect) are skipped: they never become material.
//
// Cost: a script with no union pays one records scan. A union with fewer
// than two separately finished operands pays one solid count. The BREP
// intersection probe runs only for finished pairs whose AABBs overlap with
// positive extent on every axis (face-touching boxes are skipped), and the
// distance/naming work runs only when a defect was found.
//
// Emitted from the shared evaluate seam (`evaluateAndBuildScript`), so
// `evaluate_script`, `kernelcad evaluate` and the review payload all carry
// it. Studio's per-keystroke recompute does not run it (same policy as the
// interference sweep).

import * as walk from 'acorn-walk';
import { getOC } from 'replicad';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { FeatureId, Vec3 } from '../../shared/intent/types';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { parseCode } from '../../shared/codeGeneration/ast';
import { brepExtremaDistance, wrappedShape } from '../runtime/brepDistance';

/** Overlap volume (mm³) above which two separately finished members clash. */
export const MEMBER_OVERLAP_MIN_MM3 = 1;
/** AABB extent (mm) below which two boxes count as only touching. */
const TOUCH_EPS_MM = 1e-4;
/** BREP distance (mm) at or below which two operands count as touching. */
const CONNECT_TOL_MM = 1e-3;
/** Solids below this volume (mm³) are fuse slivers, not parts. */
const SLIVER_MM3 = 1e-3;

export interface UnionIntegrityInput {
  records: readonly FeatureRecord[];
  shapes: ReadonlyMap<FeatureId, ShapeBackend>;
  /** Script source, used only on the failure path to name operands by the
   *  expressions passed to `union(...)`. */
  code?: string;
}

type Box = { min: Vec3; max: Vec3 };

interface Leaf {
  id: FeatureId;
  /** The union record whose call passed this operand. */
  parent: FeatureRecord;
  /** Operand position in that call (0 = base). */
  index: number;
}

function isUnion(r: FeatureRecord): boolean {
  return r.kind === 'boolean' && r.params.op?.expression === "'union'" && !r.suppressed;
}

function hasOwnFinish(r: FeatureRecord | undefined): boolean {
  return r?.metadata?.material !== undefined;
}

/** Canonical key of a record's own material (key order independent), so two
 *  operands finished with the same token / PBR compare equal. */
function materialKey(r: FeatureRecord | undefined): string {
  const canon = (v: unknown): unknown =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon((v as Record<string, unknown>)[k])]))
      : v;
  return JSON.stringify(canon(r?.metadata?.material));
}

/** Operand feature ids of a boolean record, in call order (base first). */
function operandIds(r: FeatureRecord): FeatureId[] {
  const entries = Object.entries(r.inputs).filter(([, ref]) => ref.kind === 'feature');
  const rank = (k: string) => (k === 'base' ? -1 : Number(k.replace('cutter_', '')));
  return entries.sort(([a], [b]) => rank(a) - rank(b)).map(([, ref]) => (ref as { id: FeatureId }).id);
}

function asOcct(s: ShapeBackend | undefined): OcctBackend | undefined {
  return s !== undefined && typeof (s as OcctBackend).intersectionVolume === 'function'
    ? (s as OcctBackend)
    : undefined;
}

function boxesOverlap(a: Box, b: Box, eps: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) <= eps) return false;
  }
  return true;
}

/** Gap between two AABBs (0 when they touch or overlap). */
function boxGap(a: Box, b: Box): number {
  let s = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k]);
    s += d * d;
  }
  return Math.sqrt(s);
}

const fmt = (v: number, digits = 2) => String(Number(v.toFixed(digits)));
const fmtBox = (b: Box) =>
  `[${b.min.map(v => fmt(v, 1)).join(', ')}] → [${b.max.map(v => fmt(v, 1)).join(', ')}] mm`;

export function detectUnionDefects(input: UnionIntegrityInput): CompilerDiagnostic[] {
  const unions = input.records.filter(isUnion);
  if (unions.length === 0) return [];

  const graph = new UnionGraph(input.records);
  const namer = new OperandNamer(input.code);
  const diagnostics: CompilerDiagnostic[] = [];
  for (const u of unions) {
    if (!graph.isChainRoot(u)) continue;
    const leaves = graph.leavesOf(u);
    if (leaves.some(l => graph.isAssemblyPartShape(l.id))) continue;
    if (graph.toolOnly(u.id)) continue;

    diagnostics.push(...memberOverlaps(u, leaves, graph.byId, input.shapes, namer));
    if (graph.judgeConnectivity(u.id)) {
      const d = disconnected(u, leaves, input.shapes, namer);
      if (d !== undefined) diagnostics.push(d);
    }
  }
  return diagnostics;
}

/** Consumer graph over the capture records, with the union-specific walks. */
class UnionGraph {
  readonly byId: ReadonlyMap<FeatureId, FeatureRecord>;
  private readonly records: readonly FeatureRecord[];
  private readonly consumers = new Map<FeatureId, FeatureRecord[]>();
  /** Shapes handed to assembly().part(...): a union of those (Scene.toUnion()
   *  on a solved snapshot) is the assembly validator's job, not ours. */
  private readonly assemblyPartShapes = new Set<FeatureId>();

  constructor(records: readonly FeatureRecord[]) {
    this.records = records;
    this.byId = new Map(records.map(r => [r.id, r] as const));
    for (const r of records) {
      for (const ref of Object.values(r.inputs)) {
        if (ref.kind !== 'feature') continue;
        const list = this.consumers.get(ref.id) ?? [];
        list.push(r);
        this.consumers.set(ref.id, list);
        if (r.kind === 'assemblyPart') this.assemblyPartShapes.add(ref.id);
      }
    }
  }

  isAssemblyPartShape(id: FeatureId): boolean {
    return this.assemblyPartShapes.has(id);
  }

  /** An unfinished, untransformed union consumed by another union is
   *  flattened into it: `a.union(b).union(c)` is checked once, as a, b, c. */
  private static flattensInto(r: FeatureRecord): boolean {
    return !hasOwnFinish(r) && r.transforms.length === 0;
  }

  leavesOf(u: FeatureRecord): Leaf[] {
    const out: Leaf[] = [];
    operandIds(u).forEach((id, index) => {
      const rec = this.byId.get(id);
      if (rec !== undefined && isUnion(rec) && UnionGraph.flattensInto(rec)) out.push(...this.leavesOf(rec));
      else out.push({ id, parent: u, index });
    });
    return out;
  }

  isChainRoot(u: FeatureRecord): boolean {
    return !(UnionGraph.flattensInto(u) && (this.consumers.get(u.id) ?? []).some(isUnion));
  }

  private reaches(id: FeatureId, hit: (c: FeatureRecord) => boolean, seen = new Set<FeatureId>()): boolean {
    for (const c of this.consumers.get(id) ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (hit(c) || this.reaches(c.id, hit, seen)) return true;
    }
    return false;
  }

  /** A disconnected union whose result later flows into another union may
   *  be bridged there; only judge connectivity where no union follows. A
   *  union that becomes (part of) an assembly part is left to the assembly
   *  validator, which owns floating geometry inside a part
   *  (`assembly.mechanical.part-disconnected`, reported by review_cad /
   *  inspect_assembly). Member overlap has no assembly equivalent, so it is
   *  checked everywhere. */
  judgeConnectivity(id: FeatureId): boolean {
    return !this.reaches(id, isUnion) && !this.reaches(id, c => c.kind === 'assemblyPart');
  }

  /** A union used only as a cutting tool (the `cutter_*` side of a
   *  subtract/intersect, possibly via pattern/mirror copies) never becomes
   *  material: a set of separate hole tools is legitimately disconnected. */
  toolOnly(id: FeatureId, seen = new Set<FeatureId>()): boolean {
    const uses = this.records.flatMap(c =>
      Object.entries(c.inputs)
        .filter(([, ref]) => ref.kind === 'feature' && ref.id === id)
        .map(([key]) => ({ c, key })),
    );
    if (uses.length === 0) return false;
    return uses.every(({ c, key }) => this.isToolUse(c, key, seen));
  }

  private isToolUse(c: FeatureRecord, key: string, seen: Set<FeatureId>): boolean {
    if (c.kind === 'boolean') return !isUnion(c) && key.startsWith('cutter_');
    if ((c.kind === 'pattern' || c.kind === 'mirror') && !seen.has(c.id)) {
      seen.add(c.id);
      return this.toolOnly(c.id, seen);
    }
    return false;
  }
}

function memberOverlaps(
  u: FeatureRecord,
  leaves: Leaf[],
  byId: ReadonlyMap<FeatureId, FeatureRecord>,
  shapes: ReadonlyMap<FeatureId, ShapeBackend>,
  namer: OperandNamer,
): CompilerDiagnostic[] {
  const members = leaves
    .filter(l => hasOwnFinish(byId.get(l.id)))
    .map(l => ({ leaf: l, shape: asOcct(shapes.get(l.id)) }))
    .filter((m): m is { leaf: Leaf; shape: OcctBackend } => m.shape !== undefined)
    .map(m => ({ ...m, box: m.shape.boundingBox(), stock: materialKey(byId.get(m.leaf.id)) }));
  if (members.length < 2) return [];

  const out: CompilerDiagnostic[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      if (a.leaf.id === b.leaf.id) continue;
      // Different materials overlapping is intentional (inlay, over-mould,
      // multi-material part); two pieces of the same stock cannot
      // interpenetrate.
      if (a.stock !== b.stock) continue;
      if (!boxesOverlap(a.box, b.box, TOUCH_EPS_MM)) continue;
      let volume: number;
      try {
        volume = a.shape.intersectionVolume(b.shape);
      } catch {
        continue; // a probe OCCT cannot complete is not evidence of a clash
      }
      if (volume <= MEMBER_OVERLAP_MIN_MM3) continue;
      const nameA = namer.name(a.leaf);
      const nameB = namer.name(b.leaf);
      out.push({
        target: 'export-occt',
        code: 'union.member-overlap',
        severity: 'error',
        featureId: u.id,
        ...(u.scriptLocation !== undefined ? { scriptLocation: u.scriptLocation } : {}),
        message:
          `union() members ${nameA} and ${nameB} are separate pieces of the same material (same finish) ` +
          `but share ${fmt(volume, 1)} mm³ of volume; overlap box ${fmtBox(overlapBox(a.shape, b.shape, a.box, b.box))}. ` +
          'One member runs into the other instead of being cut to fit.',
        hint:
          'Cut the member to fit between its neighbours (a cross member between two rails is span minus two rail widths, placed at the rail width) so the end faces touch, or build each member as assembly().part(name, shape).',
        nextAction: NEXT_ACTIONS['union.member-overlap'],
      });
    }
  }
  return out;
}

/** Bounding box of `a ∩ b`; falls back to the AABB intersection when the
 *  exact common cannot be built. Only called for a reported clash. */
function overlapBox(a: OcctBackend, b: OcctBackend, boxA: Box, boxB: Box): Box {
  try {
    const common = a.intersect(b);
    if (!common.isEmpty()) return common.boundingBox();
  } catch {
    // fall through to the AABB intersection
  }
  return {
    min: [0, 1, 2].map(k => Math.max(boxA.min[k], boxB.min[k])) as unknown as Vec3,
    max: [0, 1, 2].map(k => Math.min(boxA.max[k], boxB.max[k])) as unknown as Vec3,
  };
}

function disconnected(
  u: FeatureRecord,
  leaves: Leaf[],
  shapes: ReadonlyMap<FeatureId, ShapeBackend>,
  namer: OperandNamer,
): CompilerDiagnostic | undefined {
  const result = shapes.get(u.id);
  if (result === undefined) return undefined;
  const solidCount = realSolids(result).length;
  if (solidCount <= 1) return undefined;

  // Failure path only: split every operand into its solids, group them by
  // contact (AABB prefilter, then BREP distance) and name the floating ones.
  const items = leaves.flatMap(leaf => {
    const shape = asOcct(shapes.get(leaf.id));
    if (shape === undefined) return [];
    const solids = realSolids(shape);
    return solids.map((solid, k) => ({
      leaf,
      shape: solid,
      part: solids.length > 1 ? { k: k + 1, of: solids.length } : undefined,
      box: solid.boundingBox(),
      volume: safeVolume(solid),
    }));
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const distCache = new Map<string, number>();
  const distance = (i: number, j: number): number => {
    const key = i < j ? `${i}:${j}` : `${j}:${i}`;
    let d = distCache.get(key);
    if (d === undefined) {
      d = brepExtremaDistance(oc, wrappedShape(items[i].shape), wrappedShape(items[j].shape))
        ?? boxGap(items[i].box, items[j].box);
      distCache.set(key, d);
    }
    return d;
  };

  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (find(i) === find(j)) continue;
      if (boxGap(items[i].box, items[j].box) > CONNECT_TOL_MM) continue;
      if (distance(i, j) <= CONNECT_TOL_MM) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, number[]>();
  items.forEach((_, i) => {
    const g = groups.get(find(i)) ?? [];
    g.push(i);
    groups.set(find(i), g);
  });
  const volumeOf = (g: number[]) => g.reduce((sum, i) => sum + items[i].volume, 0);
  const ordered = [...groups.values()].sort((a, b) => volumeOf(b) - volumeOf(a));

  if (ordered.length < 2) {
    // Every solid touches another, yet the fuse kept them apart: contact
    // along an edge or a point only. Not a measurable gap, so not a gate
    // failure, but worth saying.
    return disconnectedDiagnostic(u, 'warn', solidCount,
      'Every operand touches another, but only along edges or points, which does not fuse them into one body.');
  }

  const groupNames = (g: number[]) => {
    const names = [...new Set(g.map(i => {
      const it = items[i];
      const base = namer.name(it.leaf);
      return it.part !== undefined ? `${base} [solid ${it.part.k} of ${it.part.of}]` : base;
    }))];
    return names.length > 6 ? `${names.slice(0, 6).join(', ')} and ${names.length - 6} more` : names.join(', ');
  };
  const groupBox = (g: number[]): Box => ({
    min: [0, 1, 2].map(k => Math.min(...g.map(i => items[i].box.min[k]))) as unknown as Vec3,
    max: [0, 1, 2].map(k => Math.max(...g.map(i => items[i].box.max[k]))) as unknown as Vec3,
  });
  const main = ordered[0];
  const floating = ordered.slice(1).map(g => {
    let gap = Infinity;
    for (const i of g) {
      for (const j of main) {
        if (boxGap(items[i].box, items[j].box) >= gap) continue;
        gap = Math.min(gap, distance(i, j));
      }
    }
    return `${groupNames(g)} (bbox ${fmtBox(groupBox(g))}, gap ${fmt(gap)} mm to the main body)`;
  });
  return disconnectedDiagnostic(u, 'error', solidCount,
    `Main body: ${groupNames(main)}. Floating: ${floating.join('; ')}. Floating parts are not held by anything.`);
}

function disconnectedDiagnostic(
  u: FeatureRecord,
  severity: 'error' | 'warn',
  solidCount: number,
  detail: string,
): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'union.disconnected',
    severity,
    featureId: u.id,
    ...(u.scriptLocation !== undefined ? { scriptLocation: u.scriptLocation } : {}),
    message: `union() result is ${solidCount} separate solids, not one connected body. ${detail}`,
    hint:
      'Move the floating operand until it touches the rest (shared face, zero gap) or add the member that carries it; separate parts belong in assembly().part(name, shape).',
    nextAction: NEXT_ACTIONS['union.disconnected'],
  };
}

/** Solid components with real volume. A fuse of near-tangent operands can
 *  leave zero-volume sliver solids next to the real body; those are kernel
 *  noise, not floating parts. Single-solid shapes cost one explorer pass. */
function realSolids(s: ShapeBackend): OcctBackend[] {
  let solids: readonly ShapeBackend[];
  try {
    solids = s.solidComponents();
  } catch {
    return [];
  }
  if (solids.length <= 1) return solids as OcctBackend[];
  return (solids as OcctBackend[]).filter(c => safeVolume(c) > SLIVER_MM3);
}

function safeVolume(s: OcctBackend): number {
  try { return s.volume(); } catch { return 0; }
}

/** Names union operands by the source expressions passed to the `union`
 *  call that captured them (`union(sheet, front)` → 'sheet', 'front'),
 *  falling back to the feature id. Parses the script at most once, and only
 *  when a defect needs naming. */
class OperandNamer {
  private calls: Array<{ line: number; column: number; names: string[] }> | undefined;
  private readonly code: string | undefined;
  constructor(code: string | undefined) {
    this.code = code;
  }

  name(leaf: Leaf): string {
    const expr = this.callOperandNames(leaf.parent)?.[leaf.index];
    if (expr === undefined || expr === leaf.id) return `'${leaf.id}'`;
    return `'${expr}' (${leaf.id})`;
  }

  private callOperandNames(u: FeatureRecord): string[] | undefined {
    const loc = u.scriptLocation;
    if (loc === undefined) return undefined;
    const onLine = this.parse().filter(c => c.line === loc.line);
    const operandCount = operandIds(u).length;
    const fits = onLine.filter(c => c.names.length === operandCount);
    const exact = fits.find(c => c.column === loc.column);
    if (exact !== undefined) return exact.names;
    return fits.length === 1 ? fits[0].names : undefined;
  }

  private parse(): Array<{ line: number; column: number; names: string[] }> {
    if (this.calls !== undefined) return this.calls;
    this.calls = [];
    if (this.code === undefined) return this.calls;
    const code = this.code;
    const text = (n: { start: number; end: number }) => {
      const s = code.slice(n.start, n.end).replace(/\s+/g, ' ').trim();
      return s.length > 40 ? `${s.slice(0, 37)}...` : s;
    };
    try {
      const ast = parseCode(code);
      const calls = this.calls;
      walk.simple(ast, {
        CallExpression(node) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const call = node as any;
          const callee = call.callee;
          const args: string[] = call.arguments.map(text);
          if (callee.type === 'Identifier' && callee.name === 'union') {
            calls.push({ line: callee.loc.start.line, column: callee.loc.start.column + 1, names: args });
          } else if (
            callee.type === 'MemberExpression' && !callee.computed &&
            callee.property.type === 'Identifier' && callee.property.name === 'union'
          ) {
            calls.push({
              line: callee.property.loc.start.line,
              column: callee.property.loc.start.column + 1,
              names: [text(callee.object), ...args],
            });
          }
        },
      });
    } catch {
      // Unparseable source: fall back to feature ids.
    }
    return this.calls;
  }
}
