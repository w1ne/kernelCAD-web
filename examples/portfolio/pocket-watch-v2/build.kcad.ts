// Vision-driven rebuild of the pop-art octagonal pocket-watch.
//
// Started from the reference photo (/tmp/royal-pop-reddit.png) as the FIRST
// input. Reference analysis lives in _reference-analysis.md (same dir).
//
// Key calls vs. the earlier pocket-watch (v0.7) build:
// - sculpted "horn → tab" pendant integrated with the case top (not a bare
//   crown nub with a Mickey-Mouse ring floating above it)
// - flatter, larger crystal so the dome glass actually reads
// - crown on the SIDE of the pendant (not the top axis)
// - bail = slim revolved torus with the through-hole facing the camera
// - vertical extent kept modest so the iso framing centres on the watch body
//
// Iteration log lives in the PR body. Each commit is a single focused change.
//
// Coordinate convention (matches the v0.7 build):
//   Z-up, right-handed. Front view looks from -Y toward +Y, so the
//   **smallest Y = closest to the camera**. The dial faces -Y; any element
//   drawn "on" the dial sits at Y SMALLER than the dial's front face.

// =============================================================================
// Dimensions (mm)
// =============================================================================
const FRAME_FLAT = 11.0;          // half flat-to-flat of pink octagon (22 mm full)
const FRAME_DEPTH = 7.0;          // Y thickness of frame
const CASE_FLAT = 8.5;            // half flat-to-flat of yellow octagon
const CASE_DEPTH = 6.5;           // Y thickness of case
const DIAL_RADIUS = 6.5;          // teal dial radius
const DIAL_DEPTH = 1.5;
const SUBDIAL_R = 1.9;
const SUBDIAL_CX = DIAL_RADIUS * 0.5;     // subdial offset to the right
const SUBDIAL_CZ = -DIAL_RADIUS * 0.18;   // and a hair below dial-centre

// Y-axis layout: front=camera side, back=deepest.
const CASE_Y_FRONT = -CASE_DEPTH / 2;          // -3.25
const DIAL_POCKET_DEPTH = 2.0;
const DIAL_Y_BACK = CASE_Y_FRONT + DIAL_POCKET_DEPTH;  // -1.25
const DIAL_Y_FRONT = DIAL_Y_BACK - DIAL_DEPTH;          // -2.75

const STICK_THICK_Y = 0.3;
const STICK_Y_BACK = DIAL_Y_FRONT;
const STICK_Y_FRONT = STICK_Y_BACK - STICK_THICK_Y;

const SUBRING_THICK = 0.45;
const SUBRING_Y_BACK = DIAL_Y_FRONT;
const SUBRING_Y_FRONT = SUBRING_Y_BACK - SUBRING_THICK;
const SUBFACE_THICK = 0.3;
const SUBFACE_Y_BACK = SUBRING_Y_FRONT + 0.04;
const SUBFACE_Y_FRONT = SUBFACE_Y_BACK - SUBFACE_THICK;
const SUBHAND_THICK = 0.14;
const SUBHAND_Y_BACK = SUBFACE_Y_FRONT;

const HOUR_HAND_THICK = 0.35;
const HOUR_HAND_Y_BACK = STICK_Y_FRONT - 0.08;
const HOUR_HAND_Y_FRONT = HOUR_HAND_Y_BACK - HOUR_HAND_THICK;
const MIN_HAND_THICK = 0.35;
const MIN_HAND_Y_BACK = HOUR_HAND_Y_FRONT - 0.06;
const MIN_HAND_Y_FRONT = MIN_HAND_Y_BACK - MIN_HAND_THICK;
const PIN_THICK = 0.4;
const PIN_Y_BACK = MIN_HAND_Y_FRONT - 0.04;

// Crystal: rim sits in front of bezel, apex bulges further toward camera.
// Rim distance from bezel front is sized so the dome shell (after thicken)
// clears the pinion cap which sticks furthest forward of any dial-side part.
const CRYSTAL_BASE_Y = CASE_Y_FRONT - 1.4;     // rim 1.4 mm in front of bezel
const CRYSTAL_THICK = 0.3;
const CRYSTAL_RISE = 2.2;                       // taller dome so the arch reads in the render

