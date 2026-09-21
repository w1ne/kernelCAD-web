// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import type { SweepOrientation } from '../../../shared/intent/variableSweepRecord';

/**
 * Per-section input to `lowerVariableSweep`. Each carries:
 *  - `t`: normalized parameter on the spine in `[0, 1]` (already validated
 *    monotonic-ascending + spanning by the capture layer). `t` maps onto
 *    the spine edge's OCCT parameter range `[FirstParameter(), LastParameter()]`
 *    exactly the way `Curve3D.pointAt(t)` does — it is a normalized *curve
 *    parameter*, not a normalized arc length.
 *  - `profileWire`: a `TopoDS_Wire` for the closed profile loop at this
 *    station (typically the outer wire of a sketch lifted onto its plane).
 *  - `locationPnt`: world-space anchor point on the spine at parameter `t`.
 *    Retained for callers/tests that carry it, but the lowerer ignores it:
 *    it evaluates the spine edge itself at `t` and matches that point to a
 *    spine vertex (intermediate stations) or uses the first/last spine
 *    vertex (`t=0`/`t=1`). See the subdivision contract on
 *    `lowerVariableSweep`.
 */
export interface VariableSweepSectionLowered {
  t: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profileWire: any;
  locationPnt: [number, number, number];
}

/** Endpoint snapping tolerance for section `t` values, matching the capture
 *  layer's validator (`Math.abs(t - 0) > 1e-9` rejects, so 1e-9 is the gate
 *  the lowerer must agree with). Values within this distance of 0/1 are
 *  treated as the spine endpoints. */
const T_ENDPOINT_EPS = 1e-9;

/** Max distance (mm) between a section's evaluated spine point and the wire
 *  vertex it is matched to. The subdivision pass builds the vertex from the
 *  exact same `BRepAdaptor_Curve` evaluation, so this only guards against a
 *  broken/mismatched wire; 1e-6 mm is far above double-precision noise and
 *  far below any real modelling tolerance. */
const STATION_MATCH_TOL = 1e-6;

export interface LowerVariableSweepOpts {
  continuity?: 'C0' | 'C1' | 'C2';
  closed?: boolean;
  orientation?: SweepOrientation;
  /**
   * When true, OCCT translates each profile wire so it makes contact with
   * the spine vertex it's anchored to (`BRepOffsetAPI_MakePipeShell::Add_2`'s
   * `WithContact=true`). `lowerVariableSweep` in
   * `backends/occt/lowerers/curves.ts` uses this for
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
 * aborts with a raw OCCT exception (the bundled build throws `Unknown
 * Error` out of `Add_2`). The 2-section case maps `t=0` to the spine
 * wire's first vertex and `t=1` to its last vertex. Sections with
 * `t ∈ (0, 1)` trigger a spine-subdivision pass first:
 *
 *  1. `BRep_Tool.Curve_2` extracts the edge's underlying `Geom_Curve`.
 *  2. The curve is split into sub-edges over the parameter sub-ranges
 *     between consecutive stations via `BRepBuilderAPI_MakeEdge_29`
 *     (curve + shared end vertices + parameter bounds), so adjacent
 *     sub-edges share the exact same `TopoDS_Vertex` objects.
 *  3. `BRepBuilderAPI_MakeWire` stitches the sub-edges back into one wire.
 *  4. Each station's point is evaluated with `BRepAdaptor_Curve.Value` and
 *     matched to the nearest vertex of the rebuilt wire within
 *     `STATION_MATCH_TOL`.
 *
 * `BRepAlgoAPI_Splitter` and `GCPnts_AbscissaPoint` are NOT bound by the
 * bundled build, hence the rebuild-the-wire approach. The rebuilt wire is
 * geometrically identical to the input edge (same underlying curve, shared
 * vertices), so only the intermediate-station path pays this cost; the
 * 2-section path keeps the original wire untouched.
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
 *   `IsDone()` returns false after `Build`, fewer than 2 sections are
 *   supplied, section `t` values are non-finite / outside `[0, 1]` / not
 *   strictly increasing / do not span the full spine (first `t=0`, last
 *   `t=1`), the spine cannot be subdivided for an intermediate station, or
 *   a station cannot be matched to a rebuilt-wire vertex. Callers should
 *   wrap and map into a `feature.kernel-failed` diagnostic with the
 *   underlying message.
 */
type Oc = ReturnType<typeof getOC>;
type OcEdge = ConstructorParameters<Oc['BRepBuilderAPI_MakeWire_2']>[0];
type OcPipeShell = InstanceType<Oc['BRepOffsetAPI_MakePipeShell']>;

interface SpineAnchor {
  spineWire: ReturnType<Oc['BRepBuilderAPI_MakeWire_2']['Wire']>;
  firstVertex: ReturnType<Oc['TopoDS']['Vertex_1']>;
  lastVertex: ReturnType<Oc['TopoDS']['Vertex_1']>;
}

export function lowerVariableSweep(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spineEdge: any,
  sections: VariableSweepSectionLowered[],
  opts: LowerVariableSweepOpts = {},
): OcctBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;

