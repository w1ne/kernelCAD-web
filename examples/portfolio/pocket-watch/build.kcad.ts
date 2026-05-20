// Real Object Brief
// Artifact: a pop-art octagonal pocket watch reconstructed from the reference
//   /home/andrii/Pictures/Screenshots/Screenshot_2026-05-15_11-46-42.png.
// Scale: millimetres. Outer pink octagonal frame ~50 mm corner-to-corner,
//   inner yellow octagonal case ~36 mm flat-to-flat, teal dial ~24 mm,
//   total body Y-depth ~10 mm; lanyard loop reaches ~30 mm above the frame.
// Visible facts (from reference photo):
//   - Outer pink octagonal frame with rounded outer corners, tapering up to
//     a pink lanyard loop with a pink ribbon strap.
//   - Inner yellow octagonal case with 8 hexagonal screws at each vertex.
//   - Teal dial with a waffle "tapisserie" raised grid texture.
//   - Small pink-ringed subdial at 3 o'clock with white face and red hand.
//   - Eight yellow stick hour markers + three numerals (12, 6, 9).
//   - Yellow hour and minute hands at different angles.
//   - Small yellow crown at the very top of the case.
//   - Domed sapphire crystal covering the dial (built as a NURBS surface).
// Hidden-side inference: real case-band depth, dial recess, screw counterbores,
//   subdial pocket cut into the dial, crown bore through case top, distinct
//   Y layers for crystal / numerals / hands / dial / case / frame so nothing
//   floats or interferes.
// Validation focus: front legibility (frame + case + dial concentric and
//   centred), iso-view shows the NURBS dome and the lanyard loop above,
//   right/top views show real body depth, zero BREP interferences.
//
// Coordinate convention: Z-up, right-handed. The render's "front" view looks
// from -Y toward +Y, so the **smallest Y = closest to the camera**. The dial
// faces -Y; any element drawn "on" the dial sits at Y SMALLER than the dial's
// front face.

const FRAME_DEPTH = 9.0;          // Y thickness of the pink frame (must fully wrap the case in Y; ≥ CASE_DEPTH + 1.0)
const CASE_DEPTH = 8.0;           // Y thickness of the yellow case
const FRAME_FLAT = 23.0;          // half flat-to-flat of the pink octagon
const CASE_FLAT = 17.5;           // half flat-to-flat of the yellow octagon
const DIAL_RADIUS = 12.0;         // teal dial radius
const DIAL_DEPTH = 1.6;           // dial plate thickness in Y
const LOOP_BASE_Z = FRAME_FLAT + 0.6; // top of frame (in Z) — base elevation the loop feet rest on

// --- helpers -----------------------------------------------------------------

// Y-aligned cylinder. The +Y end-cap sits at `yMax`; the -Y end-cap is at
// yMax - depth. Convention: yMax is the deepest-into-case face (back); the
// face VISIBLE to the camera is at yMax - depth (the smallest Y, "front").
function cylY(depth, radius, yMax = 0, segments = 96) {
  return cylinder(depth, radius, segments)
    .alongAxis([0, 1, 0])
    .translate(0, yMax - depth, 0);
}

// Z-aligned cylinder, base at `zBase`, extending +Z by `depth`.
function cylZ(depth, radius, zBase = 0, segments = 32) {
  return cylinder(depth, radius, segments).translate(0, 0, zBase);
}

// Octagonal prism along Y, centered on Y=0 (Y span = [-depth/2, +depth/2]).
function octagonPrismY(flat, depth) {
  const r = flat / Math.cos(Math.PI / 8);
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 8) + i * (Math.PI / 4);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // extrudePolygon takes XY points and extrudes along +Z by `depth`. After
  // rotate(X, -90°) the mapping is (x, y, z) → (x, z, -y), so the prism
  // spans world X in [-r, r], world Y in [0, depth], world Z in [-r, r].
  // Translate by -depth/2 in Y to center the prism on Y=0.
  return extrudePolygon(pts, depth)
    .rotate([1, 0, 0], -90)
    .translate(0, -depth / 2, 0);
}

// Vertices (in XZ) of a regular octagon at `radius` from origin.
function octagonVertices(radius) {
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 8) + i * (Math.PI / 4);
    pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return pts;
}