// Top of the frame in Z (top flat of the octagon, the edge the pendant grows out of).
const FRAME_TOP_Z = FRAME_FLAT;                // 11.0
// (Frame corners reach above the flat to z = FRAME_FLAT / cos(22.5°) ≈
// 11.91. Anything sitting at z ∈ [FRAME_FLAT, 11.91] visually merges
// with the octagon corners; the pendant extends well beyond ~12 mm.)


// Pendant: one taller sculpted block (horn) that reads as the sculpted neck
// rising above the octagon. Authored as a single trapezoid that starts well
// below the frame top (overlap so the union fuses) and reaches up to where
// the bail's bottom tube touches.
// Horn BASE matches the frame's top-flat width: the octagon's top flat
// runs in X from -FRAME_FLAT*tan(22.5°) to +FRAME_FLAT*tan(22.5°) (≈
// ±4.55 mm). We use the FULL diagonal span between the two top corners
// (±FRAME_FLAT/cos(22.5°) ≈ ±11.91 in X is the octagon corners; the top
// flat is between corners at (±4.55, 11)). Setting HORN_BASE_W_X to
// 2*FRAME_FLAT*tan(22.5°) = the top-flat width means the horn's bottom
// face perfectly overlies the frame's top flat — the union seam becomes
// invisible.
const FRAME_TOP_FLAT_HALF = FRAME_FLAT * Math.tan(Math.PI / 8);   // ~4.55 mm
const HORN_BASE_W_X = FRAME_TOP_FLAT_HALF * 2;                     // ~9.1 mm
const HORN_TOP_W_X = 5.0;
const HORN_DEPTH_Y = FRAME_DEPTH;                                  // match frame depth so horn bottom = frame top in Y too
// Horn base sits flush ON the frame's top flat (no overlap, since the
// flat IS the horn's bottom). The horn rises from there.
const HORN_BASE_Z = FRAME_TOP_Z - 0.05;       // hair below for clean fuse
const HORN_TOP_Z = 17.5;                      // taller sculpted pendant — the reference's pendant reads about 30% as tall as the body, not 10%
const HORN_HEIGHT_Z = HORN_TOP_Z - HORN_BASE_Z;

// Tab is folded into the horn (single shape). The bail attaches at the
// very top of the horn — see BAIL_CENTER_Z below.


// Crown sits on TOP of the pendant horn (between horn top and bail).
const CROWN_FLAT = 0.9;
const CROWN_LEN = 1.2;

// Bail — sits above the crown. Tube outer surface bottom kisses the crown
// top with a small clearance.
const BAIL_MAJOR_R = 1.7;
const BAIL_TUBE_R = 0.45;
const BAIL_CENTER_Z = HORN_TOP_Z + CROWN_LEN + 0.03 + BAIL_MAJOR_R + BAIL_TUBE_R;

// Strap omitted in iter 1+: it stretched the bbox vertically and the
// camera-fitter pushed the watch body into the corner. The real-world strap
// loops through the bail; we'll add it back only if a future iteration
// converges enough to spare the composition budget.

// =============================================================================
// Helpers
// =============================================================================

// Y-aligned cylinder. yMax = the +Y endcap (deepest into case); the visible
// face -Y endcap = yMax - depth.
function cylY(depth, radius, yMax = 0, segments = 96) {
  return cylinder(depth, radius, segments)
    .alongAxis([0, 1, 0])
    .translate(0, yMax - depth, 0);
}

// Octagonal prism along Y (flat-top orientation), centered on Y=0.
// Matches the v0.7 build's translate(-depth/2) which empirically produced
// a case centred on Y=0 in the rendered scene.
function octagonPrismY(flat, depth) {
  const r = flat / Math.cos(Math.PI / 8);
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 8) + i * (Math.PI / 4);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return extrudePolygon(pts, depth)
    .rotate([1, 0, 0], -90)
    .translate(0, -depth / 2, 0);
}

