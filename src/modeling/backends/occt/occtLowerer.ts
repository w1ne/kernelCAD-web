// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type {
  FeatureLowerer,
  BackendTarget,
  ResolvedInputs,
  LowerResult,
  ShapeBackend,
} from '../../../kernel/backends/backend';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { FeatureId, FeatureKind, Param, Vec3, Vec3Param } from '../../../shared/intent/types';
import { forwardKinematics, type NumericPoses } from '../../capture/forwardKinematics';
import type { AssemblyJointStored, AssemblyPartStored } from '../../capture/assembly';
import { mateFk, type ResolvedMatePart } from '../../mates/solver';
import { expandCoupledPoses, type MateCouplingRecord } from '../../mates/coupledPoses';
import type { Connector } from '../../mates/connector';
import type { MateRecord } from '../../mates/mate';
import type { MateType } from '../../mates/mateTypes';
import { resolveTopologyOriginOnBackend } from './connectorTopology';
import { KernelError } from '../../../shared/intent/kernelError';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { isSceneBackend, type SceneBackend, type SceneBackendPart } from '../../../kernel/backends/sceneBackend';
import { lookupSourceColor, lookupSourceMaterial } from '../../../kernel/backends/occt/lookupSourceColor';
import { Transform } from '../../../shared/runtime/se3';
import * as replicad from 'replicad';
import type { LowerContext } from './lowerers/context';
import { normalizeAxis, readVec3Param } from './lowerers/helpers';
import { lowerBoolean } from './lowerers/boolean';
import { applyVariableEdgeFeature, lowerChamfer, lowerFillet } from './lowerers/edgeFeatures';
import { lowerLoft } from './lowerers/loft';
import { lowerDraft, lowerShell } from './lowerers/shellDraft';
import { lowerSweep } from './lowerers/sweep';
import {
  lowerCurve3d,
  lowerEmbossText,
  lowerProjectCurve,
  lowerVariableSweep,
} from './lowerers/curves';
import { lowerCutout, lowerHole, lowerHoles } from './lowerers/holes';
import { lowerMirror, lowerPattern } from './lowerers/mirrorPattern';
import { lowerSheetMetal, lowerSheetMetalBend } from './lowerers/sheetMetal';
import {
  lowerSurfaceSew,
  lowerSurfaceThicken,
  lowerSurfaceToShape,
} from './lowerers/surfaces';
import { lowerImported, lowerSdfMaterialize } from './lowerers/imported';
import { lowerBox, lowerCylinder, lowerSphere } from './lowerers/primitives';
import { lowerRevolve } from './lowerers/revolve';
import { lowerExtrude, lowerSketch } from './lowerers/sketchExtrude';
import { applyTransforms, finishLowering } from './lowerers/transforms';

// `normalizeAxis` and `applyVariableEdgeFeature` moved into lowerers/;
// re-exported here so the public import path stays
// `backends/occt/occtLowerer`.
export { normalizeAxis };
export { applyVariableEdgeFeature };

/**
 * Lowers `FeatureRecord`s to `OcctBackend` shapes.
 *
 * Owns dispatch from the intent IR (`box`, `cylinder`, `sphere`, `extrude`,
 * `revolve`, `boolean`) to OCCT primitives, then applies any post-hoc
 * `record.transforms` in order. Boolean ops walk `inputs.byKey`: `base` is
 * the LHS, all keys starting with `cutter_` (lexicographically sorted) are
 * the operand sequence applied in left-to-right order.
 *
 * Operations not supported in v0.1 produce a single error `CompilerDiagnostic`
 * rather than throwing, so callers can collect diagnostics for a whole tree.
 */
/** v0.5: build a lowerer pre-wired with a session's imported STEP geometry.
 *  Use from any code that ran `runScript` and then needs to lower the
 *  resulting records — without this, `importedStep` records error out
 *  because the lowerer's `importedGeometry` map is empty. */
export function createOcctLowerer(
  session?: {
    importedGeometry: Map<string, ShapeBackend>;
    scriptDir?: string;
    /** W1.3: surface-record lookup. Optional for callers that don't ship NURBS. */
    getSurfaceRecord?: (
      id: import('../../../shared/intent/surfaceRecord').SurfaceId,
    ) => import('../../../shared/intent/surfaceRecord').SurfaceRecord | undefined;
  },
): OcctLowerer {
  const lowerer = new OcctLowerer();
  if (session) {
    lowerer.importedGeometry = session.importedGeometry;
    lowerer.scriptDir = session.scriptDir;
    if (session.getSurfaceRecord) {
      lowerer.getSurfaceRecord = session.getSurfaceRecord.bind(session);
    }
  }
  return lowerer;
}

