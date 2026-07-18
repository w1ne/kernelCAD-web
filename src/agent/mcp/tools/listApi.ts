// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/tools/listApi.ts
//
// MCP tool: advertise the kernelCAD script-runtime surface so agents can
// discover globals, Shape/Sketch methods, and EdgeQuery/FaceQuery keys
// without reading source. Hand-curated static data; updated alongside any
// API addition (this file is the single source of truth for "what can a
// .kcad.ts script call?").

import { EDGE_QUERY_KEYS, FACE_QUERY_KEYS } from '../../../shared/intent/queryKeys';
import { SUPPORTED_CONSTRAINT_TYPES } from './constraints';
import type { ConstraintType } from '../../../modeling/constraints/types';

export interface ListApiInput {
  /**
   * Optional keyword filter. When provided, only entries whose name, signature,
   * or description match (token substring, case-insensitive) are returned, WITH
   * full descriptions. When omitted, every entry is returned in COMPACT form
   * (name + signature + a short blurb, no full description) — the whole API
   * surface is ~117 entries / ~14k tokens of prose at full detail, which alone
   * can exhaust a generation's token budget. Default-compact keeps discovery
   * cheap; pass a query (e.g. 'sweep handle tube') to drill into a few entries.
   */
  query?: string;
}

const COMPACT_BLURB_CHARS = 90;