// Vertices (in XZ) of a regular flat-top octagon at `radius` from origin.
function octagonVertices(radius) {
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 8) + i * (Math.PI / 4);
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return pts;
}

// (A trapezoidPrismY helper lived here in earlier iterations; the
// final build uses a 3-section roundedRectSketch loft for the horn
// instead — see the FRAME block below.)

// Flat 2D text on the dial face. frontFaceY = the Y of the rear face of the
// glyph (closest-to-dial side).
function faceText(value, size, x, z, frontFaceY, color) {
  const t = 0.4;
  return sketch.text(value, { size, align: 'center', position: [0, 0] })
    .extrude(t)
    .rotate([1, 0, 0], 90)
    .translate(x, frontFaceY + t, z - size * 0.36)
    .color(color);
}

// =============================================================================
// Renderer setup — HDRI environment + camera framing
// =============================================================================
//
// HDRI environment lights up transmissive materials. Without an explicit
// setRenderEnvironment, the sapphire dome's transmission renders flat — the
// dial shows through but there is no specular streak that sells "glass with
// a reflection". Use the 'studio' preset (studio_small_03_1k.hdr, ~1.7MB)
// which has a discrete key softbox + dark surroundings, exactly what a
// curved sapphire crystal needs to pick up a single bright highlight.
setRenderEnvironment({ preset: 'studio', intensity: 1.0 });

// Override the camera target. The default behaviour aims at the bbox
// centroid; the pendant + bail above the dial pull the centroid up, so
// auto-fit zooms out to fit the tall+narrow bbox, which reads as a
// small watch sitting in the upper-right with too much background. Aim
// at the world origin (which lands at the dial centre after geometry
// recentering) so the dial reads as the visual centre of the frame.
setCameraTarget(0, 0, 0);

// =============================================================================
// Assembly
// =============================================================================

const watch = assembly('pop-art octagonal pocket watch');

// FRAME (pink) — outer octagon with a pocket for the case, the pendant horn
// and tab fused on top, the bail hole through the tab.
//
// Material rule: `.material()` on the union/subtract HEAD is a no-op. The
// renderer's lookupSourceMaterial walks UP the chain. Apply the pink PBR
// to every LEAF primitive that contributes mass to the final shape so the
// lookup finds it. (The case-pocket cutter doesn't need it — it's negative
// mass, removed from the output.)
const PINK_MAT = {
  baseColor: '#ff9aa3',
  metalness: 0,
  roughness: 0.45,
};
const frameOctagon = octagonPrismY(FRAME_FLAT, FRAME_DEPTH).material(PINK_MAT);
const casePocket = octagonPrismY(CASE_FLAT + 0.6, FRAME_DEPTH + 2.0);
// Horn as a multi-section LOFT through rounded-rectangle cross-sections.
// Rectangular sections produce sharp rectangular shoulders (the v2 honest
// verdict's biggest authoring-gap); replacing them with rounded-corner
// "stadium-ish" sections via path.tangentArc gives the horn the soft
// curved-shoulder profile visible in the reference photo.
//
// Three sections stacked along Z make the horn neck:
//   - base (wider): matches the frame top flat in X, slightly narrower in Y
//   - waist (narrowest): forms the "necking" pinch ~60% up
//   - top (narrow oval): meets the crown
const HORN_BASE_W   = HORN_BASE_W_X;            // X width at base
const HORN_BASE_D   = HORN_DEPTH_Y * 0.92;      // Y depth at base
const HORN_BASE_R   = 1.4;                       // base corner radius (mm)
const HORN_WAIST_W  = HORN_TOP_W_X * 0.72;      // narrowest mid-pinch — tighter waist
const HORN_WAIST_D  = HORN_DEPTH_Y * 0.70;
const HORN_WAIST_R  = 1.4;
const HORN_TOP_W    = HORN_TOP_W_X * 0.95;      // hair narrower top so the necking reads
const HORN_TOP_D    = HORN_DEPTH_Y * 0.80;
const HORN_TOP_R    = 1.5;
const HORN_WAIST_Z  = HORN_BASE_Z + HORN_HEIGHT_Z * 0.65;

