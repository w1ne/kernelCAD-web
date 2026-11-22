// Original kernelCAD hinge assembly used to demonstrate GLB rig export.
// A standard GLB export writes metres by default, scaling these mm dimensions
// for glTF viewers; pass units: 'mm' only for consumers that read kernelCAD extras.
// The boxes are intentional simple blockout geometry; no external mesh is
// used. The base carries a hinge ear, the end face of the lid bears on the
// inner face of that ear, and the hinge axis goes through both. The closed
// lid (0 deg) is 2 mm above the base. The lid is positioned from its named
// connector and revolute mate.

const BASE_W = 60;
const EAR_W = 4;     // hinge ear thickness along the hinge axis (X)
const LID_T = 4;
const HINGE_Y = 3;   // hinge axis position on the base
const HINGE_Z = 12;

const arm = assembly('GLB rig hinge example');

const ear = box(EAR_W, 2 * HINGE_Y, 8).translate(0, 0, 8);
const base = arm.part('base', box(BASE_W, 40, 8).union(ear));
const lid = arm.part('lid', box(BASE_W - EAR_W, 30, LID_T));

base.connector('hinge-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [EAR_W, HINGE_Y, HINGE_Z] },
  axis: [1, 0, 0],
});
lid.connector('hinge-axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, LID_T / 2, LID_T / 2] },
  axis: [1, 0, 0],
});

arm.mate(
  'lid',
  'base.hinge-axis',
  'lid.hinge-axis',
  'revolute',
  { pose: 35, limitsDeg: [0, 110] },
);

return arm.model();
