// src/mcp/tools/listEdges.ts
//
// MCP tool: list edges of a kernelCAD shape with optional EdgeQuery filter.
// Lets agents introspect any shape (primitives, booleans, transformed solids,
// imported geometry) before running fillet/chamfer.

import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../backends/occt/occtBackend';
import { selectEdges, type EdgeQuery, type EdgeSegment } from '../../backends/occt/edgeQueries';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ListEdgesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  query?: EdgeQuery;
}

export interface ListEdgesOutput {
  ok: boolean;
  edges?: EdgeSegment[];
  error?: string;
  /** Structured diagnostic code when the underlying script-runtime exception
   *  was a `KernelError`; otherwise `cli.script.exception` for non-kernel
   *  throws. Only set on `ok=false` from the runScript catch path. */
  errorCode?: string;
}

export async function listEdgesTool(input: ListEdgesInput): Promise<ListEdgesOutput> {
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
    return { ok: false, error: `Feature '${targetId}' has no lowered shape.` };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }

  const edges = selectEdges(shape, input.query ?? {});
  return { ok: true, edges };
}
