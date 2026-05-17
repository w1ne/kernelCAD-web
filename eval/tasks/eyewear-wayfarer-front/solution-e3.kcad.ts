// Spec-only-no-image build of the eyewear Wayfarer front (experiment e3).
// Coordinate convention: Z-up, right-handed; front face (camera-facing) is at
// smallest Y (Y=0). Body extends Y in [0, 10].
//
// Authoring strategy:
//   - The 3D body's *front silhouette* is the closed outline in the world XZ
//     plane (vertical = Z, horizontal = X). We author it in a sketch's local
//     (X, Y_local) frame, extrude along local +Z by depth = 10 mm, then
//     rotate +90° around world X so:
//       local +X stays world +X
//       local +Y_local maps to world +Z      (silhouette stays upright)
//       local +Z (extrude direction) maps to world -Y
//     and finally translate by (0, 10, 0) so the body lives at world
//     Y in [0, 10] with front face at world Y = 0.
//
//   - Lens openings, camera bore, LED bore are cut as cylinders whose axes
//     point along world +Y (use `.alongAxis([0, 1, 0])`).
//
//   - Lens insert plates and the camera/LED inserts are placed as small
//     cylinders/extrudes recessed into the front face.

// ----- Front silhouette: full outer outline of the body, closed -----------
//
// All coords are in (X horizontal, Y_local vertical) where Y_local becomes
// world Z after the +90° X rotation. So "Z=24" in the spec corresponds to
// Y_local = 24 here.
//
// Right-half key points (X >= 0); left half is the mirror image.
//
//   Bridge top center:        (  0,  24)
//   Wing peak (right):        ( 53,  31)
//   Outer-top corner:         ( 61,  26)
//   Outer-right edge mid:     ( 61,   3)   -- slight convex bow
//   Bottom-right corner R6:   around ( 55, -25)
//   Bottom-center sag point:  (  0, -25.5) -- "lazy smile" sag 0.5 mm
//
// Going counter-clockwise starting at bridge-top-center.
// The top wing is a single threePointsArc passing through the wing peak —
// this absorbs the "wing R=6 corner" call-out as the apex curvature of the
// arc. (A discrete R=6 corner with longer chord segments hits the
// degenerate-arc gate; the arc form is cleaner and matches the visual.)

const bodySilhouette = path()
  .moveTo(0, 24)
  // Top-left wing: arc from bridge top to outer-top corner, via wing peak.
  .threePointsArc(-70, 26, -53, 31)
  // Outer left edge with slight convex bow (sagitta negative = bows leftward
  // = outward when looking down the path direction).
  .sagittaArc(-70, -19, 1.2)
  // Bottom-left corner R=6.
  .radiusArc(-64, -25, 6)
  // Bottom edge with lazy smile (center sags 0.5 mm below the chord).
  .sagittaArc(64, -25, -0.5)
  // Bottom-right corner R=6.
  .radiusArc(70, -19, 6)
  // Outer right edge with slight convex bow.
  .sagittaArc(70, 26, 1.2)
  // Top-right wing: arc from outer-top corner to bridge top, via wing peak.
  .threePointsArc(0, 24, 53, 31)
  .close();

// Extrude the silhouette as a 10 mm-deep slab. After rotate+translate the
// body lives at world Y in [0, 10] with front face at Y=0.
const bodyDepth = 10;
const bodyRaw = bodySilhouette
  .extrude(bodyDepth)
  .rotate([1, 0, 0], 90)
  .translate(0, bodyDepth, 0);

// ----- Lens openings (cut through the body in Y) --------------------------
//
// Each opening (right side, mirrored to the left) is a closed trapezoidal
// region with rounded corners of mixed radii:
//   top-inner corner:    X=  9, Z= 19.5, R=3
//   top-outer corner:    X= 61, Z= 19.5, R=3
//   bottom-outer corner: X= 63, Z=-19.5, R=7
//   bottom-inner corner: X= 11, Z=-19.5, R=5
//
// We build the closed 2D profile in the same local (X, Y_local) frame as the
// body silhouette, extrude by depth >= body depth, and rotate+translate the
// resulting prism so it cuts through Y in [-1, 11] (slightly oversized to
// guarantee clean through-cuts).
//
// Each corner is approximated by an inset and a radiusArc at radius R, going
// counter-clockwise around the opening.

