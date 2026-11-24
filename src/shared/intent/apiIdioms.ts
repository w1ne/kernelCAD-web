// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/intent/apiIdioms.ts
//
// Names an author tends to reach for from other scripting CAD vocabularies
// ("workplane", "arcTo", "polarArray", ">Z"), each mapped to the kernelCAD way
// to say the same thing. One table feeds two readers: `lookup_api` (a query
// such as "polar array" surfaces the pattern entry) and the script-runtime
// diagnostic for `x.arcTo is not a function` (the hint names the real method).
//
// An alias is matched on its compact form (lower case, letters and digits
// only), so `cboreHole`, `cbore_hole` and "cbore hole" are the same alias.
// Aliases shorter than four characters match whole words only.

export interface ApiIdiom {
  /** Stable slug. */
  id: string;
  /** What the author may type or ask for. */
  aliases: readonly string[];
  /** The kernelCAD way, one or two sentences. */
  use: string;
  /** A fragment that evaluates, in the same words as `use`. */
  example: string;
  /** Names of `lookup_api` entries that carry the full signature. */
  entries: readonly string[];
}

export const API_IDIOMS: readonly ApiIdiom[] = [
  {
    id: 'workplane',
    aliases: ['workplane', 'work plane', 'sketch on face', 'on plane', 'new sketch', 'sketch plane'],
    use: 'There is no current-plane stack. Profiles are drawn with path() in XY and extruded along +Z; to land a feature on a face, name the face: hole(face, ...), holes(face, ...), cutout(profile, { face, depth }). For another plane, build in XY and rotate (rotateX(90) turns the XY profile into the XZ plane, extruding toward -Y).',
    example: "path().moveTo(0, 0).lineTo(40, 0).lineTo(40, 20).lineTo(0, 20).close().extrude(5).rotateX(90)",
    entries: ['path', 'extrude', 'cutout', 'hole', 'holes', 'rotateX'],
  },
  {
    id: 'string-selectors',
    aliases: ['selector', 'selectors', 'string selector', 'face selector', 'edge selector'],
    use: "Selection is by query object, not by selector string. Faces: a canonical name ('top', 'bottom', 'front', 'back', 'left', 'right') or a FaceQuery: { byNormal: 'Z', extreme: 'Z' } is the highest upward-facing face, { atZ: 10 } the face at that height. Edges: selectEdges(body, { parallel: 'Z' }) are the vertical edges, { atZ: h } the edges at a height, { perpendicular: 'Z' } the horizontal ones, { ofCurveType: 'CIRCLE' } the round ones; select(edges).sortBy('Z').last is the topmost.",
    example: "const vertical = await selectEdges(body, { parallel: 'Z' }); const topFace = { byNormal: 'Z', extreme: 'Z' };",
    entries: ['selectEdges', 'select', 'faces', 'edges'],
  },
  {
    id: 'edges-of-a-face',
    aliases: ['faces edges', 'face edges', 'edges of face', 'vertices', 'faces'],
    use: "The edges of one face: pass the face to the operation, .fillet(r, { face: 'top' }) / .chamfer(d, { face: 'top' }) (a name or a FaceQuery); or list them with selectEdges(body, { ofFace: { byNormal: 'Z', extreme: 'Z' } }).",
    example: "body.chamfer(1, { face: { byNormal: 'Z', extreme: 'Z' } })",
    entries: ['fillet', 'chamfer', 'selectEdges'],
  },
  {
    id: 'fillet-chamfer-by-selector',
    aliases: ['fillet', 'chamfer', 'round edges', 'break edges', 'bevel'],
    use: 'fillet(radius, edges) and chamfer(distance, edges) take the edges as the second argument (a query, a selectEdges() list, or { face }); with no second argument they act on every edge. Do the rounding before the boolean that splits the face you name afterwards, and keep radius under half the wall.',
    example: "const e = await selectEdges(body, { parallel: 'Z' }); const rounded = body.fillet(3, e);",
    entries: ['fillet', 'chamfer', 'selectEdges'],
  },
  {
    id: 'shell',
    aliases: ['shell', 'hollow', 'thicken wall', 'open face'],
    use: "shell(thickness, { face }) hollows the body inward with a POSITIVE wall thickness and leaves the named face open: box(30, 30, 20).shell(2, { face: 'top' }). Use { closed: true } instead of { face } to keep every face and leave a sealed internal cavity.",
    example: "box(30, 30, 20).shell(2, { face: 'top' })",
    entries: ['shell'],
  },
  {
    id: 'counterbore-countersink-hole',
    aliases: ['cborehole', 'cskhole', 'cbore', 'csk', 'counterbored hole', 'countersunk hole', 'hole', 'cutthruall', 'cutblind', 'drill'],
    use: "One call per hole size: body.hole(face, { u, v, diameter, depth: 'through' | mm, counterbore: { diameter, depth }, countersink: { diameter, angleDeg } }). u and v are offsets from the CENTRE of the face, not world coordinates. A different diameter per hole needs one hole()/holes() call per size.",
    example: "plate.hole('top', { u: 10, v: 0, diameter: 4, depth: 'through', counterbore: { diameter: 8, depth: 3 } })",
    entries: ['hole', 'holes', 'threadedHole'],
  },
  {
    id: 'point-arrays',
    aliases: ['pushpoints', 'rarray', 'polararray', 'grid points', 'hole pattern', 'bolt circle', 'array of holes', 'distribute'],
    use: 'Compute the positions in plain JS and pass them as positions: [{ u, v }, ...] to one holes() call (a rectangular array is two nested maps; a bolt circle is Math.cos / Math.sin of the angle). Repeated bodies use patternLinear({ count, direction, spacing }), patternGrid({ x, y }) and patternCircular({ count, axis: [0, 0, 1] }).',
    example: "plate.holes('top', { positions: [0, 90, 180, 270].map((a) => ({ u: 20 * Math.cos(a * Math.PI / 180), v: 20 * Math.sin(a * Math.PI / 180) })), diameter: 4, depth: 'through' })",
    entries: ['holes', 'patternLinear', 'patternGrid', 'patternCircular'],
  },
  {
    id: 'extrude-both-directions',
    aliases: ['both', 'symmetric', 'extrude both', 'midplane', 'centered extrude', 'both sides'],
    use: 'extrude(depth, { symmetric: true }) grows the profile half the depth each way from its plane. box(x, y, z, true) is centred on all three axes; cylinder() has no centred flag (translate it down by half its height, or extrude a circle symmetrically).',
    example: 'path().circle(0, 0, 5).extrude(30, { symmetric: true })',
    entries: ['extrude', 'box', 'cylinder'],
  },
  {
    id: 'revolve',
    aliases: ['revolve', 'lathe', 'spin', 'revolve axis', 'axisstart'],
    use: 'Draw the profile with x as the radius and y as the height (x >= 0), then .revolve({ angleDeg }) turns it about the Z axis; the angle is an option, not a positional argument. Rotate the result for another axis.',
    example: 'path().moveTo(0, 0).lineTo(10, 0).lineTo(10, 20).lineTo(0, 20).close().revolve({ angleDeg: 180 })',
    entries: ['revolve'],
  },
  {
    id: 'path-arcs',
    aliases: ['arcto', 'arc', 'threepointarc', 'tangentarcpoint', 'arcpoint', 'circlearc', 'fillet2d', 'round corner'],
    use: 'Path arcs: threePointsArc(x, y, midX, midY) through a middle point, radiusArc(x, y, radius), sagittaArc(x, y, sagitta) (positive bulges to the left of the direction of travel), bulgeArc(x, y, bulge), tangentArc(x, y). A whole circle is path().circle(cx, cy, r); rounded corners of a rectangle are extrudeRoundedRect(w, h, r, depth).',
    example: 'path().moveTo(0, 0).lineTo(10, 0).threePointsArc(10, 10, 13, 5).close().extrude(3)',
    entries: ['threePointsArc', 'radiusArc', 'sagittaArc', 'bulgeArc', 'tangentArc', 'circle'],
  },
  {
    id: 'slot',
    aliases: ['slot', 'slot2d', 'slot profile', 'obround', 'stadium', 'elongated hole'],
    use: "path().slot(cx, cy, { width, centerDistance }) is a closed stadium profile centred on (cx, cy), length along +X (angleDeg turns it). centerDistance is between the two arc centres; give length instead for the overall end-to-end length. Cut it with cutout(profile, { face, depth }) (profile coordinates are measured from the face centre) or extrude it and subtract.",
    example: "plate.cutout(path().slot(0, 0, { width: 10, centerDistance: 20 }), { face: 'top', depth: 'through' })",
    entries: ['slot', 'cutout'],
  },
  {
    id: 'polygon',
    aliases: ['polygon', 'ngon', 'regular polygon', 'hexagon', 'polyline'],
    use: 'extrudePolygon(points, depth) takes any [x, y] outline; a regular n-gon of circumradius R is Array.from({ length: n }, (_, i) => [R * Math.cos(2 * Math.PI * i / n), R * Math.sin(2 * Math.PI * i / n)]). A path() with lineTo calls and close() is the same outline as a Sketch.',
    example: 'extrudePolygon(Array.from({ length: 6 }, (_, i) => [5 * Math.cos(Math.PI / 3 * i), 5 * Math.sin(Math.PI / 3 * i)]), 4)',
    entries: ['extrudePolygon', 'path'],
  },
  {
    id: 'mirror',
    aliases: ['mirror', 'mirrory', 'mirrorx', 'symmetry', 'reflect'],
    use: "shape.mirror('yz' | 'xz' | 'xy' | { plane, offset }) returns the source PLUS its reflection as one shape; .reflect(plane) returns the reflection only.",
    example: "ear.union(ear.mirror({ plane: 'yz', offset: 30 }))",
    entries: ['mirror', 'reflect'],
  },
  {
    id: 'booleans',
    aliases: ['cut', 'combine', 'cutwith', 'intersect', 'add', 'merge', 'fuse', 'boolean'],
    use: 'a.union(b), a.subtract(b), a.intersect(b), or the n-ary global union(a, b, c). The operands must really overlap (0.1 mm or more); cut tools should run past the faces they cut. To cut one body at an infinite plane, use splitByPlane rather than subtracting a box.',
    example: 'box(20, 20, 5).subtract(cylinder(7, 3).translate(10, 10, -1))',
    entries: ['union', 'subtract', 'intersect', 'splitByPlane'],
  },
  {
    id: 'split-by-plane',
    aliases: ['split body', 'cut in half', 'half space', 'section body', 'split at plane', 'plane cut'],
    use: "shape.splitByPlane([nx, ny, nz], offset) returns [positive, negative]. positive is the material where dot(point, normal) >= offset. The plane is infinite and the normal need not be unit length. Both halves are ordinary Shapes; a plane that misses the body fails the empty half at lower time.",
    example: 'const [upper, lower] = box(40, 30, 20).splitByPlane([0, 0, 1], 8);',
    entries: ['splitByPlane', 'split'],
  },
  {
    id: 'transforms',
    aliases: ['moved', 'located', 'translate vector', 'move', 'rotate about axis', 'rotate axis'],
    use: 'translate(x, y, z) (a single [x, y, z] array also works), rotateX / rotateY / rotateZ(degrees, pivot?), rotate([ax, ay, az], degrees, pivot?) about an axis direction through the pivot (default origin).',
    example: 'shape.translate([10, 0, 5]).rotateZ(45)',
    entries: ['translate', 'rotate', 'rotateX', 'rotateY', 'rotateZ'],
  },
  {
    id: 'loft-sweep-twist',
    aliases: ['loft', 'sweep', 'twistextrude', 'taper', 'extrude taper', 'ruled'],
    use: 'sketchA.loft(sketchB, { spacing }) blends two profiles placed `spacing` mm apart along Z; sketch.sweep(rail, { spine: "smooth" }) follows a polyline or curve; sketch.extrude(depth, { twistAngle, taperDeg }) twists or tapers while extruding.',
    example: 'path().circle(0, 0, 20).loft(path().moveTo(-15, -15).lineTo(15, -15).lineTo(15, 15).lineTo(-15, 15).close(), { spacing: 40 })',
    entries: ['loft', 'sweep', 'extrude'],
  },
  {
    id: 'text',
    aliases: ['text', 'engrave', 'emboss', 'label'],
    use: 'sketch.text("KERNEL", { size, align, position }) returns a Sketch of glyph outlines; extrude it and union (raised) or subtract (engraved).',
    example: "sketch.text('KC', { size: 10, align: 'center', position: [0, 0] }).extrude(1)",
    entries: ['sketch', 'embossText'],
  },
  {
    id: 'spline',
    aliases: ['spline', 'bezier', 'smooth curve', 'interpolate'],
    use: 'path().spline([[x, y], ...]) is a smooth curve through the points inside a profile; the first point must equal the current pen position. spline3d(points) and bezier(points) make 3D rails for sweeps.',
    example: 'path().moveTo(0, 0).spline([[0, 0], [10, 5], [20, 0]]).lineTo(20, -5).lineTo(0, -5).close()',
    entries: ['spline', 'spline3d', 'bezier'],
  },
  {
    id: 'offset-2d',
    aliases: ['offset2d', 'offset', 'inset', 'outset', 'wire offset'],
    use: "await sketch.offset(distance, { corners: 'round' | 'sharp' }) grows (positive) or shrinks (negative) a profile; a rim is outline.subtract(inset).",
    example: 'const inner = await outline.offset(-5); const rim = await outline.subtract(inner);',
    entries: ['offset'],
  },
  {
    id: 'assembly',
    aliases: ['assembly', 'constrain', 'constraint', 'mate', 'joint'],
    use: "assembly().part(name, shape) registers parts; connectors mark where they meet and mate(name, a, b, 'fastened' | 'revolute' | 'prismatic' | ..., { limitsDeg }) relates them. Return assembly.model() or solvedModel().",
    example: "assembly('rig').part('base', base).part('arm', arm)",
    entries: ['assembly'],
  },
  {
    id: 'export',
    aliases: ['exporters', 'export stl', 'export step', 'show object', 'show_object', 'result'],
    use: "A script does not export; it RETURNS one Shape (or assembly.model()). Export from the CLI (kernelcad export stl|step|dxf|3mf|glb <file> -o <out>) or the MCP export tool.",
    example: 'return body;',
    entries: [],
  },
  {
    id: 'origin-and-centering',
    aliases: ['center', 'centered', 'origin', 'recenter', 'centre'],
    use: 'box() is corner-anchored at the origin (box(x, y, z, true) is centred on all axes); cylinder() stands on z = 0 centred in X/Y. await shape.recenter() moves the bounding-box centre to the origin; a following translate() then places the CENTRE.',
    example: 'const part = (await box(10, 20, 30).recenter()).translate(50, 0, 0);',
    entries: ['box', 'cylinder', 'recenter'],
  },
];

