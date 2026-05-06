import { runScript } from './runScript';
import { RecomputeEngine } from '../compute/recomputeEngine';
import { OcctLowerer } from '../backends/occt/occtLowerer';
import type { OcctBackend } from '../backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../diagnostics/diagnostic';
import { Shape } from '../capture/proxy';

export type ExportFormat = 'stl' | 'step';

export interface ExportInput {
  code: string;
  fileName: string;
  format: ExportFormat;
  /** Optional: which feature to export. Defaults to the returned value or last captured feature. */
  feature_id?: string;
}

export interface ExportResult {
  bytes: Uint8Array;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

export async function runAndExport(input: ExportInput): Promise<ExportResult> {
  const { code, fileName, format, feature_id } = input;
  const run = await runScript({ code, fileName });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const featureCount = run.records.length;

  const fatal = r.diagnostics.filter(d => d.severity === 'error');
  if (fatal.length > 0) {
    return { bytes: new Uint8Array(), featureCount, diagnostics: r.diagnostics };
  }

  let targetId: string | undefined;
  if (feature_id !== undefined) {
    // Explicit feature_id: verify it exists in captured records
    const record = run.records.find(rec => rec.id === feature_id);
    if (!record) {
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...r.diagnostics, {
          target: 'export-occt',
          code: 'export.feature-not-found',
          featureId: feature_id,
          severity: 'error',
          message: `feature_id '${feature_id}' not found in script's features.`,
          hint: 'Use list_features to see available IDs, or omit feature_id to export the script\'s return value.',
        }],
      };
    }
    targetId = feature_id;
  } else {
    const ret = run.returnValue;
    if (ret instanceof Shape) {
      targetId = ret.id;
    } else if (run.records.length > 0) {
      targetId = run.records[run.records.length - 1].id;
    }
  }
  if (!targetId) {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        severity: 'error',
        message: 'Script produced no shapes to export.',
        hint: 'End the script with `return <shape>`.',
      }],
    };
  }

  const shape = r.shapes.get(targetId) as OcctBackend | undefined;
  if (!shape) {
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'recompute.input.missing',
        featureId: targetId,
        severity: 'error',
        message: `Target shape '${targetId}' did not lower successfully.`,
        hint: 'Walk the upstream chain with why_did_this_fail to find the root cause.',
      }],
    };
  }

  const bytes = format === 'stl'
    ? await shape.exportSTLAsync()
    : await shape.exportSTEPAsync();

  return { bytes, featureCount, diagnostics: r.diagnostics };
}
