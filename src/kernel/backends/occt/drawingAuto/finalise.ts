// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/drawingAuto/finalise.ts

import { NEXT_ACTIONS } from '../../../../shared/diagnostics/registry';
import { formatDimValue } from '../drawingLayout';
import type { AutoDrawingResult } from './contracts';
import { generalToleranceNote } from './iso2768';
import type { RenderCtx } from './renderContext';
import { tidy } from './vectors';

export function unclassifiedHolesDiagnostic(ctx: RenderCtx): void {
  const { opts, include, model } = ctx;
  if (opts.enabled && include.has('holes') && model.unclassified.length > 0) {
    ctx.diagnostics.push({
      target: 'export-occt',
      code: 'drawing.auto.hole-unclassified',
      severity: 'warn',
      message:
        `svg-drawing autoAnnotate left ${model.unclassified.length} bore(s) without a callout: ` +
        model.unclassified
          .map(u => `⌀${formatDimValue(u.diameter)} at [${tidy(u.point).join(', ')}] along [${tidy(u.axis).join(', ')}] — ${u.reason}`)
          .join('; ') + '.',
      hint: 'Dimension each named bore with an options.annotations hole or diameter entry.',
      nextAction: NEXT_ACTIONS['drawing.auto.hole-unclassified'],
    });
  }
}

export function finalise(ctx: RenderCtx): AutoDrawingResult {
  const { placed, byKind, diagnostics, svg, annotations, bottomReserve, opts, include, datums } = ctx;
  let overlapped = 0;
  const crowded: string[] = [];
  for (const item of placed) {
    const hit = ctx.obstacles.cost(item.boxes, item.owner) > 0;
    if (hit) {
      overlapped++;
      crowded.push(`${item.kind} '${item.text}' (${item.view})`);
    }
    annotations.push({ kind: item.kind, view: item.view, text: item.text, overlapped: hit });
    svg.push(item.svg);
  }
  if (crowded.length > 0) {
    diagnostics.push({
      target: 'export-occt',
      code: 'drawing.annotation.overlap',
      severity: 'warn',
      message:
        `svg-drawing: ${crowded.length} automatic annotation(s) could not be placed clear of geometry, ` +
        `other labels or the sheet frame: ${crowded.join(', ')}.`,
      hint: 'Use a larger sheet (a3), narrow options.autoAnnotate.include, or dimension the crowded features with options.annotations.',
      nextAction: NEXT_ACTIONS['drawing.annotation.overlap'],
    });
  }

  const generalTolerance = opts.enabled && include.has('general-tolerance')
    ? generalToleranceNote(opts.tolerance)
    : undefined;
  if (generalTolerance) byKind['general-tolerance'] = 1;

  return {
    svg,
    bottomReserve,
    ...(generalTolerance ? { generalTolerance } : {}),
    report: {
      placed: placed.length - overlapped,
      overlapped,
      byKind,
      datums: ['A', 'B', 'C', ...[...datums.keys()].filter(l => !['A', 'B', 'C'].includes(l)).sort()]
        .filter(l => datums.has(l))
        .map(l => {
          const d = datums.get(l)!;
          return { label: l, source: d.source, normal: d.normal ? tidy(d.normal) : null, point: tidy(d.point) };
        }),
      annotations,
      ...(generalTolerance ? { generalTolerance } : {}),
    },
    diagnostics,
  };
}
