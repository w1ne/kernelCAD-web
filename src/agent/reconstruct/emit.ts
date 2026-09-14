// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/reconstruct/emit.ts
//
// FeaturePlan → readable `.kcad.ts`: named params first, then the body
// (revolved profile or extruded blocks), then one chained feature per drilled
// hole group / cutout, boolean remainders last, and the rigid transform back
// into the mesh's own frame at the very end so face queries resolve in the
// frame the features were planned in.

import { arcMidpoint, type ProfilePrim } from './profileFit';
import { rotationToAxisAngle, type V3 } from './geom';
import type { CanonicalFrame } from './frame';
import type { FaceRef, FeaturePlan, LoopOut, Op } from './plan';
import type { EdgeQueryOut } from './blends';

export interface EmitContext {
  frame: CanonicalFrame;
  sourceName: string;
  /** Optional header lines (e.g. the measured fidelity) placed after the banner. */
  headerNotes?: string[];
}

export function num(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  if (Object.is(r, -0) || r === 0) return '0';
  return String(r);
}

function point(p: readonly number[]): string {
  return `${num(p[0])}, ${num(p[1])}`;
}

function faceQuery(f: FaceRef): string {
  const at = f.byNormal.endsWith('Z') ? 'atZ' : f.byNormal.endsWith('X') ? 'atX' : 'atY';
  const near = f.near ? `, near: [${f.near.map(num).join(', ')}]` : '';
  return `{ byNormal: '${f.byNormal}', ${at}: ${num(f.level)}${near} }`;
}

function pathChain(prims: ProfilePrim[], indent: string): string {
  if (prims.length === 0) return 'path()';
  const lines = [`path()`, `${indent}.moveTo(${point(prims[0].a)})`];
  prims.forEach((p, i) => {
    const last = i === prims.length - 1;
    if (p.kind === 'line') {
      if (!last) lines.push(`${indent}.lineTo(${point(p.b)})`);
    } else {
      const m = arcMidpoint(p);
      lines.push(`${indent}.threePointsArc(${point(p.b)}, ${point(m)})`);
    }
  });
  lines.push(`${indent}.close()`);
  return lines.join('\n');
}

function circleChain(cx: number, cy: number, r: number, indent: string): string {
  return [
    'path()',
    `${indent}.moveTo(${num(cx + r)}, ${num(cy)})`,
    `${indent}.threePointsArc(${num(cx - r)}, ${num(cy)}, ${num(cx)}, ${num(cy + r)})`,
    `${indent}.threePointsArc(${num(cx + r)}, ${num(cy)}, ${num(cx)}, ${num(cy - r)})`,
    `${indent}.close()`,
  ].join('\n');
}

function loopChain(loop: LoopOut, indent: string): string {
  return loop.kind === 'circle' ? circleChain(loop.cx, loop.cy, loop.r, indent) : pathChain(loop.prims, indent);
}

function paramRange(v: number): string {
  const min = Math.max(0.001, Math.round(v * 250) / 1000);
  const max = Math.round(v * 4000) / 1000;
  return `{ min: ${num(min)}, max: ${num(max)} }`;
}