function entryMatches(e: ApiEntry, tokens: string[]): boolean {
  const hay = `${e.name} ${e.signature} ${e.description}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

function compactEntry(e: ApiEntry): ApiEntry {
  const blurb = e.description.split(/(?<=[.!?])\s/)[0] ?? '';
  return {
    name: e.name,
    signature: e.signature,
    description: blurb.length > COMPACT_BLURB_CHARS ? `${blurb.slice(0, COMPACT_BLURB_CHARS)}…` : blurb,
  };
}

/** Project an ApiEntry[] for the response: filtered+full on query, else compact. */
function projectEntries(entries: ApiEntry[], tokens: string[]): ApiEntry[] {
  return tokens.length > 0 ? entries.filter((e) => entryMatches(e, tokens)) : entries.map(compactEntry);
}

export interface ApiEntry {
  name: string;
  description: string;
  signature: string;
}

export interface FeatureKindFaceLabels {
  /** Primitive/extrude kinds that accept an `opts.faceLabels` map. */
  acceptingKinds: readonly string[];
  /** Description of the faceLabels option: value types and intended use. */
  description: string;
}

export interface ConstraintCapability {
  /** MCP tools that operate on side-effect-free sketch constraint payloads. */
  tools: readonly string[];
  /** Constraint type vocabulary accepted by list_constraints/add_constraint/solve_sketch. */
  supportedTypes: readonly ConstraintType[];
}

export interface ListApiOutput {
  ok: boolean;
  globals?: ApiEntry[];
  shapeMethods?: ApiEntry[];
  /** Selector-algebra methods on the `ShapeList` returned by `selectEdges()` / `select()`. */
  shapeListMethods?: ApiEntry[];
  sketchMethods?: ApiEntry[];
  pathBuilderMethods?: ApiEntry[];
  paramRefMethods?: ApiEntry[];
  /** Methods/properties on the `Scene` returned by `Assembly.model()` / `Assembly.solvedModel()`. */
  sceneMethods?: ApiEntry[];
  /** Properties on each `ScenePart` produced by a Scene. */
  scenePartProperties?: ApiEntry[];
  /** Methods on the `Surface` peer returned by `nurbsSurface()` / `surfaceFromCurves()`. */
  surfaceMethods?: ApiEntry[];
  /** Flat synchronous methods on the `Curve3D` peer returned by `nurbsCurve()` / `spline3d()` / `hermiteG2()`. */
  curve3dMethods?: ApiEntry[];
  /** Methods on the `.analytics` namespace of every `Curve3D` (closest-point, arc-length division, derivatives, tessellation, intersection). */
  curve3dAnalyticsMethods?: ApiEntry[];
  edgeQueryKeys?: readonly string[];
  faceQueryKeys?: readonly string[];
  /** Per-kind faceLabels support: which global functions accept opts.faceLabels and what values are valid. */
  featureKindFaceLabels?: FeatureKindFaceLabels;
  /** Constrained-sketch MCP capability: discovery tools and supported constraint vocabulary. */
  constraints?: ConstraintCapability;
  error?: string;
}

export const GLOBALS: ApiEntry[] = [
  { name: 'box', signature: '(x, y, z, centered?, opts?) => Shape', description: 'Axis-aligned box. `centered: true` centers on the origin. `opts.faceLabels` maps user label names to canonical face names (top/bottom/left/right/front/back) or FaceQuery descriptors for later fillet/chamfer/shell reference.' },
  { name: 'cylinder', signature: '(h, r, segments?, opts?) => Shape', description: 'Z-axis cylinder; bottom on the XY plane, height h, radius r. `opts.faceLabels` maps user label names to canonical face names (top/bottom) or FaceQuery descriptors.' },
  { name: 'sphere', signature: '(r) => Shape', description: 'Sphere centered at the origin, radius r. No canonical face names; does not accept an opts map with label entries.' },
  { name: 'torus', signature: '(majorR: number, minorR: number, segments?: number) => Shape', description: 'Solid torus centered on world origin, axis along world +Z. majorR is the distance from origin to profile center, minorR is the profile circle radius; both must be numeric (not ParamRef). Default 48 polyline segments. minorR must be < majorR.' },
  { name: 'spring', signature: "({ length, coilRadius, wireRadius, turns, axis?, pointsPerTurn?, endStyle?, segments? }) => Shape", description: "Build a helical spring as a circular wire profile swept along a smooth B-spline helix spine — one continuous watertight solid. `axis` is 'X' | 'Y' | 'Z' (default 'Z'); `length`, `coilRadius`, `wireRadius`, and `turns` must be positive finite numbers; `coilRadius` must be greater than `wireRadius`. `endStyle: 'closed'` adds short integral end bars contained inside the spring envelope. Use this for visible tension/compression springs instead of torus stacks or hand-authored helix segment boilerplate." },
  { name: 'extrudeRect', signature: '(w, h, height, opts?) => Shape', description: 'Extrude a w-by-h rectangle (XY) by `height` along Z. `opts.faceLabels` maps user label names to canonical face names (top/bottom/left/right/front/back) or FaceQuery descriptors.' },
  { name: 'extrudeCircle', signature: '(r, height, opts?) => Shape', description: 'Extrude a radius-r circle (XY) by `height` along Z. `opts.faceLabels` maps user label names to canonical face names (top/bottom) or FaceQuery descriptors.' },
  { name: 'extrudePolygon', signature: '(points, depth, opts?) => Shape', description: 'Extrude a 2D polygon (array of [x, y] points) by `depth` along Z. `opts.faceLabels` maps user label names to canonical face names or FaceQuery descriptors.' },
  { name: 'extrudeRoundedRect', signature: '(width, height, radius, depth, opts?) => Shape', description: 'Extrude a rounded rectangle (corner radius) by `depth` along Z. `opts.faceLabels` maps user label names to canonical face names (top/bottom/left/right/front/back) or FaceQuery descriptors.' },
  { name: 'path', signature: '() => PathBuilder', description: 'Start a 2D path: chain moveTo / lineTo / arcs / .close() to get a Sketch.' },
  { name: 'param', signature: "(name, defaultValue, meta?) => ParamRef", description: 'Declare a symbolic editable parameter. Returns a ParamRef the chain ops accept anywhere a number is expected. Edit post-build via `kcad.params.update`. `meta?: { min?, max?, description? }`.' },
  { name: 'params', signature: "(decl) => { [name]: ParamRef }", description: 'Batched form of `param()` — declare many params at once. Returns an object of ParamRefs keyed by name.' },
  { name: 'union', signature: '(...shapes) => Shape', description: 'Boolean union of two or more shapes.' },
  { name: 'assembly', signature: '(name?) => Assembly', description: 'Start an inspectable mechanical assembly. Use `.part(name, shape, { at?, connectors?, connect? })` to wrap modeled solids, `.connect(name, aConnector, bConnector)` for fixed connector metadata, joint primitives `.revolute/.prismatic/.fixed/.ball(name, parentPart, childPart, opts)` to declare DOF + joint origins (numeric Vec3 in parent local frame), `.solve(poses)` to run body-tree forward kinematics returning a SolvedKinematics handle (with `.transform(partName)`, `.value(jointName)`, `.bodies()`, `.toScene()`; `.toShape()` is deprecated — use `.toScene().toUnion()`), `.solvedModel(poses, opts?)` to return the posed `Scene` (opts: `{ validate: "warn" | "error" | "off" }` — default `warn`, attaches mate-aware validator diagnostics to `scene.warnings`), and `.model()` for the kinematic-zero `Scene`. v0.6 adds `partRef.connector(name, opts)` for mate-style connector frames and `.mate(name, aRef, bRef, type)` for typed mates. Physical mechanism intent can be declared with `.mechanicalJoint(name, { mate, actuator, shaft, supports, output, requiredSupport? })`; `requiredSupport` may name a hinge/bearing/bracket contract such as `{ kind: "hinge-bracket", around: "palm.left-hinge", supports: ["palm"], minBearingLengthMm: 8 }`. Drive transmission intent can be declared with `.transmission(name, { kind, sourceMate, drivenMates, actuator?, input?, output?, path, ratio?, notes?, springRateNPerMm?, freeLengthMm?, installedLengthMm?, preloadN?, momentArmMm?, requiredTorqueNmm?, anchorA?, anchorB? })`, where `kind` is `direct-horn`, `link-rod`, `four-bar`, `gear-pair`, `belt`, `tendon`, or `spring`; spring transmissions let `review_cad` reject decorative coils with no positive installed force, insufficient static torque budget, or anchors whose distance does not change across joint travel. `review_cad` requires every `coupleMates(...)` driven mate to have a matching physical transmission path, and consecutive `path` parts must stay near-contact adjacent across sampled mate travel. `design_loop` requires screenshot review by default so visually bad but structurally passing attempts are rejected; accepted visual reviews must include screenshotPath and non-empty findings from the vision-capable agent, and `requireVisualReview: false` is only for explicit non-visual batch checks. `review_cad` checks that declared actuators are mounted, shafts lie on revolute axes, support parts are fixed, outputs are connected by the mate, generic revolute connectors sit on modeled support material, declared support contracts reach their connector, and coupled mates are backed by adjacent transmission intent. Pose values accept `Editable<number>` — passing ParamRef poses to `.solvedModel` makes the rendered Scene reactive (param updates re-pose → fresh frozen Scene); `.solve` resolves ParamRefs at call time and returns a snapshot. The `Scene` return exposes `.parts`, `.bbox`, `.assemblyName`, `.warnings`, `.toCompound()` (lossless OCCT group, default for STEP), `.toUnion()` (lossy boolean fuse, antipattern), `.part(name)`, and iteration via `for (const p of scene)`.' },
  { name: 'helix', signature: '({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }) => [number, number, number][]', description: 'Polyline helix rail for `Sketch.sweep`. Default axis Z, 32 points per turn.' },
  { name: 'selectEdges', signature: '(shape, query?) => Promise<ShapeList<EdgeSegment>>', description: 'Pre-select edges by EdgeQuery. Awaitable; lowers the shape lazily. Returns a `ShapeList` — an `EdgeSegment[]` (accepted anywhere fillet/chamfer take one) carrying the selector algebra on top: `.sortBy` / `.groupBy` / `.filterBy` / `.filterByPosition` / `.sortByDistance`, and the `.first` / `.last` / `.at(i)` / `.take(n)` accessors. Each `EdgeSegment` also carries `radius` when `curveType === "CIRCLE"`.' },
  { name: 'selectEdge', signature: '(shape, query) => Promise<EdgeSegment>', description: 'Like selectEdges but throws if zero or multiple edges match. Use for unambiguous single-edge selection.' },
  { name: 'select', signature: '<T>(items: Iterable<T>) => ShapeList<T>', description: 'Wrap any array of topology query results in a `ShapeList` so the selector algebra applies — face summaries from `list_faces`, `ResolvedEntity[]` from `q.face(...).evaluate(scene)`, or a hand-assembled list. `selectEdges` already returns a ShapeList, so `select` is for every other result source. The algebra is pure TypeScript over already-resolved descriptors: it reorders and partitions the SAME objects, so `EdgeSegment.id` and the `@kc[...]` ref / OCCT handle on a `ResolvedEntity` survive a sort or a group untouched. Compose it with (do not replace) EdgeQuery/FaceQuery: let the declarative query filter inside OCCT first, then rank or bucket the resolved list here.' },
  { name: 'lib', signature: '{ fromSTEP(path: string): Promise<Shape> }', description: 'Parts library namespace. `lib.fromSTEP(path)` imports a STEP file as a Shape — path is resolved relative to the calling .kcad.ts script (absolute paths also accepted). Returned Shape composes with translate/rotate/color/arm.part(...) like any primitive. Use for vendor catalog parts (servos, bearings, fasteners) so geometric fidelity matches the real component instead of being hand-authored from box/cylinder.' },
  { name: 'nurbsSurface', signature: '({ controls, degree, weights?, knots?, periodic? }) => Surface', description: 'Build a NURBS surface from an explicit control net + degree. `controls` is a U-major V-minor rectangular Vec3 grid (mm). Returns a Surface (peer to Shape) — use `.thicken(t)` or `.toShape()` to enter the Shape pipeline. `weights` produces an exact rational surface (circles, cylinders, spheres, conics) as of v0.14.0.' },
  { name: 'surfaceFromCurves', signature: '(sections: Sketch[]) => Surface', description: 'Skin a NURBS surface through 2+ closed Sketch cross-sections in declaration order. Returns a Surface — chain `.thicken(t)` or `.toShape()`. Use for free-form panels and lofted shells.' },
  { name: 'sketch', signature: '{ text(content: string, opts: { size: Editable<number>; align?: "left" | "center" | "right"; position?: [Editable<number>, Editable<number>]; rotation?: Editable<number>; font?: string }): Sketch }', description: 'Sketch primitives namespace. `sketch.text(content, opts)` produces a Sketch covering all glyph outlines of the rendered string (one Sketch per call, regardless of glyph count). Bundled font is Liberation Sans Regular; pass `opts.font: fontPath("/abs/path.ttf")` to load a different TTF. `align` is horizontal-only (vertical alignment is always baseline). Chainable into `.extrude(depth)` for engraved (subtract) or raised (union) text features.' },
  { name: 'fontPath', signature: '(p: string) => FontPath', description: 'Brand a string as a font filesystem path (TTF). Use in `sketch.text({ font: fontPath("/path/to/font.ttf") })` to distinguish a TTF path from a logical font family name. Relative paths resolve against the calling .kcad.ts script\'s directory.' },
  { name: 'sheetMetal', signature: '(profile: Sketch, { thickness, kFactor, faceLabels? }) => Shape', description: 'Build a sheet-metal body from a closed planar Sketch. `thickness` in mm; `kFactor` is the neutral-axis offset ratio in [0, 1] (typical mild-steel/aluminum 0.33-0.45). Returned Shape chains `.bend(edgeRef, angle, radius)` for folds and `.flattenPattern()` to recover the flat blank.' },
  { name: 'sdf', signature: '{ sphere(r), box(size), cylinder(r, h), torus(R, r), smoothBlend(a, b, k), materialize(field, opts?), bind(name, field) }', description: 'SDF authoring namespace (W2.3 slice-1). Primitives (sphere/box/cylinder/torus) return callable distance-field closures with exact AABBs centred at origin in local frames. `smoothBlend(a, b, k)` is a polynomial smooth-min union (k mm blend radius); only union is supported in slice-1. `materialize(field, { resolution })` runs marching-cubes on the host and sews the result into a closed polyhedral Shape (kind `sdfMaterialize`) that flows through booleans/STL/STEP exports. Default resolution 30 ([10, 200] clamped). Output is polyhedral — canonical face refs do not apply. `bind(name, field)` writes the field to session.sdfFields for later sampling via the `evaluate_sdf` MCP tool.' },
  { name: 'referenceImage', signature: "(path: string, opts: { plane, anchor?, scale?, opacity?, flipU?, flipV? }) => ReferenceImageHandle", description: "Overlay a reference image on a plane for tracing or design review. The record is virtual — no OCCT geometry is produced; the renderer reads the image directly from the feature graph. `path` is resolved relative to the calling .kcad.ts script's directory; supported formats: .png, .jpg, .jpeg, .webp. `plane` is 'xy' | 'xz' | 'yz' | { plane, offset? }. `anchor` is 'origin' (default) or an explicit [x, y, z] in mm. `scale` is 'fit-bbox' (default), a number in (0, 10000] mm for explicit width, or { width?, height? } in mm. `opacity` is clamped to [0, 1], default 0.5. `flipU` / `flipV` flip the image horizontally / vertically. Validation errors (missing file, bad format, invalid plane) are pushed as structured diagnostics on `handle.metadata.diagnostics` rather than thrown — inspect the handle to check for errors." },
  { name: 'setRenderEnvironment', signature: "(spec: { preset?: 'studio' | 'softbox' | 'neutral' | 'outdoor' | 'warehouse'; url?: string; intensity?: number; rotation?: number }) => RenderEnvironmentHandle", description: "Set the HDRI / image-based-lighting environment for the rendered scene. Pass either a built-in preset key OR a custom .hdr URL (mutually exclusive). `intensity` (default 1.0; clamped to (0, 100]) scales `envMapIntensity` on every PBR material in the scene. `rotation` (degrees, default 0) rotates the env map around the world Y axis. The record is virtual — no OCCT geometry is produced; the renderer reads it directly from the feature graph. Default behavior (script never calls this) is the existing three-light rig. Multiple calls register multiple records; the last one wins at render time. Validation errors (conflicting spec, unknown preset, intensity out of range) are pushed as structured diagnostics on `handle.metadata.diagnostics` rather than thrown." },
  { name: 'setCameraTarget', signature: '(x: number, y: number, z: number) => CameraTargetHandle', description: "Override the camera look-at target for `setRenderPose` and headless engineering renders. Default is the bbox centroid; that auto-fit skews when a build has tall asymmetric features (pocket-watch with pendant + bail above origin, scope with offset eyepiece, lamp with tall shaft) — the camera ends up jamming the hero subject against the viewport edge. Pass an explicit (x, y, z) in the script's world frame to re-aim the camera; the renderer translates it into its recentered scene frame automatically. The record is virtual — no OCCT geometry is produced. Multiple calls register multiple records; the renderer applies the last one. Validation errors (non-finite coords) are pushed as structured diagnostics on `handle.metadata.diagnostics`." },
  { name: 'setCameraDistance', signature: '(distance: number) => CameraTargetHandle', description: "Override the camera framing distance (mm from target). Convenience wrap over `setCameraTarget`'s optional `distance` field — inherits the most recently captured target (or world origin if no `setCameraTarget` call has happened) and pins the camera at the supplied distance along the pose direction. Use when the auto-fit extents-projection reads too tight or too loose at the chosen pose / aspect. Same virtual-record + last-wins semantics as `setCameraTarget`." },
  { name: 'animationView', signature: '(spec: { param: string; from: number; to: number; durationMs: number; fps?: number } | { name?: string; tracks: Array<{ param: string; keys: Array<{ atMs: number; value: number; ease?: "linear" | "step" | "easeIn" | "easeOut" | "easeInOut" }> }>; fps?: number }) => AnimationViewHandle', description: "Declare an animation timeline for offline kinematic-motion MP4 capture. Two forms: a legacy single-param linear sweep (`param`/`from`/`to`/`durationMs`), or multi-track keyframes (`tracks`) where each track animates one `param()` declared earlier in the script through `{ atMs, value, ease? }` keys — `ease` applies to the segment ENDING at that key (default 'linear'), and the value holds before the first / after the last key. Stored metadata is ALWAYS normalized to the track shape: keys sorted by atMs, ease defaulted, `durationMs` = max atMs across tracks, `fps` default 30. `kernelcad animate <file> [out.mp4]` (or the `capture_animation` MCP tool) reads the recorded virtual record, samples `ceil(durationMs / 1000 * fps)` frames, and stitches an MP4 via ffmpeg (or `--frames <dir>` writes a PNG sequence and skips ffmpeg; `--focus`/`--hide` isolate parts in the frames for cutaways without affecting verification) — leveraging the per-session mesh cache so each frame's recompute is ~5 ms warm; capture drives a headless browser against a running studio dev server. Motion verification runs by default before capture: the sampled poses (keyframe times + segment midpoints) are checked for part interference at the mechanism-validity 20 mm³ threshold — collisions still write the artifact as evidence but exit 1 with `animation.collision` diagnostics (exit 0 = captured + verification clean or `--no-verify`-skipped; exit 2 = could not capture). The record is virtual; no OCCT geometry is produced. Every animated param MUST be declared NUMERIC by a prior `param()` call; undeclared or non-numeric (e.g. boolean) params, duplicate-param tracks, and malformed keys THROW KernelError (`animation.param.unknown` / `animation.track.duplicate-param` / `animation.keys.invalid`). Key values outside the param's declared min/max are clamped with an `animation.value.clamped` warn. Multiple calls register multiple records; the capture script uses the last one and the later record carries an `animation.view.shadowed` warn naming the shadowed record ids." },
  { name: 'dfmSpec', signature: "(spec: { minWall?: number; minClearance?: number; includeArticulatedMates?: boolean; ignore?: [string, string][]; exclude?: string[]; channels?: Array<{ part: string; name: string; openings: number; sealed?: boolean }> }) => DfmSpecHandle", description: "Declare printability (design-for-manufacture) gates for the model. Declaration-only: registers a virtual record (no OCCT geometry); enforcement runs on every `evaluate` / `evaluate_script` once a dfmSpec record is present. `minWall` (mm) is the minimum printed wall thickness per non-excluded part; `minClearance` (mm) is the minimum distance between distinct parts; `includeArticulatedMates: true` applies minClearance to non-fastened mate pairs at the rest pose too, while fastened mates remain exempt because their contact is checked separately; `ignore` lists part-name pairs exempt from the clearance check (design-intent contacts); `exclude` lists non-printed parts (vendor STEP imports, electronics) skipped by the minWall + void checks — each entry supports a trailing-'*' glob ('servo-*'). `channels` declares internal voids by owning part name + label + expected count of distinct mouth openings to the outside; `sealed: true` with `openings: 0` declares an intentionally sealed void. At least one of minWall / minClearance / channels is required. Malformed declarations THROW KernelError (`feature.invalid-args`) rather than stashing diagnostics — dfmSpec is an enforcement gate, and a silently-disabled gate is worse than a build failure. Multiple calls register multiple records; the last one wins (same convention as `setRenderEnvironment`)." },
  { name: 'nurbsCurve', signature: '(controlPoints: Vec3[], opts?: { degree?: number; weights?: number[]; knots?: number[]; closed?: boolean }) => Curve3D', description: '3D parametric NURBS curve specified by an explicit `Geom_BSplineCurve` control net. `degree` defaults to 3 (cubic). Pass `weights` (one per control point, strictly positive) for a rational curve; pass `knots` for a custom knot vector (length must equal `controlPoints.length + degree + 1`) otherwise clamped-uniform is generated. The curve lowers to a `TopoDS_Edge` parked on session.importedGeometry; consumed by `variableSweep` as a spine and (later slices) by `surfaceFromBoundary`. The returned Curve3D proxy exposes synchronous `.sample(n)`, `.pointAt(t)`, `.tangentAt(t)`, `.length()`, `.domain()` (always `[0, 1]`).' },
  { name: 'spline3d', signature: '(points: Vec3[], opts?: { tension?: number; closed?: boolean }) => Curve3D', description: 'Catmull-Rom-to-cubic-Bezier convenience that interpolates the supplied points through a cubic NURBS curve. `tension` defaults to 0.5 (centripetal); 0 yields standard Catmull-Rom, 1 yields piecewise-linear. The output is a clamped uniform cubic B-spline with (N - 1) * 3 + 1 control points where N is the input count; endpoints reflected via phantom points so the curve interpolates first and last input points exactly. Use for organic spines (eyewear brow, ergonomic grips) authored as a sequence of waypoint coords.' },
  { name: 'variableSweep', signature: '(spine: Curve3D | Sketch | Vec3[], sections: Array<{ t: number; profile: Sketch }>, opts?: { closed?: boolean; continuity?: "C0" | "C1" | "C2" }) => Shape', description: 'Multi-section sweep that blends `sections[i].profile` along the spine at the section\'s `t ∈ [0, 1]` spine parameter. Lowers to `BRepOffsetAPI_MakePipeShell` (direct OCCT — no replicad wrapper). `spine` accepts a Curve3D (from nurbsCurve / spline3d), a planar Sketch (its lifted wire is used as the rail), or a Vec3[] (auto-converted to a nurbsCurve of degree `min(3, points.length - 1)`). Sections must be strictly increasing in t; the first MUST sit at t=0 and the last at t=1. Continuity defaults to "C1". Use for tapered limbs (wing sections, fairings) and varying-cross-section sweeps that lofts cannot express because they need an explicit spine path.' },
  { name: 'surfaceFromBoundary', signature: '(curves: [Curve3D, Curve3D, Curve3D, Curve3D], opts?: { continuity?: "C0" | "C1" | "C2" | ("C0" | "C1" | "C2")[]; sampling?: number }) => Surface', description: 'Build the shipped filling surface: one NURBS face through 4 boundary curves. Lowers to `BRepOffsetAPI_MakeFilling` (direct OCCT) with `Add_1(edge, GeomAbs_Cn, isBound=true)` per boundary. The 4 curves must be passed in exact loop order: `curves[0]` = bottom, `curves[1]` = right, `curves[2]` = top, `curves[3]` = left. Adjacent endpoints must coincide within 1e-6 mm (kernel emits `feature.surface-from-boundary.corner-mismatch` otherwise). `opts.continuity` accepts a single grade applied to all 4 edges or a length-4 array per edge; defaults to `"C0"`. `opts.sampling` controls `NbPtsOnCur` (default 15). Returns a Surface peer — chain `.thicken(t)` or `.toShape()` to enter the Shape pipeline.' },
  { name: 'hermiteG2', signature: '(a: { point: Vec3; tangent: Vec3; curvature?: Vec3 }, b: { point: Vec3; tangent: Vec3; curvature?: Vec3 }) => Curve3D', description: 'Quintic Hermite Curve3D that interpolates the two endpoints with matching positions, first derivatives (tangents), and second derivatives (curvatures). Default curvature is `[0, 0, 0]`, which degrades the curve to G1 (lifted cubic Hermite). Tangent magnitude controls how aggressively the curve heads out of each endpoint (typical magnitude ~ chord length between endpoints, not unit length). Returns a 6-control-point clamped-uniform NURBS curve via `Geom_BSplineCurve` with knots `[0,0,0,0,0,0,1,1,1,1,1,1]`. Use to bridge two existing curves with G2 continuity for a kink-free compound spine consumed by `variableSweep` or `surfaceFromBoundary`. Capture-time emits `feature.hermite-g2.degenerate-tangent` (magnitude < 1e-12) and `feature.hermite-g2.non-finite-input` (NaN/Infinity).' },
  { name: 'sew', signature: '(surfaces: Surface[], opts?: { tolerance?: number; requireClosed?: boolean }) => Shape', description: 'Stitch N surfaces into a shell or closed solid via OCCT `BRepBuilderAPI_Sewing`. Pass surfaces from `nurbsSurface()`, `surfaceFromCurves()`, `surfaceFromBoundary()`, or chained `.trimTo()` calls. Edges within `tolerance` mm (default 1e-6) of each other are merged. When `requireClosed: true` and the result is still an open shell at lower time, the lowerer emits `feature.surface-sew.open-shell` (error) instead of returning the partial shell. Returns a `Shape` that flows into booleans, export, and fillet pipelines. Throws `feature.invalid-args` if no surfaces are supplied.' },
  { name: 'q', signature: '{ face, edge, vertex, connector, part, solid, createdBy, ownedByPart, ownerPart, union, intersection, subtraction, containsPoint, closestTo, geometryType, withLabel, withFeatureName, nthElement, fromString, nothing, everything }', description: 'Query DSL constructor namespace. Every constructor builds a lazy `Query<T>` value (phantom-typed `Query<FaceMarker>`, `Query<EdgeMarker>`, etc.) carrying a serializable AST. Chain with `.and(filter)` / `.or(other)` / `.minus(other)` / `.nth(i)` / `.asLenient()`; consume with `.evaluate(scene)` / `.evaluateUnique(scene)` or pass through to a feature op once consumer integration ships. Strings (`@kc[owner/kind/name]`) are sugar over the same internal Query value — both forms produce identical OCCT handles. The namespace is also reachable as `kc.q.*`. See `kernelcad-features/SKILL.md` (Query selectors, Cookbook — Query DSL) and `kernelcad-assemblies/SKILL.md` (Cookbook — Query DSL for assemblies).' },
  { name: 'kinematic', signature: 'KinematicFacade', description: 'Namespace with four in-process feasibility checks an agent can run before declaring a mechanism design done: `kinematic.checkMountingHoleConsistency(arm)` (fastener-side hole agreement; dispatches to the v0.7.4 substrate), `kinematic.checkSweptCollision(arm, opts?)` (sampled-pose collision sweep across declared joint ranges), `kinematic.checkReachable(arm, opts)` (IK reachability — analytical Pieper first, DLS numeric fallback), `kinematic.checkLoadCapacity(arm, opts?)` (closed-form Euler-Bernoulli beam load check). Every entry is sync compute wrapped in async and returns a typed envelope with `source: "local"` and a `diagnostics` array.' },
  { name: 'joint', signature: '{ clevis(opts: ClevisJointOptions): ClevisJoint; supportedServoRevolute(arm: Assembly, opts: SupportedServoRevoluteOptions): SupportedServoRevoluteResult; articulatedDigit(arm: Assembly, opts: ArticulatedDigitOptions): ArticulatedDigitResult }', description: 'Mechanism-delivery joint helpers. `joint.clevis({ parentBody, childBody, axis, pivotParent, pivotChild?, limitsDeg?, style?, liftPivot?, liftDir? })` builds canonical revolute-joint hardware (fork, tongue, drilled bore, pin) and returns geometry plus connector specs for `arm.mate(..., "revolute", ...)`. `joint.supportedServoRevolute(arm, { name, mate, support, supportMount, output, axis, minBearingLengthMm?, bodySizeMm? })` adds a seated servo actuator part named `${name}-servo`, fastens its `mount` frame to `supportMount`, and declares `arm.mechanicalJoint(name, { mate, actuator, shaft: support, supports: [support], output, requiredSupport: { kind: "hinge-bracket", around: axis, supports: [support], minBearingLengthMm: minBearingLengthMm ?? 8 } })`. Current helper shape requires `supportMount` to be a frame connector on `support` itself, and `axis` to be the support-side axis connector of the named revolute mate. It preflights generated part/mate/intent names, required revolute mate, support/output parts, supportMount connector, axis connector, non-empty string fields, and positive finite `bodySizeMm` before mutating the assembly. Use these helpers instead of inventing floating/disconnected actuator or hand-rolled joint geometry. `joint.articulatedDigit` builds clearance-bounded structural links; it does not certify payloads or actuation.' },
];

export const SHAPE_METHODS: ApiEntry[] = [
  { name: 'translate', signature: '(x: Editable<number>, y: Editable<number>, z: Editable<number>) => Shape', description: 'Translate by (x, y, z). Each coordinate accepts a number or a `ParamRef<number>` so translations stay editable post-build.' },
  { name: 'rotate', signature: '(axis: [Editable<number>, Editable<number>, Editable<number>], degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape', description: 'Rotate `degrees` around `axis` (vector); pivot defaults to origin. Axis components, degrees, and pivot all accept `ParamRef<number>`. For cardinal-axis rotations prefer the `.rotateX` / `.rotateY` / `.rotateZ` aliases.' },
  { name: 'rotateX', signature: '(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape', description: 'Rotate `degrees` around the world X axis. Alias for `.rotate([1, 0, 0], degrees, pivot?)`; pivot defaults to origin.' },
  { name: 'rotateY', signature: '(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape', description: 'Rotate `degrees` around the world Y axis. Alias for `.rotate([0, 1, 0], degrees, pivot?)`; pivot defaults to origin.' },
  { name: 'rotateZ', signature: '(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape', description: 'Rotate `degrees` around the world Z axis. Alias for `.rotate([0, 0, 1], degrees, pivot?)`; pivot defaults to origin.' },
  { name: 'transform', signature: '(t: Transform) => Shape', description: 'Apply an SE(3) Transform. Decomposes into one rotate + one translate (T = Translate · Rotate) and appends both via the existing translate / rotateAxis pipes. Pure translations append only translate; pure rotations append only rotateAxis; identity transforms append nothing.' },
  { name: 'color', signature: '(name: ColorToken | `#${string}`) => Shape', description: 'Tag this shape with a role color (servo/gear/beam/shaft/plate/pin/frame/tool) or a literal `#rrggbb` hex. Stored on FeatureRecord metadata; renderer resolves via ROLE_PALETTE. Booleans drop the color (identity lives at leaf parts).' },
  { name: 'material', signature: '(opts: PBRMaterial & { face?: string }) => Shape', description: 'Apply a PBR material (baseColor required; optional metalness/roughness/clearcoat/clearcoatRoughness/ior/transmission/sheen/opacity). Numeric fields clamped to [0, 1] (ior: [1.0, 2.5]); out-of-range values emit a `feature.material.value-clamped` soft warning. Use opacity < 1 for clear overlays such as glass when transmission blur is not desired. Identity dies at booleans (leaf-part level, same as `.color()`). Pass `face: "<label>"` to apply only to faces matching a label declared upstream via `faceLabels`; calls accumulate, last write wins on the same label, and a call without `face` sets the shape-level default. Labels that do not resolve emit a soft `feature.material.face-label-no-match` warning and fall back to the default.' },
  { name: 'alongAxis', signature: '(axis: [number, number, number]) => Shape', description: 'Orient this shape so its current +Z axis aligns with the given direction. Sugar over .rotate() — preferred for cross-axis cylinders/axles. Antipodal [0, 0, -1] handled deterministically (180° around X). Identity [0, 0, 1] is a no-op.' },
  { name: 'scale', signature: '(factor: number | [number, number, number]) => Shape', description: 'Scale this shape uniformly (single positive finite number) or per-axis (Vec3 — sx/sy/sz). Non-uniform lowers via gp_GTrsf + BRepBuilderAPI_GTransform so face refs survive (topology is preserved under any affine transform). All factors must be positive and finite.' },
  { name: 'union', signature: '(...others) => Shape', description: 'Boolean union with one or more shapes.' },
  { name: 'subtract', signature: '(...others) => Shape', description: 'Boolean difference (this minus others).' },
  { name: 'intersect', signature: '(...others) => Shape', description: 'Boolean intersection.' },
  { name: 'fillet', signature: `(radius, edges?: EdgeSelector, opts?: { continuity?: 'G1' | 'G2' }) => Shape`, description: 'Round edges. `edges` accepts EdgeQuery, EdgeSegment[], `{face: name|query}`, or undefined (all sharp edges). `opts.continuity` defaults to `\'G1\'` (tangent-continuous blend); `\'G2\'` selects a curvature-continuous blend via `BRepFilletAPI_MakeFillet.SetContinuity(GeomAbs_G2, 1e-4)`. Requesting `\'G2\'` on a fillet whose adjacent faces are only G1 emits `feature.fillet.continuity-not-applicable`.' },
  { name: 'chamfer', signature: '(distance, edges?: EdgeSelector) => Shape', description: 'Bevel edges. Same selector shape as fillet.' },
  { name: 'shell', signature: '(thickness, { face: FaceSelector }) => Shape', description: 'Hollow the solid removing the named face. `face` accepts canonical name, label, or FaceQuery.' },
  { name: 'draft', signature: `(angleDeg: Editable<number>, opts: { face: FaceSelector | string; neutralPlane?: string; pullDir?: [number, number, number] }) => Shape`, description: 'Taper the selected face(s) for moldability. `angleDeg` is the draft angle in degrees (0–90). `face` accepts a canonical name, label, or FaceQuery — same selector shape as shell(). `neutralPlane` sets the parting-line face (defaults to `face`); `pullDir` is the demoulding direction [x, y, z] (defaults to face normal at lower time). Lowering failures emit `feature.draft.failed`.' },
  { name: 'bend', signature: '(edgeRef: EdgeSelector | string, angle: Editable<number>, radius: Editable<number>) => Shape', description: 'Add a sheet-metal bend along a linear edge. Only valid on Shapes whose lineage roots at a sheetMetal(...) record. `angle` in degrees (signed for fold direction); `radius` is inner-bend radius in mm. K-factor bend allowance: BA = (pi * |angle| / 180) * (kFactor * thickness + radius). Lowering rejects non-linear edges with feature.bend.edge-not-linear.' },
  { name: 'flattenPattern', signature: '() => Region', description: 'Return the unfolded 2D flat-pattern of this bent sheet-metal Shape as a Region (closed outer wire + holes + bend-line metadata + source plane). Slice 1 supports at most 2 bends — chains of 3+ emit feature.flattenPattern.multi-bend-unsupported. Derived view; does not add a FeatureRecord.' },
  { name: 'hole', signature: '(face: FaceSelector | string, opts: { u, v, diameter, depth?: number | "through", upToFace?: FaceRef, counterbore?: { diameter, depth }, countersink?: { diameter, angleDeg? } }) => Shape', description: 'Drill a single hole. Position is face-local 2D (u, v in mm). Use `depth: "through"` to clip at the back face. Optional `counterbore` (wider shoulder) or `countersink` (cone) — mutually exclusive. Created refs: `wall` always, `floor` (blind), `wall-back` (through), `counterbore-wall` / `counterbore-floor` (with cb), `countersink-cone` (with csk).' },
  { name: 'holes', signature: '(face: FaceSelector | string, opts: { positions: Array<{u,v}>, diameter, depth?, upToFace?, counterbore?, countersink? }) => Shape', description: 'Drill N holes in one feature record. All holes share diameter / depth / cb / csk. Bare `wall` selector on the result resolves to all bore walls collectively (sugar for fillet-all-bore-lips). For mixed specs, chain `.hole()` calls.' },
  { name: 'cutout', signature: '(profile: PathBuilder | Sketch, opts: { face: FaceSelector | string, depth?: number | "through", upToFace?: FaceRef, depthMode?: "blind" | "symmetric" }) => Shape', description: 'Sketch-driven subtractive extrude for irregular shapes hole() can\'t express (slots, D-shapes, keyhole pockets). Profile coords are face-local 2D; direction is always into the body. Created refs: `wall` always, `floor` (blind), `wall-back` (through).' },
  { name: 'reflect', signature: `(plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset: number }) => Shape`, description: 'Reflect (pure rigid-body transformation) across a cardinal plane or an offset parallel plane. Volume is unchanged; handedness is flipped.' },
  { name: 'mirror', signature: `(plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset: number }) => Shape`, description: 'Boolean union of the source and its reflection across a cardinal plane. Produces a symmetric part. For pure reflection without union, use reflect().' },
  { name: 'patternLinear', signature: '({ count, direction, spacing }) => Shape', description: 'Repeat this shape in a linear array. `count` is >= 2, `direction` is a Vec3, and `spacing` is the distance between instances.' },
  { name: 'patternGrid', signature: '({ x: { count, direction, spacing }, y: { count, direction, spacing } }) => Shape', description: 'Repeat this shape in a two-axis grid. Each axis count is >= 2; directions are Vec3s and spacing is the distance between neighbors on that axis.' },
  { name: 'patternCircular', signature: '({ count, axis, angleDeg? }) => Shape', description: 'Repeat this shape around an axis. `count` is >= 2 and `angleDeg` defaults to 360 degrees.' },
  { name: 'embossText', signature: `(opts: { textContent: string; fontFamily?: string; size: Editable<number>; depth: Editable<number>; align?: 'left' | 'center' | 'right'; anchorU?: Editable<number>; anchorV?: Editable<number>; rotation?: Editable<number>; scaleMode?: 'original' | 'native' | 'bounds'; face: FaceSelector | string }) => Shape`, description: 'Raise or recess text on a target face. depth>0 fuses (emboss out), depth<0 cuts (engrave in). UV anchors are face-local [0, 1]. Lowers via replicad drawText → sketchOnFace → extrude → fuse|cut. Use for branded consumer products (Ray-Ban temple, CE compliance mark, appliance model numbers).' },
  { name: 'projectCurve', signature: `(opts: { source: ProjectCurveSource; face: FaceSelector | string; scaleMode?: 'original' | 'native' | 'bounds'; asEdge?: boolean }) => Sketch`, description: 'Wrap a 2D closed curve onto a 3D face along the face normal. Returns a `Sketch` (face-bound) — chain `.extrude(d)` to land a raised silhouette or pair with the parent `.subtract(...)` for an engraved logo / label insert on a curved body (bottle silhouette, helmet badge). `asEdge: true` is captured but currently deferred at lower time — the bundled OCCT does not export BRepProj_Projection.' },
  { name: 'boundingBox', signature: '(opts?: { exact?: boolean }) => Promise<{ min: [number, number, number]; max: [number, number, number]; size: [number, number, number]; center: [number, number, number] }>', description: 'Axis-aligned bounding box in the CURRENT world frame (after every transform appended so far), in mm. Lowers the Shape (cached) and reads OCCT, folding in derived `size` and `center`. This is the query to position a fetched catalog part — a `lib.fetchPart(ref)` STEP arrives at an arbitrary native origin; read `.boundingBox()` to learn where it sits before placing it. `opts.exact: true` folds the tessellation vertex AABB (tight on curved B-spline faces) instead of OCCT\'s slightly-padded gap-corrected Bnd_Box.' },
  { name: 'recenter', signature: '(opts?: { x?: boolean; y?: boolean; z?: boolean }) => Promise<Shape>', description: 'Translate this Shape so its bounding-box center lands on the world origin, then return it for chaining. The key normalizer for a freshly-fetched catalog part: after `await part.recenter()`, a subsequent `.translate(x, y, z)` places the part\'s CENTER exactly at (x, y, z) instead of nudging it from the STEP file\'s arbitrary native offset. Async (lowers to read the bbox) and appends one translate, so it composes with prior transforms. Pass `{ z: false }` etc to recenter only the named axes.' },
  { name: 'seatOnFloor', signature: '(opts?: { center?: boolean }) => Promise<Shape>', description: 'Translate this Shape so it rests on the z = 0 floor (bbox min.z → 0), centered in x/y over the origin; returns it for chaining. Use for parts that must sit on a build plate / table / PCB plane in their upright pose. Pass `{ center: false }` to drop onto z = 0 without moving x/y. Async + appends one translate, same chaining contract as recenter().' },
  { name: 'lower', signature: '() => Promise<OcctBackend>', description: 'Eagerly lower this Shape for inspection. Used internally by selectEdges; agents rarely call directly.' },
];

