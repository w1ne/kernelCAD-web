// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { lookupSourceColor } from '../../kernel/backends/occt/lookupSourceColor';
import { KernelError } from '../../shared/intent/kernelError';
import type { FeatureId } from '../../shared/intent/types';
import { Transform } from '../../shared/runtime/se3';
import { Scene, type SceneDiagnostic, type ScenePart } from '../validation/scene';
import type { CaptureSession } from './captureSession';
import { Shape } from './proxy';
import type { AssemblyJointStored, AssemblyPartStored } from './assemblyTypes';

/**
 * Copy catalog identity from a fetched Shape into the public Scene part
 * metadata.  Other source metadata has its own dedicated Scene fields (for
 * example color), so only this explicit immutable package snapshot crosses
 * the assembly boundary.
 */
export function catalogPartSceneMetadataByShapeId(
  session: CaptureSession,
): ReadonlyMap<FeatureId, Readonly<Record<string, unknown>>> {
  const metadataByShapeId = new Map<FeatureId, Readonly<Record<string, unknown>>>();
  for (const record of session.getRecords()) {
    const catalogPart = record.metadata?.catalogPart;
    if (catalogPart !== undefined) {
      metadataByShapeId.set(record.id, Object.freeze({ catalogPart }));
    }
  }
  return metadataByShapeId;
}

export class SolvedKinematics {
  private readonly assemblyName: string;
  private readonly partsByName: Map<string, AssemblyPartStored>;
  private readonly worldT: Map<FeatureId, Transform>;
  private readonly poses: Record<string, number | [number, number, number]>;
  private readonly joints: readonly AssemblyJointStored[];
  private readonly session: CaptureSession;
  /**
   * Issue #537 — advisory out-of-limits diagnostics for poses that exceed a
   * joint's declared `limitsDeg`/`limitsMm`. Always present (possibly empty).
   * Propagated onto `toScene().warnings` so the snapshot Scene reports them
   * identically to `solvedModel(...)`.
   */
  readonly warnings: readonly SceneDiagnostic[];

  /**
   * Process-scoped warn-once flag for the deprecated `.toShape()` alias.
   * The warning channel for this slice is `console.warn` (the milestone-C
   * `DiagnosticCode` catalogue is closed at 24 entries, so a dedicated
   * `feature.deprecated` code is out of scope; the hint string format is
   * preserved verbatim so a future migration to a structured session
   * diagnostic is a one-line change). See
   * `tests/unit/assemblies/solvedKinematicsToScene.test.ts`.
   */
  private static toShapeWarned = false;

  /** Test hook: reset the process-scoped warn-once flag. NOT public API. */
  static __resetDeprecationWarnedForTest(): void {
    SolvedKinematics.toShapeWarned = false;
  }

  constructor(
    assemblyName: string,
    parts: readonly AssemblyPartStored[],
    joints: readonly AssemblyJointStored[],
    worldT: Map<FeatureId, Transform>,
    poses: Record<string, number | [number, number, number]>,
    session: CaptureSession,
    warnings: readonly SceneDiagnostic[] = [],
  ) {
    this.assemblyName = assemblyName;
    this.partsByName = new Map(parts.map(p => [p.name, p]));
    this.worldT = worldT;
    this.poses = poses;
    this.joints = joints;
    this.session = session;
    this.warnings = Object.freeze([...warnings]);
    Object.freeze(this);
  }

  /**
   * World-space SE(3) transform of the named part. Read-only handle;
   * use with Shape.transform(t) to attach geometry to this part's frame.
   */
  transform(partName: string): Transform {
    const part = this.partsByName.get(partName);
    if (!part) {
      throw new KernelError(
        'feature.invalid-args',
        `SolvedKinematics.transform: unknown part '${partName}'.`,
        undefined,
        'invalid-args.solved.unknown-part — pass a part name registered via assembly.part(...).',
      );
    }
    return this.worldT.get(part.id)!;
  }

  /**
   * Pose value supplied for the named joint (defaults: 0 for revolute /
   * prismatic, [0,0,0] for ball, 0 for fixed since fixed has no pose).
   */
  value(jointName: string): number | [number, number, number] {
    const joint = this.joints.find(j => j.name === jointName);
    if (!joint) {
      throw new KernelError(
        'feature.invalid-args',
        `SolvedKinematics.value: unknown joint '${jointName}'.`,
        undefined,
        'invalid-args.solved.unknown-joint — pass a joint name registered via revolute/prismatic/fixed/ball.',
      );
    }
    if (joint.kind === 'ball') {
      return (this.poses[jointName] as [number, number, number] | undefined) ?? [0, 0, 0];
    }
    if (joint.kind === 'fixed') return 0;
    return (this.poses[jointName] as number | undefined) ?? 0;
  }

  /**
   * Iterate (partName, worldTransform) for every part in the assembly.
   * Useful for batch attach or analysis loops.
   */
  *bodies(): IterableIterator<{ name: string; transform: Transform }> {
    for (const [name, part] of this.partsByName) {
      yield { name, transform: this.worldT.get(part.id)! };
    }
  }