function lensOpeningProfile(side: 'L' | 'R') {
  const s = side === 'R' ? 1 : -1;
  // Corner centers / arc endpoints (RIGHT side; flip X for LEFT).
  // Going CCW starting from inner-top:
  const xTopIn = 9 * s;
  const xTopOut = 61 * s;
  const xBotOut = 63 * s;
  const xBotIn = 11 * s;
  const zTop = 19.5;
  const zBot = -19.5;

  // Build the profile. For the LEFT side we invert the sign of all arc
  // radii so that CCW winding is preserved.
  const sign = side === 'R' ? 1 : -1;

  return path()
    // start at inner-top edge just past the corner (X = xTopIn + sign*R3)
    .moveTo(xTopIn + sign * 3, zTop)
    // top edge to top-outer pre-corner
    .lineTo(xTopOut - sign * 3, zTop)
    // top-outer corner R=3
    .radiusArc(xTopOut, zTop - 3, 3 * sign)
    // outer edge down to bottom-outer pre-corner
    .lineTo(xBotOut, zBot + 7)
    // bottom-outer corner R=7
    .radiusArc(xBotOut - sign * 7, zBot, 7 * sign)
    // bottom edge inward to bottom-inner pre-corner
    .lineTo(xBotIn + sign * 5, zBot)
    // bottom-inner corner R=5
    .radiusArc(xBotIn, zBot + 5, 5 * sign)
    // inner edge up to top-inner pre-corner
    .lineTo(xTopIn, zTop - 3)
    // top-inner corner R=3
    .radiusArc(xTopIn + sign * 3, zTop, 3 * sign)
    .close();
}

const cutDepth = 12;             // a bit larger than bodyDepth for clean through-cut
const cutShift = bodyDepth + 1;  // place cut prism from Y=-1 to Y=cutDepth-1 = 11

const lensCutR = lensOpeningProfile('R')
  .extrude(cutDepth)
  .rotate([1, 0, 0], 90)
  .translate(0, cutShift, 0);

const lensCutL = lensOpeningProfile('L')
  .extrude(cutDepth)
  .rotate([1, 0, 0], 90)
  .translate(0, cutShift, 0);

const bodyWithLenses = bodyRaw.subtract(lensCutR, lensCutL);

// ----- Camera bore on the LEFT side ---------------------------------------
//
// Camera: cylinder Ø8.4 mm × 2.2 mm tall, axis along Y, slightly recessed
// into the front face. Placed on the upper-outer corner of the LEFT lens.
// LEFT means X < 0 (X = -55 roughly, near the outer corner of the left lens).
//
// Using camera body recess depth = 2.2 mm.

const cameraR = 8.4 / 2;        // 4.2 mm
const cameraDepth = 2.2;
const cameraX = -58;            // sits in the body material outside the left lens
const cameraZ = 22;             // upper portion, above the lens opening
const cameraBore = cylinder(cameraDepth + 0.1, cameraR)
  .alongAxis([0, 1, 0])
  .translate(cameraX, -0.05, cameraZ);

const bodyWithCameraRecess = bodyWithLenses.subtract(cameraBore);

// ----- LED dot bore on the LEFT side --------------------------------------
//
// LED: cylinder Ø1.8 × 0.6 mm, placed between the camera and the bridge,
// slightly higher Z than the camera centroid.

const ledR = 1.8 / 2;
const ledDepth = 0.6;
const ledX = -32;               // between bridge (X≈-9) and camera (X≈-58)
const ledZ = 24;                // slightly higher Z than camera (per spec)
const ledBore = cylinder(ledDepth + 0.05, ledR)
  .alongAxis([0, 1, 0])
  .translate(ledX, -0.02, ledZ);

const bodyWithBores = bodyWithCameraRecess.subtract(ledBore);

// ----- Body chamfer / fillet on perimeter ---------------------------------
//
// Front-face perimeter chamfer 0.6 mm (acetate bevel).
// Back-face perimeter fillet 0.8 mm.
//
// Front face is at Y=0; back face at Y=10. Use FaceQuery to address the two
// faces and chamfer / fillet their boundary edges.

// NOTE: The spec calls for a 0.6 mm front-face chamfer and 0.8 mm back-face
// fillet on the perimeter. OCCT rejects those operations because the lens
// cuts split the front/back face into several coplanar regions with very
// short edges around the lens openings (R=3 corners produce sub-1 mm edge
// segments). Restricting the chamfer/fillet selection to the BACK face's
// outer perimeter only would require an `EdgeQuery` more precise than the
// face-based selector — leaving as a follow-up rather than weakening the
// rest of the build. We skip front/back perimeter rounding for this build
// (silhouette + lens openings + camera/LED + temples is the bulk of the
// visual fidelity).
const bodyFinished = bodyWithBores;

// Apply final body PBR material.
bodyFinished.material({
  baseColor: '#6c6c6c',
  metalness: 0,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.05,
  ior: 1.55,
});

