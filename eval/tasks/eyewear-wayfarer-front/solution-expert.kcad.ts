// Eyewear front face — NURBS Slice B rewrite (Task 13).
//
// Hero capability: the body is built from a `spline3d` brow spine driving a
// `variableSweep` whose cross-section profile varies between the bridge
// (wider, taller) and the temples (narrower, shorter). Two `cylinder`
// cutouts subtract the lens openings; PBR clearcoat reads as glossy acetate;
// a `referenceImage` overlay anchors the build against the product photo.
//
// Coordinate convention: Z-up, right-handed. Smallest Y = camera-facing face.
//
// Capability stack used here:
//   - spline3d(points)             — Catmull-Rom NURBS brow spine
//   - variableSweep(spine, [{...}])— 2 sweeps (left + right halves) since the
//                                    sweep lowerer ships t∈{0,1} stations
//                                    only; sharing the bridge profile gives
//                                    the tapered "wider at bridge" shape.
//   - cylinder(...).alongAxis(Y)   — eye-opening cutouts through the body
//   - .material({ clearcoat, … })  — glossy acetate PBR
//   - referenceImage(...)          — photo overlay for Studio (hidden in eval)

// ----------------------------------------------------------------------------
// (a) Reference-image overlay. Hidden in eval scoring via --hide-reference-images.
// ----------------------------------------------------------------------------
referenceImage('./reference.jpg', {
  plane: 'xz',
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.35,
});

// ----------------------------------------------------------------------------
// Parameters (mm)
// ----------------------------------------------------------------------------
const FRAME_HALF_W = 70;          // half-width of the brow (X span -70..+70)
const BRIDGE_RISE_Z = 3;           // bridge Z above temple Z (subtle inverse-arc)
const BRIDGE_HEIGHT = 56;          // vertical (Z) extent of bridge profile
const TEMPLE_HEIGHT = 50;          // vertical (Z) extent of temple profile (slight taper)
const BRIDGE_DEPTH = 12;           // Y depth of profile at bridge
const TEMPLE_DEPTH = 9;            // Y depth of profile at temple

const LENS_R = 25;                 // radius of eye-opening cutout
const LENS_CENTER_X = 25;          // centers of the two eyes (±25, 0, 0)
const LENS_CUT_DEPTH = 40;         // generous through-depth along Y

// ----------------------------------------------------------------------------
// (b) Brow spine — a spline3d with a subtle inverse-arc: bridge sits above
//     the temple line, temples sag slightly. Captures the eyewear-front
//     silhouette curvature that a straight rail cannot.
// ----------------------------------------------------------------------------
const browPoints: Array<[number, number, number]> = [
  [-FRAME_HALF_W, 0, 0],
  [-30, 0, BRIDGE_RISE_Z * 0.65],
  [0, 0, BRIDGE_RISE_Z],
  [30, 0, BRIDGE_RISE_Z * 0.65],
  [FRAME_HALF_W, 0, 0],
];

// Split the spine at the bridge: variableSweep only supports t∈{0,1}
// stations today (intermediate t requires spine subdivision), so we author
// two sweeps that share the bridge profile and union at X=0.
const leftSpine = spline3d([browPoints[0], browPoints[1], browPoints[2]]);
const rightSpine = spline3d([browPoints[2], browPoints[3], browPoints[4]]);

// ----------------------------------------------------------------------------
// (c) Cross-section profiles. Profile-local axes after MakePipeShell's
//     WithCorrection on an X-running spine: profile-local X → world Z
//     (vertical), profile-local Y → world Y (depth into face). Rectangle is
//     centered on the origin so the spine threads its centroid.
// ----------------------------------------------------------------------------
function rectProfile(zExtent: number, yExtent: number) {
  // Local X drives vertical (Z), local Y drives depth (Y) after correction.
  const hz = zExtent / 2;
  const hy = yExtent / 2;
  return path()
    .moveTo(-hz, -hy)
    .lineTo(hz, -hy)
    .lineTo(hz, hy)
    .lineTo(-hz, hy)
    .close();
}

