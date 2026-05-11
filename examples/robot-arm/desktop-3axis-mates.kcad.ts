// Parametric desktop 3-axis robot arm — v0.6 mate-graph rewrite.
//
// Same geometry + same body-tree topology as the v0.5
// `desktop-3axis.kcad.ts`, but joints are declared via the v0.6 mate
// vocabulary (`partRef.connector(...)` + `arm.mate(...)`) instead of the
// v0.5 helpers (`arm.fixed/.revolute`). Each link is still authored in its
// OWN LOCAL FRAME — mate-FK (`solveMates`, T16) plants the children where
// the mates land. Visual output under default pose params matches the v0.5
// hero pixel-for-pixel: same connector origins as the v0.5 joint origins,
// child connectors all at [0,0,0] so the per-mate SE(3) collapses to the
// v0.5 body-tree FK math.
//
// 3 revolute mates (base-yaw, shoulder-pitch, elbow-pitch) expose articulation
// DOF; the other 9 fastened mates couple decorative link-internal parts to
// their parent link. Open tree — no closed loops — so the mate solver
// classifies as `solved` in one pass.

// ---- pose parameters (live sliders) -------------------------------------
const baseYawDeg       = param('baseYawDeg',       20,  { min: -180, max: 180 });
const shoulderPitchDeg = param('shoulderPitchDeg', 35,  { min:  -45, max: 135 });
const elbowPitchDeg    = param('elbowPitchDeg',   -55,  { min: -120, max: 120 });

// ---- geometry parameters -------------------------------------------------
// Footprint and base.
const baseW         = param('baseW',         140, { min: 80,  max: 240 });
const baseD         = param('baseD',         140, { min: 80,  max: 240 });
const plateT        = param('plateT',          6, { min:  3,  max:  15 });

// Servo dimensions (standard hobby servo silhouette).
const servoW        = param('servoW',         40, { min: 20,  max:  60 });
const servoD        = param('servoD',         20, { min: 12,  max:  30 });
const servoH        = param('servoH',         38, { min: 25,  max:  55 });
const servoFlangeT  = param('servoFlangeT',    3, { min:  2,  max:   6 });
const servoFlangeOver = param('servoFlangeOver', 8, { min:  4, max:  16 });
const hornR         = param('hornR',           9, { min:  5,  max:  16 });
const hornT         = param('hornT',           4, { min:  2,  max:   8 });

// Pivots / shafts.
const pivotDia      = param('pivotDia',        6, { min:  3,  max:  12 });
const shaftLen      = param('shaftLen',       18, { min: 12,  max:  60 });

// Link beams.
const upperArmLen   = param('upperArmLen',   140, { min: 80,  max: 220 });
const forearmLen    = param('forearmLen',    120, { min: 60,  max: 180 });
const beamW         = param('beamW',          22, { min: 14,  max:  40 });
const beamT         = param('beamT',          12, { min:  8,  max:  22 });
const ribT          = param('ribT',            4, { min:  2,  max:   8 });
const ribH          = param('ribH',            6, { min:  3,  max:  12 });

// Yoke cheeks (flanking plates around joint shafts).
const yokeCheekT    = param('yokeCheekT',      5, { min:  3,  max:  10 });
const yokeCheekW    = param('yokeCheekW',     46, { min: 28,  max:  80 });
const yokeCheekH    = param('yokeCheekH',     46, { min: 28,  max:  80 });

// ---- derived (symbolic ParamRef arithmetic) ------------------------------
const halfBaseW       = baseW.divide(2);
const halfBaseD       = baseD.divide(2);
const halfBeamT       = beamT.divide(2);
const halfYokeCheekH  = yokeCheekH.divide(2);
const halfYokeCheekW  = yokeCheekW.divide(2);
const halfServoH      = servoH.divide(2);
const halfUpperArm    = upperArmLen.divide(2);
const halfForearm     = forearmLen.divide(2);

