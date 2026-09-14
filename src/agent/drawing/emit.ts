// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/drawing/emit.ts
//
// Stage 6: write the part model as a `.kcad.ts` source — role-named params
// first, then the profile path, the extrude/revolve with the rotation that
// lands the profile in the plane of the view it came from, then one cylinder
// cut per hole. Placement convention: the part's bounding box starts at the
// origin on every axis, matching the drawing's view-local coordinates, so a
// value read off any view is directly a coordinate in the script.

import { fmtNum, num, renderExpr } from './expr';
import type { HoleModel, PartModel } from './reconstruct';
import type { ModelAxis } from './views';

export interface EmitHeader {
  /** Source drawing, as the caller named it (path or label). */
  source: string;
  page: number;
  views: string[];
  projection: 'third' | 'first';
  scaleText: string;
  units: 'mm' | 'in';
  /** Relative path of the persisted ledger, when one is written. */
  ledgerPath?: string;
  unresolvedCount: number;
}

const safeComment = (s: string): string => s.replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ');

function paramLine(p: PartModel['params'][number]): string {
  const desc = p.description.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `const ${p.name} = param('${p.name}', ${fmtNum(p.value)}, { description: '${desc}' });`;
}

function holeLine(h: HoleModel): string {
  const r = `${renderExpr(h.diameter)}.divide(2)`;
  const len = renderExpr(h.length);
  const c = (a: ModelAxis) => renderExpr(h.center[a] ?? num(0));
  const from = renderExpr(h.from);
  switch (h.axis) {
    case 'z':
      return `part = part.subtract(cylinder(${len}, ${r}).translate(${c('x')}, ${c('y')}, ${from})); // ${h.name}`;
    case 'x':
      return `part = part.subtract(cylinder(${len}, ${r}).rotateY(90).translate(${from}, ${c('y')}, ${c('z')})); // ${h.name}`;
    case 'y':
      return `part = part.subtract(cylinder(${len}, ${r}).rotateX(-90).translate(${c('x')}, ${from}, ${c('z')})); // ${h.name}`;
  }
}

/** Placement after `extrude` so the profile lies in the plane of its view. */
function extrudePlacement(model: PartModel): string[] {
  const [a, b] = model.profileAxes;
  const depth = renderExpr(model.depth ?? num(1));
  if (a === 'x' && b === 'y') return [];
  if (a === 'x' && b === 'z') return ['  .rotateX(90)', `  .translate(0, ${depth}, 0)`];
  return ['  .rotateX(90)', '  .rotateZ(90)'];
}

function revolvePlacement(model: PartModel): string[] {
  const r = renderExpr(model.maxRadius ?? num(0));
  switch (model.revolveAxis) {
    case 'x':
      return ['  .rotateY(90)', `  .translate(0, ${r}, ${r})`];
    case 'y':
      return ['  .rotateX(-90)', `  .translate(${r}, 0, ${r})`];
    default:
      return [`  .translate(${r}, ${r}, 0)`];
  }
}

export function emitKcadScript(model: PartModel, header: EmitHeader): string {
  const lines: string[] = [];
  lines.push(`// Rebuilt from an engineering drawing by drawing_to_cad.`);
  lines.push(`// Source: ${safeComment(header.source)}, page ${header.page} — ${header.views.join(' / ')} views, ${header.projection}-angle, scale ${safeComment(header.scaleText)}, units ${header.units}.`);
  lines.push(model.kind === 'extrude'
    ? `// Build: ${model.profileView} view silhouette extruded along ${model.extrudeAxis!.toUpperCase()}${model.holes.length ? `, ${model.holes.length} hole(s)` : ''}.`
    : `// Build: ${model.profileView} view half-silhouette revolved about ${model.revolveAxis!.toUpperCase()}${model.holes.length ? `, ${model.holes.length} hole(s)` : ''}.`);
  lines.push(`// Params are named after what they size; every value's evidence (stated`);
  lines.push(`// dimension, symmetry, measured linework, default) is in the ledger.`);
  if (header.ledgerPath) lines.push(`// Ledger: ${safeComment(header.ledgerPath)} (${header.unresolvedCount} open fact(s))`);
  lines.push('');
  for (const p of model.params) lines.push(paramLine(p));
  lines.push('');

  const [first, ...rest] = model.loop;
  lines.push('let part = path()');
  lines.push(`  .moveTo(${renderExpr(first.at[0])}, ${renderExpr(first.at[1])})`);
  const all = [...rest, first];
  model.loop.forEach((vertex, k) => {
    const to = all[k];
    const [x, y] = [renderExpr(to.at[0]), renderExpr(to.at[1])];
    lines.push(vertex.bulge === 0 ? `  .lineTo(${x}, ${y})` : `  .bulgeArc(${x}, ${y}, ${fmtNum(vertex.bulge)})`);
  });
  lines.push('  .close()');
  if (model.kind === 'extrude') {
    lines.push(`  .extrude(${renderExpr(model.depth ?? num(1))})`);
    lines.push(...extrudePlacement(model));
  } else {
    lines.push('  .revolve()');
    lines.push(...revolvePlacement(model));
  }
  lines[lines.length - 1] += ';';
  if (model.holes.length > 0) {
    lines.push('');
    for (const h of model.holes) lines.push(holeLine(h));
  }
  lines.push('');
  lines.push('return part;');
  return lines.join('\n') + '\n';
}

