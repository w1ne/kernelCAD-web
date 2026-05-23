// Vision-driven rebuild of the pop-art octagonal pocket-watch.
//
// Started from the reference photo (/tmp/royal-pop-reddit.png) as the FIRST
// input. Reference analysis lives in _reference-analysis.md (same dir).
//
// Key calls vs. the earlier pocket-watch (v0.7) build:
// - sculpted "horn → tab" pendant integrated with the case top (not a bare
//   crown nub with a Mickey-Mouse ring floating above it)
// - flatter, larger crystal so the dome glass actually reads
// - crown on the 3 o'clock side of the body (OTG ROZ Savonnette layout), not
//   on the bail/lanyard axis
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
const PIN_THICK = 0.08;
const PIN_RADIUS = 0.16;
const PIN_Y_BACK = MIN_HAND_Y_FRONT + 0.2;

// Crystal review gate:
// - dial markers and hands must remain readable through the front glass
// - retaining lip must visually capture the rim
// - shell must clear the hand stack in `interference`
const CRYSTAL_BASE_Y = CASE_Y_FRONT - 0.68;    // shell clears hands; retaining lip keeps the rim visually captured
const CRYSTAL_GASKET_Y_BACK = CASE_Y_FRONT - 0.1;
const CRYSTAL_GASKET_THICK = 0.24;

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


// OTG ROZ is a Savonnette layout: yellow winding crown at 3 o'clock, while
// the top pendant remains a lanyard/bail mount with no winding wheel.
const SIDE_CROWN_Z = 0;
const SIDE_CROWN_Y = -0.15;
const SIDE_CROWN_STEM_LEN = 0.9;
const SIDE_CROWN_STEM_R = 0.38;
const SIDE_CROWN_BODY_LEN = 1.75;
const SIDE_CROWN_BODY_R = 0.95;
const SIDE_CROWN_STEM_X_MAX = FRAME_FLAT + SIDE_CROWN_STEM_LEN;
const SIDE_CROWN_BODY_X_MAX = SIDE_CROWN_STEM_X_MAX + SIDE_CROWN_BODY_LEN;

// Bail — sits above the pendant, with the lanyard hole unobstructed.
const BAIL_MAJOR_R = 1.7;
const BAIL_TUBE_R = 0.45;
const BAIL_CENTER_Z = HORN_TOP_Z + BAIL_MAJOR_R + BAIL_TUBE_R;

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