// Rounded-rectangle 2D sketch via 4 tangent arcs at the corners. (path's
// tangentArc requires a prior straight segment to set the tangent; we
// stitch line → arc → line → arc... around the perimeter.) Centred at
// origin in the XY plane.
function roundedRectSketch(w, d, r) {
  // Clamp radius to half the smaller side so arcs don't self-intersect.
  const rr = Math.min(r, w / 2 - 0.05, d / 2 - 0.05);
  const hw = w / 2, hd = d / 2;
  return path()
    .moveTo(-hw + rr, -hd)
    .lineTo( hw - rr, -hd)
    .tangentArc( hw, -hd + rr)
    .lineTo( hw,  hd - rr)
    .tangentArc( hw - rr,  hd)
    .lineTo(-hw + rr,  hd)
    .tangentArc(-hw,  hd - rr)
    .lineTo(-hw, -hd + rr)
    .tangentArc(-hw + rr, -hd)
    .close();
}

const sectionLower = roundedRectSketch(HORN_BASE_W, HORN_BASE_D, HORN_BASE_R);
const sectionWaist = roundedRectSketch(HORN_WAIST_W, HORN_WAIST_D, HORN_WAIST_R);
const sectionUpper = roundedRectSketch(HORN_TOP_W, HORN_TOP_D, HORN_TOP_R);

// 3-section loft along +Z. Each section is placed on its own XY plane at
// the right Z height. Loft engine sweeps a NURBS surface between sections.
const horn = sectionLower
  .loft([sectionWaist, sectionUpper], {
    planes: [
      { normal: [0, 0, 1], origin: [0, 0, HORN_BASE_Z] },
      { normal: [0, 0, 1], origin: [0, 0, HORN_WAIST_Z] },
      { normal: [0, 0, 1], origin: [0, 0, HORN_TOP_Z] },
    ],
  })
  .material(PINK_MAT);

// No global fillet on the combined body — the horn/tab/frame seams create
// non-G1 edges that the OCCT fillet engine refuses. We accept a hard edge at
// the horn-frame junction for now; a future iteration can use named-edge
// selection to fillet only the safe outer corners.
const pinkBody = frameOctagon
  .subtract(casePocket)
  .union(horn);

const frame = watch.part('pink octagonal frame with sculpted pendant', pinkBody);

// CASE (yellow) — inner octagon with dial pocket and screw counterbores.
const YELLOW_MAT = {
  baseColor: '#f0d24a',
  metalness: 0.25,
  roughness: 0.4,
};
const caseRaw = octagonPrismY(CASE_FLAT, CASE_DEPTH).material(YELLOW_MAT);
const dialPocket = cylY(DIAL_POCKET_DEPTH + 0.3, DIAL_RADIUS + 0.25, DIAL_Y_BACK + 0.3);

const SCREW_VERT_R = CASE_FLAT * 0.93;
const SCREW_R = 0.85;
const SCREW_CB_DEPTH = 0.8;
const screwVerts = octagonVertices(SCREW_VERT_R);
let caseBored = caseRaw.subtract(dialPocket);
for (const [x, z] of screwVerts) {
  const cb = cylY(SCREW_CB_DEPTH + 0.3, SCREW_R + 0.25, CASE_Y_FRONT + SCREW_CB_DEPTH)
    .translate(x, 0, z);
  caseBored = caseBored.subtract(cb);
}
// Case: warm mustard yellow with a slight brushed-metal sheen (material
// applied at the caseRaw leaf above; the post-boolean .material() would be
// a no-op).
const caseFinal = watch.part('yellow octagonal case', caseBored);
watch.fixed('case nested into frame pocket', frame, caseFinal, { origin: [0, 0, 0] });

