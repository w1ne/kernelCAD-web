import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { SweepOrientation } from '../../../shared/intent/variableSweepRecord';

/**
 * Per-section input to `lowerVariableSweep`. Each carries:
 *  - `t`: normalized parameter on the spine in `[0, 1]` (already validated
 *    monotonic-ascending + spanning by the capture layer; the lowerer
 *    uses it only to pick the matching spine vertex).
 *  - `profileWire`: a `TopoDS_Wire` for the closed profile loop at this
 *    station (typically the outer wire of a sketch lifted onto its plane).
 *  - `locationPnt`: world-space anchor point on the spine at parameter `t`.
 *    Used only when the section's `t` is strictly between 0 and 1, and the
 *    spine wire does not already carry a vertex at that station. Today the
 *    lowerer always uses an existing spine vertex (see `BRepOffsetAPI_MakePipeShell::Add_2`
 *    contract notes below), so this field is forwarded for the future
 *    spine-subdivision path but never consumed in the common 2-section case.
 */
export interface VariableSweepSectionLowered {
  t: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profileWire: any;
  locationPnt: [number, number, number];
}

export interface LowerVariableSweepOpts {
  continuity?: 'C0' | 'C1' | 'C2';
  closed?: boolean;
  orientation?: SweepOrientation;
  /**
   * When true, OCCT translates each profile wire so it makes contact with
   * the spine vertex it's anchored to (`BRepOffsetAPI_MakePipeShell::Add_2`'s
   * `WithContact=true`). The dispatch arm in `occtLowerer` uses this for
   * sketch-derived profiles (always lifted at z=0); callers that supply
   * pre-positioned profile wires (e.g. the lowerer's unit test) leave this
   * `false` so OCCT honours the caller-supplied placement. Default: `false`.
   */
  withContact?: boolean;
  /**
   * When true, OCCT reorients each profile wire to be perpendicular to the
   * spine tangent at its location vertex (`Add_2`'s `WithCorrection=true`).
   * Required for sketch-derived profiles that live in the XY plane swept
   * along an XY-plane spine; without correction the profile is parallel to
   * the spine direction and the swept volume collapses. Default: `false`.
   */
  withCorrection?: boolean;
}

/**
 * Build a swept solid from a spine wire + N profile sections via
 * `BRepOffsetAPI_MakePipeShell`. Direct OCCT — no replicad wrapper around
 * the pipe-shell builder, but the result is cast back to `replicad.Shape3D`
 * via `replicad.cast` so the standard `OcctBackend` lineage (meshing,
 * exporters, history) keeps working.
 *
 * Location-vertex contract (verified empirically against the bundled
 * `replicad-opencascadejs` build): `BRepOffsetAPI_MakePipeShell::Add_2`
 * requires the location `TopoDS_Vertex` to be one of the spine wire's own
 * vertices — a fresh `BRepBuilderAPI_MakeVertex` at the same coordinates
 * triggers a silent build failure. Today the lowerer maps `t === 0` to
 * the spine wire's first vertex and `t === 1` to its last vertex (the
 * 2-section common case). Sections with `t ∈ (0, 1)` are not yet
 * supported — they need a spine-subdivision pass that splits the spine
 * edges at each station so a corresponding TopoDS_Vertex exists.
 *
 * Orientation handling:
 *  - default / `'corrected-frenet'`: `SetMode_1(false)` — OCCT's corrected
 *    Frenet frame (tolerant of straight spines where pure Frenet is
 *    undefined).
 *  - `'frenet'`: `SetMode_1(true)` — pure Frenet (rotates with curvature).
 *  - `'discrete'`: `SetDiscreteMode()` — fast-twisting spines.
 *  - `{ up: [x, y, z] }`: `SetMode_3(gp_Dir(x, y, z))` — fixed up-vector.
 *
 * Continuity → transition-mode mapping mirrors the plan: `'C2'` →
 * `RoundCorner`, anything else → `RightCorner`. `WithCorrection=true` is
 * passed on every `Add_2` so the profile is reoriented to be perpendicular
 * to the spine tangent at its location vertex.
 *
 * @throws {Error} If the pipe shell builder cannot be constructed,
 *   `IsDone()` returns false after `Build`, or a section's `t` value is
 *   not 0 or 1 (intermediate stations require spine subdivision — see
 *   contract note above). Callers should wrap and map into a
 *   `feature.kernel-failed` diagnostic with the underlying message.
 */