function cylX(length, radius, xMax = 0, segments = 72) {
  return cylinder(length, radius, segments)
    .alongAxis([1, 0, 0])
    .translate(xMax - length, 0, 0);
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

// Block numerals on the dial face. Text sketches are visually nice but the
// live Studio mesh route cannot lower them reliably yet; segment numerals keep
// the public gallery model deterministic and preserve the 12/6/9 dial cues.
function segmentDigit(digit, size, frontFaceY, color) {
  const digitW = size * 0.48;
  const digitH = size;
  const stroke = size * 0.12;
  const t = 0.28;
  const y = frontFaceY - t / 2;
  const hLen = digitW;
  const vLen = digitH / 2 - stroke * 0.7;
  const zTop = digitH / 2 - stroke / 2;
  const zMid = 0;
  const zBot = -digitH / 2 + stroke / 2;
  const xLeft = -digitW / 2 + stroke / 2;
  const xRight = digitW / 2 - stroke / 2;
  const patterns = {
    '1': ['ur', 'lr'],
    '2': ['top', 'ur', 'mid', 'll', 'bot'],
    '6': ['top', 'ul', 'mid', 'll', 'lr', 'bot'],
    '9': ['top', 'ul', 'ur', 'mid', 'lr', 'bot'],
  };
  const segs = patterns[String(digit)] ?? patterns['9'];
  let shape;
  function add(seg) {
    let s;
    if (seg === 'top') s = box(hLen, t, stroke, true).translate(0, y, zTop);
    if (seg === 'mid') s = box(hLen, t, stroke, true).translate(0, y, zMid);
    if (seg === 'bot') s = box(hLen, t, stroke, true).translate(0, y, zBot);
    if (seg === 'ul') s = box(stroke, t, vLen, true).translate(xLeft, y, digitH * 0.25);
    if (seg === 'ur') s = box(stroke, t, vLen, true).translate(xRight, y, digitH * 0.25);
    if (seg === 'll') s = box(stroke, t, vLen, true).translate(xLeft, y, -digitH * 0.25);
    if (seg === 'lr') s = box(stroke, t, vLen, true).translate(xRight, y, -digitH * 0.25);
    shape = shape ? shape.union(s) : s;
  }
  for (const seg of segs) add(seg);
  return shape.color(color);
}

function faceText(value, size, x, z, frontFaceY, color) {
  const chars = String(value).split('');
  const gap = size * 0.12;
  const digitAdvance = size * 0.6;
  const total = chars.length * digitAdvance + (chars.length - 1) * gap;
  let shape;
  for (let i = 0; i < chars.length; i += 1) {
    const dx = -total / 2 + digitAdvance / 2 + i * (digitAdvance + gap);
    const digit = segmentDigit(chars[i], size, frontFaceY, color).translate(dx, 0, 0);
    shape = shape ? shape.union(digit) : digit;
  }
  return shape.translate(x, 0, z);
}

// =============================================================================
// Renderer setup — HDRI environment + camera framing
// =============================================================================
//
// HDRI environment lights up transmissive materials. Without an explicit
// setRenderEnvironment, the sapphire dome's transmission renders flat — the
// dial shows through but there is no specular streak that sells "glass with
// a reflection". Use the 'studio' preset (studio_small_03_1k.hdr) which
// has a discrete key softbox + dark surroundings — the dark surroundings
// give the dome a high-contrast specular streak that reads cleanly as
// glass at the iso pose. (A 'softbox' preset was also tested; its
// uniform soft fill produced a weaker specular and slightly darker pink.)
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
// Saturated coral pink. The previous #ff9aa3 read as pastel under
// NeutralToneMapping; the reference's hue is a vivid coral closer to a
// hot-pink-with-warm-undertones value. #ff5c8a is the first stop; if it
// reads neon we'll dial back to #ff7da0 or #f97090.
const PINK_MAT = {
  baseColor: '#ff2f87',
  metalness: 0,
  roughness: 0.34,
};
const frameOctagon = octagonPrismY(FRAME_FLAT, FRAME_DEPTH).material(PINK_MAT);
const casePocket = octagonPrismY(CASE_FLAT + 0.08, FRAME_DEPTH + 2.0);
const HORN_BASE_W   = HORN_BASE_W_X;            // X width at base
const HORN_WAIST_W  = HORN_TOP_W_X * 0.72;      // narrowest mid-pinch — tighter waist
const HORN_TOP_W    = HORN_TOP_W_X * 0.95;      // hair narrower top so the necking reads
const HORN_WAIST_Z  = HORN_BASE_Z + HORN_HEIGHT_Z * 0.65;

// Studio must be able to lower the public gallery model deterministically.
// The earlier NURBS loft looked closer to the reference, but failed in the
// live mesh endpoint. This faceted XZ silhouette keeps the integrated
// pendant shape while using the same robust prism path as the octagonal body.
const horn = extrudePolygon([
  [-HORN_BASE_W / 2, HORN_BASE_Z],
  [ HORN_BASE_W / 2, HORN_BASE_Z],
  [ HORN_BASE_W * 0.44, HORN_BASE_Z + HORN_HEIGHT_Z * 0.25],
  [ HORN_WAIST_W / 2, HORN_WAIST_Z],
  [ HORN_TOP_W / 2, HORN_TOP_Z],
  [-HORN_TOP_W / 2, HORN_TOP_Z],
  [-HORN_WAIST_W / 2, HORN_WAIST_Z],
  [-HORN_BASE_W * 0.44, HORN_BASE_Z + HORN_HEIGHT_Z * 0.25],
], HORN_DEPTH_Y)
  .rotate([1, 0, 0], 90)
  .translate(0, HORN_DEPTH_Y / 2, 0)
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
  baseColor: '#ffd91a',
  metalness: 0,
  roughness: 0.38,
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

// DIAL — turquoise plate with subdial pocket. Material on the leaf cylinder.
const DIAL_MAT = {
  baseColor: '#00c8d7',
  metalness: 0,
  roughness: 0.42,
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
      .color('#32c0c5');
    const part = watch.part(`tap bump ${tapIdx}`, bump);
    watch.fixed('tap bump bonded to dial', dial, part, { origin: [x, DIAL_Y_FRONT, z] });
    tapIdx += 1;
  }
}

// CRYSTAL — a thin clear disk with an annular skirt captured by the retainer.
// No separate "highlight" solids: those read as random flying lines. The disk
// stays thin/flat so it is visible as glass without clouding the dial.
const GLASS_RIM_Y_BACK = CRYSTAL_GASKET_Y_BACK - CRYSTAL_GASKET_THICK;
const GLASS_FACE_Y_BACK = GLASS_RIM_Y_BACK - 0.48;
const GLASS_FACE_THICK = 0.025;
const glassFace = cylY(GLASS_FACE_THICK, DIAL_RADIUS + 0.03, GLASS_FACE_Y_BACK, 128);
const glassRim = cylY(0.48, DIAL_RADIUS + 0.14, GLASS_RIM_Y_BACK, 128)
  .subtract(cylY(0.5, DIAL_RADIUS - 0.02, GLASS_RIM_Y_BACK + 0.01, 128));
const crystalDome = glassRim
  .union(glassFace)
  .material({
    baseColor: '#dff8ff',
    opacity: 0.18,
    transmission: 0,
    roughness: 0,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0,
  });
const crystal = watch.part('sapphire dome crystal', crystalDome);

const crystalRetainer = cylY(CRYSTAL_GASKET_THICK, DIAL_RADIUS + 0.42, CRYSTAL_GASKET_Y_BACK)
  .subtract(cylY(CRYSTAL_GASKET_THICK + 0.12, DIAL_RADIUS + 0.06, CRYSTAL_GASKET_Y_BACK + 0.06))
  .material(YELLOW_MAT);