// 2D text on the dial face. `frontFaceY` is the Y of the rear face of the
// text glyph (the side closest to the dial). The text extrudes toward -Y.
function faceText(value, size, x, z, frontFaceY, color) {
  // sketch.text builds XY glyphs; .extrude(t) extrudes along +Z by t.
  // We then rotate so the glyph plane is XZ and the extrusion direction is -Y.
  // After rotate([1,0,0], 90) the original +Z axis becomes -Y, original +Y
  // becomes +Z. Glyph baseline is at Y=0 in source coords, top at Y=+size.
  // So we shift in Z by -size*0.36 to roughly centre it on the target z.
  const t = 0.5;
  return sketch.text(value, { size, align: 'center', position: [0, 0] })
    .extrude(t)
    .rotate([1, 0, 0], 90)
    .translate(x, frontFaceY + t, z - size * 0.36)  // post-rotation: glyph faces -Y; thickness in Y is t
    .color(color);
}

// =============================================================================
// Y-axis layout (smallest Y = closest to camera, largest Y = deepest in case):
// =============================================================================
const CASE_Y_FRONT = -CASE_DEPTH / 2;   // -4.0  (visible front face of case)
const DIAL_POCKET_DEPTH = 2.4;          // depth of dial pocket carved into case front
const DIAL_Y_BACK  = CASE_Y_FRONT + DIAL_POCKET_DEPTH;   // -1.6 (rear face of dial recess)
const DIAL_Y_FRONT = DIAL_Y_BACK - DIAL_DEPTH;            // -3.2 (visible dial face)
// Anything ON the dial face goes at Y < DIAL_Y_FRONT (closer to camera).
const STICK_Y_BACK   = DIAL_Y_FRONT;                      // -3.2 sticks butt against dial
const STICK_THICK_Y  = 0.5;
const STICK_Y_FRONT  = STICK_Y_BACK - STICK_THICK_Y;      // -3.7
const SUBRING_Y_BACK = DIAL_Y_FRONT;                      // -3.2
const SUBRING_THICK  = 0.6;
const SUBRING_Y_FRONT= SUBRING_Y_BACK - SUBRING_THICK;    // -3.8
const SUBFACE_Y_BACK = SUBRING_Y_FRONT + 0.05;            // recessed inside the ring
const SUBFACE_THICK  = 0.4;
const SUBFACE_Y_FRONT= SUBFACE_Y_BACK - SUBFACE_THICK;
const SUBHAND_Y_BACK = SUBFACE_Y_FRONT;
const SUBHAND_THICK  = 0.18;
const HOUR_HAND_THICK  = 0.45;
const HOUR_HAND_Y_BACK = STICK_Y_FRONT - 0.1;             // -3.8
const HOUR_HAND_Y_FRONT= HOUR_HAND_Y_BACK - HOUR_HAND_THICK;
const MIN_HAND_THICK = 0.45;
const MIN_HAND_Y_BACK  = HOUR_HAND_Y_FRONT - 0.1;
const MIN_HAND_Y_FRONT = MIN_HAND_Y_BACK - MIN_HAND_THICK;
const PIN_THICK = 0.5;
const PIN_Y_BACK = MIN_HAND_Y_FRONT - 0.05;

// Crystal is a full-dial dome: rim sits JUST IN FRONT of the bezel (case
// front face) so the dome solid never penetrates the case/frame body, apex
// curves further forward toward the camera. The rim Y must be more negative
// than CASE_Y_FRONT so neither the surface plane NOR the thickening direction
// overlaps the case at the corners of the (square) NURBS control patch. The
// apex Y must be in front of the most-forward on-dial geometry (pinion front
// at PIN_Y_FRONT ≈ -6.15) so the dome stays the topmost layer over the dial.
const CRYSTAL_BASE_Y = CASE_Y_FRONT - 1.5;                 // dome RIM sits 1.5mm in front of the bezel rim, clearing case/frame entirely
const CRYSTAL_THICK  = 0.4;
const CRYSTAL_RISE   = 3.0;                                // apex Y = CRYSTAL_BASE_Y - rise - thick = -8.0 (well in front of pinion front ≈ -6.15)
// After thicken+rotate, dome occupies Y in [CRYSTAL_BASE_Y - CRYSTAL_RISE - CRYSTAL_THICK, CRYSTAL_BASE_Y]

