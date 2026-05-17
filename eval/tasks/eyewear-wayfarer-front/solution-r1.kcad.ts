// Ray-Ban Meta Wayfarer — front face.
// Coordinate convention: Z up, Y depth (smallest Y = camera-facing front), X width.
// All units in mm. Built from spec only (no photo reference).
//
// path() sketches in XY; .extrude() extrudes in +Z. We rotate +90° around X then
// translate +Y by DEPTH so the silhouette lands in XZ (wing-top at world Z=+31,
// bridge-bottom at Z=-25) and depth sits in world Y[0, DEPTH] with the front
// face at Y=0 (camera-facing) and back face at Y=DEPTH.

const DEPTH = 10;

// ---- Front silhouette (right half built in XY, then rotated) ----
// Sketch (x, y) maps to world (X, Z) after +90°X rotation. CCW.
// X[0..70], Y[-25..31]. Wing top R=6, bottom-outer R=6.
const half = path()
  .moveTo(0, -25)
  // bottom edge with slight sag (lazy smile)
  .sagittaArc(63, -25, -0.5)
  // bottom-outer corner R=6
  .radiusArc(69, -19.5, 6)
  // outer edge with slight convex bow
  .sagittaArc(64, 25, 1.5)
  // wing top corner R=6
  .radiusArc(58, 31, 6)
  // top edge straight to bridge-top
  .lineTo(11, 31)
  // bridge curve down to center
  .radiusArc(0, 24, 8)
  .close();

// Sketch extrude +Z [0..DEPTH]. +90°X rotation maps sketch +Y -> world +Z and
// extrude +Z -> world -Y, so body Y in [-DEPTH, 0]. Translate +Y by DEPTH puts
// it in [0, DEPTH] (front Y=0).
const halfBody = half.extrude(DEPTH).rotate([1, 0, 0], 90).translate(0, DEPTH, 0);
const body = halfBody.mirror('yz');

// ---- Lens cuts (built and rotated identically) ----
const rightLens = path()
  .moveTo(9 + 5, -19.5)
  .lineTo(63 - 7, -19.5)
  .radiusArc(63, -19.5 + 7, 7)
  .lineTo(61, 19.5 - 3)
  .radiusArc(61 - 3, 19.5, 3)
  .lineTo(9 + 3, 19.5)
  .radiusArc(9, 19.5 - 3, 3)
  .lineTo(9, -19.5 + 5)
  .radiusArc(9 + 5, -19.5, 5)
  .close();

// Extrude DEPTH+4, translate sketch (0,0,-2) so cutter sketch.z in [-2, 12].
// +90°X rotation: cutter world.y in [-12, 2]. Then translate +Y by DEPTH:
// cutter world.y in [DEPTH-12, DEPTH+2] = [-2, 12]. Body Y[0,10] fully inside.
const rightLensCut = rightLens
  .extrude(DEPTH + 4)
  .translate(0, 0, -2)
  .rotate([1, 0, 0], 90)
  .translate(0, DEPTH, 0);

const leftLens = path()
  .moveTo(-(9 + 5), -19.5)
  .radiusArc(-9, -19.5 + 5, 5)
  .lineTo(-9, 19.5 - 3)
  .radiusArc(-(9 + 3), 19.5, 3)
  .lineTo(-(61 - 3), 19.5)
  .radiusArc(-61, 19.5 - 3, 3)
  .lineTo(-63, -19.5 + 7)
  .radiusArc(-(63 - 7), -19.5, 7)
  .close();

const leftLensCut = leftLens
  .extrude(DEPTH + 4)
  .translate(0, 0, -2)
  .rotate([1, 0, 0], 90)
  .translate(0, DEPTH, 0);

let frame = body.subtract(rightLensCut).subtract(leftLensCut);

// ---- Camera (LEFT side only) ----
// Ø8.4 × 2.2 axis along Y, upper-outer corner of LEFT lens, recessed.
const CAM_X = -55;
const CAM_Z = 12;
const camHousing = cylinder(2.2, 4.2)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -0.4, CAM_Z); // base poked slightly forward of front face Y=0

const camLens = cylinder(0.5, 2.8)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -0.8, CAM_Z)
  .material({
    baseColor: '#080808',
    metalness: 0.0,
    roughness: 0.08,
    clearcoat: 0.9,
    clearcoatRoughness: 0.05,
    ior: 1.5,
  });

const ledDot = cylinder(0.6, 0.9)
  .alongAxis([0, 1, 0])
  .translate(-30, -0.4, 16)
  .material({
    baseColor: '#202020',
    metalness: 0.1,
    roughness: 0.4,
  });

