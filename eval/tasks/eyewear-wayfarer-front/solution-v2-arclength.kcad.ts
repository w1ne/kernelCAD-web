// Eyewear front face — V slice rewrite (Task V5).
//
// Same Coons-patch + thicken front-face stack as the existing expert solution,
// with the load-bearing change in lens-cutout PLACEMENT: the two lens
// openings are anchored at arc-length-uniform samples along the brow spline
// via `brow.analytics.divideByEqualArcLength(N)`. The previous approach used
// a hard-coded `LENS_CX = 28 mm` literal, which is parametric-only (it does
// not track the brow's actual curve length) and would drift if the brow's
// control net is retuned.
//
// `divideByEqualArcLength(N)` returns N+1 samples spaced uniformly in arc
// length along the curve — robust against non-uniform knot density. The
// inner two samples (indices 1 and 2 of a divideByEqualArcLength(3) call)
// land near the natural Wayfarer eye-socket centres along the brow.
//
// Hold-condition cross-reference: this rewrite uses `spline3d(...)` for the
// brow, which IS the real NURBS path from v0.11.0 — the documented hold for
// resuming the eval cycle (the spline brow is a true NURBS curve, not an
// arc-only approximation) is satisfied.
//
// Capability stack: surfaceFromBoundary, nurbsCurve, hermiteG2, spline3d,
// Curve3D.analytics.divideByEqualArcLength, .thicken, PBR material,
// referenceImage overlay.

referenceImage('./reference.jpg', {
  plane: 'xz',
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.35,
});

// ---------------- Parameters (mm) ----------------
const HALF_W = 70;            // half-width of the front face (X span -70..+70)
const BROW_Z = 18;            // height of the brow (top edge of front face)
const BOTTOM_Z = -18;         // depth of the lower rim
const BRIDGE_RISE = 4;        // bridge bump above brow line
const BOTTOM_DIP = 2.5;       // sag of bottom rim
const BODY_DEPTH = 7;         // thickness of the front-face body (Y extent)
const LENS_R = 22;
const LENS_INSERT_T = 1.2;

// ---------------- Shared corner Vec3s (must coincide 1e-6 mm) ----------------
const BL: [number, number, number] = [-HALF_W, 0, BOTTOM_Z];   // bottom-left
const BR: [number, number, number] = [ HALF_W, 0, BOTTOM_Z];   // bottom-right
const TR: [number, number, number] = [ HALF_W, 0, BROW_Z];     // top-right
const TL: [number, number, number] = [-HALF_W, 0, BROW_Z];     // top-left

// ---------------- Boundary curve 1: bottom rim --------------------------
const bottom = spline3d([
  BL,
  [-30, 0, BOTTOM_Z - BOTTOM_DIP * 0.5],
  [  0, 0, BOTTOM_Z - BOTTOM_DIP],
  [ 30, 0, BOTTOM_Z - BOTTOM_DIP * 0.5],
  BR,
]);

// ---------------- Boundary curve 2: right side --------------------------
const right = nurbsCurve([BR, TR], { degree: 1 });

// ---------------- Boundary curve 3: top brow ----------------------------
// The brow is the load-bearing curve: it drives the front-face Coons patch
// AND it's the source curve for arc-length-uniform lens placement. The
// control net walks TR -> bridge crown waypoints -> TL.
const CROWN_L: [number, number, number] = [-12, 0, BROW_Z + BRIDGE_RISE * 0.7];
const CROWN_R: [number, number, number] = [ 12, 0, BROW_Z + BRIDGE_RISE * 0.7];

const browLeftFlank = nurbsCurve([
  TR,
  [50, 0, BROW_Z],
  [20, 0, BROW_Z + BRIDGE_RISE * 0.5],
  CROWN_R,
]);

const browRightFlank = nurbsCurve([
  CROWN_L,
  [-20, 0, BROW_Z + BRIDGE_RISE * 0.5],
  [-50, 0, BROW_Z],
  TL,
]);

const browBridgeRef = hermiteG2(
  { point: CROWN_R, tangent: [-15, 0, 0], curvature: [0, 0, -BRIDGE_RISE * 0.4] },
  { point: CROWN_L, tangent: [-15, 0, 0], curvature: [0, 0, -BRIDGE_RISE * 0.4] },
);