export function emitScript(plan: FeaturePlan, ctx: EmitContext): string {
  const out: string[] = [];
  out.push(`// Reconstructed from ${ctx.sourceName} by mesh_to_features.`);
  out.push('// Every dimension was measured from the mesh. Values snapped to a round');
  out.push('// number are listed, with the measured value, in the assumption ledger.');
  out.push('// Face queries pin the measured levels: change a height param and its');
  out.push('// atZ/atX/atY together.');
  for (const note of ctx.headerNotes ?? []) out.push(`// ${note}`);
  out.push('');

  for (const p of plan.params) {
    const note = p.snapped ? ` // measured ${Math.round(p.measured * 1e4) / 1e4}` : '';
    out.push(`const ${p.name} = param('${p.name}', ${num(p.value)}, ${paramRange(p.value)});${note}`);
  }
  out.push('');

  const body = plan.body;
  if (body.kind === 'revolve') {
    const zNames: string[] = [];
    body.steps.forEach((s, k) => {
      if (k === 0) zNames.push(s.hParam);
      else {
        const zn = `z${k + 1}`;
        out.push(`const ${zn} = ${zNames[k - 1]}.add(${s.hParam});`);
        zNames.push(zn);
      }
    });
    const lines = ['const body = path()', '  .moveTo(0, 0)'];
    body.steps.forEach((s, k) => {
      const zBelow = k === 0 ? '0' : zNames[k - 1];
      lines.push(`  .lineTo(${s.rParam}, ${zBelow})`);
      lines.push(`  .lineTo(${s.rParam}, ${zNames[k]})`);
    });
    lines.push(`  .lineTo(0, ${zNames[zNames.length - 1]})`);
    lines.push('  .close()');
    lines.push('  .revolve();');
    out.push(`// Turned profile (radius, height) revolved about Z.`);
    out.push(...lines);
  } else {
    const zExpr: string[] = [];
    body.blocks.forEach((blk, k) => {
      if (k === 0) zExpr.push('');
      else if (k === 1) zExpr.push(body.blocks[0].hParam);
      else {
        const zn = `block${k + 1}Base`;
        out.push(`const ${zn} = ${zExpr[k - 1]}.add(${body.blocks[k - 1].hParam});`);
        zExpr.push(zn);
      }
      const varName = body.blocks.length === 1 ? 'body' : `block${k + 1}`;
      const solids = blk.loops.map((loop) => {
        if (blk.rect) {
          return [
            'path()',
            '  .moveTo(0, 0)',
            `  .lineTo(${blk.rect.wParam}, 0)`,
            `  .lineTo(${blk.rect.wParam}, ${blk.rect.lParam})`,
            `  .lineTo(0, ${blk.rect.lParam})`,
            '  .close()',
            `  .extrude(${blk.hParam})`,
          ].join('\n');
        }
        return `${loopChain(loop, '  ')}\n  .extrude(${blk.hParam})`;
      });
      const placed = solids.map((s) => (k === 0 ? s : `${s}\n  .translate(0, 0, ${zExpr[k]})`));
      out.push(`// Block ${k + 1}: extruded profile, z ${num(blk.z0)} → ${num(blk.z1)}.`);
      if (placed.length === 1) out.push(`const ${varName} = ${placed[0]};`);
      else out.push(`const ${varName} = ${placed[0]}\n  .union(\n${placed.slice(1).map((s) => indentBlock(s, '    ')).join(',\n')},\n  );`);
    });
    if (body.blocks.length > 1) {
      out.push(`const body = block1.union(${body.blocks.slice(1).map((_, i) => `block${i + 2}`).join(', ')});`);
    }
  }
  out.push('');

  const chain: string[] = [];
  for (const op of plan.ops) chain.push(emitOp(op));
  const transform = transformChain(plan, ctx.frame);
  if (chain.length === 0 && transform.length === 0) {
    out.push('return body;');
  } else {
    out.push('return body');
    for (const c of chain) out.push(c);
    for (const t of transform) out.push(t);
    out[out.length - 1] += ';';
  }
  return out.join('\n') + '\n';
}

function indentBlock(s: string, indent: string): string {
  return s
    .split('\n')
    .map((l) => indent + l)
    .join('\n');
}

