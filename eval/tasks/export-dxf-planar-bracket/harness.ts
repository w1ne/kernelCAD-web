// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// eval/tasks/export-dxf-planar-bracket/harness.ts
//
// Round-trip gate for the Slice A DXF writer: run the candidate script
// through the runtime's DXF export path, parse the bytes back with the
// `dxf-parser` devDep, and assert the writer contract (one outer polyline
// on the `cut` layer; LWPOLYLINE only; `$INSUNITS = 4`; `BEND` layer
// present).

import { readFileSync } from 'node:fs';
import DxfParser from 'dxf-parser';
import { evaluateScript } from '../../oracle/kernelcad-client';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { HarnessResult } from '../../types';

interface ParsedDxfEntity {
  type: string;
  layer: string;
  vertices?: { x: number; y: number }[];
}

interface ParsedDxfLayer {
  name: string;
}

interface ParsedDxf {
  header: Record<string, number | string | undefined>;
  entities: ParsedDxfEntity[];
  tables?: {
    layer?: { layers: Record<string, ParsedDxfLayer> };
  };
}

function shoelaceArea(pts: { x: number; y: number }[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  // Run the runtime DXF path in-process; the round-trip parse is the gate.
  await initOcct();
  const code = readFileSync(scriptPath, 'utf8');
  const result = await runAndExport({ code, fileName: scriptPath, format: 'dxf' });
  const noErrors = result.diagnostics.filter(d => d.severity === 'error').length === 0;
  if (!noErrors || result.bytes.length === 0) {
    return {
      gates: { 'evaluates clean': true, 'DXF writer emits bytes': false },
      scored: {},
    };
  }

  let parsed: ParsedDxf | undefined;
  try {
    const text = new TextDecoder().decode(result.bytes);
    parsed = new DxfParser().parseSync(text) as unknown as ParsedDxf;
  } catch {
    parsed = undefined;
  }
  if (!parsed) {
    return {
      gates: { 'evaluates clean': true, 'DXF writer emits bytes': true, 'DXF re-parses': false },
      scored: {},
    };
  }

  const lwpolys = parsed.entities.filter(e => e.type === 'LWPOLYLINE');
  const cutPolys = lwpolys.filter(e => e.layer === 'cut');
  const hasSplines = parsed.entities.some(e => e.type === 'SPLINE');
  const insUnitsMm = parsed.header.$INSUNITS === 4;
  // Layer table — BEND must be declared even when no bend lines emit.
  const layerTable = parsed.tables?.layer?.layers ?? {};
  const bendLayerDeclared = Object.prototype.hasOwnProperty.call(layerTable, 'BEND');
  // Expected outer rectangle area (50 x 25 = 1250 mm^2). Allow 5% tolerance
  // for chord deflection on any straight-segment resampling.
  const outerArea = cutPolys[0]?.vertices ? shoelaceArea(cutPolys[0].vertices) : 0;
  const expectedArea = 50 * 25;
  const areaWithinTol = Math.abs(outerArea - expectedArea) <= 0.05 * expectedArea;

  return {
    gates: {
      'evaluates clean': true,
      'DXF writer emits bytes': true,
      'DXF re-parses': true,
      'cut layer carries the outer polyline': cutPolys.length >= 1,
      'LWPOLYLINE only — no SPLINE entities': !hasSplines,
      'BEND layer declared in TABLES section': bendLayerDeclared,
      '$INSUNITS = 4 (mm)': insUnitsMm,
    },
    scored: {
      'outer polygon area within 5% of nominal 50 x 25': areaWithinTol,
    },
  };
}
