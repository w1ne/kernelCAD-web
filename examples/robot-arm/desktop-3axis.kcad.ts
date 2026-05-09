// Desktop 3-axis robot arm — worked example.
//
// Demonstrates how to compose a fully-parametric multi-part mechanical
// assembly out of generic kernelCAD primitives + the assembly API. The
// kernel does NOT ship a robot-arm template; this example exists to show an
// agent how to build one (or any analogous multi-part artifact) from the
// lean generic toolset.
//
// Three things this example showcases beyond the bare assembly graph:
//
//   1. `arm.solve(poses)` applies a hero pose so the arm reads as articulated
//      from every angle of a 360 rotate (no "all links along +X" silhouette).
//   2. Mechanical detail — fillets on visible edges, recessed servo bays,
//      a structural rib down the back of the shoulder column, a rib along
//      the top of the upper arm — so the model reads as a real desktop
//      robot arm rather than four flat plates.
//   3. Full ParamRef arithmetic on every dimension; setParamValue on any
//      param re-lowers the whole assembly: geometry, connector frames, and
//      joint origins all stay in sync.

// ---- pose params (drive `arm.solve`) ------------------------------------

const baseYaw       = param('baseYaw',       20, { min: -120, max: 120 });
const shoulderPitch = param('shoulderPitch', 35, { min: -45,  max: 135 });
const elbowPitch    = param('elbowPitch',   -55, { min: -120, max: 120 });

// ---- geometry params ----------------------------------------------------

// Base plate (sits flat on the desk; corner-anchored).
const baseX           = param('baseX',          90);
const baseY           = param('baseY',          70);
const baseT           = param('baseT',           8);
const baseFilletR     = param('baseFilletR',     2);
const baseBayX        = param('baseBayX',       40);
const baseBayY        = param('baseBayY',       36);
const baseBayDepth    = param('baseBayDepth',    5);

// Vertical shoulder column (centered; long axis +Z).
const linkWidth        = param('linkWidth',         28);
const linkThickness    = param('linkThickness',     12);
const shoulderHeight   = param('shoulderHeight',    90);
const ribWidth         = param('ribWidth',           6);
const ribThickness     = param('ribThickness',      8);
const plateFilletR     = param('plateFilletR',       1);
const shoulderBayW     = param('shoulderBayW',      18);
const shoulderBayH     = param('shoulderBayH',      16);
const shoulderBayDepth = param('shoulderBayDepth',   4);

// Upper arm + forearm (centered; long axis +X).
const elbowLength    = param('elbowLength',    110);
const elbowWidth     = param('elbowWidth',      22);
const elbowThickness = param('elbowThickness',  10);
const elbowRibHeight = param('elbowRibHeight',   6);
const wristLength    = param('wristLength',     75);
const wristWidth     = param('wristWidth',      18);
const wristThickness = param('wristThickness',   8);

// Tool placeholder — flat tab + parallel-pad gripper silhouette.
const toolLength = param('toolLength', 30);
const toolWidth  = param('toolWidth',  16);
const toolT      = param('toolT',       8);
const padLength  = param('padLength',  18);
const padWidth   = param('padWidth',    3);
const padOffset  = param('padOffset',   5);

// Hardware.
const screwSpacingX = param('screwSpacingX', 60);
const screwSpacingY = param('screwSpacingY', 44);
const screwDiameter = param('screwDiameter',  3);
const pivotDiameter = param('pivotDiameter',  5);

// ---- derived dimensions (stay symbolic via ParamRef arithmetic) ----------

const halfBaseX        = baseX.divide(2);
const halfBaseY        = baseY.divide(2);
const screwHalfX       = screwSpacingX.divide(2);
const screwHalfY       = screwSpacingY.divide(2);
const halfLinkWidth    = linkWidth.divide(2);
const halfLinkT        = linkThickness.divide(2);
const halfShoulderH    = shoulderHeight.divide(2);
const halfElbowLength  = elbowLength.divide(2);
const halfElbowWidth   = elbowWidth.divide(2);
const halfElbowT       = elbowThickness.divide(2);
const halfWristLength  = wristLength.divide(2);
const halfWristWidth   = wristWidth.divide(2);
const halfToolLength   = toolLength.divide(2);

// ---- parts ---------------------------------------------------------------

// Base plate: corner-anchored 90×70×8 mm slab with 4 mounting screws,
// a recessed central servo bay on top, and a central pivot bore.
//
// FALLBACK: the recessed bay is implemented via .subtract(box) instead of
// .cutout(path, {face,depth}). The cutout primitive does not currently
// pre-resolve ParamRef coords on its profile sketch (the profile sketch's
// metadata.commands[*].x.paramRef is not walked by the dispatcher's
// pre-resolve before the lowerer reads command.x.evaluated, so cutout-prism
// construction fails when the profile uses ParamRef arithmetic). The
// .subtract(box) form preserves full ParamRef reactivity on every bay
// dimension and yields the same recessed-pocket silhouette.
//
// Holes drilled BEFORE the subtract so canonical 'top' face refs still
// resolve unambiguously.
//
// Fillet of all edges with a moderate radius gives the casing a desktop-product
// feel rather than a CNC test coupon.
const baseBayPocket = box(baseBayX, baseBayY, baseBayDepth)
  .translate(
    halfBaseX.subtract(baseBayX.divide(2)),
    halfBaseY.subtract(baseBayY.divide(2)),
    baseT.subtract(baseBayDepth),
  );