  validateSections(sections);

  // Stations strictly inside (0, 1) force the spine-subdivision pass. `t`
  // values within `T_ENDPOINT_EPS` of 0/1 are endpoint aliases (the capture
  // validator accepts them) and do not subdivide.
  const intermediateTs = sections
    .map((s) => s.t)
    .filter((t) => t > T_ENDPOINT_EPS && t < 1 - T_ENDPOINT_EPS);

  // The location `TopoDS_Vertex` Add_2 anchors each profile to, one per
  // section in section order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let spineWire: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stationVertices: any[];

  if (intermediateTs.length === 0) {
    // 2-section path — same anchor collection as the pre-subdivision code
    // (OCCT's `Add_2` only accepts spine-owned vertices).
    const anchor = collectSpineAnchor(oc, spineEdge);
    spineWire = anchor.spineWire;
    stationVertices = sections.map((s) => (s.t <= 0.5 ? anchor.firstVertex : anchor.lastVertex));
  } else {
    spineWire = subdivideSpineAtStations(oc, spineEdge, intermediateTs);
    const adaptor = new oc.BRepAdaptor_Curve_2(spineEdge);
    const u0 = adaptor.FirstParameter();
    const u1 = adaptor.LastParameter();
    const wireVertices = exploreVertices(oc, spineWire);
    stationVertices = sections.map((s) =>
      matchStationVertex(oc, adaptor, u0, u1, s.t, wireVertices),
    );
  }

  const pipeShell = new oc.BRepOffsetAPI_MakePipeShell(spineWire);
  applyOrientationMode(oc, pipeShell, opts);
  pipeShell.SetTransitionMode(resolveTransitionMode(oc, opts));