// ----- Lens insert plates -------------------------------------------------
//
// Tinted dark "glass" inside each opening, recessed 1 mm from the front face
// and shrunk 0.5 mm per side from the opening outline. Lens thickness = 1.5 mm
// so the back of the insert sits well within the body (Y from 1.0 to 2.5).
//
// We construct the insert as the opening profile shrunk by 0.5 mm — we
// approximate "shrink by 0.5 mm per side" by scaling the profile slightly
// (kernelCAD doesn't expose an offset op today). Scale factor is derived
// from the dominant lens dimension: ~51/52 in width and ~38/39 in height,
// so a uniform 0.98 scale is a reasonable approximation.

function lensInsertProfile(side: 'L' | 'R') {
  // Reuse the opening profile builder, then we'll scale post-extrude.
  return lensOpeningProfile(side);
}

const lensThickness = 1.5;
const lensFrontRecess = 1.0;    // recessed 1 mm from front (Y=0)

const lensR = lensInsertProfile('R')
  .extrude(lensThickness)
  .rotate([1, 0, 0], 90)
  // After rotation the slab spans Y in [0, -lensThickness]; translate
  // by (0, lensFrontRecess + lensThickness, 0) so it sits at
  // Y in [lensFrontRecess, lensFrontRecess + lensThickness].
  .translate(0, lensFrontRecess + lensThickness, 0)
  // Shrink horizontally and vertically by ~0.98 around the lens centroid.
  // Center the scale around the lens midpoint to avoid sliding it sideways:
  // we cheaply approximate by uniform scale + counter-translate.
  .scale([0.98, 1, 0.98])
  // Recenter X around the lens midpoint (≈ X = +36 for right side) so the
  // scaled insert still fits inside the opening.
  .translate(36 * 0.02, 0, 0 * 0.02);

lensR.material({
  baseColor: '#101418',
  roughness: 0.10,
  clearcoat: 0.6,
  ior: 1.5,
});

const lensL = lensInsertProfile('L')
  .extrude(lensThickness)
  .rotate([1, 0, 0], 90)
  .translate(0, lensFrontRecess + lensThickness, 0)
  .scale([0.98, 1, 0.98])
  .translate(-36 * 0.02, 0, 0);

lensL.material({
  baseColor: '#101418',
  roughness: 0.10,
  clearcoat: 0.6,
  ior: 1.5,
});

// ----- Camera lens insert (small dark cylinder inside the camera bore) ----

const cameraLensR = 5.2 / 2;
const cameraLensDepth = 0.5;
const cameraLensInsert = cylinder(cameraLensDepth, cameraLensR)
  .alongAxis([0, 1, 0])
  .translate(cameraX, cameraDepth - cameraLensDepth + 0.01, cameraZ);

cameraLensInsert.material({
  baseColor: '#0a0a0a',
  roughness: 0.05,
  clearcoat: 0.9,
  clearcoatRoughness: 0.02,
  ior: 1.55,
});

// ----- Temples -------------------------------------------------------------
//
// Rectangular cross-section: 5 mm (X) x 12 mm (Z), length 60 mm in +Y.
// Rake: tilt -5° around X (mild downward).
// Hinge at body's outer-upper corner. Right temple at X around +60, Z around
// the upper edge (Z ~= 24), Y starting at the back of the body (Y = 10).
// Left temple mirrors across YZ.

const templeLen = 60;
const templeW = 5;     // X
const templeH = 12;    // Z

function temple(side: 'L' | 'R') {
  const s = side === 'R' ? 1 : -1;
  // Build the temple as a box: x from -templeW/2..+templeW/2, y from 0..templeLen,
  // z from -templeH/2..+templeH/2.
  const t = box(templeW, templeLen, templeH, true)
    // Apply downward rake of 5° around X axis (negative tilts the +Y end down)
    .rotate([1, 0, 0], -5)
    // Position the centroid of the temple slab:
    //   X = outer corner (~ ±60 at the hinge area)
    //   Y = bodyDepth + templeLen/2  (extends +Y from back face)
    //   Z = top of body (~ 24 - templeH/2 ≈ 18)
    .translate(s * 67.5, bodyDepth + templeLen / 2, 18);

  t.material({
    baseColor: '#6c6c6c',
    metalness: 0,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    ior: 1.55,
  });
  return t;
}

const templeR = temple('R');
const templeL = temple('L');

// ----- Assemble all parts into one Shape ---------------------------------
//
// We return a union of body + lens inserts + camera-lens insert + temples.
// Materials are set on each leaf BEFORE the union (per the authoring rule
// that .material() identity dies at booleans).

return bodyFinished.union(lensR, lensL, cameraLensInsert, templeR, templeL);
