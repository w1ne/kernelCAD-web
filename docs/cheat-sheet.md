<!-- GENERATED — do not edit by hand, run `npx tsx scripts/buildCheatSheet.ts` -->

# kernelCAD cheat sheet

The script API, grouped by the job you are doing rather than by the object you
call it on. Rows come from `src/agent/mcp/tools/listApi.ts`; for the full
description of any entry, call `lookup_api(query)`.

| Task | What it covers |
|---|---|
| [Start a shape](#start-a-shape) | The first call in any model: a solid primitive, or a 2D profile to extrude. |
| [Add material](#add-material) | Turn a profile into a solid, or grow one along a path. |
| [Remove material](#remove-material) | Cut into a solid: bolt holes, pockets, slots, plain subtraction. |
| [Combine shapes](#combine-shapes) | Merge or intersect solids, or group them without paying for a boolean. |
| [Finish edges](#finish-edges) | Break edges, add draft, hollow out a wall, fold sheet metal. |
| [Select geometry](#select-geometry) | Pick the edges or faces a feature acts on. Query inside OCCT first, then sort or group what comes back. |
| [Place & transform](#place--transform) | Move a body into position, mirror it, or repeat it. |
| [Assemble](#assemble) | Build a mechanism from parts: connectors, mates, joints, posed Scenes. |
| [Curves & surfaces](#curves--surfaces) | NURBS curves and surfaces, plus the evaluators for measuring them before they become solids. |
| [Measure & verify](#measure--verify) | Ask the kernel what you actually built, and check it before shipping. |
| [Parametrize](#parametrize) | Declare editable dimensions and do arithmetic on them (JS operators throw on a ParamRef). |
| [Import & export](#import--export) | Bring in vendor geometry, and write models back out. |
| [Annotate & present](#annotate--present) | Change how a model reads without changing what it is: text, color, lighting, camera, motion. |

## Start a shape

The first call in any model: a solid primitive, or a 2D profile to extrude.

| Call | What it does |
|---|---|
| `box(x, y, z, centered?, opts?) => Shape` | Axis-aligned box. |
| `cylinder(h, r, segments?, opts?) => Shape` | Z-axis cylinder; bottom on the XY plane, height h, radius r. |
| `sphere(r) => Shape` | Sphere centered at the origin, radius r. |
| `torus(majorR: number, minorR: number, segments?: number) => Shape` | Solid torus centered on world origin, axis along world +Z. |
| `spring({ length, coilRadius, wireRadius, turns, axis?, pointsPerTurn?, endStyle?, segments? }) => Shape` | Build a helical spring as a circular wire profile swept along a smooth B-spline helix spine — one continuous watertight solid. |
| `extrudeRect(w, h, height, opts?) => Shape` | Extrude a w-by-h rectangle (XY) by `height` along Z. |
| `extrudeCircle(r, height, opts?) => Shape` | Extrude a radius-r circle (XY) by `height` along Z. |
| `extrudePolygon(points, depth, opts?) => Shape` | Extrude a 2D polygon (array of [x, y] points) by `depth` along Z. |
| `extrudeRoundedRect(width, height, radius, depth, opts?) => Shape` | Extrude a rounded rectangle (corner radius) by `depth` along Z. |
| `sheetMetal(profile: Sketch, { thickness, kFactor, faceLabels? }) => Shape` | Build a sheet-metal body from a closed planar Sketch. |
| `sdf : { sphere(r), box(size), cylinder(r, h), torus(R, r), smoothBlend(a, b, k), materialize(field, opts?), bind(name, field) }` | SDF authoring namespace (W2.3 slice-1). |
| `path() => PathBuilder` | Start a 2D path: chain moveTo / lineTo / arcs / .close() to get a Sketch. |
| `PathBuilder.moveTo(x: Editable<number>, y: Editable<number>) => PathBuilder` | Start the path at (x, y). |
| `PathBuilder.lineTo(x: Editable<number>, y: Editable<number>) => PathBuilder` | Add a straight line segment to (x, y). |
| `PathBuilder.close() => Sketch` | Close the path; returns a Sketch that can be extruded/revolved/swept. |
| `PathBuilder.label(name: string) => PathBuilder` | Tag the previous segment so it can be referenced later in fillet/chamfer/shell as `{face: name}`. |
| `PathBuilder.circle(cx: number, cy: number, r: number, segments?: number) => Sketch` | Closed circle profile centered at (cx, cy) with radius r. |
| `PathBuilder.tangentArc(x: Editable<number>, y: Editable<number>) => PathBuilder` | Arc continuing tangent from the previous segment to (x, y). |
| `PathBuilder.threePointsArc(x: Editable<number>, y: Editable<number>, midX: Editable<number>, midY: Editable<number>) => PathBuilder` | Arc through start, midpoint, and end. |
| `PathBuilder.sagittaArc(x: Editable<number>, y: Editable<number>, sagitta: Editable<number>) => PathBuilder` | Arc by chord + perpendicular bulge height. |
| `PathBuilder.bulgeArc(x: Editable<number>, y: Editable<number>, bulge: Editable<number>) => PathBuilder` | Arc by chord + DXF bulge factor (tan(angle/4)). |
| `PathBuilder.radiusArc(x: Editable<number>, y: Editable<number>, radius: Editable<number>) => PathBuilder` | Arc by chord + explicit radius. |
| `PathBuilder.smoothSpline(x: Editable<number>, y: Editable<number>) => PathBuilder` | C1-smooth spline segment from current position to (x, y); inherits start tangent from prior segment. |
| `PathBuilder.spline(points: Array<[Editable<number>, Editable<number>]>, opts?: { tension?: Editable<number> }) => PathBuilder` | NURBS Slice D — N-waypoint B-spline interpolation. |
| `PathBuilder.nurbsSegment(controlPoints: Array<[Editable<number>, Editable<number>]>, opts?: { degree?: number; weights?: number[]; knots?: number[] }) => PathBuilder` | NURBS Slice D — explicit B-spline segment defined by a control polygon. |
| `hermiteG2(a: { point: Vec3; tangent: Vec3; curvature?: Vec3 }, b: { point: Vec3; tangent: Vec3; curvature?: Vec3 }) => Curve3D` | Quintic Hermite Curve3D that interpolates the two endpoints with matching positions, first derivatives (tangents), and second derivatives (curvatures). |
| `PathBuilder.hermiteG2(a: HermiteEndpoint2D, b: HermiteEndpoint2D) => PathBuilder` | NURBS Slice D — 2D quintic-Hermite transition between two endpoints, each with prescribed point + first derivative (tangent) + optional second derivative (curvature). |

## Add material

Turn a profile into a solid, or grow one along a path.

| Call | What it does |
|---|---|
| `Sketch.extrude(depth) => Shape` | Extrude this closed sketch normal to its plane by `depth` (mm). |
| `Sketch.revolve() => Shape` | Revolve 360 degrees around the Z axis. |
| `Sketch.sweep(rail, opts?: { frenet?, transitionMode?, spine? }) => Shape` | Sweep this profile along a 3D rail. |
| `Sketch.loft(other: Sketch \| Sketch[], opts?: { spacing?, planes?, ruled?, startPoint?, endPoint? }) => Shape` | Loft this profile through one or more additional sections to produce a 3D solid that smoothly interpolates between them. |
| `variableSweep(spine: Curve3D \| Sketch \| Vec3[], sections: Array<{ t: number; profile: Sketch }>, opts?: { closed?: boolean; continuity?: "C0" \| "C1" \| "C2" }) => Shape` | Multi-section sweep that blends `sections[i].profile` along the spine at the section's `t ∈ [0, 1]` spine parameter. |
| `helix({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }) => [number, number, number][]` | Polyline helix rail for `Sketch.sweep`. |

## Remove material

Cut into a solid: bolt holes, pockets, slots, plain subtraction.

| Call | What it does |
|---|---|
| `Shape.subtract(...others) => Shape` | Boolean difference (this minus others). |
| `ParamRef.subtract(other: number \| ParamRef<number>) => ParamRef<number>` | Build a ParamRef whose value equals this ParamRef minus `other`. |
| `Shape.hole(face: FaceSelector \| string, opts: { u, v, diameter, depth?: number \| "through", upToFace?: FaceRef, counterbore?: { diameter, depth }, countersink?: { diameter, angleDeg? } }) => Shape` | Drill a single hole. |
| `Shape.holes(face: FaceSelector \| string, opts: { positions: Array<{u,v}>, diameter, depth?, upToFace?, counterbore?, countersink? }) => Shape` | Drill N holes in one feature record. |
| `Shape.cutout(profile: PathBuilder \| Sketch, opts: { face: FaceSelector \| string, depth?: number \| "through", upToFace?: FaceRef, depthMode?: "blind" \| "symmetric" }) => Shape` | Sketch-driven subtractive extrude for irregular shapes hole() can't express (slots, D-shapes, keyhole pockets). |

## Combine shapes

Merge or intersect solids, or group them without paying for a boolean.

| Call | What it does |
|---|---|
| `union(...shapes) => Shape` | Boolean union of two or more shapes. |
| `Shape.union(...others) => Shape` | Boolean union with one or more shapes. |
| `Shape.intersect(...others) => Shape` | Boolean intersection. |
| `Curve3D.analytics.intersect(other: Curve3D \| Surface, opts?: { tolerance?: number }) => CurveCurveIntersection[] \| CurveSurfaceIntersection[]` | Geometric intersection of this curve with another `Curve3D` (returns `{ tA, tB, ptA, ptB, distance }` records) or with a `Surface` from `nurbsSurface()` (returns `{ tCurve, uv, pt }` records). |
| `Scene.toCompound() => Shape` | OCCT TopoDS_Compound — groups bodies without booleaning. |
| `Scene.toUnion() => Shape` | Explicit boolean fuse of all parts into one Shape. |

## Finish edges

Break edges, add draft, hollow out a wall, fold sheet metal.

| Call | What it does |
|---|---|
| `Shape.fillet(radius, edges?: EdgeSelector, opts?: { continuity?: 'G1' \| 'G2' }) => Shape` | Round edges. |
| `Shape.chamfer(distance, edges?: EdgeSelector) => Shape` | Bevel edges. |
| `Shape.draft(angleDeg: Editable<number>, opts: { face: FaceSelector \| string; neutralPlane?: string; pullDir?: [number, number, number] }) => Shape` | Taper the selected face(s) for moldability. |
| `Shape.shell(thickness, { face: FaceSelector }) => Shape` | Hollow the solid removing the named face. |
| `Shape.bend(edgeRef: EdgeSelector \| string, angle: Editable<number>, radius: Editable<number>) => Shape` | Add a sheet-metal bend along a linear edge. |
| `Shape.flattenPattern() => Region` | Return the unfolded 2D flat-pattern of this bent sheet-metal Shape as a Region (closed outer wire + holes + bend-line metadata + source plane). |

## Select geometry

Pick the edges or faces a feature acts on. Query inside OCCT first, then sort or group what comes back.

| Call | What it does |
|---|---|
| `selectEdges(shape, query?) => Promise<ShapeList<EdgeSegment>>` | Pre-select edges by EdgeQuery. |
| `selectEdge(shape, query) => Promise<EdgeSegment>` | Like selectEdges but throws if zero or multiple edges match. |
| `select : <T>(items: Iterable<T>) => ShapeList<T>` | Wrap any array of topology query results in a `ShapeList` so the selector algebra applies — face summaries from `inspect({ of: 'faces' })`, `ResolvedEntity[]` from `q.face(...).evaluate(scene)`, or a hand-assembled list. |
| `q : { face, edge, vertex, connector, part, solid, createdBy, ownedByPart, ownerPart, union, intersection, subtraction, containsPoint, closestTo, geometryType, withLabel, withFeatureName, nthElement, fromString, nothing, everything }` | Query DSL constructor namespace. |
| `ShapeList.sortBy(criterion: 'X' \| 'Y' \| 'Z' \| Vec3 \| 'area' \| 'length' \| 'radius', opts?: { descending?: boolean; tolerance?: number }) => ShapeList<T>` | Order the list by a criterion, ascending by default. |
| `ShapeList.sortByDistance(point: Vec3, opts?: { descending?: boolean; tolerance?: number }) => ShapeList<T>` | Order by straight-line distance from each entity position to `point`, nearest first. |
| `ShapeList.groupBy(criterion: 'X' \| 'Y' \| 'Z' \| Vec3 \| 'area' \| 'length' \| 'radius', opts?: { tolerance?: number; descending?: boolean }) => ShapeGroups<T>` | Partition into groups sharing a quantized criterion value — one group per Z level, per hole diameter, per face area. |
| `ShapeList.filterBy(spec: ((item: T) => boolean) \| Axis \| string, opts?: { angleTolerance?: number }) => ShapeList<T>` | Keep matching entities. |
| `ShapeList.filterByPosition(axis: 'X' \| 'Y' \| 'Z' \| Vec3, min: number, max: number, opts?: { inclusive?: boolean }) => ShapeList<T>` | Keep entities whose position projected onto `axis` falls within [min, max] (mm). |
| `ShapeList.take(n: number) => ShapeList<T>` | First `n` entities, clamped to the list length. |
| `ShapeList.first : T \| undefined` | Getter — the first entity, or `undefined` when the list is empty. |
| `ShapeList.last : T \| undefined` | Getter — the last entity, or `undefined` when the list is empty. |
| `ShapeList.at(i: number) => T \| undefined` | Entity at index `i`; negative indexes count from the end. |

## Place & transform

Move a body into position, mirror it, or repeat it.

| Call | What it does |
|---|---|
| `Shape.translate(x: Editable<number>, y: Editable<number>, z: Editable<number>) => Shape` | Translate by (x, y, z). |
| `Shape.rotate(axis: [Editable<number>, Editable<number>, Editable<number>], degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape` | Rotate `degrees` around `axis` (vector); pivot defaults to origin. |
| `Shape.rotateX(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape` | Rotate `degrees` around the world X axis. |
| `Shape.rotateY(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape` | Rotate `degrees` around the world Y axis. |
| `Shape.rotateZ(degrees: Editable<number>, pivot?: [Editable<number>, Editable<number>, Editable<number>]) => Shape` | Rotate `degrees` around the world Z axis. |
| `Shape.transform(t: Transform) => Shape` | Apply an SE(3) Transform. |
| `Shape.alongAxis(axis: [number, number, number]) => Shape` | Orient this shape so its current +Z axis aligns with the given direction. |
| `Shape.scale(factor: number \| [number, number, number]) => Shape` | Scale this shape uniformly (single positive finite number) or per-axis (Vec3 — sx/sy/sz). |
| `Shape.reflect(plane: 'xy' \| 'xz' \| 'yz' \| { plane: 'xy' \| 'xz' \| 'yz'; offset: number }) => Shape` | Reflect (pure rigid-body transformation) across a cardinal plane or an offset parallel plane. |
| `Sketch.reflect(axis: 'x' \| 'y' \| { axis: 'x' \| 'y'; offset: number }) => Sketch` | Reflect this sketch's path across an axis, returning a new Sketch. |
| `Shape.mirror(plane: 'xy' \| 'xz' \| 'yz' \| { plane: 'xy' \| 'xz' \| 'yz'; offset: number }) => Shape` | Boolean union of the source and its reflection across a cardinal plane. |
| `Shape.patternLinear({ count, direction, spacing }) => Shape` | Repeat this shape in a linear array. |
| `Shape.patternGrid({ x: { count, direction, spacing }, y: { count, direction, spacing } }) => Shape` | Repeat this shape in a two-axis grid. |
| `Shape.patternCircular({ count, axis, angleDeg? }) => Shape` | Repeat this shape around an axis. |
| `Shape.recenter(opts?: { x?: boolean; y?: boolean; z?: boolean }) => Promise<Shape>` | Translate this Shape so its bounding-box center lands on the world origin, then return it for chaining. |
| `Shape.seatOnFloor(opts?: { center?: boolean }) => Promise<Shape>` | Translate this Shape so it rests on the z = 0 floor (bbox min.z → 0), centered in x/y over the origin; returns it for chaining. |

## Assemble

Build a mechanism from parts: connectors, mates, joints, posed Scenes.

| Call | What it does |
|---|---|
| `assembly(name?) => Assembly` | Start an inspectable mechanical assembly. |
| `joint : { clevis(opts: ClevisJointOptions): ClevisJoint; supportedServoRevolute(arm: Assembly, opts: SupportedServoRevoluteOptions): SupportedServoRevoluteResult; articulatedDigit(arm: Assembly, opts: ArticulatedDigitOptions): ArticulatedDigitResult }` | Mechanism-delivery joint helpers. |
| `Scene.part(name: string) => ScenePart` | Look up a part by its assembly-unique name. |
| `Scene.parts : readonly ScenePart[]` | Frozen, ordered list of parts in the Scene; ordering matches the order parts were added to the Assembly. |
| `Scene.assemblyName : string` | Name passed to `assembly(name?)` at capture time; "unnamed-assembly" if no name was provided. |

## Curves & surfaces

NURBS curves and surfaces, plus the evaluators for measuring them before they become solids.

| Call | What it does |
|---|---|
| `nurbsCurve(controlPoints: Vec3[], opts?: { degree?: number; weights?: number[]; knots?: number[]; closed?: boolean }) => Curve3D` | 3D parametric NURBS curve specified by an explicit `Geom_BSplineCurve` control net. |
| `spline3d(points: Vec3[], opts?: { tension?: number; closed?: boolean }) => Curve3D` | Catmull-Rom-to-cubic-Bezier convenience that interpolates the supplied points through a cubic NURBS curve. |
| `hermiteG2(a: { point: Vec3; tangent: Vec3; curvature?: Vec3 }, b: { point: Vec3; tangent: Vec3; curvature?: Vec3 }) => Curve3D` | Quintic Hermite Curve3D that interpolates the two endpoints with matching positions, first derivatives (tangents), and second derivatives (curvatures). |
| `PathBuilder.hermiteG2(a: HermiteEndpoint2D, b: HermiteEndpoint2D) => PathBuilder` | NURBS Slice D — 2D quintic-Hermite transition between two endpoints, each with prescribed point + first derivative (tangent) + optional second derivative (curvature). |
| `nurbsSurface({ controls, degree, weights?, knots?, periodic? }) => Surface` | Build a NURBS surface from an explicit control net + degree. |
| `surfaceFromCurves(sections: Sketch[]) => Surface` | Skin a NURBS surface through 2+ closed Sketch cross-sections in declaration order. |
| `surfaceFromBoundary(curves: [Curve3D, Curve3D, Curve3D, Curve3D], opts?: { continuity?: "C0" \| "C1" \| "C2" \| ("C0" \| "C1" \| "C2")[]; sampling?: number }) => Surface` | Build the shipped filling surface: one NURBS face through 4 boundary curves. |
| `sew(surfaces: Surface[], opts?: { tolerance?: number; requireClosed?: boolean }) => Shape` | Stitch N surfaces into a shell or closed solid via OCCT `BRepBuilderAPI_Sewing`. |
| `Surface.thicken(t: Editable<number>) => Shape` | Offset both sides of this surface by `t` mm and return the closed solid Shape. |
| `Surface.toShape() => Shape` | Wrap this surface as a single-face zero-volume Shape (TopoDS_Shell). |
| `Surface.trimTo(by: Surface) => Surface` | Trim this surface at its intersection with `by` (a Surface cutter) and return a new Surface representing the kept half. |
| `Surface.split(by: Surface) => [Surface, Surface]` | Split this surface at its intersection with `by` (a Surface cutter) and return both resulting Surface halves as `[first, second]`, ordered by descending face area. |
| `Shape.projectCurve(opts: { source: ProjectCurveSource; face: FaceSelector \| string; scaleMode?: 'original' \| 'native' \| 'bounds'; asEdge?: boolean }) => Sketch` | Wrap a 2D closed curve onto a 3D face along the face normal. |
| `Curve3D.sample(n: number) => [number, number, number][]` | Sample `n + 1` evenly-spaced points along the curve in the public `[0, 1]` parameter domain. |
| `Curve3D.pointAt(t: number) => [number, number, number]` | World-space point on the curve at parameter `t ∈ [0, 1]` (clamped). |
| `Curve3D.tangentAt(t: number) => [number, number, number]` | Unit tangent vector at parameter `t ∈ [0, 1]` (clamped). |
| `Curve3D.domain() => [number, number]` | Parametric domain. |
| `Curve3D.analytics.closestPoint(pt: Vec3, opts?: { tolerance?: number }) => Vec3` | World-space closest point on the curve to the query `pt` (Newton-Raphson). |
| `Curve3D.analytics.closestParam(pt: Vec3, opts?: { tolerance?: number }) => number` | Parametric coordinate `t ∈ [0, 1]` of the closest point on the curve to `pt`. |
| `Curve3D.analytics.divideByEqualArcLength(n: number) => CurveLengthSample[]` | Divide the curve into `n` equal-arc-length segments; returns `n + 1` `{ t, pt, arcLength }` samples covering both endpoints. |
| `Curve3D.analytics.divideByArcLength(arcLength: number) => CurveLengthSample[]` | Sample the curve every `arcLength` mm starting from `t = 0`. |
| `Curve3D.analytics.derivatives(t: number, numDerivs?: number) => Vec3[]` | Evaluate the curve and its first `numDerivs` derivatives at `t ∈ [0, 1]`. |
| `Curve3D.analytics.tessellate(opts?: { tolerance?: number }) => Vec3[]` | Adaptive polyline approximation of the curve at the given tolerance (mm). |
| `Shape.intersect(...others) => Shape` | Boolean intersection. |
| `Curve3D.analytics.intersect(other: Curve3D \| Surface, opts?: { tolerance?: number }) => CurveCurveIntersection[] \| CurveSurfaceIntersection[]` | Geometric intersection of this curve with another `Curve3D` (returns `{ tA, tB, ptA, ptB, distance }` records) or with a `Surface` from `nurbsSurface()` (returns `{ tCurve, uv, pt }` records). |

## Measure & verify

Ask the kernel what you actually built, and check it before shipping.

| Call | What it does |
|---|---|
| `Shape.boundingBox(opts?: { exact?: boolean }) => Promise<{ min: [number, number, number]; max: [number, number, number]; size: [number, number, number]; center: [number, number, number] }>` | Axis-aligned bounding box in the CURRENT world frame (after every transform appended so far), in mm. |
| `Scene.bbox : { min: [number, number, number]; max: [number, number, number] }` | Lazy axis-aligned bounding box over all transformed parts. |
| `Curve3D.length() => number` | Total arc length in mm. |
| `Shape.lower() => Promise<OcctBackend>` | Eagerly lower this Shape for inspection. |
| `kinematic : KinematicFacade` | Namespace with four in-process feasibility checks an agent can run before declaring a mechanism design done: `kinematic.checkMountingHoleConsistency(arm)` (fastener-side hole agreement; dispatches to the v0.7.4 substrate), `kinematic.checkSweptCollision(arm, opts?)` (sampled-pose collision sweep across declared joint ranges), `kinematic.checkReachable(arm, opts)` (IK reachability — analytical Pieper first, DLS numeric fallback), `kinematic.checkLoadCapacity(arm, opts?)` (closed-form Euler-Bernoulli beam load check). |
| `dfmSpec(spec: { minWall?: number; minClearance?: number; includeArticulatedMates?: boolean; ignore?: [string, string][]; exclude?: string[]; channels?: Array<{ part: string; name: string; openings: number; sealed?: boolean }> }) => DfmSpecHandle` | Declare printability (design-for-manufacture) gates for the model. |

## Parametrize

Declare editable dimensions and do arithmetic on them (JS operators throw on a ParamRef).

| Call | What it does |
|---|---|
| `param(name, defaultValue, meta?) => ParamRef` | Declare a symbolic editable parameter. |
| `params(decl) => { [name]: ParamRef }` | Batched form of `param()` — declare many params at once. |
| `ParamRef.add(other: number \| ParamRef<number>) => ParamRef<number>` | Build a ParamRef whose value equals this ParamRef plus `other`. |
| `Shape.subtract(...others) => Shape` | Boolean difference (this minus others). |
| `ParamRef.subtract(other: number \| ParamRef<number>) => ParamRef<number>` | Build a ParamRef whose value equals this ParamRef minus `other`. |
| `ParamRef.multiply(other: number \| ParamRef<number>) => ParamRef<number>` | Build a ParamRef whose value equals this ParamRef times `other`. |
| `ParamRef.divide(other: number \| ParamRef<number>) => ParamRef<number>` | Build a ParamRef whose value equals this ParamRef divided by `other`. |
| `ParamRef.negate() => ParamRef<number>` | Build a ParamRef whose value equals the unary negation of this ParamRef. |

## Import & export

Bring in vendor geometry, and write models back out.

| Call | What it does |
|---|---|
| `lib : { fromSTEP(path: string): Promise<Shape>; fromBREP(path: string): Promise<Shape>; fromSTL(path: string, opts?: { tolerance?: number; allowOpen?: boolean; maxTriangles?: number }): Promise<Shape> }` | Parts library namespace. |
| `Scene.toCompound() => Shape` | OCCT TopoDS_Compound — groups bodies without booleaning. |

## Annotate & present

Change how a model reads without changing what it is: text, color, lighting, camera, motion.

| Call | What it does |
|---|---|
| `sketch : { text(content: string, opts: { size: Editable<number>; align?: "left" \| "center" \| "right"; position?: [Editable<number>, Editable<number>]; rotation?: Editable<number>; font?: string }): Sketch }` | Sketch primitives namespace. |
| `fontPath(p: string) => FontPath` | Brand a string as a font filesystem path (TTF). |
| `Shape.embossText(opts: { textContent: string; fontFamily?: string; size: Editable<number>; depth: Editable<number>; align?: 'left' \| 'center' \| 'right'; anchorU?: Editable<number>; anchorV?: Editable<number>; rotation?: Editable<number>; scaleMode?: 'original' \| 'native' \| 'bounds'; face: FaceSelector \| string }) => Shape` | Raise or recess text on a target face. |
| `Shape.color(name: ColorToken \| `#${string}`) => Shape` | Tag this shape with a role color (servo/gear/beam/shaft/plate/pin/frame/tool) or a literal `#rrggbb` hex. |
| `Shape.material(opts: PBRMaterial & { face?: string }) => Shape` | Apply a PBR material (baseColor required; optional metalness/roughness/clearcoat/clearcoatRoughness/ior/transmission/sheen/opacity). |
| `referenceImage(path: string, opts: { plane, anchor?, scale?, opacity?, flipU?, flipV? }) => ReferenceImageHandle` | Overlay a reference image on a plane for tracing or design review. |
| `setRenderEnvironment(spec: { preset?: 'studio' \| 'softbox' \| 'neutral' \| 'outdoor' \| 'warehouse'; url?: string; intensity?: number; rotation?: number }) => RenderEnvironmentHandle` | Set the HDRI / image-based-lighting environment for the rendered scene. |
| `setCameraTarget(x: number, y: number, z: number) => CameraTargetHandle` | Override the camera look-at target for `setRenderPose` and headless engineering renders. |
| `setCameraDistance(distance: number) => CameraTargetHandle` | Override the camera framing distance (mm from target). |
| `animationView(spec: { param: string; from: number; to: number; durationMs: number; fps?: number } \| { name?: string; tracks: Array<{ param: string; keys: Array<{ atMs: number; value: number; ease?: "linear" \| "step" \| "easeIn" \| "easeOut" \| "easeInOut" }> }>; fps?: number }) => AnimationViewHandle` | Declare an animation timeline for offline kinematic-motion MP4 capture. |
