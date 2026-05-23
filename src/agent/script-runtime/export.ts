import { runScript } from '../../modeling/runtime/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { exportSceneToSTEPAsync, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { Shape } from '../../modeling/capture/proxy';
import { Scene } from '../../modeling/validation/scene';

export type ExportFormat =
  | 'stl' | 'step' | 'dxf' | '3mf' | 'glb'
  | 'urdf' | 'srdf' | 'sdf-gazebo';

/** Per-format option payloads. The union member is selected by `format`. */
export type ExportOptions =
  | { format: 'stl' }
  | { format: 'step'; unit?: 'mm' | 'cm' | 'in' }
  | { format: 'dxf'; layers?: DxfLayerSpec[]; unit?: 'mm' | 'cm' | 'in'; tolerance?: number }
  | { format: '3mf'; printUnit?: 'mm' | 'cm' | 'in'; embedSource?: boolean }
  | { format: 'glb'; axis?: 'y-up' | 'z-up'; draco?: false }
  | { format: 'urdf' }
  | { format: 'srdf' }
  | { format: 'sdf-gazebo' };

export interface DxfLayerSpec {
  name: string;
  color?: string;
  lineWeight?: number;
  lineType?: 'continuous' | 'dashed' | 'phantom';
  filter?: 'all' | { partName: string };
}

export interface ExportInput {
  code: string;
  fileName: string;
  format: ExportFormat;
  /** Optional: which feature to export. Defaults to the returned value or last captured feature. */
  feature_id?: string;
  /** Optional: absolute directory of the source script. Threaded into the
   *  API context so `lib.fromSTEP('parts/foo.step')` resolves. */
  scriptDir?: string;
  /** Per-format options. Discriminator `options.format` must equal top-level `format`. */
  options?: ExportOptions;
}

export interface ExportResult {
  bytes: Uint8Array;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
}

export async function runAndExport(input: ExportInput): Promise<ExportResult> {
  const { code, fileName, format, feature_id, scriptDir } = input;

  if (input.options && input.options.format !== input.format) {
    return {
      bytes: new Uint8Array(),
      featureCount: 0,
      diagnostics: [{
        target: 'export-occt',
        code: 'export.options-format-mismatch',
        severity: 'error',
        message: `options.format ('${input.options.format}') must equal format ('${input.format}').`,
        hint: 'Set options.format to the same value as the top-level format, or omit options.',
        nextAction: NEXT_ACTIONS['export.options-format-mismatch'],
      }],
    };
  }

  const run = await runScript({ code, fileName, scriptDir });
  const engine = new RecomputeEngine(createOcctLowerer(run.session));
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
          nextAction: NEXT_ACTIONS['export.feature-not-found'],
        }],
      };
    }
    targetId = feature_id;
  } else {
    const ret = run.returnValue;
    if (ret instanceof Shape) {
      targetId = ret.id;
    } else if (ret instanceof Scene) {
      // Scene return → use the upstream solvedAssembly / assemblyModel
      // feature id so STEP export routes through the Scene-aware
      // multi-body path (preserves part names + role colors).
      targetId = ret.__sourceFeatureId();
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
        nextAction: NEXT_ACTIONS['export.no-shape'],
      }],
    };
  }

  const lowered = r.shapes.get(targetId);
  if (!lowered) {
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
        nextAction: NEXT_ACTIONS['recompute.input.missing'],
      }],
    };
  }

  // Scene-aware path: STEP export of a SceneBackend ships a STEP file
  // with one named body per part (replicad.exportSTEP(ShapeConfig[])
  // writes XCAFDoc names + colors). For STL we still need a single mesh,
  // so fall back to the boolean union via assemblyExport(union).
  if (isSceneBackend(lowered)) {
    if (format === 'step') {
      const bytes = await exportSceneToSTEPAsync(lowered);
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    // STL of a Scene: caller must explicitly fuse via Scene.toUnion() /
    // Scene.toCompound() upstream — surface a structured diagnostic
    // pointing at the right call.
    return {
      bytes: new Uint8Array(),
      featureCount,
      diagnostics: [...r.diagnostics, {
        target: 'export-occt',
        code: 'export.no-shape',
        featureId: targetId,
        severity: 'error',
        message: 'STL export of a Scene requires an explicit Scene.toUnion() or Scene.toCompound() upstream.',
        hint: 'Return arm.solvedModel(poses).toUnion() (or .toCompound()) for STL; STEP export accepts the Scene directly and preserves per-part names + colors.',
        nextAction: NEXT_ACTIONS['export.no-shape'],
      }],
    };
  }

  const shape = lowered as OcctBackend;
  switch (format) {
    case 'stl': {
      const bytes = await shape.exportSTLAsync();
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    case 'step': {
      const bytes = await shape.exportSTEPAsync();
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    case 'dxf':
    case '3mf':
    case 'glb':
    case 'urdf':
    case 'srdf':
    case 'sdf-gazebo': {
      const code = `export.${format}.not-implemented` as const;
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...r.diagnostics, {
          target: 'export-occt',
          code,
          severity: 'error',
          message: `Export format '${format}' is not yet implemented in this build.`,
          hint: `Pick a supported format (stl, step) for now; '${format}' will land in an upcoming slice.`,
          nextAction: NEXT_ACTIONS[code],
        }],
      };
    }
  }
}
