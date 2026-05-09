// Desktop 3-axis robot arm — worked example (body-tree forward kinematics).
//
// Composes a posed multi-link arm out of generic kernelCAD primitives. Each
// link carries real-world orientation BAKED into its local frame (shoulder
// vertical along +Z, forearms forward along +X), so at kinematic-zero the
// arm already reads as articulated before any pose is applied.
//
// Beyond the bare assembly graph, this example showcases:
//
//   1. Mechanical detail — fillets on the basePlate / elbow / wrist edges,
//      recessed servo bays on the basePlate top + shoulder front via
//      `.subtract(box(...))`, a structural rib down the back of the
//      shoulder column, a top-running rib on the elbow forearm, and a
//      parallel-pad gripper silhouette on the tool placeholder. The model
//      reads as a real desktop robot arm rather than four flat plates from
//      every angle of a 360 demo rotate.
//
//   2. arm.solvedModel({ baseYaw, shoulderPitch, elbowPitch }) drives the
//      hero pose via body-tree FK (URDF / MuJoCo / Drake convention). Joint
//      origins are numeric Vec3 in the PARENT'S LOCAL FRAME and stay fixed
//      across geometry-param edits in v1; geometry-side dims still flow
//      through ParamRef arithmetic.
//
//   3. Full ParamRef arithmetic on every geometry dimension; setParamValue
//      on any geometry param re-lowers the whole assembly.
//
// The kernel does NOT ship a robot-arm template; this example exists to
// show an agent how to build one (or any analogous articulated mechanism)
// from the lean generic toolset.

// ---- pose params ---------------------------------------------------------
// Hero pose: tucked-in articulated silhouette so the arm reads from every
// camera angle in a 360 sweep. -75° elbow folds the wrist back toward the
// shoulder without clipping (verified visually).
const baseYawDeg       = 25;
const shoulderPitchDeg = 50;
const elbowPitchDeg    = -75;

// ---- geometry params -----------------------------------------------------

// Base plate (sits flat on the desk; corner-anchored).
const baseX        = param('baseX',        90);
const baseY        = param('baseY',        70);
const baseT        = param('baseT',         8);
const baseFilletR  = param('baseFilletR',   2);
const baseBayX     = param('baseBayX',     40);
const baseBayY     = param('baseBayY',     36);
const baseBayDepth = param('baseBayDepth',  5);

// Shoulder column (vertical; long axis +Z, centered on X/Y).
const linkWidth        = param('linkWidth',        28);
const linkThickness    = param('linkThickness',    14);
const shoulderHeight   = param('shoulderHeight',   90);
const ribWidth         = param('ribWidth',          6);
const ribThickness     = param('ribThickness',      6);
const shoulderBayW     = param('shoulderBayW',     16);
const shoulderBayH     = param('shoulderBayH',     16);
const shoulderBayDepth = param('shoulderBayDepth',  4);

// Elbow forearm (horizontal; long axis +X, proximal-end-anchored).
const elbowLength    = param('elbowLength',    110);
const elbowRibHeight = param('elbowRibHeight',   4);
const elbowFilletR   = param('elbowFilletR',    3);

// Wrist forearm (slightly slimmer than elbow; long axis +X).
const wristLength    = param('wristLength',    75);
const wristWidth     = param('wristWidth',     24);
const wristThickness = param('wristThickness', 12);
const wristFilletR   = param('wristFilletR',    3);

// Tool placeholder — flat tab + parallel-pad gripper silhouette.
const toolLength    = param('toolLength',    30);
const toolWidth     = param('toolWidth',     20);
const padLength     = param('padLength',     14);
const padThickness  = param('padThickness',   4);
const padHeight     = param('padHeight',     16);
const padOffset     = param('padOffset',      6);

// Hardware.
const screwSpacingX = param('screwSpacingX', 60);
const screwSpacingY = param('screwSpacingY', 44);
const screwDiameter = param('screwDiameter',  3);
const pivotDiameter = param('pivotDiameter',  5);

// ---- derived dimensions (stay symbolic via ParamRef arithmetic) ----------

const halfBaseX     = baseX.divide(2);
const halfBaseY     = baseY.divide(2);
const screwHalfX    = screwSpacingX.divide(2);
const screwHalfY    = screwSpacingY.divide(2);
const halfLinkW     = linkWidth.divide(2);
const halfLinkT     = linkThickness.divide(2);
const halfElbowLen  = elbowLength.divide(2);
const halfWristLen  = wristLength.divide(2);

// ---- parts ---------------------------------------------------------------