// --- assembly ---------------------------------------------------------------

const watch = assembly('pop-art octagonal pocket watch');

// =============================================================================
// FRAME — pink octagonal outer frame with a pocket for the yellow case.
// =============================================================================
const frameOuter = octagonPrismY(FRAME_FLAT, FRAME_DEPTH);
// Pocket bigger than the case so there's a small visible pink rim around the
// case (0.8 mm on each octagon flat) and zero interference.
const casePocket = octagonPrismY(CASE_FLAT + 0.8, FRAME_DEPTH + 2.0);
// (Iter 2: crown no longer pierces the frame — it sits on top of a separate
// pink pendant block above the frame, like a real pocket-watch neck. So no
// bore through the frame top.)
const frame = watch.part(
  'pink octagonal outer frame',
  frameOuter
    .subtract(casePocket)
    .fillet(0.6)
    .color('#f8b3c0'),
);

// =============================================================================
// CASE — yellow octagonal case with dial pocket, crown bore, screw counterbores.
// =============================================================================
const caseRaw = octagonPrismY(CASE_FLAT, CASE_DEPTH);

// Dial pocket: a cylinder carved from the front face. Carving cylinder spans
// Y in [yMax - extra - depth, yMax]; we make it deep enough to cleanly cut
// without leaving thin walls.
const dialPocket = cylY(DIAL_POCKET_DEPTH + 0.4, DIAL_RADIUS + 0.4, DIAL_Y_BACK + 0.4);

// (Iter 2: no crown bore through the case — crown sits on the pendant above
// the frame, doesn't pierce the case at all.)

const caseShape = caseRaw
  .subtract(dialPocket);

// Hex screw counterbores at each octagon vertex of the bezel.
const SCREW_VERT_R = CASE_FLAT * 0.94;
const SCREW_R = 1.5;
const SCREW_CB_DEPTH = 1.2;
const screwVerts = octagonVertices(SCREW_VERT_R);
let caseBored = caseShape;
for (const [x, z] of screwVerts) {
  const cb = cylY(SCREW_CB_DEPTH + 0.4, SCREW_R + 0.4, CASE_Y_FRONT + SCREW_CB_DEPTH)
    .translate(x, 0, z);
  caseBored = caseBored.subtract(cb);
}
const caseFinal = watch.part('yellow octagonal case', caseBored.color('#e8c84a'));
watch.fixed('case nested into frame pocket', frame, caseFinal, { origin: [0, 0, 0] });

// =============================================================================
// HEX SCREWS — 8 hex prisms seated inside the counterbores, top flush with
// case front face.
// =============================================================================
const SCREW_HEAD_T = 0.6;
function hexHead(x, z) {
  const pts = [];
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2;
    pts.push([Math.cos(a) * SCREW_R, Math.sin(a) * SCREW_R]);
  }
  // After rotate(X, -90°): (x, y, z) → (x, z, -y). The pre-rotation extrusion
  // direction +Z maps to world +Y; pre-rotation extrusion span [0, head_t]
  // becomes world Y span [0, head_t]. Translate so the visible face (Y_min)
  // sits at CASE_Y_FRONT + 0.05 (slight inset from the case front face),
  // putting the Y_max face at CASE_Y_FRONT + 0.05 + head_t = -3.35.
  return extrudePolygon(pts, SCREW_HEAD_T)
    .rotate([1, 0, 0], -90)
    .translate(x, CASE_Y_FRONT + 0.05, z)
    .color('#2c2c2e');
}
for (let i = 0; i < screwVerts.length; i += 1) {
  const [x, z] = screwVerts[i];
  const head = hexHead(x, z);
  const screw = watch.part(`bezel hex screw ${i}`, head);
  watch.fixed('screw seated in case counterbore', caseFinal, screw, { origin: [x, CASE_Y_FRONT, z] });
}

// =============================================================================
// DIAL — teal plate seated inside the case dial pocket.
// =============================================================================
const subdialCenterX = DIAL_RADIUS * 0.55;
const subdialCenterZ = 0;
const subdialR = 3.4;