// HEX SCREWS — flat-black hex heads seated at each case vertex.
const SCREW_HEAD_T = 0.35;
function hexHead(x, z) {
  const pts = [];
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    pts.push([Math.cos(a) * SCREW_R, Math.sin(a) * SCREW_R]);
  }
  return extrudePolygon(pts, SCREW_HEAD_T)
    .rotate([1, 0, 0], -90)
    .translate(x, CASE_Y_FRONT + 0.03, z)
    .color('#1c1c1e');
}
for (let i = 0; i < screwVerts.length; i += 1) {
  const [x, z] = screwVerts[i];
  const screw = watch.part(`bezel hex screw ${i}`, hexHead(x, z));
  watch.fixed('screw seated in case counterbore', caseFinal, screw, { origin: [x, CASE_Y_FRONT, z] });
}

// SIDE SCREWS — two horizontal hex heads on the pendant's ±X faces. The
// reference photo shows a small dark hex screw on each side of the
// pendant's lower-shoulder (the widest part of the horn). We reuse the
// bezel SCREW_R / SCREW_HEAD_T size for consistency, then orient the
// hex prism so its axis lies along X (perpendicular to the pendant's
// side face), with the head facing outward.
const PENDANT_SCREW_R = SCREW_R * 0.95;                          // about the same size as the bezel screws
const PENDANT_SCREW_T = SCREW_HEAD_T;
const PENDANT_SCREW_Z = HORN_BASE_Z + HORN_HEIGHT_Z * 0.22;     // low on the shoulder, where the reference shows them
// The horn's X half-width at PENDANT_SCREW_Z. Linearly interpolating
// between base and waist (62% of height) gives an approximation good
// enough for seating the head flush against the side face.
const SHOULDER_T = (HORN_BASE_Z + HORN_HEIGHT_Z * 0.30 - HORN_BASE_Z) / (HORN_WAIST_Z - HORN_BASE_Z);
const PENDANT_X_HALF = HORN_BASE_W * 0.5 + SHOULDER_T * (HORN_WAIST_W * 0.5 - HORN_BASE_W * 0.5);

function pendantSideScrew(side) {  // side ∈ {-1, +1}
  const pts = [];
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    pts.push([Math.cos(a) * PENDANT_SCREW_R, Math.sin(a) * PENDANT_SCREW_R]);
  }
  // Build the hex disc in XY (axis = +Z by default), then orient axis
  // to X via alongAxis. Translate to the pendant side face with a
  // visible 0.3 mm outset so the screw head sits proud (and clears the
  // pendant body — at less than ~0.2 mm the alongAxis-extruded hex
  // grazes the rounded-loft surface and registers a tiny BREP overlap).
  const dirX = side >= 0 ? 1 : -1;
  return extrudePolygon(pts, PENDANT_SCREW_T)
    .alongAxis([dirX, 0, 0])
    .translate(dirX * (PENDANT_X_HALF + 0.3), 0, PENDANT_SCREW_Z)
    .color('#1c1c1e');
}
for (const side of [-1, 1]) {
  const sideName = side > 0 ? 'right' : 'left';
  const sc = pendantSideScrew(side);
  const p = watch.part(`pendant ${sideName} hex screw`, sc);
  watch.fixed(`pendant side screw seated on ${sideName} face`, frame, p, {
    origin: [side * PENDANT_X_HALF, 0, PENDANT_SCREW_Z],
  });
}

// DIAL — turquoise plate with subdial pocket. Material on the leaf cylinder.
const DIAL_MAT = {
  baseColor: '#3fd2cf',
  metalness: 0,
  roughness: 0.55,
};
const dialRaw = cylY(DIAL_DEPTH, DIAL_RADIUS, DIAL_Y_BACK).material(DIAL_MAT);
const subdialPocket = cylY(DIAL_DEPTH + 0.8, SUBDIAL_R + 0.1, DIAL_Y_BACK + 0.05)
  .translate(SUBDIAL_CX, 0, SUBDIAL_CZ);