const crystalRetainerPart = watch.part('yellow crystal retaining lip', crystalRetainer);
watch.fixed('crystal retaining lip clamps the glass rim', caseFinal, crystalRetainerPart, {
  origin: [0, CRYSTAL_GASKET_Y_BACK, 0],
});
watch.fixed('sapphire crystal rim captured under retaining lip', crystalRetainerPart, crystal, {
  origin: [0, CRYSTAL_BASE_Y, 0],
});

// NUMERALS — 12 / 6 / 9 yellow (3 position is the subdial).
const NUMERAL_SIZE = 1.4;
const NUMERAL_RADIUS = DIAL_RADIUS - 1.2;
const numerals = [
  ['12', 0,  NUMERAL_RADIUS],
  ['6',  0, -NUMERAL_RADIUS],
  ['9', -NUMERAL_RADIUS, 0],
];
for (const [value, x, z] of numerals) {
  const numeral = faceText(value, NUMERAL_SIZE, x, z, DIAL_Y_FRONT - 0.4, '#f0d34a');
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
    .color('#f0d34a');
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
  .color('#e26679');
const subRingPart = watch.part('pink subdial ring', subRing);
watch.fixed('subdial ring around subdial pocket', dial, subRingPart, { origin: [SUBDIAL_CX, DIAL_Y_FRONT, SUBDIAL_CZ] });

const subFace = cylY(SUBFACE_THICK, SUBDIAL_R - 0.5, SUBFACE_Y_BACK)
  .translate(SUBDIAL_CX, 0, SUBDIAL_CZ)
  .color('#f1c7cf');
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
    .color('#f0d34a');
}
const hourHand = hand(4.0, 0.8, -55, HOUR_HAND_Y_CENTER, HOUR_HAND_THICK);
const minuteHand = hand(5.5, 0.6, 50, MIN_HAND_Y_CENTER, MIN_HAND_THICK)
  .union(cylY(DIAL_Y_FRONT - MIN_HAND_Y_FRONT, 0.32, DIAL_Y_FRONT, 48).color('#f0d34a'));
const pinion = cylY(PIN_THICK, PIN_RADIUS, PIN_Y_BACK)
  .union(cylY(DIAL_Y_FRONT - (PIN_Y_BACK - PIN_THICK), 0.34, DIAL_Y_FRONT, 56))
  .color('#f0d34a');
const handStack = hourHand.union(minuteHand).union(pinion).color('#f0d34a');
const handStackPart = watch.part('yellow stacked hands on central pinion arbor', handStack);
watch.fixed('hands mounted on central pinion arbor seated in dial', dial, handStackPart, { origin: [0, DIAL_Y_FRONT, 0] });

// SIDE CROWN — yellow windable crown on the 3 o'clock side of the body.
let sideCrownBody = cylX(SIDE_CROWN_BODY_LEN, SIDE_CROWN_BODY_R, SIDE_CROWN_BODY_X_MAX, 72);
for (let i = -3; i <= 3; i += 1) {
  const stripeX = SIDE_CROWN_STEM_X_MAX + (i + 3.5) * (SIDE_CROWN_BODY_LEN / 7);
  const groove = box(0.055, 0.12, SIDE_CROWN_BODY_R * 1.78, true)
    .translate(stripeX, -SIDE_CROWN_BODY_R, 0);
  sideCrownBody = sideCrownBody.subtract(groove);
}
const sideCrownAssembly = cylX(SIDE_CROWN_STEM_LEN, SIDE_CROWN_STEM_R, SIDE_CROWN_STEM_X_MAX, 40)
  .union(sideCrownBody)
  .material(YELLOW_MAT)
  .translate(0, SIDE_CROWN_Y, SIDE_CROWN_Z);
const sideCrown = watch.part('yellow side winding crown and stem', sideCrownAssembly);
watch.fixed('side crown stem physically enters 3 oclock case wall', frame, sideCrown, {
  origin: [FRAME_FLAT, SIDE_CROWN_Y, SIDE_CROWN_Z],
});

// BAIL — slim pink torus with the through-hole facing the camera. It is a
// real modeled lanyard ring, not a flat engraved hole in the pendant. The
// tube's bottom edge kisses the horn top so the loop reads as mounted.
const bailProfileR = BAIL_TUBE_R;
const bailMajorR = BAIL_MAJOR_R;
const bailPath = path()
  .moveTo(bailMajorR - bailProfileR, 0)
  .lineTo(bailMajorR - bailProfileR, 0.001)
  .tangentArc(bailMajorR + bailProfileR, 0)
  .tangentArc(bailMajorR - bailProfileR, 0)
  .close();
const bailShape = bailPath
  .revolve()
  .material(PINK_MAT)
  .rotate([1, 0, 0], 90)
  .translate(0, 0, BAIL_CENTER_Z);
const bail = watch.part('pink lanyard bail', bailShape);
watch.fixed('bail mounted atop pendant tab', frame, bail, { origin: [0, 0, BAIL_CENTER_Z] });

return watch.model();