const dialRaw = cylY(DIAL_DEPTH, DIAL_RADIUS, DIAL_Y_BACK);
const subdialDialPocket = cylY(DIAL_DEPTH + 1.0, subdialR + 0.1, DIAL_Y_BACK + 0.05)
  .translate(subdialCenterX, 0, subdialCenterZ);
const dialPlate = dialRaw.subtract(subdialDialPocket).color('#3fc7c4');
const dial = watch.part('teal tapisserie dial plate', dialPlate);
watch.fixed('dial plate seated in case dial pocket', caseFinal, dial, { origin: [0, DIAL_Y_FRONT, 0] });

// =============================================================================
// TAPISSERIE — raised waffle bumps standing PROUD of the dial front face.
// =============================================================================
// Each bump's -Y face (front, toward camera) is at DIAL_Y_FRONT - TAP_THICK.
// Each bump's +Y face (back, toward dial) is at DIAL_Y_FRONT (touching dial).
const TAP_PITCH = 1.4;
const TAP_THICK = 0.4;
const TAP_HALF = Math.ceil(DIAL_RADIUS / TAP_PITCH);
let tapIdx = 0;
for (let ix = -TAP_HALF; ix <= TAP_HALF; ix += 1) {
  for (let iz = -TAP_HALF; iz <= TAP_HALF; iz += 1) {
    const x = ix * TAP_PITCH;
    const z = iz * TAP_PITCH;
    const r = Math.sqrt(x * x + z * z);
    if (r > DIAL_RADIUS - 4.5) continue;     // keep bumps clear of marker ring
    const dxSub = x - subdialCenterX;
    const dzSub = z - subdialCenterZ;
    if (Math.sqrt(dxSub * dxSub + dzSub * dzSub) < subdialR + 0.8) continue;
    // Avoid the central hand area so the hands sit on a clean field.
    if (r < 2.0) continue;
    // box centered: place center at Y = DIAL_Y_FRONT - TAP_THICK/2 so the
    // +Y face touches the dial front and the -Y face stands proud.
    const bump = box(0.9, TAP_THICK, 0.9, true)
      .translate(x, DIAL_Y_FRONT - TAP_THICK / 2, z)
      .color('#3fc7c4');
    const part = watch.part(`tap bump ${tapIdx}`, bump);
    watch.fixed('tap bump bonded to dial', dial, part, { origin: [x, DIAL_Y_FRONT, z] });
    tapIdx += 1;
  }
}