  // `withContact` controls `BRepOffsetAPI_MakePipeShell::Add_2`'s third
  // argument: when true, OCCT translates the profile so its anchor matches
  // the spine vertex (used for sketch-lifted profiles in the dispatch arm);
  // when false, the caller is responsible for pre-positioning each profile
  // (used by direct-OCCT unit tests).
  // `withCorrection` is the fourth argument: when true, OCCT also rotates
  // each profile to be perpendicular to the spine tangent at its vertex.
  const withContact = opts.withContact ?? false;
  const withCorrection = opts.withCorrection ?? false;
  addProfileSections(pipeShell, sections, stationVertices, withContact, withCorrection);

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

/**
 * Gate the section list before any OCCT work. Mirrors the capture-layer
 * validator (`isVariableSweepMetadata` / `buildVariableSweepFeatureSpec`) so
 * direct callers of the lowerer — notably unit tests — get the same contract:
 * finite `t`, strictly increasing, and spanning the full spine with first
 * `t=0` / last `t=1` (within `T_ENDPOINT_EPS`).
 */
function validateSections(sections: VariableSweepSectionLowered[]): void {
  if (sections.length < 2) {
    throw new Error(
      `lowerVariableSweep: need at least 2 sections; got ${sections.length}.`,
    );
  }
  let prev = -Infinity;
  for (const s of sections) {
    if (!Number.isFinite(s.t)) {
      throw new Error(
        `lowerVariableSweep: section t=${s.t} is not a finite number.`,
      );
    }
    if (s.t < -T_ENDPOINT_EPS || s.t > 1 + T_ENDPOINT_EPS) {
      throw new Error(
        `lowerVariableSweep: section t=${s.t} is outside [0, 1]; every section must sit on the spine.`,
      );
    }
    if (s.t <= prev) {
      throw new Error(
        `lowerVariableSweep: sections must be strictly increasing in t; got t=${s.t} after t=${prev} (duplicate or unsorted station).`,
      );
    }
    prev = s.t;
  }
  const first = sections[0].t;
  const last = sections[sections.length - 1].t;
  if (Math.abs(first) > T_ENDPOINT_EPS || Math.abs(last - 1) > T_ENDPOINT_EPS) {
    throw new Error(
      `lowerVariableSweep: sections must span the full spine (first t=0, last t=1); got first t=${first}, last t=${last}.`,
    );
  }
}

/**
 * Snapshot a shape's vertices, deduplicated by `IsSame`. `BRepBuilderAPI_MakeWire`
 * lists a shared interior vertex once per incident edge when explored with
 * `TopExp_Explorer`, so the dedupe keeps one representative per topological
 * vertex.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exploreVertices(oc: any, shape: any): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vertices: any[] = [];
  const exp = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_VERTEX,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  while (exp.More()) {
    const candidate = oc.TopoDS.Vertex_1(exp.Current());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!vertices.some((v: any) => v.IsSame(candidate))) {
      vertices.push(candidate);
    }
    exp.Next();
  }
  return vertices;
}

/**
 * Split the spine edge at each intermediate station and stitch the pieces
 * back into one wire whose vertices are shared between adjacent sub-edges.
 *
 * The bundled `replicad-opencascadejs` build does not bind
 * `BRepAlgoAPI_Splitter` (and `GCPnts_AbscissaPoint` is absent too), so the
 * split is done by rebuilding sub-edges over the original `Geom_Curve`'s
 * parameter sub-ranges. Each sub-edge is created with
 * `BRepBuilderAPI_MakeEdge_29(curve, v1, v2, p1, p2)` sharing the exact
 * `TopoDS_Vertex` objects with its neighbours — the identity `Add_2`
 * requires (a fresh vertex at the same coordinates throws out of `Add_2`).
 *
 * @param stations Intermediate `t` values in `(0, 1)`, strictly increasing.
 */
function subdivideSpineAtStations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spineEdge: any,
  stations: number[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const adaptor = new oc.BRepAdaptor_Curve_2(spineEdge);
  const u0 = adaptor.FirstParameter();
  const u1 = adaptor.LastParameter();

  // Extract the edge's underlying curve. `BRep_Tool.Curve_2`'s output
  // parameters are not marshalled by the binding, so the handle is returned
  // directly; it carries no location, hence the explicit edge-location
  // compensation for the (not currently produced) located-edge case.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let curve: any = oc.BRep_Tool.Curve_2(spineEdge, 0, 0);
  if (!curve) {
    throw new Error(
      'lowerVariableSweep: cannot subdivide the spine for intermediate sections — BRep_Tool.Curve_2 returned null (spine edge has no 3D curve).',
    );
  }
  const location = spineEdge.Location_1();
  if (!location.IsIdentity()) {
    curve = curve.get().Transformed(location.Transformation());
  }

  // u-parameters for [spine start, ...stations, spine end].
  const params = [u0, ...stations.map((t) => u0 + t * (u1 - u0)), u1];

  // One shared vertex per station boundary, built from the same evaluation
  // `BRepAdaptor_Curve` uses (location-corrected world point).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vertices: any[] = params.map(
    (u: number) => new oc.BRepBuilderAPI_MakeVertex(adaptor.Value(u)).Vertex(),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edges: any[] = [];
  for (let i = 0; i + 1 < params.length; i++) {
    const maker = new oc.BRepBuilderAPI_MakeEdge_29(
      curve,
      vertices[i],
      vertices[i + 1],
      params[i],
      params[i + 1],
    );
    if (!maker.IsDone()) {
      throw new Error(
        `lowerVariableSweep: failed to split the spine edge over parameter range [${params[i]}, ${params[i + 1]}] (BRepBuilderAPI_MakeEdge did not converge).`,
      );
    }
    edges.push(maker.Edge());
  }

  const wireMaker = new oc.BRepBuilderAPI_MakeWire_2(edges[0]);
  for (let i = 1; i < edges.length; i++) {
    wireMaker.Add_1(edges[i]);
  }
  if (!wireMaker.IsDone()) {
    throw new Error(
      'lowerVariableSweep: failed to rebuild the spine wire after splitting at intermediate sections.',
    );
  }
  return wireMaker.Wire();
}

/**
 * Match a section's evaluated spine point to a vertex of the subdivided
 * spine wire, nearest-first, within `STATION_MATCH_TOL`. The vertex must be
 * wire-owned — `Add_2` rejects anything else.
 */
function matchStationVertex(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adaptor: any,
  u0: number,
  u1: number,
  t: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vertices: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const u = u0 + t * (u1 - u0);
  const target = adaptor.Value(u);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let best: any;
  let bestDistSq = Infinity;
  for (const v of vertices) {
    const p = oc.BRep_Tool.Pnt(v);
    const dx = p.X() - target.X();
    const dy = p.Y() - target.Y();
    const dz = p.Z() - target.Z();
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = v;
    }
  }
  if (!best || bestDistSq > STATION_MATCH_TOL * STATION_MATCH_TOL) {
    throw new Error(
      `lowerVariableSweep: no spine vertex within ${STATION_MATCH_TOL} mm of the t=${t} station point (nearest distance ${Math.sqrt(bestDistSq)} mm).`,
    );
  }
  return best;
}

