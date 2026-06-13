// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/shopcheck/parseDxfInput.ts
//
// Slice E Phase 4 — parse a DXF file produced by Slice A's exportDxf
// writer (or any external DXF) and reconstruct a Region-shaped input
// for the rule engine. Inverts the Slice A contract (LWPOLYLINE-only,
// layer `cut` + `BEND`, $INSUNITS = 4).

import { readFileSync } from 'node:fs';
import DxfParser from 'dxf-parser';
import { DIAGNOSTIC_REGISTRY } from '../../shared/diagnostics/registry';
import type { DiagnosticCode } from '../../shared/diagnostics/registry';
import type { Region, Vec2, BendLineRecord } from '../../shared/intent/region';
import type { Finding } from './types';

interface DxfVertex { x: number; y: number; z?: number }
interface DxfEntityLike { type: string; layer: string; vertices?: DxfVertex[] }
interface DxfParseResult { header: Record<string, unknown>; entities: DxfEntityLike[] }

export interface ParseDxfResult {
  ok: boolean;
  region?: Region;
  findings: Finding[];
  tolerance: number;
}

const TESSELLATION_NEAR_TOLERANCE_MM = 0.1;

/** Parse a DXF file path, surface Slice E DFM findings about the DXF
 *  itself (units / SPLINE / tessellation tolerance / BEND layer), and
 *  reconstruct a Region from the LWPOLYLINEs on the `cut` layer (outer +
 *  holes) and `BEND` layer (bend lines). */
export function parseDxfInput(path: string): ParseDxfResult {
  const text = readFileSync(path, 'utf-8');
  const parser = new DxfParser();
  const dxf = parser.parseSync(text) as unknown as DxfParseResult;
  const findings: Finding[] = [];

  const headerUnits = (dxf.header['$INSUNITS'] as number | undefined);
  if (headerUnits !== 4) {
    findings.push(makeFinding(
      'dfm.units.dxf-not-mm', 'error', 'scs.units.dxf-must-be-mm',
      `$INSUNITS = ${headerUnits ?? 'undefined'}`,
    ));
  }

  const splineOnCut = dxf.entities.some(e => e.type === 'SPLINE' && (e.layer === 'cut' || e.layer === 'CUT'));
  if (splineOnCut) {
    findings.push(makeFinding(
      'dfm.dxf.spline-present', 'error', 'scs.dxf.no-splines',
      'SPLINE on cut layer',
    ));
  }

  // Parse tessellation tolerance from the leading `999` comment block
  // (e.g. "tolerance: 0.05 mm (OCCT tessellation)").
  const tolMatch = text.match(/tolerance:\s*([\d.]+)\s*mm/);
  const tolerance = tolMatch ? parseFloat(tolMatch[1]) : 0.05;

  // Reconstruct Region from LWPOLYLINE entities by layer.
  const polylines = dxf.entities.filter(e => e.type === 'LWPOLYLINE');
  const cutPolys = polylines.filter(e => e.layer === 'cut' || e.layer === 'CUT');
  const bendPolys = polylines.filter(e => e.layer === 'BEND' || e.layer === 'bend');

  if (cutPolys.length === 0) {
    return { ok: findings.every(f => f.severity !== 'error'), findings, tolerance };
  }

  // Largest polyline by bbox area = outer; rest = holes.
  const sorted = [...cutPolys].sort((a, b) => polylineArea(b.vertices ?? []) - polylineArea(a.vertices ?? []));
  const outer: Vec2[] = (sorted[0].vertices ?? []).map(v => [v.x, v.y] as Vec2);
  const holes: Vec2[][] = sorted.slice(1).map(p => (p.vertices ?? []).map(v => [v.x, v.y] as Vec2));

  // Detect near-tolerance segments → emit dfm.dxf.tessellation-near-tolerance (warn).
  for (const poly of [outer, ...holes]) {
    let triggered = false;
    for (let i = 1; i < poly.length; i++) {
      const segLen = Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
      if (segLen > 0 && segLen <= TESSELLATION_NEAR_TOLERANCE_MM) {
        findings.push(makeFinding(
          'dfm.dxf.tessellation-near-tolerance', 'warn', 'tolerance',
          `segment length ${segLen.toFixed(3)} mm`,
        ));
        triggered = true;
        break;
      }
    }
    if (triggered) break;
  }

  const bendLines: BendLineRecord[] = bendPolys.map((p, ordinal) => {
    const verts = p.vertices ?? [];
    const start: Vec2 = [verts[0]?.x ?? 0, verts[0]?.y ?? 0];
    const end: Vec2 = [verts[verts.length - 1]?.x ?? 0, verts[verts.length - 1]?.y ?? 0];
    return {
      start, end,
      angle: 90, // angle/radius not recoverable from DXF;
      radius: 0, // rule engine cross-checks against get_bend_table when available
      ordinal,
    };
  });

  const region: Region = {
    plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
    outer, holes, bendLines,
  };
  return { ok: findings.every(f => f.severity !== 'error'), region, findings, tolerance };
}

function polylineArea(verts: ReadonlyArray<DxfVertex>): number {
  if (verts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return Math.abs(a) / 2;
}

function makeFinding(code: DiagnosticCode, severity: 'info' | 'warn' | 'error', ruleId: string, message: string): Finding {
  const spec = DIAGNOSTIC_REGISTRY[code];
  return {
    code,
    severity,
    message: message ?? spec.description,
    hint: spec.hintTemplate,
    nextAction: spec.nextAction,
    ruleId,
    ruleSource: 'direct DXF inspection',
  };
}
