// src/capture/sketch.ts
import type { FeatureId } from '../intent/types';
import type { CaptureSession } from './captureSession';
import { Shape } from './proxy';
import { KernelError } from '../intent/kernelError';

export type SketchCommand =
  | { kind: 'moveTo'; x: number; y: number }
  | { kind: 'lineTo'; x: number; y: number }
  | { kind: 'tangentArc'; x: number; y: number }
  | { kind: 'threePointsArc'; x: number; y: number; midX: number; midY: number }
  | { kind: 'sagittaArc'; x: number; y: number; sagitta: number }
  | { kind: 'bulgeArc'; x: number; y: number; bulge: number }
  | { kind: 'radiusArc'; x: number; y: number; radius: number }
  | { kind: 'close' };

/**
 * `Sketch` captures a closed 2D profile that can later be extruded.
 *
 * Constructed only via `path().moveTo(...).lineTo(...).close()`. The builder
 * pattern enforces the moveTo-first / close-before-extrude invariant at the
 * type level — `Sketch.extrude()` is the only method, and you can only get a
 * `Sketch` by closing a `PathBuilder`.
 */
export class Sketch {
  readonly id: FeatureId;
  private session: CaptureSession;

  constructor(id: FeatureId, session: CaptureSession) {
    this.id = id;
    this.session = session;
  }

  extrude(depth: number): Shape {
    return this.session.createShape({
      kind: 'extrude',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
        depth: { expression: String(depth), unit: 'mm', evaluated: depth },
      },
    });
  }

  /**
   * Revolve the sketch 360° around the Z axis. The path coordinates are
   * interpreted as `(radial-X, axial-Z)` — first coord = distance from axis,
   * second coord = height along axis. Profile must stay on x ≥ 0.
   *
   * Returns a `Shape` (3D solid). Validation (axis-cross, empty profile)
   * happens at lowering time and surfaces as `feature.revolve.*` diagnostics.
   */
  revolve(): Shape {
    return this.session.createShape({
      kind: 'revolve',
      inputs: {
        sketch: { kind: 'feature', id: this.id },
      },
      params: {
        profileKind: { expression: "'sketch'", unit: 'unitless', evaluated: 0 },
      },
    });
  }
}

/**
 * Fluent builder for arbitrary 2D profiles. Always start with `path().moveTo(x,y)`.
 * Chain `.lineTo(x,y)` for line segments. End with `.close()` to get a `Sketch`.
 *
 * `arcTo` / `lineH` / `lineV` / `lineAngled` / `label` / `stroke` are deferred to
 * v0.4-rc.2+. Constraints (`fix`, `coincident`, `horizontal`, etc.) are v0.5+.
 */
export class PathBuilder {
  private session: CaptureSession;
  private commands: SketchCommand[] = [];

  constructor(session: CaptureSession) {
    this.session = session;
  }

  moveTo(x: number, y: number): PathBuilder {
    this.commands.push({ kind: 'moveTo', x, y });
    return this;
  }

  lineTo(x: number, y: number): PathBuilder {
    this.commands.push({ kind: 'lineTo', x, y });
    return this;
  }

  /**
   * Continue tangent from the previous segment to (x, y) along an arc.
   * The arc's tangent direction at the start equals the previous segment's
   * end tangent. Replicad's `tangentArcTo` underneath.
   *
   * Throws at lowering time (via `feature.sketch.failed` diagnostic) if
   * called as the first command — there's no prior tangent to consume.
   */
  tangentArc(x: number, y: number): PathBuilder {
    this.commands.push({ kind: 'tangentArc', x, y });
    return this;
  }

  /**
   * Arc through three points (start = current pen position, mid = via, end = (x, y)).
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this when you know an interior point on the curve (e.g. reverse-engineering
   * from a CAD reference) or when you need a major arc (>180°) — set the midpoint
   * on the far side of the chord. No sign convention; midpoint position fully
   * determines the arc.
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param midX midpoint X (any point the arc passes through, not on the chord)
   * @param midY midpoint Y
   */
  threePointsArc(x: number, y: number, midX: number, midY: number): PathBuilder {
    this.commands.push({ kind: 'threePointsArc', x, y, midX, midY });
    return this;
  }