/**
 * Selector-algebra methods on the `ShapeList` returned by `selectEdges(...)`
 * and `select(...)`. `ShapeList` extends `Array`, so every built-in array
 * method is available too and is not re-advertised here.
 *
 * Drift-sentinel contract: adding a method to `ShapeList` REQUIRES updating
 * this array — the test at
 * `tests/integration/mcp/listApi.driftSentinel.test.ts` fails CI if they
 * disagree.
 */
export const SHAPE_LIST_METHODS: ApiEntry[] = [
  {
    name: 'sortBy',
    signature: "(criterion: 'X' | 'Y' | 'Z' | Vec3 | 'area' | 'length' | 'radius', opts?: { descending?: boolean; tolerance?: number }) => ShapeList<T>",
    description: "Order the list by a criterion, ascending by default. An axis name or a Vec3 direction measures the projection of the entity's position onto that direction; 'area' / 'length' / 'radius' measure an intrinsic property ('radius' is populated on CIRCLE edges only). Comparison runs on the metric quantized to `tolerance` (default 1e-6) with the pre-sort position as tiebreak, so entities whose metrics differ only by kernel float noise keep their incoming relative order instead of swapping between runs. Returns a new list; entity identity is preserved.",
  },
  {
    name: 'sortByDistance',
    signature: '(point: Vec3, opts?: { descending?: boolean; tolerance?: number }) => ShapeList<T>',
    description: 'Order by straight-line distance from each entity position to `point`, nearest first. Same quantization and stable-tiebreak contract as `sortBy`. Use to disambiguate "the hole nearest this mounting boss" without a `near` re-query.',
  },
  {
    name: 'groupBy',
    signature: "(criterion: 'X' | 'Y' | 'Z' | Vec3 | 'area' | 'length' | 'radius', opts?: { tolerance?: number; descending?: boolean }) => ShapeGroups<T>",
    description: "Partition into groups sharing a quantized criterion value — one group per Z level, per hole diameter, per face area. Keys are rounded to 6 decimal digits by default, or snapped onto a `tolerance`-wide lattice, so near-coincident geometry lands in ONE bucket instead of two adjacent ones. Groups come back ordered by key and entities keep their incoming order within a group. The returned `ShapeGroups` exposes `.groups`, `.length`, `.keys`, `.at(i)` (negative indexes count from the end), `.byKey(v)` (quantizes the request the same way, so `byKey(5)` finds a bucket built from 4.999999999998), `.flat()`, and iteration yielding `{ key, items }`.",
  },
  {
    name: 'filterBy',
    signature: '(spec: ((item: T) => boolean) | Axis | string, opts?: { angleTolerance?: number }) => ShapeList<T>',
    description: "Keep matching entities. Three forms picked by the argument's shape: a predicate for arbitrary logic; an axis ('X' | 'Y' | 'Z' | Vec3) to keep entities whose characteristic direction — an edge's tangent, a face's normal — is parallel to it within `angleTolerance` degrees (default 10); or any other string to match the geometry type case-insensitively ('CIRCLE' / 'LINE' for edges, 'PLANE' / 'CYLINDRE' for faces). Composes with EdgeQuery/FaceQuery rather than replacing them — query against the shape first so OCCT does the bulk filtering, then refine here.",
  },
  {
    name: 'filterByPosition',
    signature: "(axis: 'X' | 'Y' | 'Z' | Vec3, min: number, max: number, opts?: { inclusive?: boolean }) => ShapeList<T>",
    description: 'Keep entities whose position projected onto `axis` falls within [min, max] (mm). Bounds are inclusive by default; pass `{ inclusive: false }` for a strict interval. `min` and `max` may be given in either order. Use for slab selections ("every edge in the top 2 mm") that `within` cannot express along an arbitrary direction.',
  },
  {
    name: 'take',
    signature: '(n: number) => ShapeList<T>',
    description: 'First `n` entities, clamped to the list length. `n` must be a non-negative integer. Pair with `sortBy` for "the highest three faces": `faces.sortBy("Z", { descending: true }).take(3)`.',
  },
  {
    name: 'first',
    signature: 'T | undefined',
    description: 'Getter — the first entity, or `undefined` when the list is empty. Empty is returned rather than thrown so a chain can be probed; use `selectEdge(...)` when a missing match should be a hard failure.',
  },
  {
    name: 'last',
    signature: 'T | undefined',
    description: 'Getter — the last entity, or `undefined` when the list is empty. `list.sortBy("Z").last` is the topmost entity.',
  },
  {
    name: 'at',
    signature: '(i: number) => T | undefined',
    description: 'Entity at index `i`; negative indexes count from the end. Inherited from `Array.prototype.at` — standard JS semantics, `undefined` when out of range.',
  },
];