function emitOp(op: Op): string {
  switch (op.kind) {
    case 'holes': {
      const depth = op.depth === 'through' ? `'through'` : op.depthParam ?? num(op.depth);
      const cb = op.counterbore ? `,\n    counterbore: { diameter: ${op.counterbore.diameterParam}, depth: ${op.counterbore.depthParam} }` : '';
      const where = op.positions.map((p) => `(${p.at.map(num).join(', ')})`).join(' ');
      if (op.positions.length === 1) {
        const p = op.positions[0];
        return [
          `  // ${op.name}: ${op.axis === 'Z' ? 'axial' : `cross (${op.axis})`} bore at ${where}; u/v are from the entry face centroid.`,
          `  .hole(${faceQuery(op.face)}, {`,
          `    u: ${num(p.u)},`,
          `    v: ${num(p.v)},`,
          `    diameter: ${op.diameterParam},`,
          `    depth: ${depth}${cb},`,
          `    name: '${op.name}',`,
          '  })',
        ].join('\n');
      }
      return [
        `  // ${op.name}: ${op.positions.length} ${op.axis === 'Z' ? 'axial' : `cross (${op.axis})`} bores at ${where}; u/v are from the entry face centroid.`,
        `  .holes(${faceQuery(op.face)}, {`,
        '    positions: [',
        ...op.positions.map((p) => `      { u: ${num(p.u)}, v: ${num(p.v)} },`),
        '    ],',
        `    diameter: ${op.diameterParam},`,
        `    depth: ${depth}${cb},`,
        `    name: '${op.name}',`,
        '  })',
      ].join('\n');
    }
    case 'cutout':
      return [
        `  // ${op.name}: pocket entering the face centred at (${op.at.map(num).join(', ')}); profile is face-centroid relative.`,
        `  .cutout(`,
        `    ${pathChain(op.prims, '      ')},`,
        `    { face: ${faceQuery(op.face)}, depth: ${op.depthParam}, name: '${op.name}' },`,
        '  )',
      ].join('\n');
    case 'subtractCylinder': {
      const orient = op.axis === 'Z' ? '' : op.axis === 'X' ? '.rotate([0, 1, 0], 90)' : '.rotate([1, 0, 0], -90)';
      return [
        `  // ${op.name}: bore that no drilling feature can reach, cut as a boolean.`,
        `  .subtract(cylinder(${num(op.length)}, ${num(op.radius)})${orient}.translate(${op.base.map(num).join(', ')}))`,
      ].join('\n');
    }
    case 'fillet': {
      const edgesTotal = op.groups.reduce((n, g) => n + g.edgeCount, 0);
      const head = `  // Constant-radius edge blends measured on the mesh (${edgesTotal} edge(s)); corner patches come from filleting the meeting edges together.`;
      if (op.groups.length === 1 && op.groups[0].selectors.length === 1) {
        const g = op.groups[0];
        const sel = g.selectors[0];
        return [head, sel === undefined ? `  .fillet(${g.radiusParam})` : `  .fillet(${g.radiusParam}, ${edgeQuery(sel)})`].join('\n');
      }
      const entries = op.groups.flatMap((g) => g.selectors.map((sel) => `    { edges: ${sel === undefined ? '{}' : edgeQuery(sel)}, radius: ${g.radiusParam} },`));
      return [head, '  .fillet([', ...entries, '  ])'].join('\n');
    }
    case 'subtractPrism':
      return [
        `  // ${op.name}: pocket whose opening is covered by material, cut as a boolean.`,
        `  .subtract(`,
        `    ${pathChain(op.prims, '      ')}`,
        `      .extrude(${num(op.length)})`,
        `      .translate(0, 0, ${num(op.z0)}),`,
        '  )',
      ].join('\n');
  }
}

function edgeQuery(q: EdgeQueryOut): string {
  const parts: string[] = [];
  const vec = (v: readonly number[]) => `[${v.map(num).join(', ')}]`;
  if (q.atZ !== undefined) parts.push(`atZ: ${num(q.atZ)}`);
  if (q.atX !== undefined) parts.push(`atX: ${num(q.atX)}`);
  if (q.atY !== undefined) parts.push(`atY: ${num(q.atY)}`);
  if (q.within) {
    const w = q.within;
    parts.push(
      `within: { xMin: ${num(w.xMin)}, xMax: ${num(w.xMax)}, yMin: ${num(w.yMin)}, yMax: ${num(w.yMax)}, zMin: ${num(w.zMin)}, zMax: ${num(w.zMax)} }`,
    );
  }
  if (q.parallel) parts.push(`parallel: ${vec(q.parallel)}`);
  if (q.perpendicular) parts.push(`perpendicular: ${vec(q.perpendicular)}`);
  if (q.ofCurveType) parts.push(`ofCurveType: '${q.ofCurveType}'`);
  if (q.convex !== undefined) parts.push(`convex: ${q.convex}`);
  if (q.concave !== undefined) parts.push(`concave: ${q.concave}`);
  if (q.tolerance !== undefined) parts.push(`tolerance: ${num(q.tolerance)}`);
  return `{ ${parts.join(', ')} }`;
}

function transformChain(plan: FeaturePlan, frame: CanonicalFrame): string[] {
  const out: string[] = [];
  const o = plan.origin;
  if (o.some((v) => Math.abs(v) >= 5e-4)) {
    out.push(`  // Back into the mesh's frame.`);
    out.push(`  .translate(${o.map(num).join(', ')})`);
  }
  const { axis, degrees } = rotationToAxisAngle([frame.e1, frame.e2, frame.axis]);
  if (Math.abs(degrees) >= 1e-6) {
    const ax = axis.map((v) => Math.round(v * 1e6) / 1e6) as V3;
    if (out.length === 0) out.push(`  // Back into the mesh's frame.`);
    out.push(`  .rotate([${ax.map(num6).join(', ')}], ${num6(degrees)})`);
  }
  return out;
}

function num6(v: number): string {
  const r = Math.round(v * 1e6) / 1e6;
  return Object.is(r, -0) || r === 0 ? '0' : String(r);
}