// Base plate: corner-anchored 90×70×8 mm slab. Adds a recessed central servo
// bay on the top face, four mounting screw holes, a central pivot bore for
// the base-yaw shaft, and a moderate corner fillet for a desktop-product
// silhouette.
//
// FALLBACK: the recessed bay is implemented via .subtract(box) instead of
// .cutout(path, {face,depth}). cutout() does not pre-resolve ParamRef coords
// on its profile sketch in v1 (the dispatcher walks command.x.evaluated but
// not command.x.paramRef), so cutout-prism construction fails when the
// profile uses ParamRef arithmetic. .subtract(box) preserves full ParamRef
// reactivity on every bay dim and yields the same recessed-pocket silhouette.
//
// Hole order: drilled BEFORE the subtract so canonical 'top' face refs still
// resolve unambiguously. Fillet runs LAST so the bay walls + bore lips don't
// confuse OCCT's edge selection.
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
    u: 0,
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'basePivot',
  })
  .subtract(baseBayPocket)
  .fillet(baseFilletR);

// Shoulder column: vertical, centered on X/Y. Contains:
//   - a structural rib unioned to the BACK (+Y) face for visual mass,
//   - a recessed servo bay on the FRONT (-Y) face near the top
//     (where the shoulder-pitch motor would mount),
//   - a top-cap pivot bore for the base-yaw shaft (Z-axis),
//   - a side pivot bore on the right (+X) face for the shoulder-pitch
//     shaft (X-axis).
//
// Canonical face conventions: front = -Y, back = +Y, left = -X, right = +X,
// top = +Z, bottom = -Z. For a centered box(linkWidth, linkThickness,
// shoulderHeight, true):
//   - front (-Y) face is linkWidth × shoulderHeight ← bay pocket here
//   - back  (+Y) face is linkWidth × shoulderHeight ← rib here
//   - right (+X) face is linkThickness × shoulderHeight ← shoulder-pitch bore
//   - top   (+Z) face is linkWidth × linkThickness   ← base-yaw bore
//
// Order: drill bores on the bare column FIRST (so canonical face refs
// resolve unambiguously), THEN subtract the bay-pocket box, THEN union the
// rib. Filleting after the rib union would round the rib seam — and we
// don't fillet at all here per the FALLBACK note below.
//
// Same .subtract(box) fallback for the bay (see basePlate note).
//
// Bay sits near the top of the column. Centered Z position:
//   bay-center-z = shoulderHeight/2 - 8 - shoulderBayH/2
// Bay-Y position pushes the pocket so its inboard face overlaps the column
// front (-Y) by shoulderBayDepth.
const halfShoulderH = shoulderHeight.divide(2);
const shoulderBayCenterZ = halfShoulderH
  .subtract(8)
  .subtract(shoulderBayH.divide(2));
const shoulderBayPocket = box(shoulderBayW, shoulderBayDepth, shoulderBayH, true)
  .translate(
    0,
    halfLinkT.negate().add(shoulderBayDepth.divide(2)),
    shoulderBayCenterZ,
  );