const basePlate = box(baseX, baseY, baseT)
  .holes('top', {
    positions: [
      { u: screwHalfX.negate(), v: screwHalfY.negate() },
      { u: screwHalfX,          v: screwHalfY.negate() },
      { u: screwHalfX.negate(), v: screwHalfY          },
      { u: screwHalfX,          v: screwHalfY          },
    ],
    diameter: screwDiameter,
    depth: 'through',
    name: 'baseScrews',
  })
  .hole('top', {
    u: 0, v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'basePivot',
  })
  .subtract(baseBayPocket)
  .fillet(baseFilletR);

// Shoulder column: vertical (long axis +Z), centered. Adds a structural rib
// down the back face for visual mass and a recessed servo bay on the front
// face near the top (where the shoulder-pitch motor would mount). Top +
// bottom pivot bores carry the joint pins.
//
// Canonical face conventions (kernelCAD): front = -Y, back = +Y, left = -X,
// right = +X, top = +Z, bottom = -Z. So for box(linkWidth, linkThickness,
// shoulderHeight, centered=true):
//   - front (-Y) face is linkWidth × shoulderHeight  ← bay lives here
//   - back  (+Y) face is linkWidth × shoulderHeight  ← rib unioned here
//   - right (+X) face is linkThickness × shoulderHeight  ← shoulder-pitch pivot bore
//   - top   (+Z) face is linkWidth × linkThickness  ← base-yaw pivot bore
//
// Order: drill bores on the bare column FIRST (so canonical face refs resolve
// unambiguously), then subtract the bay-pocket box, THEN fillet, THEN union
// the rib on the back. Filleting after the rib union would round the rib
// seam, which we don't want.
//
// Same .subtract(box) fallback for the bay (see basePlate note for why).
// Bay sits near the top of the column: bay-center Z = halfShoulderH - 8 -
// halfShoulderBayH/2. Y position pushes it just past the front face.
const shoulderBayCenterZ = halfShoulderH
  .subtract(8)
  .subtract(shoulderBayH.divide(2));
const shoulderBayPocket = box(shoulderBayW, shoulderBayDepth, shoulderBayH, true)
  // Push the pocket so its inboard face sits exactly on the column's front.
  // front (-Y) face is at y = -halfLinkT; the pocket should overlap by
  // shoulderBayDepth into the column. Pocket spans [-D/2, +D/2] in Y centered;
  // place its center at y = -halfLinkT + shoulderBayDepth/2.
  .translate(
    0,
    halfLinkT.negate().add(shoulderBayDepth.divide(2)),
    shoulderBayCenterZ,
  );

// FALLBACK: no all-edges fillet on the column. The combination of a
// through-bore on 'right', a through-bore on 'top', the bay subtract, and
// the rib seam yields too many narrow edges for OCCT to fillet at any
// stable radius without bespoke edge selection. The structural rib + bay
// + bores already give the column plenty of mechanical detail, so the
// raw block silhouette reads as a desktop servo housing.
const column = box(linkWidth, linkThickness, shoulderHeight, true)
  // Bottom-cap pivot — through-bore for the base-yaw joint pin (Z axis).
  .hole('top', {
    u: 0,
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'shoulderBasePivot',
  })
  // Side pivot — through-bore for the shoulder-pitch joint pin (X axis).
  // On 'right' (+X normal): uBasis=Y, vBasis=Z. The pivot sits halfLinkWidth
  // below the top so the pin clears the top cap.
  .hole('right', {
    u: 0,
    v: halfShoulderH.subtract(halfLinkWidth),
    diameter: pivotDiameter,
    depth: 'through',
    name: 'shoulderTopPivot',
  })
  .subtract(shoulderBayPocket);

// Rib: a smaller centered box pushed to the back (+Y) of the column. Unioned
// last so the column's face refs above resolve cleanly before the seam.
const shoulderRib = box(ribWidth, ribThickness, shoulderHeight, true)
  .translate(0, halfLinkT.add(ribThickness.divide(2)), 0);
const shoulderColumn = column.union(shoulderRib);

