// src/intent/scene.ts
//
// `Scene` is the multi-body return type of `Assembly.model()` and
// `Assembly.solvedModel(poses)`, replacing the legacy single boolean-unioned
// `Shape` return. A Scene is a frozen, ordered list of named parts with
// per-part world transforms, colors, and metadata. Boolean fusion becomes an
// explicit, opt-in `Scene.toUnion()` / `Scene.toCompound()` call.
//
// This module ships the types + a stub class for the v0.6.0 assembly
// scene-graph slice. Lowerer dispatch, meshing, and the toCompound / toUnion
// implementations land in follow-up tasks.

import type { Shape } from '../capture/proxy';
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
}

/** Axis-aligned bounding box over a Scene's transformed parts. */
export interface SceneBbox {
  min: Vec3;
  max: Vec3;
}

/** Multi-body output of `Assembly.model()` / `Assembly.solvedModel(poses)`.
 *  Frozen on construction; reactivity stays on the capture-time Assembly. */
export class Scene implements Iterable<ScenePart> {
  readonly assemblyName: string;
  readonly parts: readonly ScenePart[];
  private _bbox: SceneBbox | null = null;
  private readonly bboxFn: () => SceneBbox;

  constructor(assemblyName: string, parts: readonly ScenePart[], bboxFn: () => SceneBbox) {
    this.assemblyName = assemblyName;
    this.parts = Object.freeze([...parts]);
    this.bboxFn = bboxFn;
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
      const hint = `invalid-args.scene.unknown-part — part ${name} not declared on assembly ${this.assemblyName}.`;
      throw new KernelError(
        'feature.invalid-args',
        `Scene.part: part '${name}' not declared on assembly '${this.assemblyName}'. ${hint}`,
        undefined,
        hint,
      );
    }
    return found;
  }

  /** OCCT `TopoDS_Compound` — groups bodies without booleaning. Lossless on
   *  per-part identity; use for STEP export with named bodies. Filled in by
   *  Task 8. */
  toCompound(): Shape {
    throw new Error('Scene.toCompound: not yet implemented (Task 8)');
  }

  /** Explicit boolean fuse. Lossy on color, name, metadata — the result is a
   *  single Shape with no per-part identity. Filled in by Task 8. */
  toUnion(): Shape {
    throw new Error('Scene.toUnion: not yet implemented (Task 8)');
  }

  /** @deprecated v0.6.0 — call .toUnion() instead. */
  toShape(): Shape {
    throw new Error('Scene.toShape: not yet implemented (Task 11)');
  }
}
