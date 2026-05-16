// src/mcp/tools/getBendTable.ts
//
// W2.2: MCP `get_bend_table` tool — list every sheetMetalBend in the script
// with its K-factor bend allowance, axis line, angle, radius, and the parent
// sheetMetal thickness + kFactor.

import { readFileSync } from 'node:fs';
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../kernel/backends/occt/occtLowerer';
import { computeBendAllowance } from '../../modules/sheetMetal';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../intent/types';

export interface GetBendTableInput {
  file?: string;
  code?: string;
}

export interface GetBendTableOutput {
  ok: boolean;
  rootSheetMetal?: { thickness: number; kFactor: number };
  bends: Array<{
    ordinal: number;
    featureId: string;
    angle: number;
    radius: number;
    bendAllowance: number;
    axisOrigin: Vec3;
    axisDirection: Vec3;
  }>;
  diagnostics: CompilerDiagnostic[];
}

export async function getBendTableTool(input: GetBendTableInput): Promise<GetBendTableOutput> {
  const code = input.code ?? (input.file ? readFileSync(input.file, 'utf-8') : undefined);
  if (!code) {
    return {
      ok: false, bends: [],
      diagnostics: [{
        target: 'export-occt',
        code: 'cli.invalid-args',
        severity: 'error',
        message: 'get_bend_table: either { file } or { code } is required.',
        hint: 'Pass either a file path or inline code.',
      }],
    };
  }
  const { records } = await runScript({ code, fileName: input.file ?? 'inline.kcad.ts' });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  const root = records.find(rec => rec.kind === 'sheetMetal');
  if (!root) {
    return {
      ok: false, bends: [],
      diagnostics: [
        ...r.diagnostics,
        {
          target: 'export-occt', code: 'feature.invalid-args', severity: 'error',
          message: 'get_bend_table: script contains no sheetMetal(...) record.',
          hint: 'Build the body with sheetMetal(sketch, opts) and chain .bend() calls.',
        },
      ],
    };
  }
  const kFactor = root.params.kFactor.evaluated;
  const thickness = root.params.thickness.evaluated;
  const bends = records
    .filter(rec => rec.kind === 'sheetMetalBend')
    .map((rec, ordinal) => {
      const angle = rec.params.angle.evaluated;
      const radius = rec.params.radius.evaluated;
      const bendAllowance = computeBendAllowance({
        angleDeg: angle, radius, kFactor, thickness,
      });
      const br = (rec.metadata as { bendRecord?: { axisOrigin: Vec3; axisDirection: Vec3 } } | undefined)?.bendRecord;
      return {
        ordinal,
        featureId: rec.id,
        angle, radius, bendAllowance,
        axisOrigin: br?.axisOrigin ?? [0, 0, 0] as Vec3,
        axisDirection: br?.axisDirection ?? [1, 0, 0] as Vec3,
      };
    });
  return {
    ok: true,
    rootSheetMetal: { thickness, kFactor },
    bends,
    diagnostics: r.diagnostics,
  };
}