// =============================================================================
// CRYSTAL — domed NURBS sapphire bubble over the WHOLE dial. Real pocket
// watch crystals span the full dial face. Authored as a NURBS surface (5x5
// control grid with a bell-curve rise) then thickened into a closed solid.
// The dome curvature reads cleanly in the iso/right views. v0.8 PBR material
// (high transmission, low roughness, sapphire IOR 1.76) renders it as a
// glassy lens — the dial and numerals stay visible THROUGH the dome.
// =============================================================================
const DOME_HALF = DIAL_RADIUS * 1.05;  // dome rim slightly overlaps the bezel (5% past the dial radius), as on a real pocket-watch crystal. With transmission the numerals underneath read cleanly through the glass.
// Build the control grid in POLAR coordinates so the footprint is a circle of
// radius DOME_HALF rather than a square 2*DOME_HALF on a side. The grid maps
// (i, j) → (radius, angle). i is the radial index (i = 0 collapses to the
// dome apex; i = N_R - 1 sits at the rim ring). j is the angular index over
// N_THETA slots covering [0, 2π) — declared as v-periodic on the NURBS so the
// surface closes seamlessly around the dial. The j controls do NOT duplicate
// the seam (j = 0 lives at angle 0; j = N-1 lives at angle 2π * (N-1)/N).
// Periodic knots wrap the angular axis cleanly, producing a closed dome with
// no visible wedge cut.
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
      // Bell-curve height: 1 at r=0 (apex), 0 at r=1 (rim).
      const heightFactor = 1 - r * r;
      row.push([x, z, heightFactor * CRYSTAL_RISE]);
    }
    grid.push(row);
  }
  return grid;
}
// Periodic NURBS in OCCT need a periodic (non-clamped) knot vector along the
// periodic axis: N+1 knots with multiplicity 1 each (uniform spacing). The
// clamped-uniform default the lowerer generates would fail validation when
// periodic=true. We supply an explicit V knot vector that satisfies this.
function periodicVKnots() {
  const knots = [];
  for (let i = 0; i <= DOME_N_ANGULAR; i += 1) knots.push(i);
  return knots;
}
const crystalSurf = nurbsSurface({
  controls: domeControlGrid(),
  degree: { u: 3, v: 3 },
  // U: clamped uniform, N=5 controls, d=3 → distinct knots (0, 0.5, 1) with mults (4, 1, 4).
  // V: periodic with DOME_N_ANGULAR controls → uniform knots [0..N] with mults all 1.
  knots: { u: [0, 0, 0, 0, 0.5, 1, 1, 1, 1], v: periodicVKnots() },
  periodic: { u: false, v: true },     // V wraps around the dial; periodic knots close the seam at angle 0
});
// Pre-rotation: surface in XY with height in +Z, span = [-DOME_HALF, DOME_HALF]
// in both X and Y, Z in [0, CRYSTAL_RISE+CRYSTAL_THICK].
// rotate(X, +90°) maps pre_Z → -world_Y (apex curves into -Y, toward camera)
// and pre_Y → +world_Z. Translate places the dome rim at Y=CRYSTAL_BASE_Y
// and the apex at Y=CRYSTAL_BASE_Y-(rise+thick), centered over the dial origin.
const crystalDome = crystalSurf
  .thicken(CRYSTAL_THICK)
  .rotate([1, 0, 0], 90)
  .translate(0, CRYSTAL_BASE_Y, 0)
  // v0.8 PBR: sapphire IOR=1.76, near-zero roughness, transmission=0.95 so
  // the dial + numerals + hands read THROUGH the dome. Thin clearcoat adds
  // a polished-finish highlight. Slight cool tint matches anti-reflective
  // coating on real sapphire crystals.
  .material({
    baseColor: '#e6f1f5',
    metalness: 0,
    roughness: 0.05,
    ior: 1.76,
    transmission: 0.95,
    clearcoat: 0.4,
    clearcoatRoughness: 0.05,
  });
const crystal = watch.part('domed nurbs sapphire crystal over the dial', crystalDome);
watch.fixed('crystal mounted above the dial', caseFinal, crystal, { origin: [0, CRYSTAL_BASE_Y, 0] });

// =============================================================================
// NUMERALS — generic 12 / 6 / 9 on the dial face (sketch.text). "3" position
// is occupied by the subdial.
// =============================================================================
// Numerals sit on the dial face UNDER the transparent crystal dome — the v0.8
// PBR transmission lets them read cleanly through the glass. NUMERAL_RADIUS is
// inside the dial (well within DIAL_RADIUS) and inside DOME_HALF so the
// numerals visually live under the dome rather than outside it.
const NUMERAL_SIZE = 1.6;
// Stick markers live at r = DIAL_RADIUS - 1.8 = 10.2. Numerals sit further
// inside so they don't collide with the stick at 12/9/6 positions, and so
// they read clearly under the dome curvature even from oblique angles.
const NUMERAL_RADIUS = 8.0;
const numerals = [
  ['12', 0,    NUMERAL_RADIUS],
  ['6',  0,   -NUMERAL_RADIUS],
  ['9', -NUMERAL_RADIUS, 0],
];

for (const [value, x, z] of numerals) {
  // faceText places the glyph in Y in [frontFaceY, frontFaceY + thickness];
  // the -Y face (camera-side) is at frontFaceY. We want the +Y face (back) to
  // touch the dial front, so frontFaceY = DIAL_Y_FRONT - text_thickness.
  // text_thickness = 0.5 (see faceText), so frontFaceY = -3.7.
  const numeral = faceText(value, NUMERAL_SIZE, x, z, DIAL_Y_FRONT - 0.5, '#e8c84a');
  const part = watch.part(`numeral ${value}`, numeral);
  watch.fixed('raised numeral on dial face', dial, part, { origin: [x, DIAL_Y_FRONT, z] });
}