export const SKETCH_METHODS: ApiEntry[] = [
  { name: 'extrude', signature: '(depth) => Shape', description: 'Extrude this closed sketch normal to its plane by `depth` (mm).' },
  { name: 'revolve', signature: '() => Shape', description: 'Revolve 360 degrees around the Z axis. Profile coords are (radial-X, axial-Z); all x >= 0.' },
  { name: 'sweep', signature: '(rail, opts?: { frenet?, transitionMode?, spine? }) => Shape', description: "Sweep this profile along a 3D rail. `spine: 'smooth'` builds a single B-spline spine through the rail points and places the profile at the rail start — required for rails that sample a smooth curve (helix(...), threads, organic paths); the default `spine: 'polyline'` keeps real corners (pipe runs, L-bends) but on dense smooth rails produces per-segment tubes that fail the watertight export verify. `transitionMode: 'right' | 'transformed' | 'round'` picks how polyline corners are bridged. `frenet: true` rotates the profile with the rail curvature." },
  { name: 'loft', signature: '(other: Sketch | Sketch[], opts?: { spacing?, planes?, ruled?, startPoint?, endPoint? }) => Shape', description: 'Loft this profile through one or more additional sections to produce a 3D solid that smoothly interpolates between them. Use for nozzles (round-to-square), wings/airfoils, fairings, transition pieces. `opts.spacing` z-stacks sections axially; `opts.planes` overrides with explicit per-section placement.' },
  { name: 'reflect', signature: `(axis: 'x' | 'y' | { axis: 'x' | 'y'; offset: number }) => Sketch`, description: "Reflect this sketch's path across an axis, returning a new Sketch. 'x' negates y-coords; 'y' negates x-coords; { axis, offset } reflects across the parallel axis at the given offset. Arc winding (signed sagitta/bulge/radius) is inverted automatically. Labels are preserved." },
];