// Heights in the BASE local frame.
const baseServoCenterZ = plateT.add(halfServoH);
const baseFlangeZ      = plateT.add(servoH).subtract(servoFlangeT.divide(2));

// Height in the SHOULDER local frame at which shoulder-pitch axis lives.
// Local origin (0,0,0) is at the base-yaw pivot output (top of base horn).
// Pitch shaft sits up some distance through the cheek-yoke.
const shoulderColumnH  = param('shoulderColumnH', 50, { min: 30, max: 110 });
const shoulderPitchZ   = shoulderColumnH;        // pitch axis at top of column

// ---- BASE link (root, no parent mate -> identity world transform) -------
// Authored sitting on the desk: footprint plate at z=0..plateT, column above.
// All sub-parts of the base are attached via fastened mates so they share
// the base's identity transform.

const arm = assembly('desktop 3-axis parametric arm');

// 1. Base footprint plate (the chassis).
const basePlateShape = box(baseW, baseD, plateT, true)
  .fillet(1.5)
  .holes('top', {
    positions: [
      { u: halfBaseW.subtract(10).negate(), v: halfBaseD.subtract(10).negate() },
      { u: halfBaseW.subtract(10),          v: halfBaseD.subtract(10).negate() },
      { u: halfBaseW.subtract(10).negate(), v: halfBaseD.subtract(10)          },
      { u: halfBaseW.subtract(10),          v: halfBaseD.subtract(10)          },
    ],
    diameter: 4,
    depth: 'through',
    name: 'baseFootScrews',
  })
  .translate(0, 0, plateT.divide(2))
  .color('plate');
const basePart = arm.part('base-plate', basePlateShape);

// 2. Base yaw servo (body + flange + cable lug).
//    The servo IS the structural carrier on the plate; an extra "column"
//    riser only intersected the servo body and added no real strength.
const baseServoStack = box(servoW, servoD, servoH, true)
  .translate(0, 0, baseServoCenterZ)
  .union(
    box(servoW.add(servoFlangeOver.multiply(2)), servoD, servoFlangeT, true)
      .translate(0, 0, baseFlangeZ),
  )
  .union(
    box(8, servoD.add(4), 8, true).translate(0, 0, plateT.add(7)),
  )
  .color('servo');
const baseServoPart = arm.part('base-yaw-servo', baseServoStack);

// 3. Base yaw output horn + shaft (as a single visual cluster).
const baseHornStack = cylinder(hornT, hornR, 32)
  .translate(0, 0, plateT.add(servoH))
  .union(
    cylinder(shaftLen, pivotDia.divide(2), 32)
      .translate(0, 0, plateT.add(servoH).add(hornT)),
  )
  .color('shaft');
const baseHornPart = arm.part('base-yaw-output', baseHornStack);

// ---- SHOULDER link (child of base-yaw mate) -----------------------------
// Authored in shoulder local frame: (0,0,0) sits at the base-yaw axis exit.
// The link is a yoke that holds the shoulder-pitch servo and shaft.

// 5. Shoulder column — thin spine connecting base-yaw output to the yoke
//    above. Was a wide block that engulfed every other shoulder part; now
//    a slim post the cheeks fan out around.
const spineR = beamT.divide(2);
const shoulderColumnShape = cylinder(shoulderColumnH, spineR, 32)
  .color('frame');
const shoulderColumnPart = arm.part('shoulder-column', shoulderColumnShape);

// 6. Shoulder yoke cheeks (two flanking plates that carry the pitch shaft).
//    Pushed OUT in X past the spine so they don't intersect it. Y reduced
//    from yokeCheekW (=46) to a clearance band around the upper-arm beam.
const cheekY = beamW.add(2);   // cheek depth in Y (along beam axis)
const cheekClearX = spineR.add(2);  // distance from spine to cheek inner face
const shoulderCheekL = box(yokeCheekT, cheekY, yokeCheekH, true)
  .translate(cheekClearX.add(yokeCheekT.divide(2)), 0, shoulderPitchZ)
  .color('plate');
