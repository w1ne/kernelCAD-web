// src/mcp/tools/listFaces.ts
//
// MCP tool: list faces of a kernelCAD shape with optional FaceQuery filter.

import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../backends/occt/occtBackend';
import { resolveFaceQuery, type FaceQuery } from '../../backends/occt/edgeQueries';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Face } from 'replicad';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ListFacesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  query?: FaceQuery;
}

export interface FaceSummary {
  id: string;
  centroid: [number, number, number];
  normal: [number, number, number];
  surfaceType: string;
  area: number;
  label: string | null;
}

export interface ListFacesOutput {
  ok: boolean;
  faces?: FaceSummary[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code or
   *  `cli.script.exception` for non-kernel throws; (2) lowering-error path →
   *  the first error diagnostic's `code`. */
  errorCode?: string;
}

export async function listFacesTool(input: ListFacesInput): Promise<ListFacesOutput> {
  await initOcct();

  let code: string;
  let fileName: string;
  if (input.code !== undefined) {
    code = input.code;
    fileName = input.file ?? '<inline>';
  } else if (input.file !== undefined) {
    const filePath = resolve(input.file);
    fileName = filePath;
    try {
      code = await readFile(filePath, 'utf8');
    } catch (e) {
      return { ok: false, error: `Cannot read file: ${e instanceof Error ? e.message : String(e)}` };
    }
  } else {
    return { ok: false, error: 'Must provide either { file } or { code }.' };
  }

  let run;
  try {
    run = await runScript({ code, fileName });
  } catch (e) {
    const diag = kernelErrorToDiagnostic(e);
    return { ok: false, error: diag.message, errorCode: diag.code };
  }
  if (run.records.length === 0) {
    return { ok: false, error: 'Script returned no features.' };
  }

  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records);

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const shape = r.shapes.get(targetId);
  if (!shape) {
    const fatal = r.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' has no lowered shape: ${fatal.message}`
        : `Feature '${targetId}' has no lowered shape.`,
      errorCode: fatal?.code,
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }

  const matchedFaces = resolveFaceQuery(shape, input.query ?? {});
  const allFaces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;

  const faces: FaceSummary[] = matchedFaces.map(f => {
    const idx = allFaces.indexOf(f);
    const c = f.center;
    const n = f.normalAt();
    return {
      id: `f${idx}`,
      centroid: [c.x, c.y, c.z],
      normal: [n.x, n.y, n.z],
      surfaceType: (f as unknown as { geomType?: string }).geomType ?? 'UNKNOWN',
      area: (f as unknown as { area?: number }).area ?? 0,
      label: null,
    };
  });

  return { ok: true, faces };
}