export const PARAM_REF_METHODS: ApiEntry[] = [
  { name: 'add', signature: '(other: number | ParamRef<number>) => ParamRef<number>', description: 'Build a ParamRef whose value equals this ParamRef plus `other`. Use this instead of JS `+` — numeric coercion of a ParamRef throws feature.invalid-args with this method named in the hint.' },
  { name: 'subtract', signature: '(other: number | ParamRef<number>) => ParamRef<number>', description: 'Build a ParamRef whose value equals this ParamRef minus `other`. Use this instead of JS `-`.' },
  { name: 'multiply', signature: '(other: number | ParamRef<number>) => ParamRef<number>', description: 'Build a ParamRef whose value equals this ParamRef times `other`. Use this instead of JS `*`.' },
  { name: 'divide', signature: '(other: number | ParamRef<number>) => ParamRef<number>', description: 'Build a ParamRef whose value equals this ParamRef divided by `other`. Division by zero throws at lower time, not at chain time. Use this instead of JS `/`.' },
  { name: 'negate', signature: '() => ParamRef<number>', description: 'Build a ParamRef whose value equals the unary negation of this ParamRef. Use this instead of JS unary `-`.' },
];

export const PATH_BUILDER_METHODS: ApiEntry[] = [
  { name: 'moveTo', signature: '(x: Editable<number>, y: Editable<number>) => PathBuilder', description: 'Start the path at (x, y). Required first call. Coords accept ParamRef for parametric authoring.' },
  { name: 'lineTo', signature: '(x: Editable<number>, y: Editable<number>) => PathBuilder', description: 'Add a straight line segment to (x, y). Coords accept ParamRef for parametric authoring.' },
  { name: 'tangentArc', signature: '(x: Editable<number>, y: Editable<number>) => PathBuilder', description: 'Arc continuing tangent from the previous segment to (x, y). Requires a prior segment. Coords accept ParamRef for parametric authoring.' },
  { name: 'threePointsArc', signature: '(x: Editable<number>, y: Editable<number>, midX: Editable<number>, midY: Editable<number>) => PathBuilder', description: 'Arc through start, midpoint, and end. No prior tangent required. Coords accept ParamRef for parametric authoring.' },
  { name: 'sagittaArc', signature: '(x: Editable<number>, y: Editable<number>, sagitta: Editable<number>) => PathBuilder', description: 'Arc by chord + perpendicular bulge height. Sign chooses bulge side. All scalars accept ParamRef for parametric authoring.' },
  { name: 'bulgeArc', signature: '(x: Editable<number>, y: Editable<number>, bulge: Editable<number>) => PathBuilder', description: 'Arc by chord + DXF bulge factor (tan(angle/4)). All scalars accept ParamRef for parametric authoring.' },
  { name: 'radiusArc', signature: '(x: Editable<number>, y: Editable<number>, radius: Editable<number>) => PathBuilder', description: 'Arc by chord + explicit radius. Always minor arc; sign chooses bulge side. All scalars accept ParamRef for parametric authoring.' },
  { name: 'smoothSpline', signature: '(x: Editable<number>, y: Editable<number>) => PathBuilder', description: 'C1-smooth spline segment from current position to (x, y); inherits start tangent from prior segment. Chain multiple calls for organic outlines (eyewear brow, ergonomic grips, sneaker silhouettes). Coords accept ParamRef for parametric authoring.' },
  { name: 'spline', signature: '(points: Array<[Editable<number>, Editable<number>]>, opts?: { tension?: Editable<number> }) => PathBuilder', description: 'NURBS Slice D — N-waypoint B-spline interpolation. Threads a degree-3 B-spline through every supplied waypoint, leaving the pen at the last waypoint. points[0] must match current pen position. Higher visual quality than chained smoothSpline; pick this when authoring an organic outline from measured waypoints.' },
  { name: 'nurbsSegment', signature: '(controlPoints: Array<[Editable<number>, Editable<number>]>, opts?: { degree?: number; weights?: number[]; knots?: number[] }) => PathBuilder', description: 'NURBS Slice D — explicit B-spline segment defined by a control polygon. controlPoints[0] must match current pen position within 1e-6 mm; the pen ends at controlPoints[N-1]. Pick this when the control net is the natural mental model (NURBS round-tripping, programmatic generation).' },
  { name: 'hermiteG2', signature: '(a: HermiteEndpoint2D, b: HermiteEndpoint2D) => PathBuilder', description: 'NURBS Slice D — 2D quintic-Hermite transition between two endpoints, each with prescribed point + first derivative (tangent) + optional second derivative (curvature). a.point must match current pen position. Pick this for G2-continuous blends between adjacent path runs (eyewear bridge ↔ brow, sneaker midsole transitions).' },
  { name: 'circle', signature: '(cx: number, cy: number, r: number, segments?: number) => Sketch', description: 'Closed circle profile centered at (cx, cy) with radius r. Polyline approximation (default 48 segments). Must be the ONLY operation on a fresh path. Returns Sketch directly. Arguments must be numeric (not ParamRef) in this slice.' },
  { name: 'label', signature: '(name: string) => PathBuilder', description: 'Tag the previous segment so it can be referenced later in fillet/chamfer/shell as `{face: name}`.' },
  { name: 'close', signature: '() => Sketch', description: 'Close the path; returns a Sketch that can be extruded/revolved/swept.' },
];

