// src/agent/mcp/tools/listPartStats.ts
//
// Stats-only MCP view of a solved assembly's parts — name, exact bbox,
// volume, surface area, and export-mesh triangle count. Backed by the
// shared script-runtime `listPartStats` so the numbers match the
// `kernelcad parts` CLI command and the per-part STL exporter exactly.

import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import { listPartStats, type PartStats } from '../../script-runtime/partStats';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { loadMcpScriptSource } from '../runMcpScript';

export interface ListPartStatsInput {
  file?: string;
  code?: string;
}

export interface ListPartStatsOutput {
  ok: boolean;
  parts?: PartStats[];
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP `list_part_stats` tool — list solved-assembly parts with print-prep
 * stats: name, exact world-frame bounding box (from the export
 * tessellation), volume (mm^3), surface area (mm^2), and export triangle
 * count. Pass either `{ file }` or `{ code }`.
 *
 * Returns `{ ok, parts: [{ name, bbox, volumeMm3, surfaceAreaMm2, triangleCount }], diagnostics }`.
 */
export async function listPartStatsTool(input: ListPartStatsInput): Promise<ListPartStatsOutput> {
  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  await initOcct();

  let result;
  try {
    result = await listPartStats({
      code: source.code,
      fileName: source.fileName,
      scriptDir: input.file !== undefined ? dirname(resolve(input.file)) : undefined,
    });
  } catch (e) {
    return {
      ok: false,
      error: `Part stats failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const errorDiagnostics = result.diagnostics.filter(d => d.severity === 'error');
  if (errorDiagnostics.length > 0) {
    return { ok: false, diagnostics: withNextActions(result.diagnostics) };
  }

  return {
    ok: true,
    parts: result.parts,
    diagnostics: withNextActions(result.diagnostics),
  };
}
