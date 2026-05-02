// src/mcp/tools/listApi.ts
//
// MCP tool: advertise the kernelCAD script-runtime surface so agents can
// discover globals, Shape/Sketch methods, and EdgeQuery/FaceQuery keys
// without reading source. Hand-curated static data; updated alongside any
// API addition (this file is the single source of truth for "what can a
// .kcad.ts script call?").

import { EDGE_QUERY_KEYS, FACE_QUERY_KEYS } from '../../backends/occt/queryKeys';

export type ListApiInput = Record<string, never>;

export interface ApiEntry {
  name: string;
  description: string;
  signature: string;
}

export interface ListApiOutput {
  ok: boolean;
  globals?: ApiEntry[];
  shapeMethods?: ApiEntry[];
  sketchMethods?: ApiEntry[];
  pathBuilderMethods?: ApiEntry[];
  edgeQueryKeys?: readonly string[];
  faceQueryKeys?: readonly string[];
  error?: string;
}

const GLOBALS: ApiEntry[] = [
  { name: 'box', signature: '(x, y, z, centered?) => Shape', description: 'Axis-aligned box. `centered: true` centers on the origin.' },
  { name: 'cylinder', signature: '(h, r) => Shape', description: 'Z-axis cylinder; bottom on the XY plane, height h, radius r.' },
  { name: 'sphere', signature: '(r) => Shape', description: 'Sphere centered at the origin, radius r.' },
  { name: 'extrudeRect', signature: '(w, h, height) => Shape', description: 'Extrude a w-by-h rectangle (XY) by `height` along Z.' },
  { name: 'extrudeCircle', signature: '(r, height) => Shape', description: 'Extrude a radius-r circle (XY) by `height` along Z.' },
  { name: 'extrudePolygon', signature: '(points, depth) => Shape', description: 'Extrude a 2D polygon (array of [x, y] points) by `depth` along Z.' },
  { name: 'extrudeRoundedRect', signature: '(width, height, radius, depth) => Shape', description: 'Extrude a rounded rectangle (corner radius) by `depth` along Z.' },
  { name: 'revolveRect', signature: '(w, h, offsetX, angleDeg?) => Shape', description: 'Revolve a w-by-h rectangle around Z, offset by `offsetX` from the axis. Default 360 degrees.' },
  { name: 'path', signature: '() => PathBuilder', description: 'Start a 2D path: chain moveTo / lineTo / arcs / .close() to get a Sketch.' },
  { name: 'param', signature: "(name, default, opts) => number", description: 'Declare a script parameter with a default and units. `opts: { unit, min?, max? }`.' },
  { name: 'union', signature: '(...shapes) => Shape', description: 'Boolean union of two or more shapes.' },
  { name: 'helix', signature: '({ radius, pitch, turns, axis?, pointsPerTurn?, startAngle? }) => [number, number, number][]', description: 'Polyline helix rail for `Sketch.sweep`. Default axis Z, 32 points per turn.' },
  { name: 'selectEdges', signature: '(shape, query?) => Promise<EdgeSegment[]>', description: 'Pre-select edges by EdgeQuery. Awaitable; lowers the shape lazily.' },
  { name: 'selectEdge', signature: '(shape, query) => Promise<EdgeSegment>', description: 'Like selectEdges but throws if zero or multiple edges match. Use for unambiguous single-edge selection.' },
];

const SHAPE_METHODS: ApiEntry[] = [
  { name: 'translate', signature: '(x, y, z) => Shape', description: 'Translate by (x, y, z).' },
  { name: 'rotate', signature: '(axis, degrees, pivot?) => Shape', description: 'Rotate `degrees` around `axis` (vector); pivot defaults to origin.' },
  { name: 'scale', signature: '(sx, sy?, sz?) => Shape', description: 'Scale uniformly (single arg) or per-axis. Note: kernel currently uses uniform scale internally.' },
  { name: 'union', signature: '(...others) => Shape', description: 'Boolean union with one or more shapes.' },
  { name: 'subtract', signature: '(...others) => Shape', description: 'Boolean difference (this minus others).' },
  { name: 'intersect', signature: '(...others) => Shape', description: 'Boolean intersection.' },
  { name: 'fillet', signature: '(radius, edges?: EdgeSelector) => Shape', description: 'Round edges. `edges` accepts EdgeQuery, EdgeSegment[], `{face: name|query}`, or undefined (all sharp edges).' },
  { name: 'chamfer', signature: '(distance, edges?: EdgeSelector) => Shape', description: 'Bevel edges. Same selector shape as fillet.' },
  { name: 'shell', signature: '(thickness, { face: FaceSelector }) => Shape', description: 'Hollow the solid removing the named face. `face` accepts canonical name, label, or FaceQuery.' },
  { name: 'reflect', signature: `(plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset: number }) => Shape`, description: 'Reflect (pure rigid-body transformation) across a cardinal plane or an offset parallel plane. Volume is unchanged; handedness is flipped.' },
  { name: 'mirror', signature: `(plane: 'xy' | 'xz' | 'yz' | { plane: 'xy' | 'xz' | 'yz'; offset: number }) => Shape`, description: 'Boolean union of the source and its reflection across a cardinal plane. Produces a symmetric part. For pure reflection without union, use reflect().' },
  { name: 'lower', signature: '() => Promise<OcctBackend>', description: 'Eagerly lower this Shape for inspection. Used internally by selectEdges; agents rarely call directly.' },
];