export const SCENE_METHODS: ApiEntry[] = [
  { name: 'parts', signature: 'readonly ScenePart[]', description: 'Frozen, ordered list of parts in the Scene; ordering matches the order parts were added to the Assembly. Iterate with `for (const p of scene)` (Scene is also `Iterable<ScenePart>`).' },
  { name: 'assemblyName', signature: 'string', description: 'Name passed to `assembly(name?)` at capture time; "unnamed-assembly" if no name was provided.' },
  { name: 'bbox', signature: '{ min: [number, number, number]; max: [number, number, number] }', description: 'Lazy axis-aligned bounding box over all transformed parts. Computed on first access; cached on the Scene instance.' },
  { name: 'toCompound', signature: '() => Shape', description: 'OCCT TopoDS_Compound — groups bodies without booleaning. Lossless on per-part identity (color, name, metadata preserved). Default path for STEP export with named bodies; preferred whenever a single Shape handle is needed without paying for a fuse. Free path via replicad makeCompound.' },
  { name: 'toUnion', signature: '() => Shape', description: 'Explicit boolean fuse of all parts into one Shape. Lossy on color, name, metadata — the result has no per-part identity. Documented antipattern; use only when downstream truly needs one solid (boolean ops against external geometry; legacy tools that do not accept compounds). Prefer toCompound() otherwise.' },
  { name: 'part', signature: '(name: string) => ScenePart', description: 'Look up a part by its assembly-unique name. Throws KernelError (`feature.invalid-args`, hint `invalid-args.scene.unknown-part — part X not declared on assembly Y`) on miss.' },
];

