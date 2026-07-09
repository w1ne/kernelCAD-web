// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId, PatternSpec, PlaneSpec, FeatureRef, EditableVec3 } from '../../shared/intent/types';
import { isValidVec3, isValidScaleSpec, isValidPlaneSpec, isValidEditableVec3, formatScalarForError } from '../../shared/intent/types';
import { KernelError } from '../../shared/intent/kernelError';
import type { ShapeTransform } from '../../shared/intent/featureRecord';
import type { CaptureSession } from './captureSession';
import { buildFaceInputRef } from './shapeOperationFeatureRecords';
import type { EdgeQuery, FaceQuery, EdgeSegment } from '../../kernel/backends/occt/edgeQueries';
import type { Query, FaceMarker, EdgeMarker } from '../../kernel/naming/query';
import {
  validateHoleOpts, validateHolesOpts, serializeHoleParams, serializeHolesParams,
  resolveHoleOpts, resolveHolesOpts,
  type EditableHoleOpts, type EditableHolesOpts,
} from '../validation/holeValidation';
import { generateBoltHoleConnectors, type HoleCenter } from '../parts/holeAutoConnectors';
import {
  validateCutoutOpts, validateCutoutProfile, serializeCutoutParams,
  resolveCutoutOpts,
  type EditableCutoutOpts,
} from '../validation/cutoutValidation';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';
import { toParam, toVec3Param } from '../../shared/runtime/editableHelpers';
import { Transform } from '../../shared/runtime/se3';
import type { ColorToken } from '../../shared/render/palette';
import { resolveColor } from '../../shared/render/palette';
import type { PBRMaterial } from '../../shared/intent/material';
import type { TextureRef, TextureSet } from '../../shared/intent/textureRef';
import { isTextureRef, normalizeTextureRef } from '../../shared/intent/textureRef';
import { validateBendArgs } from '../sheetMetal';
import { normalizeTopoRefOrString } from './topoRefNormalize';
import type { Region } from '../../shared/intent/region';
import {
  type FilletContinuity, isFilletContinuity,
} from '../../shared/intent/filletContinuityRecord';

type CanonicalFace = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

export type EdgeSelector =
  | EdgeQuery
  | EdgeSegment
  | EdgeSegment[]
  | { face: CanonicalFace | string }
  // Q8 — Query DSL value (kc.q.edge(...) etc) reaches every edge-feature
  // lowerer through the same {edges} slot. Captured at append-time and
  // dispatched through the Q3 evaluator at lower-time.
  | Query<EdgeMarker>
  | Query<unknown>
  | undefined;

export type FaceSelector =
  | FaceQuery
  | { face: CanonicalFace | string }
  // Q8 — Query DSL value (kc.q.face(...) etc) reaches every face-feature
  // lowerer (shell / hole / cutout) through the same {face} slot. Captured
  // at append-time and dispatched through the Q3 evaluator at lower-time.
  | Query<FaceMarker>
  | Query<unknown>;

/**
 * IMPORTANT — drift sentinel contract:
 * Adding a public method to `Sketch`, `PathBuilder`, or `Shape` requires
 * also updating `src/mcp/tools/listApi.ts` (in `SKETCH_METHODS`,
 * `PATH_BUILDER_METHODS`, or `SHAPE_METHODS` respectively). The drift
 * sentinel test at `tests/integration/mcp/listApi.driftSentinel.test.ts`
 * fails CI when `Object.getOwnPropertyNames(<Class>.prototype)` doesn't
 * match the advertised array. This guards agent discoverability — methods
 * not in `list_api` are invisible to MCP clients.
 */
export class Shape {
  readonly id: FeatureId;
  private session: CaptureSession;

  // Lazy lowered backend — cached per-Shape so consecutive selectEdges /
  // selectEdge calls don't re-run RecomputeEngine.run() against the full
  // record list. Invalidated by record-count growth (capture is append-only,
  // so length growth is the only signal we need today).
  private _loweredBackend?: import('../../kernel/backends/occt/occtBackend').OcctBackend;
  private _loweredAtRecordCount?: number;
  private _loweredAtTransformCount?: number;