/** Lower case, letters and digits only. */
export function compactName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function wordSet(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/** Selector strings such as ">Z", "|X", "#Z", "%CIRCLE" or faces(">Z"). */
const SELECTOR_STRING = /["'`]\s*[<>|#%+-]\s*[XYZxyz]|["'`]\s*%[A-Za-z]+/;

function aliasMatches(alias: string, compactQuery: string, words: ReadonlySet<string>): boolean {
  const c = compactName(alias);
  if (c.length === 0) return false;
  if (c.length < 4) return words.has(c);
  return compactQuery.includes(c);
}

/**
 * Idioms whose aliases occur in `query`, best first (more specific, i.e.
 * longer, alias wins). Empty for a blank query.
 */
export function matchApiIdioms(query: string, limit = 4): ApiIdiom[] {
  const q = query.trim();
  if (q === '') return [];
  const compactQuery = compactName(q);
  const words = wordSet(q);
  const scored: Array<{ idiom: ApiIdiom; score: number }> = [];
  for (const idiom of API_IDIOMS) {
    let score = 0;
    for (const alias of idiom.aliases) {
      if (aliasMatches(alias, compactQuery, words)) score = Math.max(score, compactName(alias).length);
    }
    if (idiom.id === 'string-selectors' && SELECTOR_STRING.test(q)) score = Math.max(score, 12);
    if (score > 0) scored.push({ idiom, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.idiom);
}

/**
 * The idiom for a member name that does not exist (`arcTo`, `polarArray`):
 * an exact compact match on an alias only, so a typo of a real name is left
 * to the near-name suggestion instead.
 */
export function idiomForMissingName(name: string): ApiIdiom | undefined {
  const c = compactName(name);
  if (c.length === 0) return undefined;
  return API_IDIOMS.find((i) => i.aliases.some((a) => compactName(a) === c));
}
