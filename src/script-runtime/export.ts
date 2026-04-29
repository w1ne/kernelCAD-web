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
}

export interface ExportResult {
  bytes: Uint8Array;
  diagnostics: CompilerDiagnostic[];
}

export async function runAndExport(input: ExportInput): Promise<ExportResult> {
  const { code, fileName, format } = input;
  const run = await runScript({ code, fileName });
  const engine = new RecomputeEngine(new OcctLowerer());
  const r = await engine.run(run.records);

  const fatal = r.diagnostics.filter(d => d.severity === 'error');
  if (fatal.length > 0) {
    return { bytes: new Uint8Array(), diagnostics: r.diagnostics };
  }

  const ret = run.returnValue;
  let targetId: string | undefined;
  if (ret instanceof Shape) {
    targetId = ret.id;
  } else if (run.records.length > 0) {
    targetId = run.records[run.records.length - 1].id;
  }
  if (!targetId) {
    return {
      bytes: new Uint8Array(),
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        severity: 'error',
        message: 'Script produced no shapes to export.',
      }],
    };
  }

  const shape = r.shapes.get(targetId) as OcctBackend | undefined;
  if (!shape) {
    return {
      bytes: new Uint8Array(),
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.shape-not-lowered',
        featureId: targetId,
        severity: 'error',
        message: `Target shape '${targetId}' did not lower successfully.`,
      }],
    };
  }

  const bytes = format === 'stl'
    ? await shape.exportSTLAsync()
    : await shape.exportSTEPAsync();

  return { bytes, diagnostics: r.diagnostics };
}