// =============================================================================
// STICK HOUR MARKERS — yellow bars around the dial perimeter.
// =============================================================================
// Marker is box(0.9, STICK_THICK_Y, 3.0). After rotate Y by angle, the
// thickness still lies along Y. Place center at Y = STICK_Y_BACK - STICK_THICK_Y/2.
const STICK_Y_CENTER = STICK_Y_BACK - STICK_THICK_Y / 2;
function stickMarker(angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const r = DIAL_RADIUS - 1.8;
  const x = Math.sin(a) * r;
  const z = Math.cos(a) * r;
  return box(0.9, STICK_THICK_Y, 3.0, true)
    .rotate([0, 1, 0], angleDeg)
    .translate(x, STICK_Y_CENTER, z)
    .color('#e8c84a');
}
for (let i = 0; i < 12; i += 1) {
  if (i === 0 || i === 3 || i === 6 || i === 9) continue;
  const stick = stickMarker(i * 30);
  const part = watch.part(`stick marker ${i}`, stick);
  watch.fixed('stick marker on dial', dial, part, { origin: [0, DIAL_Y_FRONT, 0] });
}

// =============================================================================
// SUBDIAL — pink ring + white face + red hand at 3 o'clock.
// =============================================================================
// Pink ring is an annulus standing proud of the dial face.
const subRing = cylY(SUBRING_THICK, subdialR, SUBRING_Y_BACK)
  .subtract(cylY(SUBRING_THICK + 0.6, subdialR - 0.6, SUBRING_Y_BACK + 0.3))
  .translate(subdialCenterX, 0, subdialCenterZ)
  .color('#f8b3c0');
const subRingPart = watch.part('pink subdial ring', subRing);
watch.fixed('subdial ring around subdial pocket', dial, subRingPart, { origin: [subdialCenterX, DIAL_Y_FRONT, subdialCenterZ] });

// White subdial face, recessed inside the ring (slightly back).
const subFace = cylY(SUBFACE_THICK, subdialR - 0.75, SUBFACE_Y_BACK)
  .translate(subdialCenterX, 0, subdialCenterZ)
  .color('#f4f4ef');
const subFacePart = watch.part('white subdial face', subFace);
watch.fixed('subdial face inside ring', subRingPart, subFacePart, { origin: [subdialCenterX, DIAL_Y_FRONT, subdialCenterZ] });

// Red subdial hand — thin bar pivoting at subdial center.
const subHandAngleDeg = -40;
const subHandLen = subdialR - 1.1;
const SUBHAND_Y_CENTER = SUBHAND_Y_BACK - SUBHAND_THICK / 2;
const subHand = box(0.3, SUBHAND_THICK, subHandLen, true)
  .translate(0, SUBHAND_Y_CENTER, subHandLen / 2 - 0.2)
  .rotate([0, 1, 0], subHandAngleDeg)
  .translate(subdialCenterX, 0, subdialCenterZ)
  .color('#c8243a');
const subHandPart = watch.part('red subdial hand', subHand);
watch.fixed('subdial hand pinned at subdial center', subFacePart, subHandPart, { origin: [subdialCenterX, DIAL_Y_FRONT, subdialCenterZ] });

// =============================================================================
// MAIN HANDS — yellow hour + minute hands on separate Y layers, in front of
// the stick markers but behind the crystal.
// =============================================================================
const HOUR_HAND_Y_CENTER = HOUR_HAND_Y_BACK - HOUR_HAND_THICK / 2;
const MIN_HAND_Y_CENTER  = MIN_HAND_Y_BACK  - MIN_HAND_THICK / 2;
function hand(length, width, angleDeg, yCenter) {
  // Build a flat bar centered at origin then rotate about Y, then translate.
  return box(width, HOUR_HAND_THICK, length, true)
    .translate(0, yCenter, length / 2 - 0.6)  // pivot near short end
    .rotate([0, 1, 0], angleDeg)
    .color('#e8c84a');
}
const hourHand = hand(7.0, 1.3, -50, HOUR_HAND_Y_CENTER);
const minuteHand = hand(10.0, 1.0, 40, MIN_HAND_Y_CENTER);
const hourPart = watch.part('yellow hour hand', hourHand);
const minPart = watch.part('yellow minute hand', minuteHand);
watch.fixed('hour hand on pinion', dial, hourPart, { origin: [0, DIAL_Y_FRONT, 0] });
watch.fixed('minute hand above hour hand', dial, minPart, { origin: [0, DIAL_Y_FRONT, 0] });

