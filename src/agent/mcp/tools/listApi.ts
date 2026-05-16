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

export type ListApiInput = Record<string, never>;

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
  sketchMethods?: ApiEntry[];
  pathBuilderMethods?: ApiEntry[];
  paramRefMethods?: ApiEntry[];
  /** Methods/properties on the `Scene` returned by `Assembly.model()` / `Assembly.solvedModel()`. */
  sceneMethods?: ApiEntry[];
  /** Properties on each `ScenePart` produced by a Scene. */
  scenePartProperties?: ApiEntry[];
  /** Methods on the `Surface` peer returned by `nurbsSurface()` / `surfaceFromCurves()`. */
  surfaceMethods?: ApiEntry[];
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
  { name: 'extrudeRect', signature: '(w, h, height, opts?) => Shape', description: 'Extrude a w-by-h rectangle (XY) by `height` along Z. `opts.faceLabels` maps user label names to canonical face names (top/bottom/left/right/front/back) or FaceQuery descriptors.' },
  { name: 'extrudeCircle', signature: '(r, height, opts?) => Shape', description: 'Extrude a radius-r circle (XY) by `height` along Z. `opts.faceLabels` maps user label names to canonical face names (top/bottom) or FaceQuery descriptors.' },
  { name: 'extrudePolygon', signature: '(points, depth, opts?) => Shape', description: 'Extrude a 2D polygon (array of [x, y] points) by `depth` along Z. `opts.faceLabels` maps user label names to canonical face names or FaceQuery descriptors.' },
  { name: 'extrudeRoundedRect', signature: '(width, height, radius, depth, opts?) => Shape', description: 'Extrude a rounded rectangle (corner radius) by `depth` along Z. `opts.faceLabels` maps user label names to canonical face names (top/bottom/left/right/front/back) or FaceQuery descriptors.' },
  { name: 'path', signature: '() => PathBuilder', description: 'Start a 2D path: chain moveTo / lineTo / arcs / .close() to get a Sketch.' },
  { name: 'param', signature: "(name, defaultValue, meta?) => ParamRef", description: 'Declare a symbolic editable parameter. Returns a ParamRef the chain ops accept anywhere a number is expected. Edit post-build via `kcad.params.update`. `meta?: { min?, max?, description? }`.' },
  { name: 'params', signature: "(decl) => { [name]: ParamRef }", description: 'Batched form of `param()` — declare many params at once. Returns an object of ParamRefs keyed by name.' },
  { name: 'union', signature: '(...shapes) => Shape', description: 'Boolean union of two or more shapes.' },
  { name: 'assembly', signature: '(name?) => Assembly', description: 'Start an inspectable mechanical assembly. Use `.part(name, shape, { at?, connectors?, connect? })` to wrap modeled solids, `.connect(name, aConnector, bConnector)` for fixed connector metadata, joint primitives `.revolute/.prismatic/.fixed/.ball(name, parentPart, childPart, opts)` to declare DOF + joint origins (numeric Vec3 in parent local frame), `.solve(poses)` to run body-tree forward kinematics returning a SolvedKinematics handle (with `.transform(partName)`, `.value(jointName)`, `.bodies()`, `.toScene()`; `.toShape()` is deprecated — use `.toScene().toUnion()`), `.solvedModel(poses, opts?)` to return the posed `Scene` (opts: `{ validate: "warn" | "error" | "off" }` — default `warn`, attaches mate-aware validator diagnostics to `scene.warnings`), and `.model()` for the kinematic-zero `Scene`. v0.6 adds `partRef.connector(name, opts)` for mate-style connector frames and `.mate(name, aRef, bRef, type)` for typed mates. Physical mechanism intent can be declared with `.mechanicalJoint(name, { mate, actuator, shaft, supports, output, requiredSupport? })`; `requiredSupport` may name a hinge/bearing/bracket contract such as `{ kind: "hinge-bracket", around: "palm.left-hinge", supports: ["palm"], minBearingLengthMm: 8 }`. Drive transmission intent can be declared with `.transmission(name, { kind, sourceMate, drivenMates, actuator?, input?, output?, path, ratio?, notes? })`, where `kind` is `direct-horn`, `link-rod`, `four-bar`, `gear-pair`, `belt`, or `tendon`; `review_cad` requires every `coupleMates(...)` driven mate to have a matching physical transmission path, and consecutive `path` parts must stay near-contact adjacent across sampled mate travel. `design_loop` requires screenshot review by default so visually bad but structurally passing attempts are rejected; accepted visual reviews must include screenshotPath and non-empty findings from the vision-capable agent, and `requireVisualReview: false` is only for explicit non-visual batch checks. `review_cad` checks that declared actuators are mounted, shafts lie on revolute axes, support parts are fixed, outputs are connected by the mate, generic revolute connectors sit on modeled support material, declared support contracts reach their connector, and coupled mates are backed by adjacent transmission intent. Pose values accept `Editable<number>` — passing ParamRef poses to `.solvedModel` makes the rendered Scene reactive (param updates re-pose → fresh frozen Scene); `.solve` resolves ParamRefs at call time and returns a snapshot. The `Scene` return exposes `.parts`, `.bbox`, `.assemblyName`, `.warnings`, `.toCompound()` (lossless OCCT group, default for STEP), `.toUnion()` (lossy boolean fuse, antipattern), `.part(name)`, and iteration via `for (const p of scene)`.' },
  { name: 'helix', signature: '({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }) => [number, number, number][]', description: 'Polyline helix rail for `Sketch.sweep`. Default axis Z, 32 points per turn.' },
  { name: 'selectEdges', signature: '(shape, query?) => Promise<EdgeSegment[]>', description: 'Pre-select edges by EdgeQuery. Awaitable; lowers the shape lazily.' },
  { name: 'selectEdge', signature: '(shape, query) => Promise<EdgeSegment>', description: 'Like selectEdges but throws if zero or multiple edges match. Use for unambiguous single-edge selection.' },
  { name: 'lib', signature: '{ fromSTEP(path: string): Promise<Shape> }', description: 'Parts library namespace. `lib.fromSTEP(path)` imports a STEP file as a Shape — path is resolved relative to the calling .kcad.ts script (absolute paths also accepted). Returned Shape composes with translate/rotate/color/arm.part(...) like any primitive. Use for vendor catalog parts (servos, bearings, fasteners) so geometric fidelity matches the real component instead of being hand-authored from box/cylinder.' },
  { name: 'nurbsSurface', signature: '({ controls, degree, weights?, knots?, periodic? }) => Surface', description: 'Build a NURBS surface from an explicit control net + degree. `controls` is a U-major V-minor rectangular Vec3 grid (mm). Returns a Surface (peer to Shape) — use `.thicken(t)` or `.toShape()` to enter the Shape pipeline. Slice-1: weights are accepted but ignored (non-rational only); rational support pending WASM bindings.' },
  { name: 'surfaceFromCurves', signature: '(sections: Sketch[]) => Surface', description: 'Skin a NURBS surface through 2+ closed Sketch cross-sections in declaration order. Returns a Surface — chain `.thicken(t)` or `.toShape()`. Use for free-form panels and lofted shells.' },
  { name: 'sketch', signature: '{ text(content: string, opts: { size: Editable<number>; align?: "left" | "center" | "right"; position?: [Editable<number>, Editable<number>]; rotation?: Editable<number>; font?: string }): Sketch }', description: 'Sketch primitives namespace. `sketch.text(content, opts)` produces a Sketch covering all glyph outlines of the rendered string (one Sketch per call, regardless of glyph count). Bundled font is Liberation Sans Regular; pass `opts.font: fontPath("/abs/path.ttf")` to load a different TTF. `align` is horizontal-only (vertical alignment is always baseline). Chainable into `.extrude(depth)` for engraved (subtract) or raised (union) text features.' },
  { name: 'fontPath', signature: '(p: string) => FontPath', description: 'Brand a string as a font filesystem path (TTF). Use in `sketch.text({ font: fontPath("/path/to/font.ttf") })` to distinguish a TTF path from a logical font family name. Relative paths resolve against the calling .kcad.ts script\'s directory.' },
  { name: 'sheetMetal', signature: '(profile: Sketch, { thickness, kFactor, faceLabels? }) => Shape', description: 'Build a sheet-metal body from a closed planar Sketch. `thickness` in mm; `kFactor` is the neutral-axis offset ratio in [0, 1] (typical mild-steel/aluminum 0.33-0.45). Returned Shape chains `.bend(edgeRef, angle, radius)` for folds and `.flattenPattern()` to recover the flat blank.' },
  { name: 'sdf', signature: '{ sphere(r), box(size), cylinder(r, h), torus(R, r), smoothBlend(a, b, k), materialize(field, opts?), bind(name, field) }', description: 'SDF authoring namespace (W2.3 slice-1). Primitives (sphere/box/cylinder/torus) return callable distance-field closures with exact AABBs centred at origin in local frames. `smoothBlend(a, b, k)` is a polynomial smooth-min union (k mm blend radius); only union is supported in slice-1. `materialize(field, { resolution })` runs marching-cubes on the host and sews the result into a closed polyhedral Shape (kind `sdfMaterialize`) that flows through booleans/STL/STEP exports. Default resolution 30 ([10, 200] clamped). Output is polyhedral — canonical face refs do not apply. `bind(name, field)` writes the field to session.sdfFields for later sampling via the `evaluate_sdf` MCP tool.' },
];