export function lowerVariableSweep(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spineEdge: any,
  sections: VariableSweepSectionLowered[],
  opts: LowerVariableSweepOpts = {},
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  if (sections.length < 2) {
    throw new Error(
      `lowerVariableSweep: need at least 2 sections; got ${sections.length}.`,
    );
  }

  // Wrap the spine edge in a TopoDS_Wire and snapshot its vertices —
  // OCCT's `Add_2` only accepts spine-owned vertices.
  const spineWire = new oc.BRepBuilderAPI_MakeWire_2(spineEdge).Wire();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spineVertices: any[] = [];
  const exp = new oc.TopExp_Explorer_2(
    spineWire,
    oc.TopAbs_ShapeEnum.TopAbs_VERTEX,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  while (exp.More()) {
    spineVertices.push(oc.TopoDS.Vertex_1(exp.Current()));
    exp.Next();
  }
  if (spineVertices.length < 2) {
    throw new Error(
      `lowerVariableSweep: spine wire has only ${spineVertices.length} vertex (need ≥ 2).`,
    );
  }
  const firstVertex = spineVertices[0];
  const lastVertex = spineVertices[spineVertices.length - 1];

  const pipeShell = new oc.BRepOffsetAPI_MakePipeShell(spineWire);

  // Orientation: default is corrected-Frenet (SetMode_1(false)). For a
  // straight spine this is the safe choice (pure Frenet is undefined when
  // curvature is zero).
  const orient = opts.orientation ?? 'corrected-frenet';
  if (orient === 'frenet') {
    pipeShell.SetMode_1(true);
  } else if (orient === 'discrete') {
    pipeShell.SetDiscreteMode();
  } else if (typeof orient === 'object' && 'up' in orient) {
    const [ux, uy, uz] = orient.up;
    pipeShell.SetMode_3(new oc.gp_Dir_4(ux, uy, uz));
  } else {
    pipeShell.SetMode_1(false);
  }

  // Continuity → transition-mode mapping. C2 picks the rounded transition
  // for smoother blends across stations; everything else (incl. default
  // 'C1') uses the OCCT default right-corner transition.
  const transitionMode =
    opts.continuity === 'C2'
      ? oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RoundCorner
      : oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RightCorner;
  pipeShell.SetTransitionMode(transitionMode);

  // Add each profile, anchored at a spine-owned vertex.
  // `withContact` controls `BRepOffsetAPI_MakePipeShell::Add_2`'s third
  // argument: when true, OCCT translates the profile so its anchor matches
  // the spine vertex (used for sketch-lifted profiles in the dispatch arm);
  // when false, the caller is responsible for pre-positioning each profile
  // (used by direct-OCCT unit tests).
  // `withCorrection` is the fourth argument: when true, OCCT also rotates
  // each profile to be perpendicular to the spine tangent at its vertex.
  const withContact = opts.withContact ?? false;
  const withCorrection = opts.withCorrection ?? false;
  for (const s of sections) {
    let vertex;
    if (s.t === 0) {
      vertex = firstVertex;
    } else if (s.t === 1) {
      vertex = lastVertex;
    } else {
      throw new Error(
        `lowerVariableSweep: section t=${s.t} is between 0 and 1; only t=0 and t=1 are supported today (intermediate stations require spine subdivision).`,
      );
    }
    pipeShell.Add_2(s.profileWire, vertex, withContact, withCorrection);
  }

  const progress = new oc.Message_ProgressRange_1();
  pipeShell.Build(progress);
  if (!pipeShell.IsDone()) {
    throw new Error('BRepOffsetAPI_MakePipeShell::Build did not converge.');
  }
  pipeShell.MakeSolid();
  const rawShape = pipeShell.Shape();

  // Cast TopoDS_Shape → replicad.Shape3D so the OcctBackend lineage
  // (meshing, exporters, transforms, history) reuses the standard wrapper.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = replicad.cast(rawShape as any) as replicad.Shape3D;
  return new OcctBackend(wrapped);
}