const dialPlate = dialRaw.subtract(subdialPocket);
const dial = watch.part('turquoise tapisserie dial plate', dialPlate);
watch.fixed('dial plate seated in case dial pocket', caseFinal, dial, { origin: [0, DIAL_Y_FRONT, 0] });

// TAPISSERIE — small raised squares standing proud of the dial.
const TAP_PITCH = 0.9;
const TAP_THICK = 0.22;
const TAP_HALF = Math.ceil(DIAL_RADIUS / TAP_PITCH);
let tapIdx = 0;
for (let ix = -TAP_HALF; ix <= TAP_HALF; ix += 1) {
  for (let iz = -TAP_HALF; iz <= TAP_HALF; iz += 1) {
    const x = ix * TAP_PITCH;
    const z = iz * TAP_PITCH;
    const r = Math.sqrt(x * x + z * z);
    if (r > DIAL_RADIUS - 1.8) continue;          // keep clear of stick markers
    const dxSub = x - SUBDIAL_CX;
    const dzSub = z - SUBDIAL_CZ;
    if (Math.sqrt(dxSub * dxSub + dzSub * dzSub) < SUBDIAL_R + 0.5) continue;
    if (r < 1.3) continue;                         // clear of pinion + hands
    const bump = box(0.55, TAP_THICK, 0.55, true)
      .translate(x, DIAL_Y_FRONT - TAP_THICK / 2, z)
      .color('#3fc7c4');
    const part = watch.part(`tap bump ${tapIdx}`, bump);
    watch.fixed('tap bump bonded to dial', dial, part, { origin: [x, DIAL_Y_FRONT, z] });
    tapIdx += 1;
  }
}

// CRYSTAL — moderate dome NURBS surface, glass material.
const DOME_HALF = DIAL_RADIUS * 0.97;
const DOME_N_RADIAL = 5;
const DOME_N_ANGULAR = 12;
function domeControlGrid() {
  const grid = [];
  for (let i = 0; i < DOME_N_RADIAL; i += 1) {
    const row = [];
    for (let j = 0; j < DOME_N_ANGULAR; j += 1) {
      const r = i / (DOME_N_RADIAL - 1);
      const angle = (j / DOME_N_ANGULAR) * 2 * Math.PI;
      const x = r * DOME_HALF * Math.cos(angle);
      const z = r * DOME_HALF * Math.sin(angle);
      const heightFactor = 1 - r * r;
      row.push([x, z, heightFactor * CRYSTAL_RISE]);
    }
    grid.push(row);
  }
  return grid;
}
function periodicVKnots() {
  const knots = [];
  for (let i = 0; i <= DOME_N_ANGULAR; i += 1) knots.push(i);
  return knots;
}
const crystalSurf = nurbsSurface({
  controls: domeControlGrid(),
  degree: { u: 3, v: 3 },
  knots: { u: [0, 0, 0, 0, 0.5, 1, 1, 1, 1], v: periodicVKnots() },
  periodic: { u: false, v: true },
});
const crystalDome = crystalSurf
  .thicken(CRYSTAL_THICK)
  .rotate([1, 0, 0], 90)
  .translate(0, CRYSTAL_BASE_Y, 0)
  .material({
    baseColor: '#e8f4ff',
    transmission: 0.95,
    ior: 1.5,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 0.4,
  });
const crystal = watch.part('sapphire dome crystal', crystalDome);
watch.fixed('crystal mounted above the dial', caseFinal, crystal, { origin: [0, CRYSTAL_BASE_Y, 0] });

// NUMERALS — 12 / 6 / 9 yellow (3 position is the subdial).
const NUMERAL_SIZE = 1.4;
const NUMERAL_RADIUS = DIAL_RADIUS - 1.2;
const numerals = [
  ['12', 0,  NUMERAL_RADIUS],
  ['6',  0, -NUMERAL_RADIUS],
  ['9', -NUMERAL_RADIUS, 0],
];
for (const [value, x, z] of numerals) {
  const numeral = faceText(value, NUMERAL_SIZE, x, z, DIAL_Y_FRONT - 0.4, '#e6c84a');
  const part = watch.part(`numeral ${value}`, numeral);
  watch.fixed('raised numeral on dial face', dial, part, { origin: [x, DIAL_Y_FRONT, z] });
}

