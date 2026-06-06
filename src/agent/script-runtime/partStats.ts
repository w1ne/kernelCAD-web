// src/agent/script-runtime/partStats.ts
//
// Stats-only view of a solved assembly's parts — shared by the
// `kernelcad parts` CLI command and the MCP list_part_stats tool. Reuses
// the same Scene resolution as `runAndExportParts` (resolveWorldFrameScene)
// so part names and world-frame placement match the per-part STL exporter
// exactly.

import { meshShapeForExport } from '../../kernel/backends/occt/occtBackend';
import { resolveWorldFrameScene } from './export';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';

export interface PartStats {
  name: string;
  /** Tessellation-tight (exact) world-frame bounding box, mm. */
  bbox: { min: [number, number, number]; max: [number, number, number] };
  volumeMm3: number;
  surfaceAreaMm2: number;
  /** Triangle count of the export-grade mesh (same mesher as STL export). */
  triangleCount: number;
}

export interface ListPartStatsInput {
  code: string;
  fileName: string;
  scriptDir?: string;
}

export interface ListPartStatsResult {
  parts: PartStats[];
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

/**
 * Run a script returning `assembly.model()` / `assembly.solvedModel(...)`
 * and report per-part stats: exact bbox, volume, surface area, and the
 * export-mesh triangle count.
 */
export async function listPartStats(input: ListPartStatsInput): Promise<ListPartStatsResult> {
  const resolved = await resolveWorldFrameScene(input);
  if (!resolved.parts) {
    return { parts: [], featureCount: resolved.featureCount, diagnostics: resolved.diagnostics };
  }
  const parts: PartStats[] = resolved.parts.map((p) => {
    const mesh = meshShapeForExport(p.shape.getReplicadShape());
    const bb = p.shape.boundingBox({ exact: true });
    return {
      name: p.name,
      bbox: {
        min: [bb.min[0], bb.min[1], bb.min[2]],
        max: [bb.max[0], bb.max[1], bb.max[2]],
      },
      volumeMm3: p.shape.volume(),
      surfaceAreaMm2: p.shape.surfaceArea(),
      triangleCount: mesh.triangles.length / 3,
    };
  });
  return { parts, featureCount: resolved.featureCount, diagnostics: resolved.diagnostics };
}
