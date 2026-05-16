// src/mcp/tools/flattenPattern.ts
//
// W2.2: MCP `flatten_pattern` tool — return the unfolded 2D outline of a
// bent sheet-metal Shape as a Region (closed polyline + holes + bend lines).

import { readFileSync } from 'node:fs';
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { OcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { flattenPattern } from '../../kernel/backends/occt/flattenPattern';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { Vec3 } from '../../intent/types';
import type { Vec2 } from '../../intent/region';

export interface FlattenPatternInput {
  /** Path to a .kcad.ts script. Either `file` or `code` is required. */
  file?: string;
  /** Inline source. */
  code?: string;
  /** Optional: a specific feature id to flatten. Defaults to the last record. */
  featureId?: string;
}

export interface FlattenPatternOutput {
  ok: boolean;
  region?: {
    plane: { origin: Vec3; normal: Vec3 };
    outer: Vec2[];
    holes: Vec2[][];
    bendLines: Array<{
      start: Vec2;
      end: Vec2;
      angle: number;
      radius: number;
      ordinal: number;
    }>;
  };
  diagnostics: CompilerDiagnostic[];
}

export async function flattenPatternTool(input: FlattenPatternInput): Promise<FlattenPatternOutput> {
  const code = input.code ?? (input.file ? readFileSync(input.file, 'utf-8') : undefined);
  if (!code) {
    return {
      ok: false,
      diagnostics: [{
        target: 'export-occt',
        code: 'cli.invalid-args',
        severity: 'error',
        message: 'flatten_pattern: either { file } or { code } is required.',
        hint: 'Pass either a file path or inline code.',
      }],
    };
  }
  let records;
  try {
    ({ records } = await runScript({ code, fileName: input.file ?? 'inline.kcad.ts' }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      diagnostics: [{
        target: 'export-occt',
        code: 'cli.script-exception',
        severity: 'error',
        message: msg,
        hint: 'Fix the script and rerun.',
      }],
    };
  }
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(records);
  try {
    const region = flattenPattern(records, input.featureId);
    return {
      ok: true,
      region: {
        plane: region.plane,
        outer: region.outer,
        holes: region.holes,
        bendLines: region.bendLines,
      },
      diagnostics: r.diagnostics,
    };
  } catch (e) {
    const code = (e as { code?: string }).code ?? 'feature.invalid-args';
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      diagnostics: [
        ...r.diagnostics,
        {
          target: 'export-occt',
          code: code as CompilerDiagnostic['code'],
          severity: 'error',
          message: msg,
          hint: (e as { hint?: string }).hint ?? '',
        },
      ],
    };
  }
}