export const SHAPE_METHODS: ApiEntry[] = [
  { name: 'translate', signature: '(x: Editable<number>, y: Editable<number>, z: Editable<number>) => Shape', description: 'Translate by (x, y, z). Each coordinate accepts a number or a `ParamRef<number>` so translations stay editable post-build.' },
  { name: 'rotate', signature: '(axis: [Editable<number>, Editable<number>, Editable<number>], degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape', description: 'Rotate `degrees` around `axis` (vector); pivot defaults to origin. Axis components, degrees, and pivot all accept `ParamRef<number>`.' },
  { name: 'transform', signature: '(t: Transform) => Shape', description: 'Apply an SE(3) Transform. Decomposes into one rotate + one translate (T = Translate · Rotate) and appends both via the existing translate / rotateAxis pipes. Pure translations append only translate; pure rotations append only rotateAxis; identity transforms append nothing.' },
  { name: 'color', signature: '(name: ColorToken | `#${string}`) => Shape', description: 'Tag this shape with a role color (servo/gear/beam/shaft/plate/pin/frame/tool) or a literal `#rrggbb` hex. Stored on FeatureRecord metadata; renderer resolves via ROLE_PALETTE. Booleans drop the color (identity lives at leaf parts).' },
  { name: 'alongAxis', signature: '(axis: [number, number, number]) => Shape', description: 'Orient this shape so its current +Z axis aligns with the given direction. Sugar over .rotate() — preferred for cross-axis cylinders/axles. Antipodal [0, 0, -1] handled deterministically (180° around X). Identity [0, 0, 1] is a no-op.' },
  { name: 'scale', signature: '(factor: number | [number, number, number]) => Shape', description: 'Scale this shape uniformly (single positive finite number) or per-axis (Vec3 — sx/sy/sz). Non-uniform lowers via gp_GTrsf + BRepBuilderAPI_GTransform so face refs survive (topology is preserved under any affine transform). All factors must be positive and finite.' },
  { name: 'union', signature: '(...others) => Shape', description: 'Boolean union with one or more shapes.' },
  { name: 'subtract', signature: '(...others) => Shape', description: 'Boolean difference (this minus others).' },
  { name: 'intersect', signature: '(...others) => Shape', description: 'Boolean intersection.' },
  { name: 'fillet', signature: '(radius, edges?: EdgeSelector) => Shape', description: 'Round edges. `edges` accepts EdgeQuery, EdgeSegment[], `{face: name|query}`, or undefined (all sharp edges).' },
  { name: 'chamfer', signature: '(distance, edges?: EdgeSelector) => Shape', description: 'Bevel edges. Same selector shape as fillet.' },
  { name: 'shell', signature: '(thickness, { face: FaceSelector }) => Shape', description: 'Hollow the solid removing the named face. `face` accepts canonical name, label, or FaceQuery.' },
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
  { name: 'lower', signature: '() => Promise<OcctBackend>', description: 'Eagerly lower this Shape for inspection. Used internally by selectEdges; agents rarely call directly.' },
];

