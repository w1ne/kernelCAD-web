// Wayfarer front face — V slice rewrite (recognizable Ray-Ban Meta).
// Uses path().spline() (V4 tangent extension) for wing + bridge curves.
// Uses Curve3D.analytics.divideByEqualArcLength (V2) for lens centers.
// Uses Curve3D.analytics.closestPoint (V2) to snap camera position to brow.

referenceImage('./reference.jpg', { plane: 'xz', anchor: 'origin', scale: 'fit-bbox', opacity: 0.3 });

// ---- Parameters (mm) ----
const W = 150;
const H = 50;
const DEPTH = 10;
const BROW_Z = H / 2;        // +25
const BOTTOM_Z = -H / 2;     // -25
const OUTER_RIM = 5;         // rim thickness outside the lens
const LENS_W_TOP = 50;       // lens width at top edge
const LENS_W_BOT = 44;       // lens width at bottom edge (narrower → trapezoid)
const LENS_H = 38;
const LENS_CR = 7;           // lens corner rounding
const NOSE_NOTCH_W = 12;
const NOSE_NOTCH_D = 4;
const CAMERA_R = 4;          // camera lens radius (~8 mm dia)
const LED_R = 0.75;          // LED dot radius (~1.5 mm dia)

// ---- Outer silhouette: Wayfarer wing on top, gentle bottom curve ----
const silhouette = path()
  // bottom edge: start at bottom-left, gentle bow downward, back up
  .moveTo(-W/2, BOTTOM_Z + 4)
  .spline(
    [[-W/2, BOTTOM_Z + 4], [-W/2 + 6, BOTTOM_Z], [-W/2 + 22, BOTTOM_Z - 1]],
    { startTangent: [4, -3] },
  )
  .lineTo(W/2 - 22, BOTTOM_Z - 1)
  .spline(
    [[W/2 - 22, BOTTOM_Z - 1], [W/2 - 6, BOTTOM_Z], [W/2, BOTTOM_Z + 4]],
    { endTangent: [4, 3] },
  )
  // right vertical (slightly tapered inward at top)
  .lineTo(W/2 + 2, BROW_Z - 7)
  // upper-right wing: pronounced outward flare then sharp inward sweep
  .spline(
    [[W/2 + 2, BROW_Z - 7], [W/2 + 5, BROW_Z - 1], [W/2 - 10, BROW_Z + 1]],
    { startTangent: [1, 5], endTangent: [-10, 0] },
  )
  // top edge: pronounced brow dome with central peak
  .spline(
    [[W/2 - 10, BROW_Z + 1], [W/4, BROW_Z + 4], [0, BROW_Z + 5], [-(W/4), BROW_Z + 4], [-(W/2 - 10), BROW_Z + 1]],
    { startTangent: [-10, 1], endTangent: [-10, -1] },
  )
  // upper-left wing (mirror)
  .spline(
    [[-(W/2 - 10), BROW_Z + 1], [-(W/2) - 5, BROW_Z - 1], [-(W/2) - 2, BROW_Z - 7]],
    { startTangent: [-10, 0], endTangent: [-1, -5] },
  )
  .close();

// ---- Front-face body ----
const body = silhouette.extrude(DEPTH).alongAxis([0, 1, 0]);

// ---- Brow curve: 3D NURBS for arc-length lens placement ----
// Spans ±58 so that divideByEqualArcLength(4) puts samples [1] and [3]
// at ±29, exactly the lens centers needed for 50mm lenses with a
// 16mm bridge gap (lens spans -54..-4 and +4..+54, bridge from -4..+4).
const BROW_SPAN = 58;
const brow = spline3d([
  [-BROW_SPAN,     0, BROW_Z - 4],
  [-BROW_SPAN/2,   0, BROW_Z - 2],
  [0,              0, BROW_Z - 1],
  [BROW_SPAN/2,    0, BROW_Z - 2],
  [BROW_SPAN,      0, BROW_Z - 4],
]);
// divideByEqualArcLength(4) → 5 samples at s=0,1/4,1/2,3/4,1.
// Samples [1] and [3] are the lens centers (left + right).
const samples = brow.analytics.divideByEqualArcLength(4);
const leftLensCx = samples[1].pt[0];
const rightLensCx = samples[3].pt[0];

