// e4: NURBS-emphasized Ray-Ban Meta Wayfarer front face.
//
// The outer brow silhouette is driven by a single nurbsSurface() whose
// 4-row x 11-col control grid encodes the Wayfarer wing-curve along the
// top edge AND the gentler bottom curve. We then .thicken() into a body,
// carve trapezoidal lens openings + bridge notch, and drop the camera/LED
// asymmetry on the LEFT side. PBR acetate material per kernelcad-nurbs.
//
// No path().sagittaArc / tangentArc / lineTo are used for the outer
// silhouette — they're used only for the lens cutouts (rounded trapezoid
// profiles), as permitted by the prompt.

// ---------- dimensions ----------
const W = 144;        // total frame width  (~140mm target; Wayfarer Meta is ~150)
const H = 48;         // total frame height at center
const T = 8.5;        // frame body thickness (Y depth)
const lensW = 50;
const lensH = 36;
const lensCornerR = 4;
const bridgeGap = 18;       // distance between the two lens openings
const noseNotchW = 11;
const noseNotchDepth = 3.2;

// Vertical center of the lens cutouts within the body (Z, from frame center).
const lensZ = -2;

// ---------- NURBS front-face surface ----------
//
// Control grid layout — 4 U-rows (vertical, top->bottom) x 11 V-cols
// (horizontal, left->right). Y is fixed at 0 because we thicken into the
// 3D body afterwards; the U/V control points trace the front-face SHAPE.
//
// V column index   : 0     1     2     3     4     5     6     7     8     9    10
// Position role    : far-L  L-wing L-shoulder L-upper L-bridge bridge R-bridge R-upper R-shoulder R-wing far-R
//
// U row 0  -> TOP brow curve. Outer corners (V=0, V=10) sit HIGHER than
//             center to create the Wayfarer "wing" rake. Bridge dips.
// U row 1  -> upper interior, slight pull toward the top curve.
// U row 2  -> lower interior, slight pull toward the bottom curve.
// U row 3  -> BOTTOM curve. Gentle smile; outer corners slightly higher
//             than the bottom-of-lens trough.
//
// X positions are mirror-symmetric about 0; Z is +up. Y=0 (we live on
// the XZ plane; thicken offsets along the surface normal, i.e. +Y).

const xCols: number[] = [
  -W / 2,            // 0  far-L
  -W / 2 + 7,        // 1  L-wing  (control of upswept brow tip)
  -W / 2 + 18,       // 2  L-shoulder
  -W / 2 + 32,       // 3  L-upper
  -bridgeGap / 2 - 6,// 4  L-bridge-edge
  0,                 // 5  bridge center
   bridgeGap / 2 + 6,// 6  R-bridge-edge
   W / 2 - 32,       // 7  R-upper
   W / 2 - 18,       // 8  R-shoulder
   W / 2 - 7,        // 9  R-wing
   W / 2,            // 10 far-R
];

// Top brow Z values per column — the WAYFARER WING:
// corners sit at H/2 + small lift; center dips at the bridge.
const topZ: number[] = [
   H / 2 - 2,        // 0  far-L  (slightly clipped corner)
   H / 2 + 3.0,      // 1  L-wing  ← peak of the wing
   H / 2 + 1.5,      // 2  L-shoulder
   H / 2 - 0.5,      // 3  L-upper
   H / 2 - 4.0,      // 4  L-bridge-edge (dip toward bridge)
   H / 2 - 5.5,      // 5  bridge top (lowest point of top curve)
   H / 2 - 4.0,      // 6
   H / 2 - 0.5,      // 7
   H / 2 + 1.5,      // 8
   H / 2 + 3.0,      // 9  R-wing
   H / 2 - 2,        // 10 far-R
];

// Bottom curve Z values per column — gentle smile, lifting at the temples.
const botZ: number[] = [
  -H / 2 + 4,        // 0
  -H / 2 + 1,        // 1
  -H / 2 - 1,        // 2
  -H / 2 - 2,        // 3
  -H / 2 - 1.5,      // 4
  -H / 2 - 1,        // 5  bridge bottom (mostly flat)
  -H / 2 - 1.5,      // 6
  -H / 2 - 2,        // 7
  -H / 2 - 1,        // 8
  -H / 2 + 1,        // 9
  -H / 2 + 4,        // 10
];

// Build the 4-row x 11-col control grid. Y=0 throughout; the NURBS
// surface lives on the XZ plane, normal is +Y, .thicken() bakes the body.
const controls: [number, number, number][][] = [];
for (let u = 0; u < 4; u++) {
  const row: [number, number, number][] = [];
  // Interpolate Z between topZ (u=0) and botZ (u=3) with cubic-ish weighting
  // so interior rows track the front-face plane smoothly. Bezier blend at u/3.
  const t = u / 3;
  for (let v = 0; v <= 10; v++) {
    const z = (1 - t) * topZ[v] + t * botZ[v];
    row.push([xCols[v], 0, z]);
  }
  controls.push(row);
}