// ---- Lens inserts (tinted glass, recessed 1mm) ----
const rightLensInsert = path()
  .moveTo(9 + 5 + 0.5, -19.5 + 0.5)
  .lineTo(63 - 7 - 0.5, -19.5 + 0.5)
  .radiusArc(63 - 0.5, -19.5 + 7 + 0.5, 6.5)
  .lineTo(61 - 0.5, 19.5 - 3 - 0.5)
  .radiusArc(61 - 3 - 0.5, 19.5 - 0.5, 2.5)
  .lineTo(9 + 3 + 0.5, 19.5 - 0.5)
  .radiusArc(9 + 0.5, 19.5 - 3 - 0.5, 2.5)
  .lineTo(9 + 0.5, -19.5 + 5 + 0.5)
  .radiusArc(9 + 5 + 0.5, -19.5 + 0.5, 4.5)
  .close();

const leftLensInsert = path()
  .moveTo(-(9 + 5 + 0.5), -19.5 + 0.5)
  .radiusArc(-(9 + 0.5), -19.5 + 5 + 0.5, 4.5)
  .lineTo(-(9 + 0.5), 19.5 - 3 - 0.5)
  .radiusArc(-(9 + 3 + 0.5), 19.5 - 0.5, 2.5)
  .lineTo(-(61 - 3 - 0.5), 19.5 - 0.5)
  .radiusArc(-(61 - 0.5), 19.5 - 3 - 0.5, 2.5)
  .lineTo(-(63 - 0.5), -19.5 + 7 + 0.5)
  .radiusArc(-(63 - 7 - 0.5), -19.5 + 0.5, 6.5)
  .close();

const LENS_THICKNESS = 2.0;
// Place insert so its front face is recessed 1mm behind model front (Y=1).
// Sketch extrude Z by 2; +90°X maps to world -Y[-2, 0]; +DEPTH puts at Y[DEPTH-2, DEPTH].
// That's at the BACK — wrong. We want at Y=1..3 (recessed 1 from Y=0).
// Translate sketch (0,0,-1) so sketch Z in [-1, 1] -> world Y[-1, 1] -> +DEPTH = [9, 11].
// Still wrong direction. Compute fresh:
//   sketch extrude Z[0,2] + sketch translate (0,0,t) -> sketch Z[t, t+2]
//   +90°X: world Y = -sketch.z, so world.y range [-(t+2), -t]
//   +DEPTH: world.y range [DEPTH-(t+2), DEPTH-t]
// Want world.y range [1, 3]. Solve DEPTH-(t+2) = 1 -> t = DEPTH - 3 = 7.
const rightInsert = rightLensInsert
  .extrude(LENS_THICKNESS)
  .translate(0, 0, DEPTH - 3)
  .rotate([1, 0, 0], 90)
  .translate(0, DEPTH, 0)
  .material({
    baseColor: '#101418',
    metalness: 0.0,
    roughness: 0.10,
    clearcoat: 0.6,
    ior: 1.5,
  });

const leftInsert = leftLensInsert
  .extrude(LENS_THICKNESS)
  .translate(0, 0, DEPTH - 3)
  .rotate([1, 0, 0], 90)
  .translate(0, DEPTH, 0)
  .material({
    baseColor: '#101418',
    metalness: 0.0,
    roughness: 0.10,
    clearcoat: 0.6,
    ior: 1.5,
  });

// ---- Temples ----
// rect 5(X) x 12(Z) x 60(Y), -5° rake about X, hinge at back-outer-upper.
// Extend in +Y (away from camera) from Y = DEPTH (back face).
const TEMPLE_LEN = 60;
const HINGE_X = 64 - 2.5;
const HINGE_Y = DEPTH; // back face of body
const HINGE_Z = 18;
const rightTemple = box(5, TEMPLE_LEN, 12, true)
  .rotate([1, 0, 0], -5)
  .translate(HINGE_X, HINGE_Y + TEMPLE_LEN / 2, HINGE_Z)
  .material({
    baseColor: '#1a1a1a',
    metalness: 0.0,
    roughness: 0.25,
    clearcoat: 0.5,
  });

const leftTemple = box(5, TEMPLE_LEN, 12, true)
  .rotate([1, 0, 0], -5)
  .translate(-HINGE_X, HINGE_Y + TEMPLE_LEN / 2, HINGE_Z)
  .material({
    baseColor: '#1a1a1a',
    metalness: 0.0,
    roughness: 0.25,
    clearcoat: 0.5,
  });

// ---- Apply material to frame ----
const frameFinished = frame.material({
  baseColor: '#6c6c6c',
  metalness: 0.0,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.05,
  ior: 1.55,
});

const camHousingColored = camHousing.material({
  baseColor: '#3a3a3a',
  metalness: 0.2,
  roughness: 0.3,
});

return frameFinished
  .union(camHousingColored)
  .union(camLens)
  .union(ledDot)
  .union(rightInsert)
  .union(leftInsert)
  .union(rightTemple)
  .union(leftTemple);