// Central pinion cap — sits in front of both hands.
const pinion = cylY(PIN_THICK, 0.85, PIN_Y_BACK).color('#e8c84a');
const pinionPart = watch.part('central pinion cap', pinion);
watch.fixed('pinion centered on dial', dial, pinionPart, { origin: [0, DIAL_Y_FRONT, 0] });

// =============================================================================
// PENDANT — short pink rectangular block sitting on top of the frame, like
// the "neck" between the case and the bail on a real pocket watch. Carries
// the crown on its top face and serves as the anchor for the bail post.
// =============================================================================
// Height: ~4 mm, ~8% of the case corner-to-corner span (~50 mm) — modest
// so it doesn't dominate the silhouette. Width 8 mm (X) — smaller than the
// case top flat (which has an X-span of 2·CASE_FLAT·tan(π/8) ≈ 14.5 mm) so
// it visually reads as a separate stub rather than a continuation of the
// case. Depth matches the frame (Y = FRAME_DEPTH) so it sits flush front-back.
// Tapered pendant — base wider than the top, so the silhouette steps inward
// toward the bail (matches a real pocket-watch neck better than a flat-sided
// block). Built as a polygon extrusion: trapezoidal cross-section in the
// X-Z plane, extruded along Y by PENDANT_DEPTH.
const PENDANT_BASE_HALF_X = 4.5;                    // base half-width (X)
const PENDANT_TOP_HALF_X = 3.2;                     // top half-width (X) — narrower than base
const PENDANT_HEIGHT = 4.0;
const PENDANT_DEPTH = FRAME_DEPTH;
const PENDANT_Z_BASE = FRAME_FLAT;                  // 23 — top of frame
const PENDANT_Z_TOP = PENDANT_Z_BASE + PENDANT_HEIGHT;   // 27
// Polygon vertices (XZ plane, CCW): bottom-left, bottom-right, top-right, top-left.
// extrudePolygon extrudes along +Z by PENDANT_DEPTH; rotate(X, -90°) then maps
// the polygon plane onto XY (originally XZ) and the extrusion direction onto
// world -Y. Then translate to place the pendant base at world Z = PENDANT_Z_BASE.
const pendantPts = [
  [-PENDANT_BASE_HALF_X, 0],
  [+PENDANT_BASE_HALF_X, 0],
  [+PENDANT_TOP_HALF_X, PENDANT_HEIGHT],
  [-PENDANT_TOP_HALF_X, PENDANT_HEIGHT],
];
const pendantBlock = extrudePolygon(pendantPts, PENDANT_DEPTH)
  // rotate(X, +90°) maps original (x, y, z) → (x, -z, y), so polygon-Y becomes
  // world-Z (height, preserves sign) and the +Z extrusion direction becomes
  // world -Y. Then translate by +PENDANT_DEPTH/2 in Y to centre the prism on
  // world Y = 0, and by PENDANT_Z_BASE in Z to set the base flush with the
  // frame top.
  .rotate([1, 0, 0], 90)
  .translate(0, PENDANT_DEPTH / 2, PENDANT_Z_BASE)
  // Fillet softens all edges — the trapezoidal taper + fillet matches the
  // reference's soft, rounded neck silhouette.
  .fillet(0.4)
  .color('#f8b3c0');
const pendant = watch.part('pink pendant block above frame', pendantBlock);
watch.fixed('pendant on top of frame', frame, pendant, { origin: [0, 0, PENDANT_Z_BASE] });

