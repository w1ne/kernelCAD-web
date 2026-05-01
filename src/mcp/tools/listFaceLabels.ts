// src/mcp/tools/listFaceLabels.ts
//
// MCP tool: list user-applied path labels on a script's sketches. Returns
// labels with their sketch FeatureId and segment chord endpoints. Lets agents
// discover the label vocabulary on a shape before referencing labels in
// fillet/chamfer/shell.

import { runScript } from '../../script-runtime/runScript';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';

export interface ListFaceLabelsInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export interface LabelSummary {
  name: string;
  sketchId: string;
  segmentKind: string;
  chord: { startX: number; startY: number; endX: number; endY: number };
}

export interface ListFaceLabelsOutput {
  ok: boolean;
  labels?: LabelSummary[];
  error?: string;
  /** Structured diagnostic code when the underlying script-runtime exception
   *  was a `KernelError`; otherwise `cli.script.exception` for non-kernel
   *  throws. Only set on `ok=false` from the runScript catch path. */
  errorCode?: string;
}

export async function listFaceLabelsTool(input: ListFaceLabelsInput): Promise<ListFaceLabelsOutput> {
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

  const labels: LabelSummary[] = [];
  for (const rec of run.records) {
    if (rec.kind !== 'sketch') continue;
    if (input.feature_id && rec.id !== input.feature_id) continue;
    const commands = (rec.metadata as { commands?: Array<{ kind: string; x?: number; y?: number; label?: string }> } | undefined)?.commands;
    if (!commands) continue;
    for (let i = 0; i < commands.length; i++) {
      const c = commands[i];
      if (!c.label) continue;
      const prev = commands[i - 1];
      labels.push({
        name: c.label,
        sketchId: rec.id,
        segmentKind: c.kind,
        chord: {
          startX: prev?.x ?? 0,
          startY: prev?.y ?? 0,
          endX: c.x ?? 0,
          endY: c.y ?? 0,
        },
      });
    }
  }
  return { ok: true, labels };
}
