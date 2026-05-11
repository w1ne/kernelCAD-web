// src/intent/scene.ts
//
// `Scene` is the multi-body return type of `Assembly.model()` and
// `Assembly.solvedModel(poses)`, replacing the legacy single boolean-unioned
// `Shape` return. A Scene is a frozen, ordered list of named parts with
// per-part world transforms, colors, and metadata. Boolean fusion becomes an
// explicit, opt-in `Scene.toUnion()` / `Scene.toCompound()` call.
//
// This module ships the types + a stub class for the v0.5.0 assembly
// scene-graph slice. Lowerer dispatch, meshing, and the toCompound / toUnion
// implementations land in follow-up tasks.

import type { Shape } from '../capture/proxy';
import type { Connector } from '../lib/mates/connector';
import type { MateRecord } from '../lib/mates/mate';
import type { ValidatorDiagnostic } from '../lib/mates/validator';
import type { Transform } from '../runtime/se3';
import type { Vec3 } from './types';
import { KernelError } from './kernelError';

/** A single placed part in a Scene. The `shape` is authored in its own
 *  local frame; the `worldTransform` carries the post-FK placement. */
export interface ScenePart {
  /** Assembly-unique name from `assembly.part(name, ...)`. */
  readonly name: string;
  /** LOCAL-frame shape — untransformed. */
  readonly shape: Shape;
  /** SE(3) post-FK placement. Identity for kinematic-zero `model()` apart
   *  from each part's `at` placement (already baked into the lowered shape). */
  readonly worldTransform: Transform;
  /** Role token or hex; resolved from the source shape's metadata. */
  readonly color?: string;
  /** Forward-compat container for material, mass, BOM tags, etc. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Mate-style connectors declared on this part via
   *  `partRef.connector(name, opts)` (v0.6 Task 4). Carries the structured
   *  `Connector` (type tag + `ConnectorOrigin` that may be vec3 or topology).
   *  Distinct from the legacy v0.5 kinematic connectors on
   *  `AssemblyPartRef.connectors` used by `opts.connect`. */
  readonly connectors?: readonly Connector[];
}

/** Axis-aligned bounding box over a Scene's transformed parts. */
export interface SceneBbox {
  min: Vec3;
  max: Vec3;
}

/** Capture-time export callback supplied by `Assembly.model()` /
 *  `Assembly.solvedModel()`. Each call records a new `assemblyExport` feature
 *  whose `inputs.scene` references the upstream `solvedAssembly` /
 *  `assemblyModel` feature; the lowerer reads the SceneBackend and either
 *  groups (compound) or boolean-fuses (union) the per-part shapes. */
export type SceneExportFn = (op: 'compound' | 'union') => Shape;

/** Multi-body output of `Assembly.model()` / `Assembly.solvedModel(poses)`.
 *  Frozen on construction; reactivity stays on the capture-time Assembly. */
export class Scene implements Iterable<ScenePart> {
  readonly assemblyName: string;
  readonly parts: readonly ScenePart[];
  /** Mate records declared via `arm.mate(name, aRef, bRef, type)` (v0.6 Task 5).
   *  Scene-level (not per-part) — each entry references two parts by
   *  `partName.connectorName` string. Undefined when the assembly declared no
   *  mates, omitted from the field set for parity with the optional
   *  `ScenePart.connectors` surface. */
  readonly mates?: readonly MateRecord[];
  /** Validator diagnostics attached by `Assembly.solvedModel({validate: 'warn'})`
   *  (v0.6 Task 9). Populated from `validateAssemblyWithMates(arm)` when the
   *  gate is in `warn` mode; empty when validation is skipped (`mode: 'off'`)
   *  or when `mode: 'error'` is used (in which case error-severity diagnostics
   *  throw, and the surviving warnings/info are silently dropped). Always
   *  present (possibly empty); never undefined, so consumers don't need a
   *  presence check. */
  readonly warnings: readonly ValidatorDiagnostic[];
  private _bbox: SceneBbox | null = null;
  private readonly bboxFn: () => SceneBbox;
  private readonly exportFn?: SceneExportFn;
  /**
   * Underlying capture-time feature id for the upstream `solvedAssembly` /
   * `assemblyModel` record. Internal — used by `runAndExport` to route a
   * Scene return value to its lowered SceneBackend without re-running the
   * lossy `assemblyExport(compound)` path. Not part of the public surface;
   * accessed via `__sourceFeatureId(scene)` to keep IDE autocomplete clean.
   */
  private readonly _sourceFeatureId?: string;