// =============================================================================
// CROWN — yellow knurled knob on the pendant top, slightly offset in X so
// the crown axis isn't perfectly co-linear with the bail post (a perfectly
// coaxial stack reads ambiguously; a small offset matches real pocket
// watches' crowns sitting at the 1-2 o'clock side of the pendant neck).
// =============================================================================
const CROWN_X_OFFSET = 2.7;                         // offset to one side of the pendant top — clears the bail torus tube
const CROWN_KNOB_R = 1.2;                           // knob radius — keep within the pendant's ±3.2 mm tapered top
const CROWN_KNOB_H = 1.7;                           // total knob height above pendant — visible from the iso pose
const CROWN_STEM_R = 0.6;
const CROWN_STEM_H = 0.45;                          // short stub between pendant top and the knob
// Knurled hex-prism knob (6 facets) — reads as a winding wheel.
const knobHexPts = [];
for (let k = 0; k < 6; k += 1) {
  const a = (k / 6) * Math.PI * 2;
  knobHexPts.push([Math.cos(a) * CROWN_KNOB_R, Math.sin(a) * CROWN_KNOB_R]);
}
const crownStem = cylZ(CROWN_STEM_H, CROWN_STEM_R, PENDANT_Z_TOP, 24)
  .translate(CROWN_X_OFFSET, 0, 0)
  .color('#e8c84a');
const crownKnob = extrudePolygon(knobHexPts, CROWN_KNOB_H)
  .translate(CROWN_X_OFFSET, 0, PENDANT_Z_TOP + CROWN_STEM_H)
  .color('#e8c84a');
const crown = crownStem.union(crownKnob);
const crownPart = watch.part('yellow crown', crown);
watch.fixed('crown atop the pendant', pendant, crownPart, { origin: [CROWN_X_OFFSET, 0, PENDANT_Z_TOP] });

// =============================================================================
// LANYARD LOOP — pink half-torus mounted on a short bail post above the pendant.
// The bail axis is at x = 0 (centered on the pendant top), the crown is offset
// by CROWN_X_OFFSET so the two parts read as distinct silhouettes from the
// iso pose. Closest surface-to-surface gap between bail post and crown knob:
// 2.0 (offset) − 0.5 (bail post radius) − 1.4 (knob radius) = 0.1 mm — they
// just clear without interference.
// =============================================================================
// Built as the top half of a torus whose axis runs along world +Y. The torus
// hole therefore opens along ±Y, so the camera (looking from -Y) sees the
// circular through-hole — a real chain could be threaded through it.
const LOOP_MAJOR_R = 2.5;    // through-hole radius
const LOOP_TUBE_R  = 0.55;   // tube cross-section radius
const loopCenterZ  = PENDANT_Z_TOP + 5.0;             // 32 — center of torus; raised so tube bottom clears the crown knob hex
const LOOP_TOP_Z_ACTUAL = loopCenterZ + LOOP_MAJOR_R + LOOP_TUBE_R;  // ~35.05 apex
// Bail post: thin pink cylinder rising from the pendant top up into the torus
// tube. Centered at world x=0. Post base at PENDANT_Z_TOP (flush with pendant
// top face) — no socket required since the volumes are tangent, not overlapping.
const BAIL_POST_BASE_Z = PENDANT_Z_TOP;                          // 27
const BAIL_POST_TOP_Z  = loopCenterZ - LOOP_MAJOR_R + LOOP_TUBE_R * 0.4;  // sinks ~0.24 mm into torus tube
const BAIL_POST_R      = 0.5;
const BAIL_POST_LEN    = Math.max(0.6, BAIL_POST_TOP_Z - BAIL_POST_BASE_Z);

// Full torus: axis = world +Z by default. Rotate(+90° about world X) to
// re-orient axis along world +Y; the hole opens along ±Y facing the camera.
const loopFull = torus(LOOP_MAJOR_R, LOOP_TUBE_R, 48)
  .rotate([1, 0, 0], 90)
  .translate(0, 0, loopCenterZ);
// Cut away everything at z < LOOP_BASE_Z to leave just the upper half.
const loopCutter = box(40, 30, 100, true).translate(0, 0, LOOP_BASE_Z - 50);
const bailPost = cylZ(BAIL_POST_LEN, BAIL_POST_R, BAIL_POST_BASE_Z, 24);
const loopShape = loopFull
  .subtract(loopCutter)
  .union(bailPost)
  .color('#f8b3c0');
const loop = watch.part('pink lanyard loop', loopShape);
watch.fixed('lanyard loop attached above pendant', pendant, loop, { origin: [0, 0, BAIL_POST_BASE_Z] });

// (Ribbon omitted — a flat plank doesn't read as fabric at the iso pose and
// would inflate the model's Z extent, breaking the camera-fit framing.)

return watch.model();