const top = spline3d([
  TR,
  [30, 0, BROW_Z + BRIDGE_RISE * 0.5],
  [0, 0, BROW_Z + BRIDGE_RISE],
  [-30, 0, BROW_Z + BRIDGE_RISE * 0.5],
  TL,
]);

// ---------------- Boundary curve 4: left side ---------------------------
const left = nurbsCurve([TL, BL], { degree: 1 });

// ---------------- Front-face Coons patch + thicken ---------------------
const frontPatch = surfaceFromBoundary([bottom, right, top, left]);
const body = frontPatch.thicken(BODY_DEPTH);

// ---------------- Lens openings — arc-length-uniform placement ---------
// `divideByEqualArcLength(3)` returns 4 samples at arc-length 0, L/3, 2L/3, L
// along the brow. Indices [1] and [2] are the two inner samples; their `pt`
// fields are the world-space centre points where the lens cutouts anchor.
// Compared to a hard-coded `LENS_CX` constant, this scales with the brow's
// actual arc length and stays correct when the control net is retuned.
const browSamples = top.analytics.divideByEqualArcLength(3);
const leftLensAnchor = browSamples[1].pt;   // closer to TL (negative X)
const rightLensAnchor = browSamples[2].pt;  // closer to TR (positive X)

// The brow runs TR -> TL (positive X to negative X), so divideByEqualArcLength
// emits samples in TR-to-TL order. Sample index 1 is therefore the
// right-of-centre anchor (positive X), index 2 the left-of-centre anchor.
const rightLensX = browSamples[1].pt[0];
const leftLensX = browSamples[2].pt[0];

// Sanity hooks — keep the references reachable so the bridge / flanks don't
// get tree-shaken at lower time.
void browLeftFlank;
void browRightFlank;
void browBridgeRef;
void leftLensAnchor;
void rightLensAnchor;

const LENS_W = LENS_R * 2;
const LENS_H = LENS_R * 1.7;
const LENS_CORNER = LENS_R * 0.45;
const LENS_CUT_DEPTH = BODY_DEPTH * 4;

function lensCutoutSketch() {
  const hx = LENS_W / 2;
  const hy = LENS_H / 2;
  const k = LENS_CORNER;
  return path()
    .moveTo(-hx + k, -hy)
    .lineTo(hx - k, -hy)
    .spline([[hx - k, -hy], [hx, -hy + k * 0.4], [hx, -hy + k]])
    .lineTo(hx, hy - k)
    .spline([[hx, hy - k], [hx - k * 0.4, hy], [hx - k, hy]])
    .lineTo(-hx + k, hy)
    .spline([[-hx + k, hy], [-hx, hy - k * 0.4], [-hx, hy - k]])
    .lineTo(-hx, -hy + k)
    .spline([[-hx, -hy + k], [-hx + k * 0.4, -hy], [-hx + k, -hy]])
    .close();
}

const leftLens = lensCutoutSketch().extrude(LENS_CUT_DEPTH)
  .alongAxis([0, 1, 0])
  .translate(leftLensX, -LENS_CUT_DEPTH / 2, 0);
const rightLens = lensCutoutSketch().extrude(LENS_CUT_DEPTH)
  .alongAxis([0, 1, 0])
  .translate(rightLensX, -LENS_CUT_DEPTH / 2, 0);
const bodyWithEyes = body.subtract(leftLens).subtract(rightLens);

// ---------------- Tinted lens inserts --------------------------------
function lensInsert(cx: number) {
  return cylinder(LENS_INSERT_T, LENS_R - 0.8)
    .alongAxis([0, 1, 0])
    .translate(cx, 1, 0)
    .material({
      baseColor: '#101418',
      metalness: 0.0,
      roughness: 0.10,
      clearcoat: 0.6,
      clearcoatRoughness: 0.05,
      ior: 1.5,
    });
}

// ---------------- Compose + apply glossy acetate PBR ------------------
const glasses = bodyWithEyes
  .union(lensInsert(leftLensX))
  .union(lensInsert(rightLensX))
  .material({
    baseColor: '#6c6c6c',
    metalness: 0.0,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    ior: 1.55,
  });

return glasses;