  /**
   * Arc by chord + perpendicular bulge height (sagitta).
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this when you know how far the arc bulges from the chord. Replicad-native
   * (`sagittaArcTo`).
   *
   * Sign convention: positive sagitta → arc bulges LEFT of chord direction
   * (counterclockwise from start to end). Negative → bulges RIGHT (clockwise).
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param sagitta perpendicular bulge height (signed)
   */
  sagittaArc(x: number, y: number, sagitta: number): PathBuilder {
    this.commands.push({ kind: 'sagittaArc', x, y, sagitta });
    return this;
  }

  /**
   * Arc by chord + DXF bulge factor (bulge = tan(includedAngle / 4)).
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this when round-tripping DXF (DXF stores arcs as bulge factors).
   * Replicad-native (`bulgeArcTo`).
   *
   * Sign convention: positive bulge → counterclockwise (left of chord direction).
   * Negative → clockwise. Magnitude > 1 means included angle > 180°.
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param bulge DXF bulge factor (signed)
   */
  bulgeArc(x: number, y: number, bulge: number): PathBuilder {
    this.commands.push({ kind: 'bulgeArc', x, y, bulge });
    return this;
  }

  /**
   * Arc by chord + explicit radius. Always the MINOR arc (<180°). For a major
   * arc, use threePointsArc with the midpoint on the far side of the chord.
   * No prior tangent required — can be the first segment of a path.
   *
   * Pick this for parametric work where radius is the natural mental model.
   * Computed via signed sagitta and lowered through `sagittaArcTo`.
   *
   * Sign convention: positive radius → arc bulges LEFT of chord direction
   * (counterclockwise from start to end). Negative → bulges RIGHT.
   *
   * Validation (at lowering time):
   * - `|radius| >= chord/2` — else `feature.sketch.degenerate-arc` diagnostic
   * - `chord > 0` (start ≠ end) — else `feature.sketch.degenerate-arc`
   *
   * @param x endpoint X
   * @param y endpoint Y
   * @param radius arc radius (signed)
   */
  radiusArc(x: number, y: number, radius: number): PathBuilder {
    this.commands.push({ kind: 'radiusArc', x, y, radius });
    return this;
  }

  /**
   * Tag the most recent segment with a name. The label persists in the sketch's
   * metadata.commands and can be referenced later in .fillet/.chamfer/.shell:
   *
   *   path().moveTo(0,0).lineTo(10,5).label('rim').close().extrude(3).fillet(1, { face: 'rim' });
   *
   * Constraints:
   * - Must follow a segment (lineTo or any *Arc); throws if called as the first
   *   command, immediately after moveTo, or after close.
   * - Each label name must be unique within one sketch.
   * - Avoid using the canonical face names ('top', 'bottom', 'left', 'right',
   *   'front', 'back') as labels — those route through canonical face resolution
   *   instead of label lookup. Use any non-canonical name.
   *
   * @param name a label name unique within this path (and not a canonical face name)
   */
  label(name: string): PathBuilder {
    const last = this.commands[this.commands.length - 1];
    if (!last || last.kind === 'moveTo' || last.kind === 'close') {
      throw new KernelError(
        'feature.path.label-without-segment',
        `label('${name}'): must follow a segment (lineTo or any arc), not moveTo / close / nothing.`,
      );
    }
    if (this.commands.some(c => c !== last && (c as { label?: string }).label === name)) {
      throw new KernelError(
        'feature.path.duplicate-label',
        `label('${name}'): name already used in this sketch — labels must be unique.`,
      );
    }
    (last as { label?: string }).label = name;
    return this;
  }

  /**
   * Close the path and register the sketch FeatureRecord. Returns a `Sketch`
   * proxy whose only method is `.extrude(depth)`.
   */
  close(): Sketch {
    this.commands.push({ kind: 'close' });
    return this.session.createSketch({
      kind: 'sketch',
      inputs: {},
      params: {},
      metadata: { commands: this.commands },
    });
  }
}

export function makePath(session: CaptureSession): PathBuilder {
  return new PathBuilder(session);
}