export class OcctLowerer implements FeatureLowerer {
  readonly target: BackendTarget = 'export-occt';
  readonly supports: ReadonlySet<FeatureKind> = new Set<FeatureKind>([
    'box',
    'cylinder',
    'sphere',
    'extrude',
    'revolve',
    'boolean',
    'fillet',
    'chamfer',
    'shell',
    'sketch',    // NEW
    'sweep',     // NEW (v0.13.0-rc.8)
    'loft',      // NEW (v0.13.0-rc.10)
    'mirror',    // NEW (v0.13.0-rc.13)
    'pattern',
    'importedStep',  // v0.5: lib.fromSTEP(path)
    'importedBrep',  // lib.fromBREP(path) — OCCT native, exact B-rep
    'importedStl',   // lib.fromSTL(path)  — sewn triangle mesh (faceted)
    'assemblyPart',
    'assemblyJoint',
    'assemblyConnect',
    'assemblyModel',
    'solvedAssembly',
    'assemblyExport',
    'surfaceThicken',   // W1.3
    'surfaceToShape',   // W1.3
    'surfaceSew',       // NURBS Slice E (5): stitch N surface faces into a closed solid
    'sheetMetal',       // W2.2
    'sheetMetalBend',   // W2.2
    'sdfMaterialize',   // W2.3
    'referenceImage',   // virtual — no BREP; defense-in-depth guard
    'renderEnvironment',// W2: HDRI / IBL virtual record; defense-in-depth guard
    'cameraTarget',     // Script-callable camera look-at override; virtual record; defense-in-depth guard
    'dfmSpec',          // W3: print-prep gate declaration; virtual record; defense-in-depth guard
    'feaStudy',         // structural study declaration; virtual record; defense-in-depth guard
    'drawingDatum',     // GD&T datum declaration for svg-drawing; virtual record; defense-in-depth guard
    'drawingTolerance', // GD&T tolerance declaration for svg-drawing; virtual record; defense-in-depth guard
    'curve3d',          // NURBS Slice B: 3D NURBS curve → TopoDS_Edge on session.importedGeometry
    'variableSweep',    // NURBS Slice B Task 8: BRepOffsetAPI_MakePipeShell along a 3D spine
    'embossText',       // W3: emboss/engrave text onto a face (raise or recess via signed depth)
    'projectCurve',     // W3: project a closed 2D curve onto a face (open-wire mode deferred)
  ]);

  /** v0.5: pre-lowered geometry for `importedStep` records, populated by
   *  `lib.fromSTEP(path)` at script-run time. Keyed by feature id; threaded
   *  in by the script-runtime caller after the script returns. */
  importedGeometry: Map<string, ShapeBackend> = new Map();

  /** W1.3: per-lowerer-instance cache mapping `SurfaceId` to the resolved
   *  surface (either a single Replicad Face for `nurbsSurface`, or a
   *  multi-face shell for `surfaceFromCurves`). Populated lazily on first
   *  surface ref consumption per surface id; reused across `surfaceThicken`
   *  / `surfaceToShape` records that point at the same surface. */
  surfaceCache: Map<
    import('../../../shared/intent/surfaceRecord').SurfaceId,
    import('../../../kernel/backends/occt/nurbsSurfaceLowerer').BuiltSurface
  > = new Map();

  /** W1.3: optional session hook to look up a SurfaceRecord by id at lower
   *  time. Provided by `createOcctLowerer(session)`; undefined if the lowerer
   *  was instantiated without a session (legacy / unit-test code paths). */
  getSurfaceRecord?: (
    id: import('../../../shared/intent/surfaceRecord').SurfaceId,
  ) => import('../../../shared/intent/surfaceRecord').SurfaceRecord | undefined;

  /** v0.6: absolute directory of the calling `.kcad.ts` script. Used by the
   *  text lowerer to resolve relative `fontPath(...)` arguments. */
  scriptDir?: string;

  /** Bundle everything the per-kind lowering steps read (instance state +
   *  this call's inputs) into one context object. The `diagnostics` array is
   *  the accumulator `lower()` returns. */
  private contextFor(inputs: ResolvedInputs): LowerContext {
    return {
      target: this.target,
      inputs,
      // Record table for label-resolution path; threaded through pickEdges/pickFace.
      allRecords: inputs.records,
      diagnostics: [],
      importedGeometry: this.importedGeometry,
      surfaceCache: this.surfaceCache,
      getSurfaceRecord: this.getSurfaceRecord,
      scriptDir: this.scriptDir,
    };
  }