const SKETCH_METHODS: ApiEntry[] = [
  { name: 'extrude', signature: '(depth) => Shape', description: 'Extrude this closed sketch normal to its plane by `depth` (mm).' },
  { name: 'revolve', signature: '() => Shape', description: 'Revolve 360 degrees around the Z axis. Profile coords are (radial-X, axial-Z); all x >= 0.' },
  { name: 'sweep', signature: '(rail, opts?: { frenet? }) => Shape', description: 'Sweep this profile along a 3D polyline rail. `frenet: true` for helices/curves; default false for straight/L-bend rails.' },
  { name: 'loft', signature: '(other: Sketch | Sketch[], opts?: { spacing?, planes?, ruled?, startPoint?, endPoint? }) => Shape', description: 'Loft this profile through one or more additional sections to produce a 3D solid that smoothly interpolates between them. Use for nozzles (round-to-square), wings/airfoils, fairings, transition pieces. `opts.spacing` z-stacks sections axially; `opts.planes` overrides with explicit per-section placement.' },
  { name: 'reflect', signature: `(axis: 'x' | 'y' | { axis: 'x' | 'y'; offset: number }) => Sketch`, description: "Reflect this sketch's path across an axis, returning a new Sketch. 'x' negates y-coords; 'y' negates x-coords; { axis, offset } reflects across the parallel axis at the given offset. Arc winding (signed sagitta/bulge/radius) is inverted automatically. Labels are preserved." },
];

const PATH_BUILDER_METHODS: ApiEntry[] = [
  { name: 'moveTo', signature: '(x, y) => PathBuilder', description: 'Start the path at (x, y). Required first call.' },
  { name: 'lineTo', signature: '(x, y) => PathBuilder', description: 'Add a straight line segment to (x, y).' },
  { name: 'tangentArc', signature: '(x, y) => PathBuilder', description: 'Arc continuing tangent from the previous segment to (x, y). Requires a prior segment.' },
  { name: 'threePointsArc', signature: '(x, y, midX, midY) => PathBuilder', description: 'Arc through start, midpoint, and end. No prior tangent required.' },
  { name: 'sagittaArc', signature: '(x, y, sagitta) => PathBuilder', description: 'Arc by chord + perpendicular bulge height. Sign chooses bulge side.' },
  { name: 'bulgeArc', signature: '(x, y, bulge) => PathBuilder', description: 'Arc by chord + DXF bulge factor (tan(angle/4)).' },
  { name: 'radiusArc', signature: '(x, y, radius) => PathBuilder', description: 'Arc by chord + explicit radius. Always minor arc; sign chooses bulge side.' },
  { name: 'label', signature: '(name) => PathBuilder', description: 'Tag the previous segment so it can be referenced later in fillet/chamfer/shell as `{face: name}`.' },
  { name: 'close', signature: '() => Sketch', description: 'Close the path; returns a Sketch that can be extruded/revolved/swept.' },
];

export async function listApiTool(input: ListApiInput = {}): Promise<ListApiOutput> {
  void input;
  return {
    ok: true,
    globals: GLOBALS,
    shapeMethods: SHAPE_METHODS,
    sketchMethods: SKETCH_METHODS,
    pathBuilderMethods: PATH_BUILDER_METHODS,
    edgeQueryKeys: EDGE_QUERY_KEYS,
    faceQueryKeys: FACE_QUERY_KEYS,
  };
}
