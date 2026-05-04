// src/mcp/tools/listFaceLabels.ts
//
// MCP tool: list user-applied labels visible in a script — both sketch-segment
// labels (path().label('rim')) and creating-op faceLabels
// (box(..., { faceLabels: { ... } })). Returns labels with their source kind
// so agents can disambiguate. Lets agents discover the label vocabulary on a
// shape before referencing labels in fillet/chamfer/shell.

import { runScript } from '../../script-runtime/runScript';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { kernelErrorToDiagnostic } from '../../script-runtime/kernelErrorToDiagnostic';
import type { CanonicalFace } from '../../intent/types';
import type { FaceQuery } from '../../backends/occt/edgeQueries';
import type { FaceLabelsMap } from '../../intent/featureRecord';

export interface ListFaceLabelsInput {
  file?: string;
  code?: string;
  feature_id?: string;
}

export type LabelSummary =
  | {
      name: string;
      source: 'sketch-segment';
      sketchId: string;
      segmentKind: string;
      chord: { startX: number; startY: number; endX: number; endY: number };
    }
  | {
      name: string;
      source: 'faceLabels';
      featureId: string;
      featureKind: string;
      // exactly one of these is set:
      canonical?: CanonicalFace;
      query?: FaceQuery;
    };

export interface ListFaceLabelsOutput {
  ok: boolean;
  labels?: LabelSummary[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on the script-runtime
   *  exception path: `KernelError` code (e.g. `feature.path.duplicate-label`)
   *  or `cli.script.exception` for non-kernel throws. (This tool walks records
   *  without lowering, so there's no lowering-error path here.) */
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

  // ── Sketch-segment labels ──────────────────────────────────────────────────
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
        source: 'sketch-segment',
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

  // ── faceLabels from creating-op metadata ──────────────────────────────────
  for (const rec of run.records) {
    if (input.feature_id && rec.id !== input.feature_id) continue;
    const fl = (rec.metadata as { faceLabels?: FaceLabelsMap } | undefined)?.faceLabels;
    if (!fl) continue;
    for (const [name, value] of Object.entries(fl)) {
      if (typeof value === 'string') {
        labels.push({
          name,
          source: 'faceLabels',
          featureId: rec.id,
          featureKind: rec.kind,
          canonical: value,
        });
      } else {
        labels.push({
          name,
          source: 'faceLabels',
          featureId: rec.id,
          featureKind: rec.kind,
          query: value,
        });
      }
    }
  }

  return { ok: true, labels };
}