const shoulderCheekR = box(yokeCheekT, cheekY, yokeCheekH, true)
  .translate(cheekClearX.add(yokeCheekT.divide(2)).negate(), 0, shoulderPitchZ)
  .color('plate');
const shoulderCheeks = shoulderCheekL.union(shoulderCheekR);
const shoulderCheeksPart = arm.part('shoulder-cheeks', shoulderCheeks);

// 7. Shoulder pitch servo — mounted EXTERNALLY on the front face of the
//    cheeks (extending into +Y), not inside the yoke or onto the side
//    where it would sweep through the upper-arm beam's pitched arc.
const shoulderServoMountY = cheekY.divide(2).add(yokeCheekT.divide(2));
const shoulderPitchServo = box(servoH, servoD, servoW, true)
  .translate(0, shoulderServoMountY.add(servoD.divide(2)), shoulderPitchZ)
  .color('servo');
const shoulderServoPart = arm.part('shoulder-pitch-servo', shoulderPitchServo);

// ---- UPPER ARM link (child of shoulder-pitch mate) ----------------------
// Authored in upper-arm local frame: (0,0,0) at shoulder-pitch axis.
// Upper arm extends along +X, with structural ribs and an elbow yoke at the
// distal end.

// 8. Upper-arm beam (proximal-end-anchored along +X).
const upperArmBeamShape = box(upperArmLen, beamW, beamT, true)
  .holes('top', {
    positions: [
      { u: halfUpperArm.subtract(beamW), v: 0 },
      { u: halfUpperArm.subtract(beamW).negate(), v: 0 },
      { u: 0, v: 0 },
    ],
    diameter: 3,
    depth: 'through',
    name: 'upperArmLightening',
  })
  .fillet(2)
  .translate(halfUpperArm, 0, 0)
  .color('beam');
const upperArmRibTop = box(upperArmLen.subtract(20), ribT, ribH, true)
  .translate(halfUpperArm, 0, halfBeamT.add(ribH.divide(2)))
  .color('beam');
const upperArmRibBot = box(upperArmLen.subtract(20), ribT, ribH, true)
  .translate(halfUpperArm, 0, halfBeamT.add(ribH.divide(2)).negate())
  .color('beam');
const upperArmRootPlate = box(8, beamW.add(4), beamT.add(10), true)
  .translate(0, 0, 0)
  .color('plate');
const upperArmShape = upperArmBeamShape
  .union(upperArmRibTop)
  .union(upperArmRibBot)
  .union(upperArmRootPlate);
const upperArmPart = arm.part('upper-arm-beam', upperArmShape);

// 9. Elbow yoke at the distal end of the upper arm (carries elbow servo).
//    Two flanking plates only — the previous 6mm "yoke base" was a wide
//    cross-bar that intersected the beam and surrounding parts. The two
//    cheeks alone form a U-shape that holds the elbow shaft without a
//    bridging slab.
const elbowCheekY = beamW.add(2);
const elbowYokeCheekL = box(yokeCheekT, elbowCheekY, yokeCheekH, true)
  .translate(upperArmLen, halfYokeCheekW.subtract(yokeCheekT.divide(2)), halfYokeCheekH)
  .color('plate');
const elbowYokeCheekR = box(yokeCheekT, elbowCheekY, yokeCheekH, true)
  .translate(upperArmLen, halfYokeCheekW.subtract(yokeCheekT.divide(2)).negate(), halfYokeCheekH)
  .color('plate');
const elbowYoke = elbowYokeCheekL.union(elbowYokeCheekR);
const elbowYokePart = arm.part('elbow-yoke', elbowYoke);

// 10. Elbow pitch servo — mounted EXTERNALLY on the +Y cheek's outer face
//     (axis along +Y), not stacked above the joint where it intersected
//     the upper-arm beam, the yoke, and the forearm beam after FK rotation.
const elbowServoMountY = halfYokeCheekW.add(yokeCheekT.divide(2));
const elbowServoStack = box(servoH, servoD, servoW, true)
  .translate(upperArmLen, elbowServoMountY.add(servoD.divide(2)), halfYokeCheekH)
  .color('servo');