  constructor(id: FeatureId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  translate(x: Editable<number>, y: Editable<number>, z: Editable<number>): Shape {
    if (!isValidEditableVec3([x, y, z])) {
      throw new KernelError(
        'feature.invalid-args',
        `Translate vector must be three finite numbers (or ParamRef<number>); got [${formatScalarForError(x)}, ${formatScalarForError(y)}, ${formatScalarForError(z)}].`,
        this.id,
        'Pass three finite numbers (x, y, z) to .translate().',
      );
    }
    this.session.appendTransform(this.id, { op: 'translate', vec: toVec3Param([x, y, z], 'mm') });
    return this;
  }

  rotate(
    axis: EditableVec3,
    degrees: Editable<number>,
    pivot?: EditableVec3,
  ): Shape {
    if (!isValidEditableVec3(axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `Rotate axis must be a finite Vec3 (numbers or ParamRef<number>); got ${formatScalarForError(axis)}.`,
        this.id,
        'Pass a finite Vec3 axis and a finite number of degrees to .rotate(axis, degrees, pivot?).',
      );
    }
    if (typeof degrees !== 'number' && !isParamRef(degrees)) {
      throw new KernelError(
        'feature.invalid-args',
        `Rotate degrees must be a finite number or ParamRef; got ${formatScalarForError(degrees)}.`,
        this.id,
        'Pass a finite Vec3 axis and a finite number of degrees to .rotate(axis, degrees, pivot?).',
      );
    }
    if (typeof degrees === 'number' && !Number.isFinite(degrees)) {
      throw new KernelError(
        'feature.invalid-args',
        `Rotate degrees must be a finite number or ParamRef; got ${formatScalarForError(degrees)}.`,
        this.id,
        'Pass a finite Vec3 axis and a finite number of degrees to .rotate(axis, degrees, pivot?).',
      );
    }
    if (pivot !== undefined && !isValidEditableVec3(pivot)) {
      throw new KernelError(
        'feature.invalid-args',
        `Rotate pivot (when provided) must be a finite Vec3; got ${formatScalarForError(pivot)}.`,
        this.id,
        'Pass a finite Vec3 as the pivot, or omit it.',
      );
    }
    const transform: ShapeTransform = pivot === undefined
      ? { op: 'rotateAxis', axis: toVec3Param(axis, 'unitless'), degrees: toParam(degrees, 'deg') }
      : { op: 'rotateAxis', axis: toVec3Param(axis, 'unitless'), degrees: toParam(degrees, 'deg'), pivot: toVec3Param(pivot, 'mm') };
    this.session.appendTransform(this.id, transform);
    return this;
  }

  /** Rotate `degrees` around the world X axis. Thin alias for
   *  `.rotate([1, 0, 0], degrees, pivot?)` — same validation, same
   *  ShapeTransform record, same ParamRef support. */
  rotateX(degrees: Editable<number>, pivot?: EditableVec3): Shape {
    return this.rotate([1, 0, 0], degrees, pivot);
  }

  /** Rotate `degrees` around the world Y axis. Thin alias for
   *  `.rotate([0, 1, 0], degrees, pivot?)`. */
  rotateY(degrees: Editable<number>, pivot?: EditableVec3): Shape {
    return this.rotate([0, 1, 0], degrees, pivot);
  }

  /** Rotate `degrees` around the world Z axis. Thin alias for
   *  `.rotate([0, 0, 1], degrees, pivot?)`. */
  rotateZ(degrees: Editable<number>, pivot?: EditableVec3): Shape {
    return this.rotate([0, 0, 1], degrees, pivot);
  }

  /**
   * Apply an SE(3) Transform to this shape. Decomposes the transform into
   * one rotate + one translate component (T = Translate · Rotate) and
   * appends them to this shape's transform stack. The lowerer applies them
   * via the existing translate / rotateAxis ShapeTransform pipes — no new
   * lowerer code path.
   *
   * For an identity rotation, only the translate is appended.
   * For a pure rotation (zero translation), only the rotate is appended.
   * For an identity transform (no rotation, no translation), nothing is
   * appended.
   */
  transform(t: Transform): Shape {
    const { translate, rotateAxis, rotateDeg } = t.decomposeToTranslateAndRotate();
    if (rotateDeg !== 0) {
      this.rotate([rotateAxis[0], rotateAxis[1], rotateAxis[2]], rotateDeg);
    }
    if (translate[0] !== 0 || translate[1] !== 0 || translate[2] !== 0) {
      this.translate(translate[0], translate[1], translate[2]);
    }
    return this;
  }

  /**
   * Tag this shape with a role-based color token (resolved by the renderer
   * via ROLE_PALETTE) or a literal `#rrggbb` hex color. Stored on the
   * underlying FeatureRecord.metadata.color; lowerer/exports ignore it.
   *
   * Color identity dies at boolean operations — `a.color('servo').union(b)`
   * produces a new Shape with no color. Color lives at the LEAF-PART level;
   * for an assembly, color each part individually before the assembly's
   * solvedModel() unions them for export.
   */
  color(name: ColorToken | `#${string}`): Shape {
    const records = this.session.getRecords();
    const record = records.find(r => r.id === this.id);
    if (record === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.color: feature record '${this.id}' not found in session.`,
        this.id,
        'invalid-args.color.unknown-record — call .color() on a Shape produced by the current session.',
      );
    }
    // Mutate metadata in place. Same pattern as other capture-time mutations.
    if (record.metadata === undefined) {
      (record as { metadata: Record<string, unknown> }).metadata = {};
    }
    (record.metadata as Record<string, unknown>).color = name;
    return this;
  }

  /**
   * Apply a PBR material to this shape. Material lives at the leaf-shape
   * level; identity dies at boolean operations (same as `.color()`).
   *
   * **Core fields** (all optional except `baseColor`):
   * - `baseColor`: CSS color string or role token. Required, non-empty.
   * - `metalness`, `roughness`: `[0, 1]` (clamped).
   * - `clearcoat`, `clearcoatRoughness`, `sheen`, `transmission`: `[0, 1]`.
   * - `ior`: `[1.0, 2.5]` (clamped).
   *
   * **Glass (volume absorption)** — populated when `transmission > 0`:
   * - `thickness`: world units (mm); non-negative, finite.
   * - `attenuationColor`: CSS color string for through-body tint.
   * - `attenuationDistance`: mm at which `attenuationColor` is fully reached;
   *   positive finite, or `Infinity` to disable absorption.
   * The renderer auto-loads a neutral studio HDRI when any material in the
   * scene has `transmission > 0` (no `setRenderEnvironment()` call needed).
   *
   * **Anisotropic specular** — brushed metals, hairline finishes:
   * - `anisotropy`: `[0, 1]` (clamped). 0 = isotropic (default).
   * - `anisotropyRotation`: degrees; normalized to `[0, 360)`. A soft
   *   `feature.material.anisotropy-rotation-normalized` warning is emitted
   *   when the input falls outside `[0, 360)`.
   *
   * **Image-texture maps** — `textures` accepts up to six optional slots:
   * `albedo` / `normal` / `roughness` / `metalness` / `anisotropy` / `emissive`.
   * Each is a `TextureRef` with `path` (required, non-empty), and optional
   * `repeat`, `offset`, `rotation` (degrees). Paths resolve relative to the
   * script file; `https://` URLs are fetched once and sha256-cached at
   * `~/.cache/kernelcad/textures/`. Supported formats: `.png`, `.jpg`,
   * `.jpeg`, `.webp`. Maximum dimension 8192px (hard error); ≥ 2048px emits a
   * soft warning.
   *
   * Clamped numeric fields emit `feature.material.value-clamped`. Negative
   * `thickness` throws `feature.material.thickness-negative`. Texture path
   * problems surface as `feature.material.texture-not-found` /
   * `texture-unsupported-format` / `texture-oversize-error`.
   *
   * Per-face form: passing `face: '<label>'` applies the material to faces
   * matching that label only. The label must resolve against an upstream
   * `metadata.faceLabels` entry (declared on a creating op like
   * `box(..., { faceLabels: { rim: 'top' } })`). Calls accumulate on the
   * record's `metadata.materialByLabel` map; subsequent calls with the same
   * `face` overwrite. A call with no `face` sets the whole-shape default
   * (applies to faces not matched by any per-face entry). Labels that fail
   * to resolve at mesh time emit a soft `feature.material.face-label-no-match`
   * warning — the build continues with the unmatched faces using the
   * shape-level default.
   */
  material(opts: PBRMaterial & { face?: string }): Shape {
    if (!opts || typeof opts.baseColor !== 'string' || opts.baseColor.length === 0) {
      throw new KernelError(
        'feature.material.invalid-base-color',
        `Shape.material: baseColor is required and must be a non-empty string; got ${formatScalarForError(opts?.baseColor)}.`,
        this.id,
        'Pass a CSS color string or a registered role token to baseColor.',
      );
    }

    // Validate `face` if present — must be a non-empty string label.
    let faceLabel: string | undefined;
    if (opts.face !== undefined) {
      if (typeof opts.face !== 'string' || opts.face.length === 0) {
        throw new KernelError(
          'feature.invalid-args',
          `Shape.material: 'face' must be a non-empty string label; got ${formatScalarForError(opts.face)}.`,
          this.id,
          "Pass a face-label string declared upstream via `<creator>(..., { faceLabels: { <label>: <CanonicalFace|FaceQuery> } })`.",
        );
      }
      faceLabel = opts.face;
    }

    const cleaned: PBRMaterial = { baseColor: opts.baseColor };
    let anyClamped = false;
    const maybeAssign = (
      key: keyof PBRMaterial,
      raw: number | undefined,
      min: number,
      max: number,
    ): void => {
      if (raw === undefined) return;
      if (!Number.isFinite(raw)) {
        throw new KernelError(
          'feature.invalid-args',
          `Shape.material: field '${key}' must be a finite number; got ${raw}.`,
          this.id,
          'Fix the named field on the call args; check type, sign, and units.',
        );
      }
      const clamped = Math.max(min, Math.min(max, raw));
      if (clamped !== raw) anyClamped = true;
      (cleaned as Record<keyof PBRMaterial, unknown>)[key] = clamped;
    };
    maybeAssign('metalness', opts.metalness, 0, 1);
    maybeAssign('roughness', opts.roughness, 0, 1);
    maybeAssign('clearcoat', opts.clearcoat, 0, 1);
    maybeAssign('clearcoatRoughness', opts.clearcoatRoughness, 0, 1);
    maybeAssign('ior', opts.ior, 1.0, 2.5);
    maybeAssign('transmission', opts.transmission, 0, 1);
    maybeAssign('sheen', opts.sheen, 0, 1);
    maybeAssign('opacity', opts.opacity, 0, 1);
    maybeAssign('anisotropy', opts.anisotropy, 0, 1);

    // thickness — non-negative finite mm. Negative is a hard error.
    if (opts.thickness !== undefined) {
      if (!Number.isFinite(opts.thickness)) {
        throw new KernelError(
          'feature.invalid-args',
          `Shape.material: field 'thickness' must be a finite number; got ${opts.thickness}.`,
          this.id,
          'Fix the named field on the call args; check type, sign, and units.',
        );
      }
      if (opts.thickness < 0) {
        throw new KernelError(
          'feature.material.thickness-negative',
          `Shape.material: thickness must be non-negative mm; got ${opts.thickness}.`,
          this.id,
          'Pass a non-negative number of mm for the volume thickness, or omit the field.',
        );
      }
      cleaned.thickness = opts.thickness;
    }

    // attenuationColor — route through resolveColor; on null return drop +
    // soft warn (matches the value-clamped convention).
    if (opts.attenuationColor !== undefined) {
      if (typeof opts.attenuationColor !== 'string') {
        throw new KernelError(
          'feature.invalid-args',
          `Shape.material: field 'attenuationColor' must be a string; got ${formatScalarForError(opts.attenuationColor)}.`,
          this.id,
          'Pass a CSS color string or a registered role token.',
        );
      }
      const resolved = resolveColor(opts.attenuationColor);
      if (resolved === undefined) {
        anyClamped = true;
      } else {
        cleaned.attenuationColor = resolved;
      }
    }

    // attenuationDistance — positive finite mm, or Infinity. Anything else
    // is a hard error (zero / negative / NaN).
    if (opts.attenuationDistance !== undefined) {
      const ad = opts.attenuationDistance;
      const isInf = ad === Number.POSITIVE_INFINITY;
      if (!isInf && (!Number.isFinite(ad) || ad <= 0)) {
        throw new KernelError(
          'feature.material.attenuation-distance-invalid',
          `Shape.material: attenuationDistance must be positive finite mm or Infinity; got ${ad}.`,
          this.id,
          'Pass a positive distance in mm (e.g. 10 for a typical glass volume) or Infinity for no attenuation.',
        );
      }
      cleaned.attenuationDistance = ad;
    }

    // anisotropyRotation — degrees; normalize to [0, 360). If normalized
    // value differs from raw, emit a soft warning so the agent can clean up
    // its call.
    if (opts.anisotropyRotation !== undefined) {
      if (!Number.isFinite(opts.anisotropyRotation)) {
        throw new KernelError(
          'feature.invalid-args',
          `Shape.material: field 'anisotropyRotation' must be a finite number; got ${opts.anisotropyRotation}.`,
          this.id,
          'Fix the named field on the call args; check type, sign, and units.',
        );
      }
      const raw = opts.anisotropyRotation;
      const norm = ((raw % 360) + 360) % 360;
      cleaned.anisotropyRotation = norm;
      if (norm !== raw) {
        this.session.warnings.push({
          code: 'feature.material.anisotropy-rotation-normalized',
          hint: 'anisotropyRotation is in degrees and was normalized to [0, 360).',
          message: `Shape.material: anisotropyRotation ${raw}° normalized to ${norm}°.`,
          recordId: this.id,
          phase: 'build',
        });
      }
    }

    // textures — validate each TextureRef.path is a non-empty string and
    // pass through with defaults applied. Existence / format / dimension
    // checks happen at load time (src/shared/textures/index.ts).
    if (opts.textures !== undefined) {
      if (typeof opts.textures !== 'object' || opts.textures === null) {
        throw new KernelError(
          'feature.invalid-args',
          `Shape.material: field 'textures' must be an object; got ${formatScalarForError(opts.textures)}.`,
          this.id,
          'Pass a TextureSet — { albedo?, normal?, roughness?, metalness?, anisotropy?, emissive? } of TextureRef.',
        );
      }
      const cleanedTextures: TextureSet = {};
      const slots: Array<keyof TextureSet> = [
        'albedo',
        'normal',
        'roughness',
        'metalness',
        'anisotropy',
        'emissive',
      ];
      for (const slot of slots) {
        const raw = (opts.textures as TextureSet)[slot];
        if (raw === undefined) continue;
        if (!isTextureRef(raw)) {
          throw new KernelError(
            'feature.invalid-args',
            `Shape.material: textures.${slot} must be a TextureRef ({ path, ... }) with a non-empty 'path' string; got ${formatScalarForError(raw)}.`,
            this.id,
            'Pass { path: "<file-or-url>", repeat?, offset?, rotation? }.',
          );
        }
        cleanedTextures[slot] = normalizeTextureRef(raw as TextureRef);
      }
      if (Object.keys(cleanedTextures).length > 0) {
        cleaned.textures = cleanedTextures;
      }
    }

    const records = this.session.getRecords();
    const record = records.find(r => r.id === this.id);
    if (record === undefined) {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.material: feature record '${this.id}' not found in session.`,
        this.id,
        'Call .material() on a Shape produced by the current session.',
      );
    }
    if (record.metadata === undefined) {
      (record as { metadata: Record<string, unknown> }).metadata = {};
    }
    const metadata = record.metadata as Record<string, unknown>;
    if (faceLabel !== undefined) {
      // Per-face: route to materialByLabel, leave whole-shape material
      // untouched (the two forms compose — whole-shape acts as default for
      // unmatched faces).
      const existing = (metadata.materialByLabel as Record<string, PBRMaterial> | undefined) ?? {};
      // Last-write-wins on the same label.
      metadata.materialByLabel = { ...existing, [faceLabel]: cleaned };
    } else {
      metadata.material = cleaned;
    }

    if (anyClamped) {
      this.session.warnings.push({
        code: 'feature.material.value-clamped',
        hint: 'Numeric PBR fields are clamped to [0, 1] (ior to [1.0, 2.5]).',
        message: 'Shape.material: numeric fields were clamped to allowed ranges.',
        recordId: this.id,
        phase: 'build',
      });
    }

    return this;
  }

  /**
   * Orient this shape so its current +Z axis aligns with the supplied
   * direction vector. Sugar over .rotate() — preferred for cross-axis
   * cylinders / axles where .rotate([1, 0, 0], 90) is error-prone.
   *
   * The axis is treated as a direction; magnitude is ignored (normalized
   * internally). Antipodal case ([0, 0, -1]) is handled deterministically
   * (180° around X). Identity case ([0, 0, 1]) is a no-op (no rotation
   * appended).
   */
  alongAxis(axis: [number, number, number]): Shape {
    const len = Math.hypot(axis[0], axis[1], axis[2]);
    if (len === 0 || !Number.isFinite(len)) {
      throw new KernelError(
        'feature.invalid-args',
        `Shape.alongAxis: axis must be a non-zero finite Vec3; got [${axis[0]}, ${axis[1]}, ${axis[2]}].`,
        this.id,
        'invalid-args.alongAxis.zero — provide a non-zero direction vector.',
      );
    }
    const ax = axis[0] / len;
    const ay = axis[1] / len;
    const az = axis[2] / len;
    // Identity: already +Z.
    if (Math.abs(az - 1) < 1e-9 && Math.abs(ax) < 1e-9 && Math.abs(ay) < 1e-9) {
      return this;
    }
    // Antipodal: rotate 180° around X (deterministic choice).
    if (Math.abs(az + 1) < 1e-9 && Math.abs(ax) < 1e-9 && Math.abs(ay) < 1e-9) {
      return this.rotate([1, 0, 0], 180);
    }
    // General: rotate around (Z × axis) by acos(Z · axis).
    // Z × axis = [0, 0, 1] × [ax, ay, az] = [-ay, ax, 0].
    const rx = -ay;
    const ry = ax;
    const rz = 0;
    const angleRad = Math.acos(Math.min(1, Math.max(-1, az)));
    const angleDeg = angleRad * 180 / Math.PI;
    return this.rotate([rx, ry, rz], angleDeg);
  }

  /**
   * Scale this shape uniformly (single positive number) or per-axis
   * (Vec3 — sx/sy/sz). All factors must be positive and finite.
   *
   * Two call shapes are accepted:
   *   - `.scale(2)`           — uniform
   *   - `.scale([2, 1, 1])`   — per-axis Vec3 form
   *   - `.scale(2, 2, 2)`     — legacy multi-arg form (must be uniform; see below)
   *
   * The Vec3 form is the canonical agent-facing way to request non-uniform
   * scale. Capture stores per-axis components in the FeatureRecord's
   * transform stack (`{ op: 'scale', sx, sy, sz }`), so face refs survive
   * because OCCT preserves topology under any affine transform (audited at
   * `tests/unit/intent/faceRefScaleAudit.test.ts`).
   *
   * BACKEND LIMITATION (2026-05-09): the lowerer can only honor uniform
   * scale today because `replicad-opencascadejs` does not export
   * `BRepBuilderAPI_GTransform`. A non-uniform Vec3 still captures cleanly,
   * but lowering will emit a `feature.kernel-failed` diagnostic. Track via
   * the TODO in `src/backends/occt/occtLowerer.ts` near the scale dispatch.
   */
  scale(factor: number | [number, number, number]): Shape;
  scale(sx: number, sy: number, sz: number): Shape;
  scale(
    factorOrSx: number | [number, number, number],
    sy?: number,
    sz?: number,
  ): Shape {
    // Normalize the three call shapes into a single ScaleSpec.
    const scaleSpec: number | [number, number, number] = Array.isArray(factorOrSx)
      ? factorOrSx
      : (sy !== undefined || sz !== undefined)
        ? [factorOrSx, sy ?? factorOrSx, sz ?? factorOrSx] as [number, number, number]
        : factorOrSx;

    if (!isValidScaleSpec(scaleSpec)) {
      throw new KernelError(
        'feature.invalid-args',
        `Scale factor must be a positive finite number, or a Vec3 of three positive finite numbers; got ${formatScalarForError(scaleSpec)}.`,
        this.id,
        'invalid-args.scale.zero — provide positive finite scale factors.',
      );
    }

    const [sx, syOut, szOut]: [number, number, number] = Array.isArray(scaleSpec)
      ? [scaleSpec[0], scaleSpec[1], scaleSpec[2]]
      : [scaleSpec, scaleSpec, scaleSpec];

    this.session.appendTransform(this.id, {
      op: 'scale',
      sx,
      sy: syOut,
      sz: szOut,
    });
    return this;
  }

  reflect(plane: PlaneSpec): Shape {
    if (!isValidPlaneSpec(plane)) {
      throw new KernelError(
        'feature.invalid-args',
        `Reflect plane must be 'xy' | 'xz' | 'yz' or { plane: '<cardinal>', offset?: number }; got ${formatScalarForError(plane)}.`,
        this.id,
        "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number } to .reflect().",
      );
    }
    this.session.appendTransform(this.id, { op: 'reflect', plane });
    return this;
  }

  mirror(plane: PlaneSpec): Shape {
    if (!isValidPlaneSpec(plane)) {
      throw new KernelError(
        'feature.invalid-args',
        `Mirror plane must be 'xy' | 'xz' | 'yz' or { plane: '<cardinal>', offset?: number }; got ${formatScalarForError(plane)}.`,
        this.id,
        "Pass 'xy', 'xz', 'yz', or { plane: '<cardinal>', offset?: number } to .mirror().",
      );
    }
    return this.session.mirrorFeature(this, plane);
  }

  patternLinear(opts: { count: number; direction: [number, number, number]; spacing: number }): Shape {
    if (!Number.isInteger(opts.count) || opts.count < 2) {
      throw new KernelError(
        'feature.invalid-args',
        'patternLinear count must be an integer >= 2.',
        this.id,
        'Pass count: 2 or greater.',
      );
    }
    if (!isValidVec3(opts.direction)) {
      throw new KernelError(
        'feature.invalid-args',
        `patternLinear direction must be a finite Vec3; got ${formatScalarForError(opts.direction)}.`,
        this.id,
        'Pass direction: [x, y, z].',
      );
    }
    if (typeof opts.spacing !== 'number' || !Number.isFinite(opts.spacing) || opts.spacing === 0) {
      throw new KernelError(
        'feature.invalid-args',
        `patternLinear spacing must be a non-zero finite number; got ${formatScalarForError(opts.spacing)}.`,
        this.id,
        'Pass a non-zero finite spacing.',
      );
    }
    const pattern: PatternSpec = {
      kind: 'linear',
      count: opts.count,
      direction: opts.direction,
      spacing: opts.spacing,
    };
    return this.session.patternFeature(this, pattern);
  }

  patternGrid(opts: {
    x: { count: number; direction: [number, number, number]; spacing: number };
    y: { count: number; direction: [number, number, number]; spacing: number };
  }): Shape {
    validateGridPatternAxis('patternGrid.x', opts.x, this.id);
    validateGridPatternAxis('patternGrid.y', opts.y, this.id);
    const pattern: PatternSpec = {
      kind: 'grid',
      x: opts.x,
      y: opts.y,
    };
    return this.session.patternFeature(this, pattern);
  }

  patternCircular(opts: { count: number; axis: [number, number, number]; angleDeg?: number }): Shape {
    if (!Number.isInteger(opts.count) || opts.count < 2) {
      throw new KernelError(
        'feature.invalid-args',
        'patternCircular count must be an integer >= 2.',
        this.id,
        'Pass count: 2 or greater.',
      );
    }
    if (!isValidVec3(opts.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `patternCircular axis must be a finite Vec3; got ${formatScalarForError(opts.axis)}.`,
        this.id,
        'Pass axis: [x, y, z].',
      );
    }
    const angleDeg = opts.angleDeg ?? 360;
    if (typeof angleDeg !== 'number' || !Number.isFinite(angleDeg) || angleDeg === 0) {
      throw new KernelError(
        'feature.invalid-args',
        `patternCircular angleDeg must be a non-zero finite number; got ${formatScalarForError(angleDeg)}.`,
        this.id,
        'Pass a non-zero finite angleDeg.',
      );
    }
    const pattern: PatternSpec = {
      kind: 'circular',
      count: opts.count,
      axis: opts.axis,
      angleDeg,
    };
    return this.session.patternFeature(this, pattern);
  }

  subtract(...others: Shape[]): Shape {
    return this.session.boolean('difference', this, others);
  }

  union(...others: Shape[]): Shape {
    return this.session.boolean('union', this, others);
  }

  intersect(...others: Shape[]): Shape {
    return this.session.boolean('intersection', this, others);
  }

  // Single-radius form (rc.6) + optional continuity opts (Slice C Task 6).
  fillet(
    radius: Editable<number>,
    edges?: EdgeSelector,
    opts?: { continuity?: FilletContinuity },
  ): Shape;
  // Variable-radius form (rc.11).
  fillet(groups: Array<{ edges: EdgeSelector; radius: Editable<number> }>): Shape;
  fillet(
    radiusOrGroups: Editable<number> | Array<{ edges: EdgeSelector; radius: Editable<number> }>,
    edges?: EdgeSelector,
    opts?: { continuity?: FilletContinuity },
  ): Shape {
    if (typeof radiusOrGroups === 'number' || isParamRef(radiusOrGroups)) {
      let continuity: FilletContinuity | undefined;
      if (opts !== undefined && opts.continuity !== undefined) {
        if (!isFilletContinuity(opts.continuity)) {
          throw new KernelError(
            'feature.invalid-args',
            `fillet: continuity must be 'G1' or 'G2'.`,
            this.id,
            `invalid-args.fillet.continuity — got ${String(opts.continuity)}`,
          );
        }
        continuity = opts.continuity;
      }
      return this.session.edgeFeature('fillet', this, 'radius', radiusOrGroups, edges, { continuity });
    }
    return this.session.variableEdgeFeature('fillet', this, 'radius', radiusOrGroups);
  }

  // Single-distance form (rc.6 — unchanged).
  chamfer(distance: Editable<number>, edges?: EdgeSelector): Shape;
  // Variable-distance form (rc.11).
  chamfer(groups: Array<{ edges: EdgeSelector; distance: Editable<number> }>): Shape;
  chamfer(
    distanceOrGroups: Editable<number> | Array<{ edges: EdgeSelector; distance: Editable<number> }>,
    edges?: EdgeSelector,
  ): Shape {
    if (typeof distanceOrGroups === 'number' || isParamRef(distanceOrGroups)) {
      return this.session.edgeFeature('chamfer', this, 'distance', distanceOrGroups, edges);
    }
    return this.session.variableEdgeFeature('chamfer', this, 'distance', distanceOrGroups);
  }

  shell(thickness: Editable<number>, opts: { face: FaceSelector | CanonicalFace | string }): Shape {
    return this.session.edgeFeature('shell', this, 'thickness', thickness, { face: opts.face });
  }

  /**
   * Slice E Task 6: taper the selected face(s) for moldability.
   *
   * @param angleDeg  Draft angle in degrees. Must be in (0, 90).
   *                  Positive = taper outward from the pull direction.
   * @param opts.face      Face(s) to draft. Accepts a canonical name
   *                       (`'front'`, `'top'`, …), a face label, or a
   *                       `FaceSelector` query. Same selector shape as
   *                       `.shell()` and `.hole()`.
   * @param opts.neutralPlane  The plane where drafted faces meet the
   *                       un-tapered geometry (the "parting line"). Defaults
   *                       to `opts.face` when omitted. Task 7 resolves this
   *                       via `pickFace` and passes it to
   *                       `BRepOffsetAPI_DraftAngle`.
   * @param opts.pullDir   Pull (demoulding) direction as a unit [x, y, z]
   *                       vector. Defaults to the face normal at lower time
   *                       when not supplied.
   *
   * Lowering errors emit `feature.draft.failed` (Task 7).
   */
  draft(
    angleDeg: Editable<number>,
    opts: {
      face: FaceSelector | CanonicalFace | string;
      neutralPlane?: CanonicalFace | string;
      pullDir?: [number, number, number];
    },
  ): Shape {
    return this.session.draftFeature(this, angleDeg, {
      face: opts.face,
      neutralPlane: opts.neutralPlane,
      pullDir: opts.pullDir,
    });
  }

  /**
   * W2.2: Add a sheet-metal bend along a linear edge. The Shape must trace
   * its lineage to a `sheetMetal(...)` record (validated at lowering time;
   * non-sheet-metal callers see `feature.invalid-args`).
   *
   * @param edgeRef the linear edge to fold around. Same selector shape as
   *               `.fillet(edges, ...)`: an EdgeQuery, EdgeSegment[],
   *               `{ face: <canonical|label> }`, or a string label name.
   * @param angle  fold angle in degrees. Positive = fold toward the sheet's
   *               +normal; negative = fold the other way.
   * @param radius inner bend radius in mm. Recommended `radius >= 0.5 * thickness`
   *               to avoid sewing failure (`feature.kernel-failed`).
   *
   * Bend-allowance math (K-factor):
   *   `BA = (pi * |angle| / 180) * (kFactor * thickness + radius)`
   *
   * Slice-1 lowering limits:
   *   - edge must be linear (else `feature.bend.edge-not-linear`)
   *   - at most 2 bends in the chain for `.flattenPattern()` (else
   *     `feature.flattenPattern.multi-bend-unsupported`).
   */
  bend(
    edgeRef: EdgeSelector | { face: FaceSelector | CanonicalFace | string } | CanonicalFace | string,
    angle: Editable<number>,
    radius: Editable<number>,
  ): Shape {
    const angleParam = toParam(angle, 'deg');
    const radiusParam = toParam(radius, 'mm');
    // Capture-time validation on the resolved scalar values.
    validateBendArgs(angleParam.evaluated, radiusParam.evaluated, this.id);
    // Reuse edgeFeature's selector-handling so .bend(...) accepts the same
    // shape as .fillet(...) / .shell(...). We piggyback on edgeFeature by
    // calling it with kind: 'sheetMetalBend' wedged into the same pipeline
    // via session.createShape directly (edgeFeature's kind union doesn't
    // include 'sheetMetalBend', so we replicate its body here).
    return this.session.bendFeature(this, angleParam, radiusParam, edgeRef as EdgeSelector | { face: FaceSelector | CanonicalFace | string });
  }

  /**
   * W2.2: Return the unfolded 2D flat-pattern of this bent sheet-metal Shape
   * as a `Region`. Slice-1 limit: at most 2 bends in the chain — third bend
   * emits `feature.flattenPattern.multi-bend-unsupported`. Derived view;
   * adds no FeatureRecord. Requires the shape to have been lowered at least
   * once (the bendRecord metadata is populated by the sheetMetalBend lowerer).
   */
  flattenPattern(): Region {
    // Implementation imported lazily to avoid circular import (proxy.ts is
    // imported by captureSession.ts which is imported by everything).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../kernel/backends/occt/flattenPattern') as typeof import('../../kernel/backends/occt/flattenPattern');
    return mod.flattenPattern(this.session.getRecords(), this.id);
  }

  /**
   * Drill a single hole through this Shape. Position is face-local 2D
   * (`u`, `v` in mm). Use `depth: 'through'` to clip at the back face.
   * Optional `counterbore` (wider shoulder) or `countersink` (cone) — the
   * two are mutually exclusive on a single hole.
   *
   * Created face refs (resolvable downstream as `{ face: '<name>' }`):
   *   `wall` (always), `floor` (blind), `wall-back` (through),
   *   `counterbore-wall` / `counterbore-floor` (with cb),
   *   `countersink-cone` (with csk).
   */
  hole(face: FaceSelector | CanonicalFace | string, opts: EditableHoleOpts): Shape {
    // Slice-3: validate against the resolved-at-capture-time numeric view, but
    // serialize from the original Editable opts so symbolic ParamRefs survive
    // into the FeatureRecord for later edit-after-build.
    const resolved = resolveHoleOpts(opts, this.session.paramTable);
    validateHoleOpts(resolved, this.id);
    const faceSel = normalizeFaceSelector(face);
    const { params, metadata } = serializeHoleParams(faceSel, opts);
    if (opts.name !== undefined) {
      assertFeatureNameUniqueOnChain(this.session.getRecords(), this.id, opts.name);
    } else {
      metadata.ordinal = nextOrdinalForKindOnChain(this.session.getRecords(), this.id, 'hole');
    }
    const inputs: Record<string, FeatureRef> = {
      target: { kind: 'feature', id: this.id },
      face: buildFaceInputRef(this.id, faceSel),
    };
    const holeShape = this.session.createShape({
      kind: 'hole',
      inputs,
      params,
      metadata,
    });
    // Auto-emit bolt-holes-1 connector at the hole's bottom face + through-axis.
    const holeDepth =
      resolved.depth === 'through'
        ? 0 // through-hole: the connector sits at the back of the parent face
        : typeof resolved.depth === 'number'
          ? resolved.depth
          : 0;
    const centers: HoleCenter[] = [
      { u: resolved.u, v: resolved.v, depthMm: holeDepth, axis: [0, 0, -1] },
    ];
    const partName =
      (metadata as { partName?: string }).partName ?? holeShape.id;
    const conns = generateBoltHoleConnectors(centers, { partName });
    this.session.attachAutoConnectors(holeShape.id, conns);
    return holeShape;
  }

  /**
   * Drill N holes in a single feature record. All holes share diameter,
   * depth, and optional counterbore/countersink. Use `.hole()` chained
   * calls if you need mixed specs.
   *
   * The bare `'wall'` selector on the result resolves to *all* bore walls
   * collectively — `.fillet(0.2, { face: 'wall' })` rounds every lip in one
   * call. Indexed access (e.g. `holes[0].wall`) is slice-2.
   */
  holes(face: FaceSelector | CanonicalFace | string, opts: EditableHolesOpts): Shape {
    const resolved = resolveHolesOpts(opts, this.session.paramTable);
    validateHolesOpts(resolved, this.id);
    const faceSel = normalizeFaceSelector(face);
    const { params, metadata } = serializeHolesParams(faceSel, opts);
    if (opts.name !== undefined) {
      assertFeatureNameUniqueOnChain(this.session.getRecords(), this.id, opts.name);
    } else {
      metadata.ordinal = nextOrdinalForKindOnChain(this.session.getRecords(), this.id, 'holes');
    }
    const inputs: Record<string, FeatureRef> = {
      target: { kind: 'feature', id: this.id },
      face: buildFaceInputRef(this.id, faceSel),
    };
    const holesShape = this.session.createShape({
      kind: 'holes',
      inputs,
      params,
      metadata,
    });
    // Auto-emit bolt-holes-1..N connectors, one per hole position.
    const holesDepth =
      resolved.depth === 'through'
        ? 0
        : typeof resolved.depth === 'number'
          ? resolved.depth
          : 0;
    const centers: HoleCenter[] = resolved.positions.map((p) => ({
      u: p.u,
      v: p.v,
      depthMm: holesDepth,
      axis: [0, 0, -1] as [number, number, number],
    }));
    const partName =
      (metadata as { partName?: string }).partName ?? holesShape.id;
    const conns = generateBoltHoleConnectors(centers, { partName });
    this.session.attachAutoConnectors(holesShape.id, conns);
    return holesShape;
  }

  /**
   * Sketch-driven subtractive extrude. Useful for irregular shapes hole()
   * can't express (slots, D-shapes, keyhole pockets). Profile coords are
   * in face-local 2D; direction is always *into* the body.
   *
   * Pass a closed `Sketch` or a bare `PathBuilder` (auto-closed). Created
   * face refs: `wall` (always), `floor` (blind), `wall-back` (through).
   */
  cutout(profile: import('./sketch').PathBuilder | import('./sketch').Sketch, opts: EditableCutoutOpts): Shape {
    const resolved = resolveCutoutOpts(opts, this.session.paramTable);
    validateCutoutOpts(resolved, this.id);
    // Auto-close a bare PathBuilder. Duck-type on `.close` to avoid pulling
    // PathBuilder/Sketch class identifiers from sketch.ts (which imports Shape
    // from this module — would create a top-level circular dep).
    const isPathBuilder = typeof (profile as { close?: unknown }).close === 'function';
    const sketch: import('./sketch').Sketch = isPathBuilder
      ? (profile as import('./sketch').PathBuilder).close()
      : (profile as import('./sketch').Sketch);
    const sketchRecord = this.session.getRecords().find(r => r.id === sketch.id);
    const commands = (sketchRecord?.metadata as { commands?: import('./sketch').SketchCommand[] })?.commands ?? [];
    validateCutoutProfile(commands, this.id);
    const faceSel = normalizeFaceSelector(opts.face);
    const { params, metadata } = serializeCutoutParams(faceSel, opts);
    if (opts.name !== undefined) {
      assertFeatureNameUniqueOnChain(this.session.getRecords(), this.id, opts.name);
    } else {
      metadata.ordinal = nextOrdinalForKindOnChain(this.session.getRecords(), this.id, 'cutout');
    }
    const inputs: Record<string, FeatureRef> = {
      target: { kind: 'feature', id: this.id },
      profile: { kind: 'feature', id: sketch.id },
      face: buildFaceInputRef(this.id, faceSel),
    };
    return this.session.createShape({
      kind: 'cutout',
      inputs,
      params,
      metadata,
    });
  }

  /**
   * W3: Raise or recess text on a target face. `depth > 0` fuses (emboss out),
   * `depth < 0` cuts (engrave in). UV anchors are face-local [0, 1] (0=umin,
   * 1=umax). Returns a new Shape with the same lineage plus the new geometry.
   *
   * Pipeline at lower time: replicad `drawText(...) → drawing.sketchOnFace(face,
   * scaleMode) → sketch.extrude(|depth|) → parent.fuse|.cut`.
   */
  embossText(opts: {
    textContent: string;
    fontFamily?: string;
    size: Editable<number>;
    depth: Editable<number>;
    align?: 'left' | 'center' | 'right';
    anchorU?: Editable<number>;
    anchorV?: Editable<number>;
    rotation?: Editable<number>;
    scaleMode?: 'original' | 'native' | 'bounds';
    face: FaceSelector | CanonicalFace | string;
  }): Shape {
    const id = this.session.addEmbossText(this.id, {
      textContent: opts.textContent,
      ...(opts.fontFamily !== undefined ? { fontFamily: opts.fontFamily } : {}),
      size: opts.size,
      depth: opts.depth,
      align: opts.align,
      anchorU: opts.anchorU,
      anchorV: opts.anchorV,
      rotation: opts.rotation,
      scaleMode: opts.scaleMode,
      face: typeof opts.face === 'string' ? { face: opts.face } : opts.face,
    });
    return new Shape(id, this.session);
  }

  /**
   * W3: Wrap a 2D closed curve onto a 3D face. Returns a `Sketch` — chain
   * `.extrude(depth)` to land an engraved logo or label insert on a curved
   * body. The Sketch's underlying OcctBackend is a face-bound sketch, so the
   * extrude direction follows the face normal.
   *
   * `asEdge: true` is captured but currently deferred at lower time —
   * `BRepProj_Projection` is not exposed by the bundled OCCT.
   */
  projectCurve(opts: {
    source: import('../../shared/intent/projectCurveRecord').ProjectCurveSource;
    face: FaceSelector | CanonicalFace | string;
    scaleMode?: 'original' | 'native' | 'bounds';
    asEdge?: boolean;
  }): import('./sketch').Sketch {
    const id = this.session.addProjectCurve(this.id, {
      source: opts.source,
      face: typeof opts.face === 'string' ? { face: opts.face } : opts.face,
      scaleMode: opts.scaleMode,
      asEdge: opts.asEdge,
    });
    return this.session.sketchFromId(id);
  }

  /**
   * Axis-aligned bounding box of this Shape in its CURRENT world frame —
   * i.e. AFTER every transform appended so far (translate / rotate / scale)
   * is applied. Lowers the Shape (via `.lower()`, cached) and reads the OCCT
   * backend's AABB, then folds in the derived `size` and `center`.
   *
   * This is the query an agent needs to place a fetched catalog part. A
   * `lib.fetchPart(ref)` STEP arrives at its own arbitrary native origin;
   * call `await part.boundingBox()` to learn where it actually sits before
   * translating it, or use `.recenter()` / `.seatOnFloor()` which do the
   * arithmetic for you.
   *
   * @param opts.exact  Fold the tessellation vertex AABB (tight on curved
   *                    B-spline faces) instead of OCCT's gap-corrected
   *                    `Bnd_Box` (slightly padded on curves). Default false.
   * @returns `{ min, max, size, center }`, all in mm, all `[x, y, z]`.
   */
  async boundingBox(
    opts?: { exact?: boolean },
  ): Promise<{
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
    center: [number, number, number];
  }> {
    const backend = await this.lower();
    const { min, max } = backend.boundingBox(opts);
    const size: [number, number, number] = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2],
    ];
    const center: [number, number, number] = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    return {
      min: [min[0], min[1], min[2]],
      max: [max[0], max[1], max[2]],
      size,
      center,
    };
  }

  /**
   * Translate this Shape so its bounding-box center lands on the world
   * origin. The single most useful normalizer for a freshly-fetched catalog
   * part — a STEP body authored at an arbitrary native offset becomes
   * origin-centered, so a subsequent `.translate(x, y, z)` places its CENTER
   * exactly at `(x, y, z)` instead of nudging it from wherever the STEP file
   * happened to put it.
   *
   * Async (must lower to read the current bbox) and appends a single
   * `translate` transform, so it composes with prior transforms and returns
   * the same Shape for continued chaining:
   *
   *   const part = (await lib.fetchPart('servo/sg90'));
   *   (await part.recenter()).translate(20, 0, 0);  // center now at (20,0,0)
   *
   * @param opts.x/y/z  Recenter only the named axes (default: all three).
   *                    e.g. `recenter({ z: false })` centers x/y, leaves z.
   */
  async recenter(opts?: { x?: boolean; y?: boolean; z?: boolean }): Promise<Shape> {
    const { center } = await this.boundingBox();
    const dx = (opts?.x ?? true) ? -center[0] : 0;
    const dy = (opts?.y ?? true) ? -center[1] : 0;
    const dz = (opts?.z ?? true) ? -center[2] : 0;
    if (dx !== 0 || dy !== 0 || dz !== 0) {
      this.translate(dx, dy, dz);
    }
    return this;
  }

  /**
   * Translate this Shape so it sits ON the z = 0 floor (bbox `min.z` → 0),
   * centered in x and y over the origin. Use for parts that must rest on a
   * build plate / table / PCB plane in their natural upright pose. Pass
   * `{ center: false }` to seat on the floor WITHOUT moving x/y (keep the
   * part's existing footprint position, only drop it onto z = 0).
   *
   * Async + appends one `translate`, same composition/chaining contract as
   * `.recenter()`.
   */
  async seatOnFloor(opts?: { center?: boolean }): Promise<Shape> {
    const { min, center } = await this.boundingBox();
    const recenterXy = opts?.center ?? true;
    const dx = recenterXy ? -center[0] : 0;
    const dy = recenterXy ? -center[1] : 0;
    const dz = -min[2];
    if (dx !== 0 || dy !== 0 || dz !== 0) {
      this.translate(dx, dy, dz);
    }
    return this;
  }

  /**
   * Lower this Shape eagerly — runs recompute against the records up to and
   * including this Shape, returns the resulting OcctBackend so script-runtime
   * helpers like `selectEdges` can introspect the lowered geometry.
   *
   * Most agents won't call this directly. It's invoked implicitly when an
   * agent calls `selectEdges(myShape, ...)` from a `.kcad.ts` script.
   */
  async lower(): Promise<import('../../kernel/backends/occt/occtBackend').OcctBackend> {
    const records = this.session.getRecords();
    // C1 fix: cache invalidates on either record-count growth OR a transform
    // appended to THIS shape. `appendTransform` mutates `record.transforms`
    // in place — `records.length` is unchanged after Shape.translate/rotate/scale.
    // Without the transform-count check, the cache returns the un-transformed
    // backend after a transform, producing silent incorrect results.
    const ownRecord = records.find(r => r.id === this.id);
    const transformCount = ownRecord?.transforms.length ?? 0;
    if (
      this._loweredBackend &&
      this._loweredAtRecordCount === records.length &&
      this._loweredAtTransformCount === transformCount
    ) {
      return this._loweredBackend;
    }
    const { RecomputeEngine } = await import('../compute/recomputeEngine');
    const { createOcctLowerer } = await import('../backends/occt/occtLowerer');
    const { OcctBackend, initOcct } = await import('../../kernel/backends/occt/occtBackend');
    await initOcct();
    const engine = new RecomputeEngine(createOcctLowerer(this.session));
    const r = await engine.run(
      records as readonly import('../../shared/intent/featureRecord').FeatureRecord[],
      {
        paramTable: this.session.paramTable,
        warningSink: (warning) => this.session.warnings.push(warning),
        warningPhase: 'build',
        gatedFeatureNames: this.session.gatedFeatureNames,
      },
    );
    // Slice-3: populate per-record cache so `session.params.update` can
    // reuse earlier records' lowered output. Only stores successful records;
    // failed records are absent from `r.shapes` so we don't pollute the cache.
    for (const [id, sh] of r.shapes) {
      this.session.cachedShapes.set(id, sh);
    }
    const shape = r.shapes.get(this.id);
    if (!shape) {
      throw new Error(`Shape.lower(): shape '${this.id}' not lowered (check upstream diagnostics).`);
    }
    if (!(shape instanceof OcctBackend)) {
      throw new Error(`Shape.lower(): shape '${this.id}' is not an OcctBackend.`);
    }
    this._loweredBackend = shape;
    this._loweredAtRecordCount = records.length;
    this._loweredAtTransformCount = transformCount;
    return shape;
  }
}

function validateGridPatternAxis(
  label: 'patternGrid.x' | 'patternGrid.y',
  axis: { count: number; direction: [number, number, number]; spacing: number },
  featureId: FeatureId,
): void {
  if (!Number.isInteger(axis.count) || axis.count < 2) {
    throw new KernelError(
      'feature.invalid-args',
      `${label} count must be an integer >= 2.`,
      featureId,
      'Pass count: 2 or greater for both grid axes.',
    );
  }
  if (!isValidVec3(axis.direction)) {
    throw new KernelError(
      'feature.invalid-args',
      `${label} direction must be a finite Vec3; got ${formatScalarForError(axis.direction)}.`,
      featureId,
      'Pass direction: [x, y, z] for both grid axes.',
    );
  }
  if (typeof axis.spacing !== 'number' || !Number.isFinite(axis.spacing) || axis.spacing === 0) {
    throw new KernelError(
      'feature.invalid-args',
      `${label} spacing must be a non-zero finite number; got ${formatScalarForError(axis.spacing)}.`,
      featureId,
      'Pass a non-zero finite spacing for both grid axes.',
    );
  }
}

/** Wrap a bare canonical-face / label string OR a `@kc[<owner>/face/<name>]`
 *  ref string into the structured `{ face: <s> }` shape so hole/holes/cutout/
 *  shell accept every input form uniformly. */
function normalizeFaceSelector(face: FaceSelector | CanonicalFace | string): FaceSelector {
  if (typeof face === 'string') {
    return normalizeTopoRefOrString(face, 'face') as FaceSelector;
  }
  return face;
}

/** Walk records back from `targetId` via `inputs.target` (slice-2 chain
 *  semantics). Returns records in chain order (oldest first). */
function chainRecordsFrom(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
): typeof records[number][] {
  const byId = new Map<string, typeof records[number]>();
  for (const r of records) byId.set(r.id, r);
  const out: typeof records[number][] = [];
  let cur: string | undefined = targetId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const r = byId.get(cur);
    if (!r) break;
    out.unshift(r);
    const target = r.inputs?.target;
    cur = target && target.kind === 'feature' ? target.id : undefined;
  }
  return out;
}

/** Throw `feature.invalid-args` if any prior feature in the chain ending
 *  at `targetId` already used the given `name`. */
function assertFeatureNameUniqueOnChain(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
  name: string,
): void {
  const chain = chainRecordsFrom(records, targetId);
  for (const r of chain) {
    const prev = (r.metadata as { name?: unknown } | undefined)?.name;
    if (typeof prev === 'string' && prev === name) {
      throw new KernelError(
        'feature.invalid-args',
        `feature name '${name}' is already used in this chain.`,
        undefined,
        `Feature name '${name}' already used in this chain. Names must be unique per chain; for variations use suffixes ('${name}-front', '${name}-back').`,
      );
    }
  }
}

/** 1-based ordinal among unnamed features of the given `kind` in the chain
 *  ending at `targetId`. */
function nextOrdinalForKindOnChain(
  records: ReadonlyArray<{ id: string; kind: string; inputs?: Record<string, { kind: string; id?: string }>; metadata?: Record<string, unknown> }>,
  targetId: string,
  kind: string,
): number {
  const chain = chainRecordsFrom(records, targetId);
  let count = 0;
  for (const r of chain) {
    if (r.kind !== kind) continue;
    const meta = r.metadata as { name?: unknown } | undefined;
    if (typeof meta?.name === 'string') continue;  // named features don't consume an ordinal slot
    count++;
  }
  return count + 1;
}