// ---- Trapezoidal lens cutout (Wayfarer signature) ----
function lensCutoutSketch() {
  const wt = LENS_W_TOP / 2;     // top half-width
  const wb = LENS_W_BOT / 2;     // bottom half-width (narrower)
  const hh = LENS_H / 2;
  const r = LENS_CR;
  // Walk: BL → BR → TR → TL → BL with rounded corners via splines.
  // Coords are in lens-local (X horizontal, Y vertical when sketch later
  // rotated through alongAxis([0,1,0]) so sketch-Y → world-Z).
  return path()
    .moveTo(-wb + r, -hh)                // start bottom-left rounded corner end
    .lineTo(wb - r, -hh)                 // along bottom edge
    .spline(                              // bottom-right rounded corner
      [[wb - r, -hh], [wb, -hh + r * 0.4], [wb, -hh + r]],
      { startTangent: [r * 0.6, 0] },
    )
    .lineTo(wt, hh - r)                  // tapered right side (wider at top)
    .spline(                              // top-right rounded corner
      [[wt, hh - r], [wt - r * 0.4, hh], [wt - r, hh]],
      { startTangent: [0, r * 0.6] },
    )
    .lineTo(-wt + r, hh)                 // top edge
    .spline(                              // top-left rounded corner
      [[-wt + r, hh], [-wt, hh - r * 0.4], [-wt, hh - r]],
      { startTangent: [-r * 0.6, 0] },
    )
    .lineTo(-wb, -hh + r)                // tapered left side
    .spline(                              // bottom-left rounded corner
      [[-wb, -hh + r], [-wb + r * 0.4, -hh], [-wb + r, -hh]],
      { startTangent: [0, -r * 0.6] },
    )
    .close();
}

const cutDepth = DEPTH * 3;
const leftLensCut = lensCutoutSketch()
  .extrude(cutDepth).alongAxis([0, 1, 0])
  .translate(leftLensCx, -cutDepth/2, 0);
const rightLensCut = lensCutoutSketch()
  .extrude(cutDepth).alongAxis([0, 1, 0])
  .translate(rightLensCx, -cutDepth/2, 0);

// ---- Bridge nose-notch: half-circle cut into the bottom of the bridge ----
// Bridge sits between the two lens-opening tops (Z ≈ +19) and the frame top
// (BROW_Z = +25). A cylinder centred at (0, 0, +19) with radius NOSE_NOTCH_D
// punches a half-circular arch into the bridge bottom.
const noseNotch = cylinder(cutDepth, NOSE_NOTCH_D)
  .alongAxis([0, 1, 0])
  .translate(0, -cutDepth/2, LENS_H/2);

// ---- Camera lens on LEFT side (asymmetric Meta detail) ----
// Find the brow point near the OUTER-TOP corner of the left lens.
// Outer-top corner of left lens ≈ (leftLensCx - LENS_W_TOP/2, BROW_Z - 3).
const cameraTargetX = leftLensCx - LENS_W_TOP / 2 + 2;
// closestPoint() returns Vec3 directly (not { pt, t, distance }).
const cameraPt = brow.analytics.closestPoint([cameraTargetX, 0, BROW_Z - 4]);

const cameraCut = cylinder(3, CAMERA_R)
  .alongAxis([0, 1, 0])
  .translate(cameraPt[0], -1.5, cameraPt[2] - 2);

const ledCut = cylinder(2, LED_R)
  .alongAxis([0, 1, 0])
  .translate(cameraPt[0] + CAMERA_R + 4, -1, cameraPt[2] - 1);

// ---- Compose: subtract lenses, then bridge notch, then camera + LED ----
let frame = body;
frame = frame.subtract(leftLensCut);
frame = frame.subtract(rightLensCut);
frame = frame.subtract(noseNotch);
frame = frame.subtract(cameraCut);
frame = frame.subtract(ledCut);

return frame.material({
  baseColor: '#1a1a1a',
  metalness: 0.0,
  roughness: 0.22,
  clearcoat: 0.7,
  clearcoatRoughness: 0.08,
  ior: 1.55,
});