// STICK HOUR MARKERS — yellow rectangles around the perimeter.
const STICK_Y_CENTER = STICK_Y_BACK - STICK_THICK_Y / 2;
function stickMarker(angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const r = DIAL_RADIUS - 1.0;
  const x = Math.sin(a) * r;
  const z = Math.cos(a) * r;
  return box(0.55, STICK_THICK_Y, 1.8, true)
    .rotate([0, 1, 0], angleDeg)
    .translate(x, STICK_Y_CENTER, z)
    .color('#e6c84a');
}
for (let i = 0; i < 12; i += 1) {
  // 0/12, 3 (subdial), 6, 9 are numerals / occupied; also skip 4 because
  // the subdial is offset toward 4 o'clock and stick 4 collides with the ring.
  if (i === 0 || i === 3 || i === 4 || i === 6 || i === 9) continue;
  const stick = stickMarker(i * 30);
  const part = watch.part(`stick marker ${i}`, stick);
  watch.fixed('stick marker on dial', dial, part, { origin: [0, DIAL_Y_FRONT, 0] });
}

// SUBDIAL — pink ring + white face + red hand.
const subRing = cylY(SUBRING_THICK, SUBDIAL_R, SUBRING_Y_BACK)
  .subtract(cylY(SUBRING_THICK + 0.4, SUBDIAL_R - 0.4, SUBRING_Y_BACK + 0.2))
  .translate(SUBDIAL_CX, 0, SUBDIAL_CZ)
  .color('#d96a72');
const subRingPart = watch.part('pink subdial ring', subRing);
watch.fixed('subdial ring around subdial pocket', dial, subRingPart, { origin: [SUBDIAL_CX, DIAL_Y_FRONT, SUBDIAL_CZ] });

const subFace = cylY(SUBFACE_THICK, SUBDIAL_R - 0.5, SUBFACE_Y_BACK)
  .translate(SUBDIAL_CX, 0, SUBDIAL_CZ)
  .color('#f0d6da');
const subFacePart = watch.part('white subdial face', subFace);
watch.fixed('subdial face inside ring', subRingPart, subFacePart, { origin: [SUBDIAL_CX, DIAL_Y_FRONT, SUBDIAL_CZ] });

const subHandAngleDeg = -50;
const subHandLen = SUBDIAL_R - 0.65;
const SUBHAND_Y_CENTER = SUBHAND_Y_BACK - SUBHAND_THICK / 2;
const subHand = box(0.18, SUBHAND_THICK, subHandLen, true)
  .translate(0, SUBHAND_Y_CENTER, subHandLen / 2 - 0.1)
  .rotate([0, 1, 0], subHandAngleDeg)
  .translate(SUBDIAL_CX, 0, SUBDIAL_CZ)
  .color('#c8243a');
const subHandPart = watch.part('red subdial hand', subHand);
watch.fixed('subdial hand pinned at subdial center', subFacePart, subHandPart, { origin: [SUBDIAL_CX, DIAL_Y_FRONT, SUBDIAL_CZ] });

// MAIN HANDS — yellow hour + minute, separate Y layers.
const HOUR_HAND_Y_CENTER = HOUR_HAND_Y_BACK - HOUR_HAND_THICK / 2;
const MIN_HAND_Y_CENTER = MIN_HAND_Y_BACK - MIN_HAND_THICK / 2;
function hand(length, width, angleDeg, yCenter, thick) {
  return box(width, thick, length, true)
    .translate(0, yCenter, length / 2 - 0.4)
    .rotate([0, 1, 0], angleDeg)
    .color('#e6c84a');
}
const hourHand = hand(4.0, 0.8, -55, HOUR_HAND_Y_CENTER, HOUR_HAND_THICK);
const minuteHand = hand(5.5, 0.6, 50, MIN_HAND_Y_CENTER, MIN_HAND_THICK);
const hourPart = watch.part('yellow hour hand', hourHand);
const minPart = watch.part('yellow minute hand', minuteHand);
watch.fixed('hour hand on pinion', dial, hourPart, { origin: [0, DIAL_Y_FRONT, 0] });
watch.fixed('minute hand above hour hand', dial, minPart, { origin: [0, DIAL_Y_FRONT, 0] });