const frontSurface = nurbsSurface({
  controls,
  degree: { u: 3, v: 5 },   // cubic in vertical, degree-5 in horizontal for the wing curve
});

const body = frontSurface
  .thicken(T)
  .material({
    baseColor: '#070707',
    metalness: 0.0,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    ior: 1.55,
  });

// ---------- lens openings (rounded trapezoids — path() is OK here) ----------
function lensProfile(centerX: number) {
  // Wayfarer-tapered trapezoid: top edge wider than bottom.
  const topHalf = lensW / 2;
  const botHalf = lensW / 2 - 2.5;
  const halfH = lensH / 2;
  // Build a closed rounded trapezoid in XZ, centered at (centerX, lensZ).
  // Path lives in 2D (the cutout will be extruded through the body in Y).
  return path()
    .moveTo(centerX - topHalf + lensCornerR, lensZ + halfH)
    .lineTo(centerX + topHalf - lensCornerR, lensZ + halfH)
    .sagittaArc(centerX + topHalf, lensZ + halfH - lensCornerR, lensCornerR * 0.55)
    .lineTo(centerX + botHalf, lensZ - halfH + lensCornerR)
    .sagittaArc(centerX + botHalf - lensCornerR, lensZ - halfH, lensCornerR * 0.55)
    .lineTo(centerX - botHalf + lensCornerR, lensZ - halfH)
    .sagittaArc(centerX - botHalf, lensZ - halfH + lensCornerR, lensCornerR * 0.55)
    .lineTo(centerX - topHalf, lensZ + halfH - lensCornerR)
    .sagittaArc(centerX - topHalf + lensCornerR, lensZ + halfH, lensCornerR * 0.55)
    .close();
}

const lensCenterDX = bridgeGap / 2 + lensW / 2;
const leftLens  = lensProfile(-lensCenterDX);
const rightLens = lensProfile( lensCenterDX);

// Extrude through the body along Y. The body lives at Y in [0, T] post-thicken;
// extrude depth of T+2, then translate to Y = -1 to fully pass through.
// NB: profile sketches lower on the XY plane by default, so we extrude in
// Z. We instead author the openings as Z-thick prisms and rotate into Y.
const lensCutterL = leftLens .extrude(T + 4).rotate([1, 0, 0], -90).translate(0, T + 2, 0);
const lensCutterR = rightLens.extrude(T + 4).rotate([1, 0, 0], -90).translate(0, T + 2, 0);

// ---------- bridge nose notch ----------
const noseNotch = path()
  .moveTo(-noseNotchW / 2, -H / 2 - 1)
  .lineTo( noseNotchW / 2, -H / 2 - 1)
  .lineTo( noseNotchW / 2 - 1, -H / 2 + noseNotchDepth)
  .sagittaArc(-noseNotchW / 2 + 1, -H / 2 + noseNotchDepth, -1.4)
  .close();

const noseCutter = noseNotch.extrude(T + 4).rotate([1, 0, 0], -90).translate(0, T + 2, 0);

// ---------- left-side camera + LED (asymmetric) ----------
// Camera lens: ~8mm diameter, recessed ~2mm, at upper-outer corner of LEFT lens.
const camRadius = 4.0;
const camRecess = 2.2;
const camX = -lensCenterDX - lensW / 2 + 6;
const camZ =  lensZ + lensH / 2 - 6;
const cameraRecess = cylinder(camRecess + 0.2, camRadius)
  .rotate([1, 0, 0], -90)             // axis -> +Y
  .translate(camX, -0.1, camZ);

// LED dot: ~1.5mm, between camera and bridge, on the brow rim.
const ledRadius = 0.9;
const ledRecess = 0.8;
const ledX = -bridgeGap / 2 - 8;
const ledZ =  H / 2 - 6;
const ledRecessSolid = cylinder(ledRecess + 0.1, ledRadius)
  .rotate([1, 0, 0], -90)
  .translate(ledX, -0.05, ledZ);

// ---------- assemble ----------
let frame = body
  .subtract(lensCutterL, lensCutterR, noseCutter, cameraRecess, ledRecessSolid);

// Soft global chamfer on the perimeter for the acetate body feel.
// Use simple .chamfer with no selector → applies to all edges; the boolean
// removed the lens & notch edges already, so this catches just the silhouette.
frame = frame.chamfer(0.6);

return frame;