// Upper arm: centered horizontal beam (long axis +X). A rib runs along the
// top (+Z) face for the full length. Two pivot bores near each end carry the
// shoulder + elbow joint pins. Corners get a small fillet to round the
// silhouette.
//
// Same ordering as the shoulder: holes + fillet on the bare beam FIRST, then
// union with the rib. Keeps canonical face refs resolvable through every op.
const beam = box(elbowLength, elbowWidth, elbowThickness, true)
  .holes('top', {
    positions: [
      { u: halfElbowLength.subtract(halfElbowWidth).negate(), v: 0 },
      { u: halfElbowLength.subtract(halfElbowWidth),          v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: 'elbowPivots',
  })
  .fillet(plateFilletR);
const elbowRib = box(elbowLength, ribThickness, elbowRibHeight, true)
  .translate(0, 0, halfElbowT.add(elbowRibHeight.divide(2)));
const elbowArm = beam.union(elbowRib);

// Forearm: smaller, slimmer, no rib. Pivot bores near each end. Fillet
// for a rounded silhouette.
const wristArm = box(wristLength, wristWidth, wristThickness, true)
  .holes('top', {
    positions: [
      { u: halfWristLength.subtract(halfWristWidth).negate(), v: 0 },
      { u: halfWristLength.subtract(halfWristWidth),          v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: 'wristPivots',
  })
  .fillet(plateFilletR);

// Tool placeholder: a flat tab + two thin parallel pads (gripper jaws)
// sticking forward along +X. Reads as "robot end-effector" in the silhouette
// rather than a featureless stub.
const toolBase = box(toolLength, toolWidth, toolT, true);
const padLeft = box(padLength, padWidth, toolT, true)
  .translate(halfToolLength.add(padLength.divide(2)), padOffset, 0);
const padRight = box(padLength, padWidth, toolT, true)
  .translate(halfToolLength.add(padLength.divide(2)), padOffset.negate(), 0);
const toolPlaceholder = union(toolBase, padLeft, padRight);

// ---- assembly ------------------------------------------------------------

const arm = assembly('desktop 3-axis robot arm');

// Base plate placed at origin. Pivot connector at the top center of the slab
// (corner-anchored: center is at [baseX/2, baseY/2, baseT]).
const base = arm.part('base-plate', basePlate, {
  at: [0, 0, 0],
  connectors: {
    pivot: { origin: [halfBaseX, halfBaseY, baseT], axis: [0, 0, 1] },
  },
});

// Shoulder column: long axis +Z, centered. Local coords:
//   bottom-center = [0, 0, -halfShoulderH] (root connector — sits on base)
//   top-center    = [0, 0, +halfShoulderH] (tip connector — carries elbow)
const shoulder = arm.part('shoulder-column', shoulderColumn, {
  connectors: {
    root: { origin: [0, 0, halfShoulderH.negate()], axis: [0, 0, 1] },
    tip:  { origin: [0, 0, halfShoulderH],          axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: base.connector('pivot'), name: 'base-to-shoulder' },
});

// Upper arm: long axis +X, centered. Local root connector at -X end, tip at +X.
const elbow = arm.part('elbow-arm', elbowArm, {
  connectors: {
    root: { origin: [halfElbowLength.negate(), 0, 0], axis: [0, 1, 0] },
    tip:  { origin: [halfElbowLength,          0, 0], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: shoulder.connector('tip'), name: 'shoulder-to-elbow' },
});

// Forearm: long axis +X, centered.
const wrist = arm.part('wrist-arm', wristArm, {
  connectors: {
    root: { origin: [halfWristLength.negate(), 0, 0], axis: [0, 1, 0] },
    tip:  { origin: [halfWristLength,          0, 0], axis: [0, 1, 0] },
  },
  connect: { connector: 'root', to: elbow.connector('tip'), name: 'elbow-to-wrist' },
});

// Tool placeholder: long axis +X, centered. Mount connector at -X end.
arm.part('tool-placeholder', toolPlaceholder, {
  connectors: {
    mount: { origin: [halfToolLength.negate(), 0, 0], axis: [1, 0, 0] },
  },
  connect: { connector: 'mount', to: wrist.connector('tip'), name: 'wrist-to-tool' },
});

// ---- joints --------------------------------------------------------------

// Joint origins are the parent connector's worldOrigin — symbolic Vec3Param,
// so editing baseX / shoulderHeight / elbowLength reactively moves the joint
// frames alongside the connector frames.

arm.revolute('base-yaw', base, shoulder, {
  axis: [0, 0, 1],
  origin: base.connector('pivot').worldOrigin,
  limitsDeg: [-120, 120],
});

arm.revolute('shoulder-pitch', shoulder, elbow, {
  axis: [0, 1, 0],
  origin: shoulder.connector('tip').worldOrigin,
  limitsDeg: [-45, 135],
});

arm.revolute('elbow-pitch', elbow, wrist, {
  axis: [0, 1, 0],
  origin: elbow.connector('tip').worldOrigin,
  limitsDeg: [-120, 120],
});

// ---- hero pose -----------------------------------------------------------

// `arm.solve(poses)` composes joint-pose rotations onto each part's
// originalShape (inner-to-outer through the ancestor chain) and returns
// the unioned posed model. The defaults above bend the arm into a
// confident posed silhouette so it reads as articulated from every camera
// angle of a 360 demo rotate.
return arm.solve({
  'base-yaw':       baseYaw,
  'shoulder-pitch': shoulderPitch,
  'elbow-pitch':    elbowPitch,
});