  constructor(
    assemblyName: string,
    parts: readonly ScenePart[],
    bboxFn: () => SceneBbox,
    exportFn?: SceneExportFn,
    sourceFeatureId?: string,
    mates?: readonly MateRecord[],
    warnings?: readonly ValidatorDiagnostic[],
  ) {
    this.assemblyName = assemblyName;
    this.parts = Object.freeze([...parts]);
    this.bboxFn = bboxFn;
    this.exportFn = exportFn;
    this._sourceFeatureId = sourceFeatureId;
    if (mates !== undefined && mates.length > 0) {
      this.mates = Object.freeze([...mates]);
    }
    // `warnings` is always present (possibly empty) — keep it a frozen array
    // so callers can `.some(...)` / iterate without a null-check. Inserted as
    // the last constructor arg so existing v0.5 call sites (Scene built by
    // SolvedKinematics.toScene, Assembly.makeScene before T9) keep working
    // without an explicit `[]`.
    this.warnings = Object.freeze(warnings ? [...warnings] : []);
  }

  /** Lazily-computed AABB over all transformed parts. */
  get bbox(): SceneBbox {
    if (this._bbox === null) this._bbox = this.bboxFn();
    return this._bbox;
  }

  [Symbol.iterator](): Iterator<ScenePart> {
    return this.parts[Symbol.iterator]();
  }

  /** Look up a part by its assembly-unique name. Throws KernelError
   *  ('feature.invalid-args') with hint
   *  `invalid-args.scene.unknown-part` on miss. */
  part(name: string): ScenePart {
    const found = this.parts.find((p) => p.name === name);
    if (!found) {
      throw new KernelError(
        'feature.invalid-args',
        `Scene.part: part '${name}' not declared on assembly '${this.assemblyName}'.`,
        undefined,
        `invalid-args.scene.unknown-part — part ${name} not declared on assembly ${this.assemblyName}.`,
      );
    }
    return found;
  }

  /** OCCT `TopoDS_Compound` — groups bodies without booleaning. Lossless on
   *  per-part identity; use for STEP export with named bodies, downstream
   *  tools that walk a heterogeneous shape, or whenever a single Shape handle
   *  is needed without paying for a fuse. Free path via replicad's
   *  `makeCompound`. */
  toCompound(): Shape {
    return this.requireExportFn('toCompound')('compound');
  }

  /** Explicit boolean fuse. Lossy on color, name, metadata — the result is a
   *  single Shape with no per-part identity. Use only when downstream truly
   *  needs one solid (boolean ops against external geometry; legacy tools
   *  that don't accept compounds). Documented antipattern; prefer
   *  `toCompound()` whenever possible. */
  toUnion(): Shape {
    return this.requireExportFn('toUnion')('union');
  }

  private requireExportFn(method: string): SceneExportFn {
    if (this.exportFn === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        `Scene.${method}: this Scene was not produced by Assembly.model() / Assembly.solvedModel(); no export callback is wired.`,
        undefined,
        `invalid-args.scene.export-callback-missing — call Scene.${method}() on a Scene returned by an Assembly, not on a hand-constructed Scene.`,
      );
    }
    return this.exportFn;
  }

  /**
   * Internal accessor for `runAndExport` — returns the upstream
   * `solvedAssembly` / `assemblyModel` feature id wired by
   * `Assembly.makeScene()`, or `undefined` for hand-constructed Scenes
   * (no recompute graph behind them). Underscore-prefixed: not part of
   * the agent-facing API surface.
   */
  __sourceFeatureId(): string | undefined {
    return this._sourceFeatureId;
  }
}