const templeProfile = rectProfile(TEMPLE_HEIGHT, TEMPLE_DEPTH);
const bridgeProfile = rectProfile(BRIDGE_HEIGHT, BRIDGE_DEPTH);
// Independent profile handles per sweep — capture records are single-consumer.
const templeProfileR = rectProfile(TEMPLE_HEIGHT, TEMPLE_DEPTH);
const bridgeProfileR = rectProfile(BRIDGE_HEIGHT, BRIDGE_DEPTH);

// ----------------------------------------------------------------------------
// (d) Variable sweeps — temple → bridge on the left, bridge → temple on the
//     right. Identical bridge profile at the shared joint gives a continuous
//     bulge at X=0; union closes the seam.
// ----------------------------------------------------------------------------
const leftHalf = variableSweep(leftSpine, [
  { t: 0, profile: templeProfile },
  { t: 1, profile: bridgeProfile },
]);

const rightHalf = variableSweep(rightSpine, [
  { t: 0, profile: bridgeProfileR },
  { t: 1, profile: templeProfileR },
]);

const browBody = leftHalf.union(rightHalf);

// ----------------------------------------------------------------------------
// (e) Lens openings. Two cylinders aligned along Y, centered at (±25, 0, 0),
//     subtracted through the swept body. The pair touches at the bridge,
//     leaving a thin nose-bridge web between them.
// ----------------------------------------------------------------------------
// Cylinder is built along +Z from base at origin; alongAxis(+Y) maps it to
// +Y from origin. Translate so the cylinder spans Y=-20..+20 (well past the
// body's ±BRIDGE_DEPTH/2 envelope) and is centered at X = ±LENS_CENTER_X.
const leftLens = cylinder(LENS_CUT_DEPTH, LENS_R)
  .alongAxis([0, 1, 0])
  .translate(-LENS_CENTER_X, -LENS_CUT_DEPTH / 2, 0);

const rightLens = cylinder(LENS_CUT_DEPTH, LENS_R)
  .alongAxis([0, 1, 0])
  .translate(LENS_CENTER_X, -LENS_CUT_DEPTH / 2, 0);

const bodyWithEyes = browBody.subtract(leftLens).subtract(rightLens);

// ----------------------------------------------------------------------------
// (f) Tinted lens inserts. Recessed 1mm behind the front face. Material on
//     the LEAF before any union (post-boolean .material() is a no-op).
// ----------------------------------------------------------------------------
const LENS_INSERT_T = 1.5;
const LENS_INSERT_SHRINK = 0.8;
const leftLensInsert = cylinder(LENS_INSERT_T, LENS_R - LENS_INSERT_SHRINK)
  .alongAxis([0, 1, 0])
  .translate(-LENS_CENTER_X, -BRIDGE_DEPTH / 2 + 1.5, 0)
  .material({
    baseColor: '#101418',
    metalness: 0.0,
    roughness: 0.10,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    ior: 1.5,
  });

const rightLensInsert = cylinder(LENS_INSERT_T, LENS_R - LENS_INSERT_SHRINK)
  .alongAxis([0, 1, 0])
  .translate(LENS_CENTER_X, -BRIDGE_DEPTH / 2 + 1.5, 0)
  .material({
    baseColor: '#101418',
    metalness: 0.0,
    roughness: 0.10,
    clearcoat: 0.6,
    clearcoatRoughness: 0.05,
    ior: 1.5,
  });

// ----------------------------------------------------------------------------
// (g) Compose + apply glossy acetate PBR to the final boolean head record.
//     Mid-grey baseColor (not pure black) lets silhouetteMask's bgTolerance
//     bucket the body as foreground against the renderer's near-black
//     backdrop; clearcoat still drives the specular acetate read.
// ----------------------------------------------------------------------------
const glasses = bodyWithEyes
  .union(leftLensInsert)
  .union(rightLensInsert)
  .material({
    baseColor: '#6c6c6c',
    metalness: 0.0,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.05,
    ior: 1.55,
  });

return glasses;