/**
 * Methods on the `Surface` peer returned by `nurbsSurface(...)` and
 * `surfaceFromCurves(...)`. Drift-sentinel contract: adding a method to
 * `SurfaceProxy` REQUIRES updating this array — the test at
 * `tests/integration/mcp/listApi.driftSentinel.test.ts` fails CI if they
 * disagree.
 */
export const SURFACE_METHODS: ApiEntry[] = [
  {
    name: 'thicken',
    signature: '(t: Editable<number>) => Shape',
    description: 'Offset both sides of this surface by `t` mm and return the closed solid Shape. Lowers via OCCT BRepOffsetAPI_MakeThickSolid.MakeThickSolidBySimple. `t` must be a positive finite number or a ParamRef<number>.',
  },
  {
    name: 'toShape',
    signature: '() => Shape',
    description: 'Wrap this surface as a single-face zero-volume Shape (TopoDS_Shell). Use as a profile placeholder for downstream face-aware features; `.volume()` returns ~0 but `.boundingBox()` works.',
  },
  {
    name: 'trimTo',
    signature: '(by: Surface) => Surface',
    description: 'Trim this surface at its intersection with `by` (a Surface cutter) and return a new Surface representing the kept half. No geometry is computed at capture time — the lowerer runs BRepAlgoAPI_Section, imprints the section curve with BRepFeat_SplitShape, and keeps the largest resulting face. Emits `feature.surface-trim.no-intersection` when the cutter produces no section curve. Shape/Curve3D cutters are deferred to a later slice.',
  },
  {
    name: 'split',
    signature: '(by: Surface) => [Surface, Surface]',
    description: 'Split this surface at its intersection with `by` (a Surface cutter) and return both resulting Surface halves as `[first, second]`, ordered by descending face area. The lowerer uses BRepFeat_SplitShape, so curved base/cutter patches are supported for clean intersections. Emits `feature.surface-trim.no-intersection` when the cutter produces no section curve. Shape/Curve3D cutters are deferred to a later slice.',
  },
];

/**
 * Methods on the `Curve3D` peer returned by `nurbsCurve(...)`,
 * `spline3d(...)`, and `hermiteG2(...)`. These are the flat synchronous
 * evaluators on the proxy itself; the `.analytics` namespace is advertised
 * separately via `CURVE3D_ANALYTICS_METHODS`.
 *
 * Drift-sentinel contract: adding a method to `Curve3DProxy` REQUIRES
 * updating this array — the test at
 * `tests/integration/mcp/listApi.driftSentinel.test.ts` fails CI if they
 * disagree.
 */