  async lower(r: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    const ctx = this.contextFor(inputs);
    let shape: ShapeBackend;

    switch (r.kind) {
      case 'box': return finishLowering(ctx, r, lowerBox(ctx, r));
      case 'cylinder': return finishLowering(ctx, r, lowerCylinder(ctx, r));
      case 'sphere': return finishLowering(ctx, r, lowerSphere(ctx, r));
      case 'importedStep':
      case 'importedBrep':
      case 'importedStl': return finishLowering(ctx, r, lowerImported(ctx, r));
      case 'sdfMaterialize': return finishLowering(ctx, r, lowerSdfMaterialize(ctx, r));
      case 'sketch': return finishLowering(ctx, r, await lowerSketch(ctx, r));
      case 'extrude': return finishLowering(ctx, r, lowerExtrude(ctx, r));
      case 'sheetMetal': return finishLowering(ctx, r, lowerSheetMetal(ctx, r));
      case 'sheetMetalBend': return finishLowering(ctx, r, lowerSheetMetalBend(ctx, r));
      case 'revolve': return finishLowering(ctx, r, lowerRevolve(ctx, r));
      case 'sweep': return finishLowering(ctx, r, lowerSweep(ctx, r));
      case 'loft': return finishLowering(ctx, r, await lowerLoft(ctx, r));
      case 'boolean': return finishLowering(ctx, r, lowerBoolean(ctx, r));
      case 'fillet': return finishLowering(ctx, r, lowerFillet(ctx, r));
      case 'chamfer': return finishLowering(ctx, r, lowerChamfer(ctx, r));
      case 'shell': return finishLowering(ctx, r, lowerShell(ctx, r));
      case 'draft': return finishLowering(ctx, r, lowerDraft(ctx, r));
      case 'hole': return finishLowering(ctx, r, await lowerHole(ctx, r));
      case 'holes': return finishLowering(ctx, r, await lowerHoles(ctx, r));
      case 'cutout': return finishLowering(ctx, r, await lowerCutout(ctx, r));
      case 'mirror': return finishLowering(ctx, r, lowerMirror(ctx, r));
      case 'pattern': return finishLowering(ctx, r, lowerPattern(ctx, r));
      case 'assemblyPart': {
        const base = ctx.inputs.byKey.shape as OcctBackend | undefined;
        if (!base) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly part shape input is missing or failed.`,
            hint: 'Assembly parts must wrap a successfully lowered source shape.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        shape = base.clone();
        const at = (r.metadata as { at?: Vec3Param } | undefined)?.at;
        if (at !== undefined) {
          const [tx, ty, tz] = readVec3Param(at);
          shape = shape.translate(tx, ty, tz);
        }
        break;
      }
      case 'assemblyJoint': {
        const partA = ctx.inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly joint input 'a' is missing or failed.`,
            hint: 'Assembly joints must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        // Read joint metadata Vec3 values. Joint frames are now pure numeric
        // tuples (v1 spec deferred joint reactivity). `normalizeAxis`
        // validates that the axis is non-zero; the throw surfaces as a
        // structured diagnostic via the dispatcher's exception path.
        const jointMeta = r.metadata as { origin?: [number, number, number]; axis?: [number, number, number] } | undefined;
        if (jointMeta?.axis !== undefined) {
          normalizeAxis(jointMeta.axis);
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyConnect': {
        const partA = ctx.inputs.byKey.a as OcctBackend | undefined;
        if (!partA) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly connect input 'a' is missing or failed.`,
            hint: 'Assembly connect records must reference successfully lowered assembly parts.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        shape = partA.clone();
        break;
      }
      case 'assemblyModel': {
        // SceneBackend counterpart of `solvedAssembly`: mate-free model()
        // parts stay at identity, while mate-bearing model() records carry
        // enough metadata for default mate FK. The legacy boolean-union path
        // is gone; consumers that need a fused single-Shape now call
        // Scene.toUnion()/Scene.toCompound() explicitly.
        const partEntries = Object.entries(ctx.inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assembly model has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.model().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const meta = r.metadata as {
          assemblyName?: string;
          partIds?: FeatureId[];
          mates?: {
            name: string;
            a: string;
            b: string;
            type: MateType;
            pose?: { kind: 'scalar'; value: Param } | { kind: 'ball'; value: [Param, Param, Param] };
          }[];
          couplings?: readonly MateCouplingRecord[];
          connectorsByPartId?: Record<FeatureId, readonly Connector[]>;
        } | undefined;
        const partIds = meta?.partIds ?? [];
        const encodedMates = meta?.mates ?? [];
        const mateCouplings = meta?.couplings ?? [];
        const connectorsByPartId = meta?.connectorsByPartId ?? {};
        if (partEntries.length !== partIds.length) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assemblyModel: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
            hint: 'Ensure inputs and partIds stay in sync.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const records = ctx.allRecords ?? [];
        const worldT = new Map<FeatureId, Transform>();
        for (const partId of partIds) worldT.set(partId, Transform.identity());

        if (encodedMates.length > 0) {
          const matePoses: NumericPoses = {};
          for (const m of encodedMates) {
            if (m.pose === undefined) continue;
            if (m.pose.kind === 'ball') {
              matePoses[m.name] = [
                m.pose.value[0].evaluated,
                m.pose.value[1].evaluated,
                m.pose.value[2].evaluated,
              ];
            } else {
              matePoses[m.name] = m.pose.value.evaluated;
            }
          }

          let matePoseFiniteFailed = false;
          for (const [name, val] of Object.entries(matePoses)) {
            const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
            if (!finite) {
              ctx.diagnostics.push({
                target: ctx.target,
                code: 'feature.kernel-failed',
                featureId: r.id,
                severity: 'error',
                message: `assemblyModel: mate pose '${name}' is not finite (${JSON.stringify(val)}).`,
                hint: `kernel-failed.assemblyModel.bad-pose — mate pose value for ${name} is not finite.`,
              });
              matePoseFiniteFailed = true;
            }
          }
          if (matePoseFiniteFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }

          const resolvedParts: ResolvedMatePart[] = [];
          let topologyResolutionFailed = false;
          for (let i = 0; i < partIds.length; i++) {
            const partId = partIds[i];
            const partRec = records.find((rec) => rec.id === partId);
            if (!partRec || partRec.kind !== 'assemblyPart') {
              ctx.diagnostics.push({
                target: ctx.target,
                code: 'recompute.input.missing',
                featureId: r.id,
                severity: 'error',
                message: `assemblyModel: missing or wrong-kind part record '${partId}'.`,
                hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
              });
              return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
            }
            const partName =
              (partRec.metadata as { partName?: string } | undefined)?.partName ?? partId;
            const rawConnectors = connectorsByPartId[partId] ?? [];
            if (rawConnectors.length === 0) {
              resolvedParts.push({ id: partId, name: partName, connectors: [] });
              continue;
            }
            const partBackend = partEntries[i][1] as OcctBackend;
            const resolvedConnectors: Connector[] = [];
            for (const c of rawConnectors) {
              if (c.origin.kind === 'vec3') {
                resolvedConnectors.push(c);
                continue;
              }
              try {
                const value = resolveTopologyOriginOnBackend(partBackend, c.origin.query, {
                  records,
                  consumerId: partId,
                });
                resolvedConnectors.push({
                  ...c,
                  origin: { kind: 'vec3', value },
                });
              } catch (err) {
                const msg = (err as Error).message;
                ctx.diagnostics.push({
                  target: ctx.target,
                  code: 'feature.invalid-args',
                  featureId: r.id,
                  severity: 'error',
                  message: `assemblyModel: failed to resolve connector '${c.name}' on part '${partName}' (${msg}).`,
                  hint: 'invalid-args.assembly.mate-connector-origin-unresolved — declare the connector with a numeric origin or a topology query that resolves on the lowered shape.',
                });
                topologyResolutionFailed = true;
              }
            }
            if (topologyResolutionFailed) break;
            resolvedParts.push({ id: partId, name: partName, connectors: resolvedConnectors });
          }
          if (topologyResolutionFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }

          const mates: MateRecord[] = encodedMates.map((m) => ({
            name: m.name,
            a: m.a,
            b: m.b,
            type: m.type,
          }));
          const expandedMatePoses = expandCoupledPoses(mates, mateCouplings, matePoses);
          const mateWorldT = mateFk(resolvedParts, mates, expandedMatePoses);
          for (const [partId, mT] of mateWorldT) {
            if (partId in connectorsByPartId) worldT.set(partId, mT);
          }
        }

        const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
          const partId = partIds[i];
          const partRec = records.find((rec) => rec.id === partId);
          const partName =
            (partRec?.metadata as { partName?: string } | undefined)?.partName ?? partId;
          const color = partRec ? lookupSourceColor(partRec, records) : undefined;
          const material = partRec ? lookupSourceMaterial(partRec, records) : undefined;
          return {
            name: partName,
            shape: partShape as OcctBackend,
            worldTransform: worldT.get(partId) ?? Transform.identity(),
            ...(color !== undefined ? { color } : {}),
            ...(material !== undefined ? { material } : {}),
          };
        });
        const sceneBackend: SceneBackend = {
          target: ctx.target,
          assemblyName: meta?.assemblyName ?? 'unnamed',
          parts: sceneParts,
          _kind: 'scene',
        };
        // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
        // r.transforms loop below cannot apply. Mirror the solvedAssembly
        // boundary cast (Task 4); Task 7 widens the dispatch signature.
        return { shape: sceneBackend as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'solvedAssembly': {
        // 1. Read poses from metadata. Param.evaluated is updated by the
        //    recompute pipeline (resolveParams walks metadata) before lower
        //    is called — so we just read it; never resolve ParamRefs here.
        type EncodedPose =
          | { kind: 'scalar'; value: Param }
          | { kind: 'ball'; value: [Param, Param, Param] };
        type EncodedMate = {
          name: string;
          a: string;
          b: string;
          type: MateType;
          pose?: EncodedPose;
        };
        const meta = r.metadata as {
          assemblyName?: string;
          partIds?: FeatureId[];
          jointIds?: FeatureId[];
          poses?: Record<string, EncodedPose>;
          mates?: EncodedMate[];
          couplings?: readonly MateCouplingRecord[];
          connectorsByPartId?: Record<FeatureId, readonly Connector[]>;
        } | undefined;
        const partIds = meta?.partIds ?? [];
        const jointIds = meta?.jointIds ?? [];
        const encodedPoses = meta?.poses ?? {};
        const encodedMates: readonly EncodedMate[] = meta?.mates ?? [];
        const mateCouplings = meta?.couplings ?? [];
        const connectorsByPartId = meta?.connectorsByPartId ?? {};

        const partEntries = Object.entries(ctx.inputs.byKey)
          .filter(([key]) => key.startsWith('part_'))
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        if (partEntries.length === 0) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `solvedAssembly has no part inputs.`,
            hint: 'Call assembly.part(...) at least once before assembly.solvedModel(poses).',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }

        // 2. Resolve poses to numeric values via Param.evaluated.
        const numericPoses: NumericPoses = {};
        for (const [name, p] of Object.entries(encodedPoses)) {
          if (p.kind === 'ball') {
            numericPoses[name] = [
              p.value[0].evaluated,
              p.value[1].evaluated,
              p.value[2].evaluated,
            ];
          } else {
            numericPoses[name] = p.value.evaluated;
          }
        }

        // 3. Reconstruct AssemblyPartStored / AssemblyJointStored stubs from
        //    FeatureRecords. forwardKinematics only reads .id on parts and
        //    {id, name, kind, parentPartId, childPartId, axis, origin} on
        //    joints — so we build the minimal viable shape.
        const records = ctx.allRecords ?? [];
        const parts: AssemblyPartStored[] = [];
        for (const partId of partIds) {
          const partRec = records.find(rec => rec.id === partId);
          if (!partRec || partRec.kind !== 'assemblyPart') {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: missing or wrong-kind part record '${partId}'.`,
              hint: 'Each partId in metadata.partIds must reference an assemblyPart record.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          parts.push({ id: partRec.id } as AssemblyPartStored);
        }
        const joints: AssemblyJointStored[] = [];
        for (const jointId of jointIds) {
          const jointRec = records.find(rec => rec.id === jointId);
          if (!jointRec || jointRec.kind !== 'assemblyJoint') {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: missing or wrong-kind joint record '${jointId}'.`,
              hint: 'Each jointId in metadata.jointIds must reference an assemblyJoint record.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          const jm = jointRec.metadata as {
            jointName: string;
            jointKind: 'revolute' | 'prismatic' | 'fixed' | 'ball';
            axis?: Vec3;
            origin: Vec3;
          };
          const aRef = jointRec.inputs.a as { id: FeatureId } | undefined;
          const bRef = jointRec.inputs.b as { id: FeatureId } | undefined;
          if (!aRef || !bRef) {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'recompute.input.missing',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: joint '${jointId}' is missing parent or child part input.`,
              hint: 'Joint records must have a/b inputs referencing parent and child parts.',
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          joints.push({
            id: jointRec.id,
            name: jm.jointName,
            kind: jm.jointKind,
            parentPartId: aRef.id,
            childPartId: bRef.id,
            ...(jm.axis !== undefined ? { axis: jm.axis } : {}),
            origin: jm.origin,
          });
        }

        // Recompute-time pose validation. Capture allows ParamRef-bearing
        // partial pose maps; the lowerer must emit structured ctx.diagnostics
        // when (a) a non-fixed joint has no pose value or (b) a pose
        // resolved to a non-finite number (NaN / +/-Infinity).
        for (const j of joints) {
          if (j.kind !== 'fixed' && numericPoses[j.name] === undefined) {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: joint '${j.name}' (${j.kind}) requires a pose value.`,
              hint: `invalid-args.solvedModel.missing-pose — joint ${j.name} requires a pose value.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
        }
        for (const [name, val] of Object.entries(numericPoses)) {
          const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
          if (!finite) {
            ctx.diagnostics.push({
              target: ctx.target,
              code: 'feature.kernel-failed',
              featureId: r.id,
              severity: 'error',
              message: `solvedAssembly: pose '${name}' is not finite (${JSON.stringify(val)}).`,
              hint: `kernel-failed.solvedModel.bad-pose — pose value for ${name} is not finite.`,
            });
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
        }

        // 4. Run body-tree forward kinematics. Throws KernelError on graph
        //    issues (multi-parent, cycles); the dispatcher's exception path
        //    surfaces these as structured ctx.diagnostics.
        const worldT = forwardKinematics(parts, joints, numericPoses);

        // 4b. v0.6 T17: when the assembly declares mates, run `mateFk` over
        //     the captured mate metadata. The mate-derived transforms WIN
        //     over the v0.5 joint-derived transforms per part — parts that
        //     participate in a mate graph are placed in LOCAL frames at
        //     authoring time, and the mate solver is the source of truth for
        //     their world position. Without this step the lowerer would emit
        //     identity transforms for purely-mated parts and the rendered
        //     output (compound, STL, STEP) would sit at the local origin
        //     even though the capture-time Scene's `worldTransform` (T16) is
        //     correct.
        if (encodedMates.length > 0 && partEntries.length === partIds.length) {
          // Resolve mate poses the same way joint poses are: Param.evaluated
          // already reflects the live ParamTable value (resolveParams walked
          // metadata before lower was called).
          const matePoses: NumericPoses = {};
          for (const m of encodedMates) {
            const override = numericPoses[m.name];
            if (override !== undefined) {
              matePoses[m.name] = override;
            } else if (m.pose === undefined) {
              continue;
            } else if (m.pose.kind === 'ball') {
              matePoses[m.name] = [
                m.pose.value[0].evaluated,
                m.pose.value[1].evaluated,
                m.pose.value[2].evaluated,
              ];
            } else {
              matePoses[m.name] = m.pose.value.evaluated;
            }
          }
          // Mate-pose finiteness check (mirror of the joint-pose check above).
          // Capture allows ParamRef poses; if the live ParamTable resolves one
          // to NaN / +/-Infinity, surface a structured diagnostic instead of
          // letting `mateFk` produce a degenerate transform.
          let matePoseFiniteFailed = false;
          for (const [name, val] of Object.entries(matePoses)) {
            const finite = Array.isArray(val) ? val.every(Number.isFinite) : Number.isFinite(val);
            if (!finite) {
              ctx.diagnostics.push({
                target: ctx.target,
                code: 'feature.kernel-failed',
                featureId: r.id,
                severity: 'error',
                message: `solvedAssembly: mate pose '${name}' is not finite (${JSON.stringify(val)}).`,
                hint: `kernel-failed.solvedModel.bad-pose — mate pose value for ${name} is not finite.`,
              });
              matePoseFiniteFailed = true;
            }
          }
          if (matePoseFiniteFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          // Resolve topology connector origins via each part's already-
          // lowered backend, then build the pure-data `ResolvedMatePart[]`
          // input for `mateFk`. Vec3 origins pass through unchanged.
          const resolvedParts: ResolvedMatePart[] = [];
          let topologyResolutionFailed = false;
          for (let i = 0; i < partIds.length; i++) {
            const partId = partIds[i];
            const partRec = records.find((rec) => rec.id === partId)!;
            const partName =
              (partRec.metadata as { partName?: string } | undefined)?.partName ?? partId;
            const rawConnectors = connectorsByPartId[partId] ?? [];
            if (rawConnectors.length === 0) {
              resolvedParts.push({ id: partId, name: partName, connectors: [] });
              continue;
            }
            const partBackend = partEntries[i][1] as OcctBackend;
            const resolvedConnectors: Connector[] = [];
            for (const c of rawConnectors) {
              if (c.origin.kind === 'vec3') {
                resolvedConnectors.push(c);
                continue;
              }
              try {
                const value = resolveTopologyOriginOnBackend(partBackend, c.origin.query, {
                  records,
                  consumerId: partId,
                });
                resolvedConnectors.push({
                  ...c,
                  origin: { kind: 'vec3', value },
                });
              } catch (err) {
                const msg = (err as Error).message;
                ctx.diagnostics.push({
                  target: ctx.target,
                  code: 'feature.invalid-args',
                  featureId: r.id,
                  severity: 'error',
                  message: `solvedAssembly: failed to resolve connector '${c.name}' on part '${partName}' (${msg}).`,
                  hint: 'invalid-args.assembly.mate-connector-origin-unresolved — declare the connector with a numeric origin or a topology query that resolves on the lowered shape.',
                });
                topologyResolutionFailed = true;
              }
            }
            if (topologyResolutionFailed) break;
            resolvedParts.push({ id: partId, name: partName, connectors: resolvedConnectors });
          }
          if (topologyResolutionFailed) {
            return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
          }
          // mateFk is pure — KernelErrors propagate out and surface via the
          // dispatcher's exception path as structured ctx.diagnostics, same as
          // forwardKinematics' graph errors.
          const mates: MateRecord[] = encodedMates.map((m) => ({
            name: m.name,
            a: m.a,
            b: m.b,
            type: m.type,
          }));
          const expandedMatePoses = expandCoupledPoses(mates, mateCouplings, matePoses);
          const mateWorldT = mateFk(resolvedParts, mates, expandedMatePoses);
          // Merge: mate-derived transforms WIN over joint-derived transforms.
          // Disconnected-from-mates parts retain their joint-FK transform (or
          // identity if no joint either). This is the explicit precedence
          // documented in `Assembly.solvedModel`'s JSDoc.
          //
          // `mateFk` always populates a transform for every part it was given
          // (disconnected parts default to identity). To keep that identity
          // from clobbering a v0.5 joint-tree transform when the SAME part is
          // both on a joint tree AND in the mate-parts list but NOT actually
          // referenced by any mate, we only overwrite when the part has at
          // least one mate-connector entry (i.e. it's a real participant in
          // the mate graph). Mate participants are exactly the parts whose
          // FeatureId appears in `connectorsByPartId`.
          for (const [partId, mT] of mateWorldT) {
            if (partId in connectorsByPartId) {
              // Exp-B four-bolt-flange surfaced this: when a part has an
              // authored `at:` AND is positioned by mate FK, the `at:` is
              // silently dropped — the agent only learns about it 2 reasoning
              // steps later via a Gate 2 axis-mismatch. Emit an info-level
              // diagnostic so the conflict surfaces at the override point.
              const partRec = records.find((rec) => rec.id === partId);
              // `resolvePartPlacement` defaults `at` to [0,0,0] even when the
              // user passed nothing — so we can't just check for presence.
              // Only fire the diagnostic when `at` is a non-trivial vec3
              // (any coord magnitude > 1e-6 mm) AND was authored by the user
              // (the placedBy/connect path leaves `at` synthesized from the
              // connector pair — that's not a conflict, it's how connect
              // was designed; skip those).
              const partMeta = partRec?.metadata as
                | { at?: { x?: { evaluated?: number }; y?: { evaluated?: number }; z?: { evaluated?: number } };
                    placedBy?: unknown;
                    partName?: string }
                | undefined;
              const partAt = partMeta?.at;
              const ax = partAt?.x?.evaluated ?? 0;
              const ay = partAt?.y?.evaluated ?? 0;
              const az = partAt?.z?.evaluated ?? 0;
              const atIsNonTrivial = Math.abs(ax) + Math.abs(ay) + Math.abs(az) > 1e-6;
              const placedByConnect = partMeta?.placedBy !== undefined;
              if (partRec && atIsNonTrivial && !placedByConnect) {
                const partName = partMeta?.partName ?? partId;
                ctx.diagnostics.push({
                  target: ctx.target,
                  code: 'assembly.placement-ignored-by-mate-fk',
                  featureId: partRec.id,
                  severity: 'info',
                  message: `assembly.part '${partName}' has both an authored \`at:\` placement (${ax.toFixed(2)}, ${ay.toFixed(2)}, ${az.toFixed(2)}) AND a mate-FK-derived pose; the \`at:\` is being ignored.`,
                  hint: "Remove the `at:` and let the mate decide the pose, or place the part's local frame so its mate connector sits at the origin (mate FK composes parent_world ∘ trans(parent_conn) ∘ joint ∘ trans(-child_conn)).",
                });
              }
              worldT.set(partId, mT);
            }
          }
        }

        // 5. Build a SceneBackend (no boolean union — each part stays in its
        //    LOCAL frame and the FK-derived worldTransform travels with it).
        //    This preserves per-part identity (color, name, topology) for
        //    downstream meshing / STEP-compound export. The legacy union
        //    path is gone; consumers that needed a fused single-Shape now
        //    call Scene.toUnion() / Scene.toCompound() explicitly.
        if (partEntries.length !== partIds.length) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `solvedAssembly: input part count (${partEntries.length}) != metadata.partIds length (${partIds.length}).`,
            hint: 'Ensure inputs and partIds stay in sync.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const sceneParts: SceneBackendPart[] = partEntries.map(([, partShape], i) => {
          const partId = partIds[i];
          const T = worldT.get(partId);
          if (!T) {
            throw new KernelError(
              'feature.invalid-args',
              `solvedAssembly: forwardKinematics produced no transform for part '${partId}'.`,
              r.id,
              'invalid-args.solve.internal — please file a bug.',
            );
          }
          const partRec = records.find((rec) => rec.id === partId)!;
          const partMeta = partRec.metadata as { partName?: string } | undefined;
          const partName = partMeta?.partName ?? partId;
          const color = lookupSourceColor(partRec, records);
          const material = lookupSourceMaterial(partRec, records);
          return {
            name: partName,
            shape: partShape as OcctBackend,
            worldTransform: T,
            ...(color !== undefined ? { color } : {}),
            ...(material !== undefined ? { material } : {}),
          };
        });
        const assemblyName =
          (r.metadata as { assemblyName?: string } | undefined)?.assemblyName ?? 'unnamed';
        const sceneBackend: SceneBackend = {
          target: ctx.target,
          assemblyName,
          parts: sceneParts,
          _kind: 'scene',
        };
        // Early-return: SceneBackend is not a ShapeBackend, so the post-hoc
        // `r.transforms` loop below cannot be applied to it. Task 7 widens
        // the dispatch signature to LoweringResult; today we cast cleanly at
        // the boundary so existing ShapeBackend-typed call sites (recompute
        // engine's shapes map, meshing) keep compiling. Consumers that need
        // the SceneBackend at runtime use isSceneBackend(...) to discriminate.
        return { shape: sceneBackend as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'assemblyExport': {
        // Backs `Scene.toCompound()` and `Scene.toUnion()`. Reads the upstream
        // SceneBackend (produced by `solvedAssembly` / `assemblyModel`),
        // applies each part's worldTransform to its local-frame shape, then
        // either:
        //   - 'compound': groups the transformed parts into a TopoDS_Compound
        //     via replicad.makeCompound (lossless on per-part identity).
        //   - 'union'   : boolean-fuses them into a single solid (lossy on
        //     color, name, metadata — documented antipattern).
        const sceneInput = ctx.inputs.byKey.scene as unknown;
        if (!isSceneBackend(sceneInput)) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: input 'scene' is not a SceneBackend (upstream solvedAssembly / assemblyModel must lower to a SceneBackend).`,
            hint: 'Construct via Scene.toCompound() / Scene.toUnion() on a Scene returned by Assembly.model() / Assembly.solvedModel().',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const meta = r.metadata as { op?: 'compound' | 'union' } | undefined;
        const op = meta?.op;
        if (op !== 'compound' && op !== 'union') {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'feature.invalid-args',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: metadata.op must be 'compound' or 'union'; got ${JSON.stringify(op)}.`,
            hint: 'Use Scene.toCompound() or Scene.toUnion() rather than constructing the feature directly.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        const sceneBackend = sceneInput as SceneBackend;
        if (sceneBackend.parts.length === 0) {
          ctx.diagnostics.push({
            target: ctx.target,
            code: 'recompute.input.missing',
            featureId: r.id,
            severity: 'error',
            message: `assemblyExport: scene has no parts.`,
            hint: 'Call assembly.part(...) at least once before exporting the scene.',
          });
          return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
        }
        // Apply each part's worldTransform to its local-frame shape. Parts are
        // visited in scene-declaration order so both compound and union are
        // deterministic.
        //
        // We clone before applyTransform because replicad's translate()/rotate()
        // mutate-and-destroy the source OCCT handle. The recompute engine caches
        // the SceneBackend across `params.update` runs, so without a fresh clone
        // the second recompute hits "This object has been deleted." on any part
        // with a non-identity worldTransform. Identity transforms early-return
        // `this` from applyTransform, which is why the yaw=0 path historically
        // worked but ball-joint poses broke.
        const transformed: OcctBackend[] = sceneBackend.parts.map((p: SceneBackendPart) =>
          (p.shape as OcctBackend).clone().applyTransform(p.worldTransform),
        );
        if (op === 'compound') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const replicadShapes = transformed.map((b) => (b as OcctBackend).getReplicadShape() as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const compound = replicad.makeCompound(replicadShapes) as any;
          shape = new OcctBackend(compound);
          break;
        }
        // op === 'union': fold-fuse from the first part. Mirrors the
        // pre-Task-4 union loop, just consumed from a SceneBackend instead.
        let fused: OcctBackend = transformed[0];
        for (let i = 1; i < transformed.length; i++) {
          fused = fused.union(transformed[i]) as OcctBackend;
        }
        shape = fused;
        break;
      }
      case 'surfaceThicken': return finishLowering(ctx, r, lowerSurfaceThicken(ctx, r));
      case 'surfaceToShape': return finishLowering(ctx, r, lowerSurfaceToShape(ctx, r));
      case 'surfaceSew': return finishLowering(ctx, r, lowerSurfaceSew(ctx, r));
      case 'referenceImage': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer, so this arm is
        // defense-in-depth for callers that invoke the lowerer directly.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'renderEnvironment': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer; this arm is
        // defense-in-depth for direct callers.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'dfmSpec': {
        // Virtual record — no BREP output. recomputeEngine gates on
        // metadata.virtual === true and skips the lowerer; this arm is
        // defense-in-depth for direct callers.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'feaStudy': {
        // Virtual record — no BREP output. The study is a DECLARATION; the
        // solver run happens in the FEA runner, which reads this record's
        // metadata and the shape it points at. Same shape as dfmSpec.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'drawingDatum':
      case 'drawingTolerance': {
        // Virtual records — no BREP output. GD&T declarations are read by the
        // svg-drawing exporter, which resolves their queries against the
        // exported geometry.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'cameraTarget': {
        // Virtual record — no BREP output. Same shape as renderEnvironment:
        // recomputeEngine gates on metadata.virtual === true and skips the
        // lowerer; this arm is defense-in-depth for direct callers.
        return { shape: undefined as unknown as ShapeBackend, diagnostics: ctx.diagnostics };
      }
      case 'curve3d': return finishLowering(ctx, r, lowerCurve3d(ctx, r));
      case 'variableSweep': return finishLowering(ctx, r, lowerVariableSweep(ctx, r));
      case 'embossText': return finishLowering(ctx, r, await lowerEmbossText(ctx, r));
      case 'projectCurve': return finishLowering(ctx, r, await lowerProjectCurve(ctx, r));
      default:
        return {
          shape: undefined as unknown as ShapeBackend,
          diagnostics: [
            {
              target: ctx.target,
              code: 'feature.invalid-args',
              featureId: r.id,
              severity: 'error',
              message: `Feature kind '${r.kind}' is not supported.`,
              hint: 'Use a documented feature kind.',
            },
          ],
        };
    }

    return { shape: applyTransforms(ctx, shape, r), diagnostics: ctx.diagnostics };
  }
}