  /**
   * Multi-body view of the FK snapshot. Mirrors `Assembly.solvedModel(poses)`'s
   * return shape — a frozen `Scene` whose ordered `parts` match
   * `assembly.part(name, ...)` declaration order, with each part's
   * `worldTransform` set to the FK-resolved SE(3) and `color` walked from
   * the source-shape upstream chain.
   *
   * Unlike the reactive `solvedModel(poses)` Scene, this Scene is a snapshot:
   * the FK is already baked into each part's source `Shape` (see
   * `Assembly.solve`), so `Scene.toUnion()` chains `Shape.union()` on the
   * mutated source shapes directly and does NOT record a fresh
   * `solvedAssembly` / `assemblyExport` feature pair. `Scene.toCompound()`
   * is intentionally unsupported on snapshot Scenes — call
   * `Assembly.solvedModel(poses).toCompound()` for a TopoDS_Compound that
   * preserves per-part identity through the lowerer.
   *
   * Rendering note (issue #538): this snapshot Scene carries NO upstream
   * feature id (`__sourceFeatureId()` is undefined), so RETURNING it from a
   * script does not route to the SceneBackend mesh fan-out — `resolveRootId`
   * falls back to the chain tail (the last `assemblyJoint`/part record) and
   * the viewport renders that single record, not a posed multi-part scene.
   * For a posed AND per-part-colored scene that renders, return
   * `Assembly.solvedModel(poses)` directly (the reactive Scene whose lowerer
   * emits a colored, FK-posed SceneBackend); use this snapshot handle for
   * in-script analysis (`transform(part)`, `bodies()`) or `.toUnion()` for a
   * fused single Shape.
   */
  toScene(): Scene {
    if (this.partsByName.size === 0) {
      throw new KernelError(
        'feature.invalid-args',
        'SolvedKinematics.toScene: assembly has no parts.',
        undefined,
        'Call assembly.part(...) before assembly.solve(...).',
      );
    }
    const records = this.session.getRecords();
    const catalogMetadataByShapeId = catalogPartSceneMetadataByShapeId(this.session);
    const sceneParts: ScenePart[] = [];
    for (const part of this.partsByName.values()) {
      const partRecord = records.find(r => r.id === part.id);
      const color = partRecord ? lookupSourceColor(partRecord, records) : undefined;
      const metadata = catalogMetadataByShapeId.get(part.originalShape.id);
      sceneParts.push({
        name: part.name,
        shape: part.originalShape,
        worldTransform: this.worldT.get(part.id) ?? Transform.identity(),
        ...(color !== undefined ? { color } : {}),
        ...(metadata === undefined ? {} : { metadata }),
        ...(part.mateConnectors.length > 0 ? { connectors: [...part.mateConnectors] } : {}),
      });
    }
    const assemblyName = this.assemblyName;
    return new Scene(
      assemblyName,
      sceneParts,
      () => {
        throw new KernelError(
          'feature.invalid-args',
          `Scene.bbox: snapshot Scene from SolvedKinematics has no capture-time AABB. Compute the bbox from each part's shape.boundingBox() with worldTransform applied, or call Scene.toUnion().boundingBox().`,
          undefined,
          'invalid-args.scene.bbox-not-available — capture-time Scene bbox is computed during recompute; for the snapshot Scene, use per-part bboxes or .toUnion().boundingBox().',
        );
      },
      (op) => {
        if (op === 'union') {
          const partsArr = Array.from(this.partsByName.values());
          let model: Shape = partsArr[0].originalShape;
          for (let i = 1; i < partsArr.length; i++) {
            model = model.union(partsArr[i].originalShape);
          }
          return model;
        }
        // op === 'compound'.
        throw new KernelError(
          'feature.invalid-args',
          `Scene.toCompound: snapshot Scene from SolvedKinematics does not support compound export (per-part identity is not preserved through the snapshot). Call Assembly.solvedModel(poses).toCompound() instead.`,
          undefined,
          'invalid-args.scene.compound-not-supported-on-snapshot — call Assembly.solvedModel(poses).toCompound() for a Scene whose lowerer preserves per-part identity.',
        );
      },
      undefined, // sourceFeatureId — snapshot Scene has no upstream feature.
      undefined, // mates — snapshot Scene does not carry the mate graph.
      // Issue #537 — propagate out-of-limits warnings onto the snapshot Scene.
      this.warnings,
    );
  }

  /**
   * @deprecated v0.5.0 — call `.toScene().toUnion()` instead. Emits a
   * warn-once `deprecated.solvedKinematics.toShape` advisory on the first
   * call per process and delegates to `.toScene().toUnion()`. Removal in
   * v0.6.0 (CHANGELOG entry under v0.5.0).
   */
  toShape(): Shape {
    if (!SolvedKinematics.toShapeWarned) {
      SolvedKinematics.toShapeWarned = true;
      console.warn(
        'SolvedKinematics.toShape() is deprecated; call .toScene().toUnion() instead. ' +
          'hint: deprecated.solvedKinematics.toShape — call .toScene().toUnion() instead.',
      );
    }
    return this.toScene().toUnion();
  }
}