export const CURVE3D_METHODS: ApiEntry[] = [
  {
    name: 'sample',
    signature: '(n: number) => [number, number, number][]',
    description: 'Sample `n + 1` evenly-spaced points along the curve in the public `[0, 1]` parameter domain. Materializes the OCCT edge on first call via the lazy evaluator and reuses the cached evaluator on subsequent calls.',
  },
  {
    name: 'pointAt',
    signature: '(t: number) => [number, number, number]',
    description: 'World-space point on the curve at parameter `t ∈ [0, 1]` (clamped). Synchronous; backed by the cached OCCT evaluator.',
  },
  {
    name: 'tangentAt',
    signature: '(t: number) => [number, number, number]',
    description: 'Unit tangent vector at parameter `t ∈ [0, 1]` (clamped). Synchronous; backed by the cached OCCT evaluator.',
  },
  {
    name: 'length',
    signature: '() => number',
    description: 'Total arc length in mm. Synchronous; computed once and cached on the evaluator.',
  },
  {
    name: 'domain',
    signature: '() => [number, number]',
    description: 'Parametric domain. Always `[0, 1]` — the evaluator normalizes the OCCT first/last knot range internally.',
  },
];

/**
 * Methods on the `.analytics` namespace exposed on every `Curve3D` proxy.
 * Returns computed-query data (Vec3, numbers, sample records) without a
 * kernel round-trip — authoritative geometry stays in OCCT; analytics
 * delegates to the vendored NURBS JS module via the curveBridge cache.
 *
 * Drift-sentinel contract: adding a method to `Curve3DAnalyticsImpl`
 * (and the `Curve3DAnalytics` interface in `curveProxy.ts`) REQUIRES
 * updating this array — the test at
 * `tests/integration/mcp/listApi.driftSentinel.test.ts` fails CI if they
 * disagree.
 */
export const CURVE3D_ANALYTICS_METHODS: ApiEntry[] = [
  {
    name: 'closestPoint',
    signature: '(pt: Vec3, opts?: { tolerance?: number }) => Vec3',
    description: 'World-space closest point on the curve to the query `pt` (Newton-Raphson). Default tolerance 1e-3 mm. Throws `feature.curve3d.analytics.closest-point-no-converge` if the solver returns non-finite coordinates.',
  },
  {
    name: 'closestParam',
    signature: '(pt: Vec3, opts?: { tolerance?: number }) => number',
    description: 'Parametric coordinate `t ∈ [0, 1]` of the closest point on the curve to `pt`. Maps the verb intrinsic knot range into the public `[0, 1]` domain. Default tolerance 1e-3 mm.',
  },
  {
    name: 'divideByEqualArcLength',
    signature: '(n: number) => CurveLengthSample[]',
    description: 'Divide the curve into `n` equal-arc-length segments; returns `n + 1` `{ t, pt, arcLength }` samples covering both endpoints. `n` must be a positive integer; degenerate curves (length < 1e-9 mm) raise `feature.curve3d.analytics.degenerate-arclength`.',
  },
  {
    name: 'divideByArcLength',
    signature: '(arcLength: number) => CurveLengthSample[]',
    description: 'Sample the curve every `arcLength` mm starting from `t = 0`. Returns `{ t, pt, arcLength }` records. `arcLength` must be a positive finite number strictly less than `length()`; out-of-range inputs raise `feature.curve3d.analytics.degenerate-arclength`.',
  },
  {
    name: 'derivatives',
    signature: '(t: number, numDerivs?: number) => Vec3[]',
    description: 'Evaluate the curve and its first `numDerivs` derivatives at `t ∈ [0, 1]`. `numDerivs` defaults to 2 (point + tangent + curvature direction) and must be a positive integer `<= degree`; higher orders raise `feature.curve3d.analytics.derivatives-out-of-range`.',
  },
  {
    name: 'tessellate',
    signature: '(opts?: { tolerance?: number }) => Vec3[]',
    description: 'Adaptive polyline approximation of the curve at the given tolerance (mm). Default tolerance 0.05 mm (matches the K1 mesh-discretisation gate). Output is deterministic — the vendored algorithm calls `Math.random` for midpoint perturbation; this method seeds a mulberry32 stream so consecutive calls produce bit-identical polylines.',
  },
  {
    name: 'intersect',
    signature: '(other: Curve3D | Surface, opts?: { tolerance?: number }) => CurveCurveIntersection[] | CurveSurfaceIntersection[]',
    description: 'Geometric intersection of this curve with another `Curve3D` (returns `{ tA, tB, ptA, ptB, distance }` records) or with a `Surface` from `nurbsSurface()` (returns `{ tCurve, uv, pt }` records). Default tolerance 1e-3 mm. Deterministic — the curve bounding-box tree calls `Math.random`; this method seeds a mulberry32 stream for the duration of the call. Curve-surface overload is supported only for `nurbsSurface()`-authored surfaces today; unsupported surface kinds raise `feature.curve3d.analytics.intersect-kernel-failed`.',
  },
];

export const SCENE_PART_PROPERTIES: ApiEntry[] = [
  { name: 'name', signature: 'string', description: 'Assembly-unique part name from `assembly.part(name, ...)`.' },
  { name: 'shape', signature: 'Shape', description: 'LOCAL-frame shape — untransformed. Apply `worldTransform` to render in world frame.' },
  { name: 'worldTransform', signature: 'Transform', description: 'SE(3) post-FK placement. Identity for kinematic-zero `model()` (apart from each part\'s `at` already baked into the lowered shape); body-tree FK output for `solvedModel(poses)`.' },
  { name: 'color', signature: 'string | undefined', description: 'Role token (e.g. "servo", "gear") or `#rrggbb` hex; resolved from the source shape\'s metadata via input-graph walk to nearest color attribution.' },
  { name: 'metadata', signature: 'Readonly<Record<string, unknown>> | undefined', description: 'Forward-compat container for material, mass, BOM tags. Frozen.' },
];

/** Which global primitive/extrude functions accept an opts.faceLabels map,
 *  and the description of valid values for that map. */
export const FEATURE_KIND_FACE_LABELS: FeatureKindFaceLabels = {
  acceptingKinds: [
    'box',
    'cylinder',
    'extrudeRect',
    'extrudeCircle',
    'extrudePolygon',
    'extrudeRoundedRect',
  ] as const,
  description:
    'Pass `opts.faceLabels` as a plain object map from user-chosen label name to either a canonical face name ' +
    '(one of: top, bottom, left, right, front, back) or a FaceQuery descriptor object. ' +
    'Example: `box(10, 10, 5, false, { faceLabels: { lid: \'top\', floor: \'bottom\' } })`. ' +
    'Labels declared here are resolved later by fillet/chamfer/shell via `{ face: \'<label>\' }`. ' +
    'Use `list_face_labels` to inspect labels on an existing script. ' +
    'Sphere does not accept faceLabels (no canonical face names; no meaningful FaceQuery targets).',
};

export const CONSTRAINT_CAPABILITY: ConstraintCapability = {
  tools: ['list_constraints', 'add_constraint', 'solve_sketch'] as const,
  supportedTypes: SUPPORTED_CONSTRAINT_TYPES,
};

export async function listApiTool(input: ListApiInput = {}): Promise<ListApiOutput> {
  const tokens = (typeof input.query === 'string' ? input.query : '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const p = (entries: ApiEntry[]): ApiEntry[] => projectEntries(entries, tokens);
  // The big token cost is the prose descriptions of the ~117 ApiEntry items, so
  // those are compacted by default and shown in full only for query matches.
  // The small featureKindFaceLabels / constraints blocks stay present always.
  return {
    ok: true,
    globals: p(GLOBALS),
    shapeMethods: p(SHAPE_METHODS),
    shapeListMethods: p(SHAPE_LIST_METHODS),
    sketchMethods: p(SKETCH_METHODS),
    pathBuilderMethods: p(PATH_BUILDER_METHODS),
    paramRefMethods: p(PARAM_REF_METHODS),
    sceneMethods: p(SCENE_METHODS),
    scenePartProperties: p(SCENE_PART_PROPERTIES),
    surfaceMethods: p(SURFACE_METHODS),
    curve3dMethods: p(CURVE3D_METHODS),
    curve3dAnalyticsMethods: p(CURVE3D_ANALYTICS_METHODS),
    edgeQueryKeys: EDGE_QUERY_KEYS,
    faceQueryKeys: FACE_QUERY_KEYS,
    featureKindFaceLabels: FEATURE_KIND_FACE_LABELS,
    constraints: CONSTRAINT_CAPABILITY,
  };
}