export const SKETCH_METHODS: ApiEntry[] = [
  { name: 'extrude', signature: '(depth) => Shape', description: 'Extrude this closed sketch normal to its plane by `depth` (mm).' },
  { name: 'revolve', signature: '() => Shape', description: 'Revolve 360 degrees around the Z axis. Profile coords are (radial-X, axial-Z); all x >= 0.' },
  { name: 'sweep', signature: '(rail, opts?: { frenet? }) => Shape', description: 'Sweep this profile along a 3D polyline rail. `frenet: true` for helices/curves; default false for straight/L-bend rails.' },
  { name: 'loft', signature: '(other: Sketch | Sketch[], opts?: { spacing?, planes?, ruled?, startPoint?, endPoint? }) => Shape', description: 'Loft this profile through one or more additional sections to produce a 3D solid that smoothly interpolates between them. Use for nozzles (round-to-square), wings/airfoils, fairings, transition pieces. `opts.spacing` z-stacks sections axially; `opts.planes` overrides with explicit per-section placement.' },
  { name: 'reflect', signature: `(axis: 'x' | 'y' | { axis: 'x' | 'y'; offset: number }) => Sketch`, description: "Reflect this sketch's path across an axis, returning a new Sketch. 'x' negates y-coords; 'y' negates x-coords; { axis, offset } reflects across the parallel axis at the given offset. Arc winding (signed sagitta/bulge/radius) is inverted automatically. Labels are preserved." },
];

export const PARAM_REF_METHODS: ApiEntry[] = [
  { name: 'add', signature: '(other: number | ParamRef<number>) => ParamRef<number>', description: 'Build a ParamRef whose value equals this ParamRef plus `other`. Use this instead of JS `+` (which would NaN-coerce the branded object).' },
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
  void input;
  return {
    ok: true,
    globals: GLOBALS,
    shapeMethods: SHAPE_METHODS,
    sketchMethods: SKETCH_METHODS,
    pathBuilderMethods: PATH_BUILDER_METHODS,
    paramRefMethods: PARAM_REF_METHODS,
    sceneMethods: SCENE_METHODS,
    scenePartProperties: SCENE_PART_PROPERTIES,
    surfaceMethods: SURFACE_METHODS,
    edgeQueryKeys: EDGE_QUERY_KEYS,
    faceQueryKeys: FACE_QUERY_KEYS,
    featureKindFaceLabels: FEATURE_KIND_FACE_LABELS,
    constraints: CONSTRAINT_CAPABILITY,
  };
}