// FALLBACK: no all-edges fillet on the column. Combining a through-bore on
// 'right', a through-bore on 'top', the bay subtract, and the rib seam
// produces too many narrow edges for OCCT to fillet at any stable radius
// without bespoke edge selection. The rib + bay + bores already give the
// column ample mechanical detail, so the raw silhouette reads as a desktop
// servo housing.
const column = box(linkWidth, linkThickness, shoulderHeight, true)
  // Top-cap pivot — through-bore for the base-yaw joint pin (Z axis).
  .hole('top', {
    u: 0,
    v: 0,
    diameter: pivotDiameter,
    depth: 'through',
    name: 'shoulderBasePivot',
  })
  // Side pivot — through-bore for the shoulder-pitch joint pin (X axis).
  // On 'right' (+X normal): uBasis=Y, vBasis=Z. The pivot sits halfLinkW
  // below the top so the pin clears the top cap.
  .hole('right', {
    u: 0,
    v: halfShoulderH.subtract(halfLinkW),
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

// Elbow forearm: centered horizontal beam (long axis +X). Two pivot bores
// near each end carry the shoulder + elbow joint pins. A rib runs along
// the top (+Z) face for most of the length. End-edges get a small fillet
// to round the silhouette.
//
// Same ordering as the shoulder: holes + fillet on the bare beam FIRST,
// then union with the rib. Keeps canonical face refs resolvable through
// every op.
const elbowBeam = box(elbowLength, linkWidth, linkThickness, true)
  .holes('top', {
    positions: [
      { u: halfElbowLen.subtract(halfLinkW).negate(), v: 0 },
      { u: halfElbowLen.subtract(halfLinkW),          v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: 'elbowPivots',
  })
  .fillet(elbowFilletR);
const elbowRib = box(elbowLength.subtract(16), ribThickness, elbowRibHeight, true)
  .translate(0, 0, halfLinkT.add(elbowRibHeight.divide(2)));
const elbowArm = elbowBeam.union(elbowRib);

// Wrist forearm: smaller, slimmer, no rib. Pivot bores near each end.
// End-edges get a fillet for a rounded silhouette.
const halfWristW = wristWidth.divide(2);
const wristArm = box(wristLength, wristWidth, wristThickness, true)
  .holes('top', {
    positions: [
      { u: halfWristLen.subtract(halfWristW).negate(), v: 0 },
      { u: halfWristLen.subtract(halfWristW),          v: 0 },
    ],
    diameter: pivotDiameter,
    depth: 'through',
    name: 'wristPivots',
  })
  .fillet(wristFilletR);

// Tool placeholder: flat tab + two thin parallel pads (gripper jaws)
// sticking forward along +X. Reads as "robot end-effector" in the
// silhouette rather than a featureless stub.
//
// Tab is corner-anchored at the proximal (-X) end so it bolts onto the
// wrist tip. Pads stick forward of the tab along +X, offset symmetrically
// in ±Y, and stand tall in ±Z so the parallel-pad gripper silhouette reads
// from every angle.
const toolTab = box(toolLength, toolWidth, linkThickness)
  .translate(0, toolWidth.divide(2).negate(), linkThickness.divide(2).negate());
const padLeft = box(padLength, padThickness, padHeight)
  .translate(toolLength, padOffset, padHeight.divide(2).negate());
const padRight = box(padLength, padThickness, padHeight)
  .translate(toolLength, padOffset.negate().subtract(padThickness), padHeight.divide(2).negate());
const toolPlaceholder = union(toolTab, padLeft, padRight);

// ---- assembly ------------------------------------------------------------

const arm = assembly('desktop 3-axis robot arm');

const base     = arm.part('base',     basePlate);
const shoulder = arm.part('shoulder', shoulderColumn);
const elbow    = arm.part('elbow',    elbowArm);
const wrist    = arm.part('wrist',    wristArm);
const tool     = arm.part('tool',     toolPlaceholder);

// ---- joints --------------------------------------------------------------
//
// Joint origins live in the PARENT'S LOCAL FRAME (URDF / MuJoCo / Drake
// body-tree FK convention). v1 of the joint API takes plain numeric Vec3
// for `origin` — pose reactivity for joint frames is deferred to a future
// slice, so we hardcode literal numerics matching the param defaults. If
// e.g. baseX is later edited via setParamValue, the basePlate geometry
// rescales but the base-yaw joint origin stays put. Known v1 limitation;
// tracked separately.

// base-yaw: rotates the shoulder column around +Z, anchored at the center
// of the base plate's top face.
arm.revolute('base-yaw', base, shoulder, {
  axis: [0, 0, 1],
  origin: [45, 35, 8], // [baseX/2, baseY/2, baseT] in base local frame
  limitsDeg: [-120, 120],
});

// shoulder-pitch: rotates the elbow forearm around +Y. The shoulder column
// is centered on X/Y; its top-center sits at z = +shoulderHeight/2 in the
// shoulder's local frame.
arm.revolute('shoulder-pitch', shoulder, elbow, {
  axis: [0, 1, 0],
  origin: [0, 0, 45], // [0, 0, shoulderHeight/2] in shoulder local frame
  limitsDeg: [-45, 135],
});

// elbow-pitch: rotates the wrist forearm around +Y at the elbow's distal
// tip. The elbow forearm is centered on X; tip-center sits at x =
// +elbowLength/2 in the elbow's local frame.
arm.revolute('elbow-pitch', elbow, wrist, {
  axis: [0, 1, 0],
  origin: [55, 0, 0], // [elbowLength/2, 0, 0] in elbow local frame
  limitsDeg: [-120, 120],
});

// wrist-tool: rigid attach. Anchors the tool placeholder at the wrist's
// distal tip. Wrist is centered on X; tip-center sits at x = +wristLength/2.
arm.fixed('wrist-tool', wrist, tool, {
  origin: [37.5, 0, 0], // [wristLength/2, 0, 0] in wrist local frame
});

// ---- hero pose -----------------------------------------------------------
// solvedModel() runs body-tree FK and returns the unioned posed Shape via
// SolvedKinematics.toShape(). At pose (baseYaw=25°, shoulderPitch=50°,
// elbowPitch=-75°) the arm reads as a tucked-in articulated silhouette
// from every camera angle. Fixed joints have no DOF and accept no pose.

return arm.solvedModel({
  'base-yaw':       baseYawDeg,
  'shoulder-pitch': shoulderPitchDeg,
  'elbow-pitch':    elbowPitchDeg,
});
