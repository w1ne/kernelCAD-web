import { runScript } from '../../modeling/runtime/runScript';
import { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../modeling/backends/occt/occtLowerer';
import { exportSceneToSTEPAsync, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { exportDxf, type DxfWriterOptions } from '../../kernel/backends/occt/exportDxf';
import { export3mfAsync, type Export3mfOptions } from '../../kernel/backends/occt/export3mf';
import { sceneToWorldFrameParts, type WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { flattenPattern } from '../../kernel/backends/occt/flattenPattern';
import { isSceneBackend } from '../../kernel/backends/sceneBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import { Shape } from '../../modeling/capture/proxy';
import { Scene } from '../../modeling/validation/scene';
import { isRegion } from '../../shared/intent/region';

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

  // DXF entry path: a script that returns a `Region` (typically from
  // `Shape.flattenPattern()`) bypasses target-shape lowering — the Region's
  // outer / holes / bendLines feed straight into the polyline writer. Any
  // other format on a Region return is unsupported and falls through to
  // the normal `targetId` resolution path, which then trips
  // `export.no-shape` because the Region is not a Shape.
  if (format === 'dxf' && isRegion(run.returnValue)) {
    const opts =
      (input.options as DxfWriterOptions | undefined) ?? { format: 'dxf' };
    const bytes = exportDxf({ kind: 'region', region: run.returnValue }, opts);
    return { bytes, featureCount, diagnostics: r.diagnostics };
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
    if (format === 'dxf') {
      // DXF needs a single planar wire source; a multi-body Scene cannot
      // satisfy that contract without a caller-side choice of which face /
      // part to export. Surface the non-planar diagnostic so the agent's
      // next move is to either pick a planar face or return a Region.
      return {
        bytes: new Uint8Array(),
        featureCount,
        diagnostics: [...r.diagnostics, {
          target: 'export-occt',
          code: 'export.dxf.non-planar',
          featureId: targetId,
          severity: 'error',
          message: 'DXF export requires a planar input; received a multi-body Scene.',
          hint: 'Return a Region via Shape.flattenPattern() or a single planar face.',
          nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
        }],
      };
    }
    if (format === '3mf') {
      // 3MF natively ships multi-body scenes — one `<object>` per part with
      // distinct names + base colors. Mesh each part via the shared
      // world-frame walk, then chain through the OPC zip writer.
      const opts3mf = (input.options as Export3mfOptions | undefined) ?? { format: '3mf' };
      try {
        const worldParts = sceneToWorldFrameParts(lowered);
        const bytes = await export3mfAsync(worldParts, opts3mf);
        return { bytes, featureCount, diagnostics: r.diagnostics };
      } catch (e) {
        const notWatertight = notWatertightDiagnostic(e, r.diagnostics, featureCount, targetId);
        if (notWatertight) return notWatertight;
        throw e;
      }
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
    case 'dxf': {
      const opts =
        (input.options as DxfWriterOptions | undefined) ?? { format: 'dxf' };
      // Sheet-metal Shape entry path: if the target Shape's lineage chain
      // roots at a `sheetMetal` record, recover the flat-pattern Region by
      // walking `flattenPattern(records, targetId)` and ship it through the
      // polyline writer. This is the same Region that
      // `Shape.flattenPattern()` would produce — recomputed inside the
      // runtime so the user script can return the bent body directly
      // without needing `require` inside the vm sandbox.
      const tracesToSheetMetal = (() => {
        const byId = new Map(run.records.map(rec => [rec.id, rec]));
        let cur = byId.get(targetId);
        // Bound the walk by the record count — a healthy graph terminates
        // quickly; an inputs.base cycle would otherwise spin forever.
        for (let i = 0; cur && i <= run.records.length; i++) {
          if (cur.kind === 'sheetMetal') return true;
          const baseRef = cur.inputs.base;
          if (!baseRef || baseRef.kind !== 'feature') return false;
          cur = byId.get(baseRef.id);
        }
        return false;
      })();
      if (tracesToSheetMetal) {
        try {
          const region = flattenPattern(run.records, targetId);
          const bytes = exportDxf({ kind: 'region', region }, opts);
          return { bytes, featureCount, diagnostics: r.diagnostics };
        } catch (e) {
          const errCode = (e as { code?: string }).code;
          const msg = e instanceof Error ? e.message : String(e);
          const hint = (e as { hint?: string }).hint;
          // Pass through structured diagnostics like
          // `feature.flattenPattern.multi-bend-unsupported`; downgrade
          // anything else to `export.dxf.non-planar` so callers see a
          // catalog-known code.
          if (errCode === 'feature.flattenPattern.multi-bend-unsupported') {
            return {
              bytes: new Uint8Array(),
              featureCount,
              diagnostics: [...r.diagnostics, {
                target: 'export-occt',
                code: 'feature.flattenPattern.multi-bend-unsupported',
                featureId: targetId,
                severity: 'error',
                message: msg,
                hint: hint ?? 'Flatten an upstream Shape with at most two bends, or wait for the multi-bend slice.',
                nextAction: NEXT_ACTIONS['feature.flattenPattern.multi-bend-unsupported'],
              }],
            };
          }
          return {
            bytes: new Uint8Array(),
            featureCount,
            diagnostics: [...r.diagnostics, {
              target: 'export-occt',
              code: 'export.dxf.non-planar',
              featureId: targetId,
              severity: 'error',
              message: `DXF export could not flatten the sheet-metal chain: ${msg}`,
              hint: hint ?? 'Inspect the sheetMetal root and bends, then retry. Return a Region directly to bypass.',
              nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
            }],
          };
        }
      }
      // Planar `Shape` entry path: extract the outer (and any hole) wires
      // from a single planar face and ship them through the polyline writer.
      // A `null` return from `tryExtractPlanarWires` means the shape carries
      // no planar face we can flatten — emit the non-planar diagnostic so
      // the agent can pick a face explicitly or switch to `flattenPattern()`.
      const planarWires = shape.tryExtractPlanarWires();
      if (!planarWires) {
        return {
          bytes: new Uint8Array(),
          featureCount,
          diagnostics: [...r.diagnostics, {
            target: 'export-occt',
            code: 'export.dxf.non-planar',
            featureId: targetId,
            severity: 'error',
            message: 'DXF export requires a planar input (Region, planar face, or planar wire).',
            hint: 'Call list_faces to pick a planar face, or return a Region via Shape.flattenPattern().',
            nextAction: NEXT_ACTIONS['export.dxf.non-planar'],
          }],
        };
      }
      const bytes = exportDxf(
        {
          kind: 'planarWires',
          outer: planarWires.outer,
          holes: planarWires.holes,
        },
        opts,
      );
      return { bytes, featureCount, diagnostics: r.diagnostics };
    }
    case '3mf': {
      // Single-shape 3MF: wrap in a one-part `WorldFramePart[]` so the
      // writer can mesh + emit identically to the Scene path.
      const opts3mf = (input.options as Export3mfOptions | undefined) ?? { format: '3mf' };
      const part: WorldFramePart = { name: 'part', shape };
      try {
        const bytes = await export3mfAsync([part], opts3mf);
        return { bytes, featureCount, diagnostics: r.diagnostics };
      } catch (e) {
        const notWatertight = notWatertightDiagnostic(e, r.diagnostics, featureCount, targetId);
        if (notWatertight) return notWatertight;
        throw e;
      }
    }
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

/**
 * Translate an `assertWatertight` Error into the structured
 * `export.3mf.not-watertight` diagnostic. Returns `undefined` when the
 * error doesn't look like a watertight failure so callers can rethrow.
 */
function notWatertightDiagnostic(
  e: unknown,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  targetId: string | undefined,
): ExportResult | undefined {
  const msg = e instanceof Error ? e.message : String(e);
  if (!/watertight/i.test(msg)) return undefined;
  return {
    bytes: new Uint8Array(),
    featureCount,
    diagnostics: [...diagnostics, {
      target: 'export-occt',
      code: 'export.3mf.not-watertight',
      featureId: targetId,
      severity: 'error',
      message: '3MF export requires a watertight mesh; the exported triangulation has non-manifold edges.',
      hint: 'The mesh has open or non-manifold edges. Inspect the source geometry (typically a self-intersecting cone or non-closed shell) and re-author the offending surface via nurbsSurfaceLowerer, raise OCCT mesh deflection, or re-mesh via Manifold; see the K1 mesher gap.',
      nextAction: NEXT_ACTIONS['export.3mf.not-watertight'],
    }],
  };
}