const pinion = cylY(PIN_THICK, 0.35, PIN_Y_BACK).color('#e6c84a');
const pinionPart = watch.part('central pinion cap', pinion);
watch.fixed('pinion centered on dial', dial, pinionPart, { origin: [0, DIAL_Y_FRONT, 0] });

// CROWN — yellow hex prism on TOP of the pendant horn (between horn top
// and bail), axis along +Z so the crown reads as a small yellow knob
// when viewed from the front. Reference shows it as a stubby cylinder/hex
// at the very top of the neck, NOT on the side.
// (CROWN_FLAT and CROWN_LEN defined above, near the bail dimensions.)
const crownHexPts = [];
for (let k = 0; k < 6; k += 1) {
  const a = (k / 6) * Math.PI * 2;
  crownHexPts.push([Math.cos(a) * CROWN_FLAT, Math.sin(a) * CROWN_FLAT]);
}
// Crown sits on the +X face of the horn box at the lower third of the horn.
// The horn is a rectangular box of half-width HORN_BASE_W_X / 2.
// Crown placement: high enough on the horn that we're ABOVE the frame's
// angled top-right edge (no overlap with the octagon body), and outboard
// enough in X that the crown's hex prism doesn't poke into the horn.
// Crown sits ON TOP of the lofted horn, axis along +Z. The base of the
// crown is at HORN_TOP_Z; the crown extends UP by CROWN_LEN.
const crownBaseZ = HORN_TOP_Z;
// pre-Z extrusion → world +Z. No rotation needed; the hex faces toward
// the camera (i.e. axis is +Z, hex face is the XY plane).
const crownShape = extrudePolygon(crownHexPts, CROWN_LEN)
  .material(YELLOW_MAT)
  .translate(0, 0, crownBaseZ);
const crown = watch.part('yellow top crown', crownShape);
watch.fixed('crown on top of pendant horn', frame, crown, { origin: [0, 0, crownBaseZ] });

// BAIL — slim pink torus built via path() + revolve(). The path-validator
// only recognises lineTo / tangentArc as area-bearing segments, so we use
// tangentArc to author the two halves of a circular cross-section. The
// profile sits in the (radial, axial) plane at (bailMajorR, 0); revolving
// around the Z axis sweeps it into a torus.
const bailProfileR = BAIL_TUBE_R;
const bailMajorR = BAIL_MAJOR_R;
const bailPath = path()
  .moveTo(bailMajorR - bailProfileR, 0)                      // start: left of profile centre
  .lineTo(bailMajorR - bailProfileR, 0.001)                  // tiny seed segment to establish tangent
  .tangentArc(bailMajorR + bailProfileR, 0)                  // arc to right of centre (top half)
  .tangentArc(bailMajorR - bailProfileR, 0)                  // arc back (bottom half)
  .close();
// revolve sweeps around the Z axis. Result is a torus in the XY plane
// (major-axis = Z). Rotate(X, 90°) maps original revolve-axis Z -> world -Y,
// so the through-hole opens along the camera axis.
const bailShape = bailPath
  .revolve()
  .material(PINK_MAT)
  .rotate([1, 0, 0], 90)
  .translate(0, 0, BAIL_CENTER_Z);
const bail = watch.part('pink lanyard bail', bailShape);
watch.fixed('bail mounted atop pendant tab', frame, bail, { origin: [0, 0, BAIL_CENTER_Z] });

return watch.model();