const elbowServoPart = arm.part('elbow-pitch-servo', elbowServoStack);

// 11. Shoulder-pitch shaft (cosmetic axle running through the upper-arm root).
const shoulderPitchShaft = cylinder(yokeCheekW.add(10), pivotDia.divide(2), 32)
  .alongAxis([0, 1, 0])
  .translate(0, halfYokeCheekW.add(5).negate(), 0)
  .color('shaft');
const shoulderPitchShaftPart = arm.part('shoulder-pitch-shaft', shoulderPitchShaft);

// ---- FOREARM link (child of elbow-pitch mate) ---------------------------
// Authored in forearm local frame: (0,0,0) at elbow-pitch axis.
// Forearm extends along +X. Slimmer than upper arm, capped with a gripper
// mounting plate.

// 12. Forearm beam.
const forearmBeamShape = box(forearmLen, beamW.subtract(2), beamT.subtract(2), true)
  .fillet(1.5)
  .translate(halfForearm, 0, 0)
  .color('beam');
const forearmRib = box(forearmLen.subtract(16), ribT.subtract(1), ribH.subtract(1), true)
  .translate(halfForearm, 0, halfBeamT.add(ribH.divide(2)).subtract(1))
  .color('beam');
const forearmRootPlate = box(6, beamW.add(2), beamT.add(8), true)
  .translate(0, 0, 0)
  .color('plate');
const forearmShape = forearmBeamShape.union(forearmRib).union(forearmRootPlate);
const forearmPart = arm.part('forearm-beam', forearmShape);

// 13. Gripper mounting plate at the forearm tip.
const gripperPlate = box(6, 28, 28, true)
  .fillet(2)
  .translate(forearmLen.subtract(3), 0, 0)
  .union(
    cylinder(8, 5, 32).alongAxis([1, 0, 0]).translate(forearmLen, 0, 0),
  )
  .union(
    cylinder(14, 1.5, 24).alongAxis([1, 0, 0]).translate(forearmLen.add(4), 0, 0),
  )
  .color('tool');
const gripperPlatePart = arm.part('gripper-plate', gripperPlate);

// 14. Elbow-pitch shaft (cosmetic axle through the forearm root cheeks).
const elbowPitchShaft = cylinder(yokeCheekW.add(10), pivotDia.divide(2), 32)
  .alongAxis([0, 1, 0])
  .translate(0, halfYokeCheekW.add(5).negate(), 0)
  .color('shaft');
const elbowPitchShaftPart = arm.part('elbow-pitch-shaft', elbowPitchShaft);

// ---- MATES ---------------------------------------------------------------
// Body-tree FK convention via the v0.6 mate vocabulary. The parent connector
// of each mate lives at the joint origin in the parent's LOCAL frame; the
// child connector sits at the child's LOCAL [0,0,0]. With both origins set
// this way, the per-mate SE(3) collapses to v0.5's body-tree FK formula
// (`parentT . T(parentOrigin) . R(axis, pose)`), so visual output under
// default poses matches the v0.5 hero pixel-for-pixel.
//
// Joint origins are plain numeric Vec3 (mate-connector ParamRef reactivity is
// on the roadmap). Numerics match the geometry defaults so editing geometry
// params reshapes parts but joint pivots stay put — same convention as v0.5.
const baseTopZNum     = 6 + 38 + 4;          // plateT + servoH + hornT
const shoulderPitchZNum = 50;                // shoulderColumnH default
const upperArmLenNum  = 140;                 // upperArmLen default

// ---- connectors on each part --------------------------------------------
// base-plate: hosts the two fastened mounts (servo, output horn) AND the
// driven base-yaw revolute exiting at the top of the horn.
basePart
  .connector('servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('horn-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('yaw-out', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, baseTopZNum] },
    axis: [0, 0, 1],
  });

baseServoPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
baseHornPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});

// shoulder-column: yaw-input (from base) + decorative cheek/servo mounts +
// the driven shoulder-pitch revolute at the top of the column.
shoulderColumnPart
  .connector('yaw-in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  .connector('cheeks-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('pitch-out', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, shoulderPitchZNum] },
    axis: [0, 1, 0],
  });

shoulderCheeksPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
shoulderServoPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});

// upper-arm-beam: pitch-input (from shoulder column) + decorative elbow yoke /
// elbow servo / shoulder-pitch-shaft mounts + the driven elbow-pitch revolute
// at the distal end (x = upperArmLenNum).
upperArmPart
  .connector('pitch-in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 1, 0],
  })
  .connector('yoke-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('elbow-servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('shoulder-shaft-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('elbow-out', {
    type: 'axis',
    origin: { kind: 'vec3', value: [upperArmLenNum, 0, 0] },
    axis: [0, 1, 0],
  });

elbowYokePart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
elbowServoPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
shoulderPitchShaftPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});

// forearm-beam: elbow-input (from upper arm) + decorative gripper-plate /
// elbow-pitch-shaft mounts.
forearmPart
  .connector('elbow-in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 1, 0],
  })
  .connector('gripper-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  })
  .connector('elbow-shaft-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
  });

gripperPlatePart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});
elbowPitchShaftPart.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
});

// ---- mate declarations ---------------------------------------------------
// Base-link internals (column / servo / horn ride with the base, which is
// stationary, but binding them via fastened mates documents the ownership
// graph and keeps every part in the same mate-tree).
arm.mate('base-yaw-servo-fix',   'base-plate.servo-mount', 'base-yaw-servo.mount', 'fastened');
arm.mate('base-yaw-output-fix',  'base-plate.horn-mount',  'base-yaw-output.mount', 'fastened');

// Three driven revolute mates — these are the ones the harness counts.
// Pose ParamRefs are captured on the mate record (T16); recompute-time
// resolution against the session's ParamTable preserves reactivity so
// studio-driven slider edits re-pose the arm without re-running the script.
arm.mate('base-yaw', 'base-plate.yaw-out', 'shoulder-column.yaw-in', 'revolute', {
  pose: baseYawDeg,
});
arm.mate('shoulder-cheeks-fix', 'shoulder-column.cheeks-mount', 'shoulder-cheeks.mount', 'fastened');
arm.mate('shoulder-servo-fix',  'shoulder-column.servo-mount',  'shoulder-pitch-servo.mount', 'fastened');

arm.mate('shoulder-pitch', 'shoulder-column.pitch-out', 'upper-arm-beam.pitch-in', 'revolute', {
  pose: shoulderPitchDeg,
});
arm.mate('elbow-yoke-fix',           'upper-arm-beam.yoke-mount',           'elbow-yoke.mount',           'fastened');
arm.mate('elbow-pitch-servo-fix',    'upper-arm-beam.elbow-servo-mount',    'elbow-pitch-servo.mount',    'fastened');
arm.mate('shoulder-pitch-shaft-fix', 'upper-arm-beam.shoulder-shaft-mount', 'shoulder-pitch-shaft.mount', 'fastened');

arm.mate('elbow-pitch', 'upper-arm-beam.elbow-out', 'forearm-beam.elbow-in', 'revolute', {
  pose: elbowPitchDeg,
});
arm.mate('gripper-plate-fix',     'forearm-beam.gripper-mount',     'gripper-plate.mount',     'fastened');
arm.mate('elbow-pitch-shaft-fix', 'forearm-beam.elbow-shaft-mount', 'elbow-pitch-shaft.mount', 'fastened');

// ---- POSE ---------------------------------------------------------------
// Mate poses are bound to the mate records above via `{ pose: <ParamRef> }`.
// solvedModel({}) resolves them against the session's ParamTable so studio
// param edits reactively re-pose the rendered arm without re-running the
// script.

return arm.solvedModel({});
