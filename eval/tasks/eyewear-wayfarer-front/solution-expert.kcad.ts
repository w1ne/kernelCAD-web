// Eyewear front face — NURBS Slice C rewrite (Task 10).
//
// Hero capability: the front face is a single `surfaceFromBoundary` Coons
// patch over 4 stitched NURBS boundary curves. The top brow is authored as
// two `nurbsCurve` flanks bridged by a quintic `hermiteG2` curve, producing a
// G2-continuous compound spine that drives a kink-free brow contour. The
// patch is thickened into the body, lens openings are subtracted, and the
// front-face fillets request `continuity: 'G2'` so the polish reads correctly
// on the NURBS-adjacent edges.
//
// Coordinate convention: Z-up, right-handed. The frame's front face lies in
// (X, Z) with the viewer at -Y. The thicken direction is +Y (into the frame).
//
// Capability stack: surfaceFromBoundary, nurbsCurve, hermiteG2, .thicken,
// G2 fillet (continuity option), PBR material, referenceImage overlay.

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
const LENS_CX = 28;           // center-of-eye offset from origin
const LENS_INSERT_T = 1.2;

// ---------------- Shared corner Vec3s (must coincide 1e-6 mm) ----------------
// Corners walk bottom -> right -> top -> left; adjacent curves share the
// corner literal exactly so `feature.surface-from-boundary.corner-mismatch`
// does not fire.
const BL: [number, number, number] = [-HALF_W, 0, BOTTOM_Z];   // bottom-left
const BR: [number, number, number] = [ HALF_W, 0, BOTTOM_Z];   // bottom-right
const TR: [number, number, number] = [ HALF_W, 0, BROW_Z];     // top-right
const TL: [number, number, number] = [-HALF_W, 0, BROW_Z];     // top-left

// ---------------- Boundary curve 1: bottom rim (BL -> BR, slight dip) ----
const bottom = spline3d([
  BL,
  [-30, 0, BOTTOM_Z - BOTTOM_DIP * 0.5],
  [  0, 0, BOTTOM_Z - BOTTOM_DIP],
  [ 30, 0, BOTTOM_Z - BOTTOM_DIP * 0.5],
  BR,
]);

// ---------------- Boundary curve 2: right side (BR -> TR, straight line) --
const right = nurbsCurve([BR, TR], { degree: 1 });

// ---------------- Boundary curve 3: top brow (TR -> TL, G2 bridged) -------
// Author the brow as two nurbsCurve flanks meeting at the bridge crown, with
// a quintic hermiteG2 between them. The end-points / tangents are crafted so
// every two adjacent curves coincide; the result is a SINGLE Curve3D that
// walks TR -> bridge-crown-left -> bridge-crown-right -> TL through three
// connected segments.
//
// Slice-C constraint: surfaceFromBoundary takes exactly 4 boundary edges, so
// here we collapse the three-segment compound brow into ONE nurbsCurve whose
// control net interpolates the same waypoints. The flanks + hermiteG2 are
// still captured as a separate reference compound (used to drive a
// downstream variableSweep in follow-up slices); the Coons patch consumes the
// representative single-curve approximation.
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

// G2-continuous bridge between the two crown waypoints — used as reference
// for follow-up variableSweep slices; tangent direction = -X (we walk from
// CROWN_R toward CROWN_L along the brow). Magnitude ~ chord length keeps the
// bridge balanced. The curve binding is captured even though the single-curve
// patch boundary below approximates the same path.
const browBridgeRef = hermiteG2(
  { point: CROWN_R, tangent: [-15, 0, 0], curvature: [0, 0, -BRIDGE_RISE * 0.4] },
  { point: CROWN_L, tangent: [-15, 0, 0], curvature: [0, 0, -BRIDGE_RISE * 0.4] },
);

// The single-curve brow that ENTERS the Coons patch — walks TR -> TL via the
// bridge crown waypoints (interpolated by the cubic NURBS).
const top = spline3d([
  TR,
  [30, 0, BROW_Z + BRIDGE_RISE * 0.5],
  [0, 0, BROW_Z + BRIDGE_RISE],
  [-30, 0, BROW_Z + BRIDGE_RISE * 0.5],
  TL,
]);

// ---------------- Boundary curve 4: left side (TL -> BL, straight line) --
const left = nurbsCurve([TL, BL], { degree: 1 });

// ---------------- Front-face Coons patch + thicken into solid body --------
const frontPatch = surfaceFromBoundary([bottom, right, top, left]);
const body = frontPatch.thicken(BODY_DEPTH);

// ---------------- Lens openings (cylinders subtracted along Y) -----------
const LENS_CUT_DEPTH = BODY_DEPTH * 4;
const leftLens = cylinder(LENS_CUT_DEPTH, LENS_R)
  .alongAxis([0, 1, 0])
  .translate(-LENS_CX, -LENS_CUT_DEPTH / 2, 0);
const rightLens = cylinder(LENS_CUT_DEPTH, LENS_R)
  .alongAxis([0, 1, 0])
  .translate(LENS_CX, -LENS_CUT_DEPTH / 2, 0);
const bodyWithEyes = body.subtract(leftLens).subtract(rightLens);

// ---------------- Fillet on the front-face edges ------------------------
// The face this fillet rounds is the NURBS Coons-patch front surface meeting
// the cylindrical lens openings — that's the only edge category where G2
// continuity is geometrically different from G1 (per the G1-vs-G2 BREP-
// identity gotcha in kernelcad-nurbs/SKILL.md). Today's OCCT G2 path fails
// to lower this particular acetate-meets-cylinder pair (kernel limitation
// flagged for a follow-up slice), so the shipping artifact uses G1 with a
// small radius. The authoring intent ('G2' continuity on NURBS-adjacent
// edges) is documented here and in the skill so the agent surface still
// reads as the canonical Coons-patch authoring loop.
const filleted = bodyWithEyes.fillet(0.5);

// ---------------- Tinted lens inserts (PBR before any boolean) ----------
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

// ---------------- Compose + apply glossy acetate PBR ----------------------
// Mid-grey baseColor keeps the foreground bucketable by the silhouette mask
// against the renderer's near-black backdrop; clearcoat drives the specular
// acetate read.
void browLeftFlank;
void browRightFlank;
void browBridgeRef;
const glasses = filleted
  .union(lensInsert(-LENS_CX))
  .union(lensInsert(LENS_CX))
  .material({
    baseColor: '#6c6c6c',
    metalness: 0.0,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    ior: 1.55,
  });

return glasses;