// Wrap the spine edge in a TopoDS_Wire and snapshot its first/last vertices —
// OCCT's `Add_2` only accepts spine-owned vertices.
function collectSpineAnchor(oc: Oc, spineEdge: OcEdge): SpineAnchor {
  const spineWire = new oc.BRepBuilderAPI_MakeWire_2(spineEdge).Wire();

  const spineVertices: SpineAnchor['firstVertex'][] = [];
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
  return {
    spineWire,
    firstVertex: spineVertices[0],
    lastVertex: spineVertices[spineVertices.length - 1],
  };
}

// Orientation: default is corrected-Frenet (SetMode_1(false)). For a
// straight spine this is the safe choice (pure Frenet is undefined when
// curvature is zero).
function applyOrientationMode(oc: Oc, pipeShell: OcPipeShell, opts: LowerVariableSweepOpts): void {
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
}

// Continuity → transition-mode mapping. C2 picks the rounded transition
// for smoother blends across stations; everything else (incl. default
// 'C1') uses the OCCT default right-corner transition.
function resolveTransitionMode(oc: Oc, opts: LowerVariableSweepOpts) {
  return opts.continuity === 'C2'
    ? oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RoundCorner
    : oc.BRepBuilderAPI_TransitionMode.BRepBuilderAPI_RightCorner;
}

// Add each profile, anchored at its station vertex (first/last for the
// two-section path, matched spine vertices when stations are subdivided).
function addProfileSections(
  pipeShell: OcPipeShell,
  sections: VariableSweepSectionLowered[],
  stationVertices: SpineAnchor['firstVertex'][],
  withContact: boolean,
  withCorrection: boolean,
): void {
  for (let i = 0; i < sections.length; i++) {
    pipeShell.Add_2(sections[i].profileWire, stationVertices[i], withContact, withCorrection);
  }
}
