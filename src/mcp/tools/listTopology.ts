// src/mcp/tools/listTopology.ts
import { runScript } from '../../script-runtime/runScript';
import { RecomputeEngine } from '../../compute/recomputeEngine';
import { OcctLowerer } from '../../backends/occt/occtLowerer';
import { initOcct, OcctBackend } from '../../backends/occt/occtBackend';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ListTopologyInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export interface ListTopologyOutput {
  ok: boolean;
  hasTrackedTopology?: boolean;
  faceNames?: string[];
  edgeCount?: number;
  error?: string;
  /** Structured diagnostic code when the underlying script-runtime exception
   *  was a `KernelError`; otherwise `cli.script.exception` for non-kernel
   *  throws. Only set on `ok=false` from the runScript catch path. */
  errorCode?: string;
}

const BOX_FACES = ['top', 'bottom', 'left', 'right', 'front', 'back'] as const;
const CYLINDER_FACES = ['top', 'bottom'] as const;

export async function listTopologyTool(input: ListTopologyInput): Promise<ListTopologyOutput> {
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

  if (run.records.length === 0) return { ok: false, error: 'Script produced no features.' };

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  if (!run.records.some(r => r.id === targetId)) {
    return { ok: false, error: `feature_id '${targetId}' not found.` };
  }

  const engine = new RecomputeEngine(new OcctLowerer());
  const result = await engine.run(run.records);
  const shape = result.shapes.get(targetId);
  if (!shape) return { ok: false, error: `Feature '${targetId}' did not lower successfully.` };

  const occt = shape as OcctBackend;
  let faceNames: string[];
  let hasTrackedTopology: boolean;

  switch (occt.kind) {
    case 'box':
      faceNames = [...BOX_FACES];
      hasTrackedTopology = true;
      break;
    case 'cylinder':
      faceNames = [...CYLINDER_FACES];
      hasTrackedTopology = true;
      break;
    case 'sphere':
      faceNames = [];
      hasTrackedTopology = true;
      break;
    default:
      faceNames = [];
      hasTrackedTopology = false;
      break;
  }

  const replicadShape = occt.getReplicadShape();
  const edgeCount = replicadShape.edges.length;

  return { ok: true, hasTrackedTopology, faceNames, edgeCount };
}
