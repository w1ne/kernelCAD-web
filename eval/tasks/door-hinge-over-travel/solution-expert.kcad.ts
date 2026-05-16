// Door hinged to a wall via one revolute mate.
//
// The hinge must allow the door to swing through 0°-95° without the panel
// clashing back into the wall at any sampled pose. The pose-envelope review
// gate samples min, mid (interior), and max of the declared travel range;
// every sample must be interference-free.
//
// Pedagogy:
// - Place the door's hinge connector at ONE VERTICAL EDGE of the door, NOT
//   at the door's centerline. A center-pivoted door would sweep half its
//   panel back through the wall at large opening angles.
// - Place the hinge axis ON the wall's front face (y=0) so the v0.7.5
//   joint-axis binding gate (Gate 2) admits it as intersecting the wall's
//   BREP. The axis line at world-y=0 hits the wall's front face plane
//   within Gate 2's positional tolerance.
// - On the door side, build a small hinge knuckle around the hinge axis
//   (door-local origin) so Gate 2 binds the axis to the door's BREP too.
//   Offset the door panel itself by HINGE_GAP_MM from the hinge axis so
//   the panel's back-face hinge-side corner doesn't graze the wall at
//   large opening angles. The knuckle is small enough that it never
//   intrudes into the wall during the envelope sweep.
// - Use axis [0, 0, -1] for both connectors so positive joint travel
//   carries the door INTO the room (negative world-y), away from the wall.

const WALL_W   = 500;   // wall width (along world x)
const WALL_T   = 100;   // wall thickness (along world y, the depth of the wall)
const WALL_H   = 1000;  // wall height (along world z)

const DOOR_W   = 300;   // door panel width (along door-local +x at pose 0)
const DOOR_T   =  40;   // door panel thickness (along door-local -y at pose 0)
const DOOR_H   = 800;   // door panel height (along world z)

const HINGE_X      = -200; // hinge x in world; offset from wall center so the
                           // door does not extend past the wall's left edge
const HINGE_Z      =  500; // hinge z (mid-height of wall and door)
const HINGE_GAP_MM =   5;  // clearance between door panel and wall front face
const KNUCKLE_R    =   3;  // hinge knuckle radius on the door side
const KNUCKLE_H    =  40;  // knuckle height (along door-local z)
const MORTISE_W    =  20;  // mortise width (along world x) cut into the wall
const MORTISE_D    =  KNUCKLE_R + HINGE_GAP_MM; // mortise depth into wall
const MORTISE_H    =  KNUCKLE_H + 20; // mortise height (along world z)

const door = assembly('door-hinge-over-travel');

// Wall: centered horizontally at x=0, sitting on the ground (z=0..WALL_H),
// front face at y=0, depth extending into +y. The "room" is the half-space y<0.
// A small mortise is cut into the wall front face at the hinge to receive the
// door's hinge knuckle without interference — same as a real door jamb.
const wallBody = box(WALL_W, WALL_T, WALL_H, true)
  .translate(0, WALL_T / 2, WALL_H / 2);
const wallMortise = box(MORTISE_W, MORTISE_D + 1, MORTISE_H, true)
  .translate(HINGE_X, MORTISE_D / 2 - 0.5, HINGE_Z);
const wallShape = wallBody.subtract(wallMortise).color('frame');
const wallPart = door.part('wall', wallShape);

// Door: authored in its own local frame. The hinge knuckle is centered on
// door-local origin (which mates onto the hinge axis); the panel is offset
// by HINGE_GAP_MM in -y AND set back PANEL_OFFSET_X in +x so the panel's
// hinge-side edge doesn't sweep into the wall during 95° rotation.
const PANEL_OFFSET_X = HINGE_GAP_MM * 2 + KNUCKLE_R; // 13mm offset clears wall
const doorPanel = box(DOOR_W, DOOR_T, DOOR_H, true)
  .translate(PANEL_OFFSET_X + DOOR_W / 2, -DOOR_T / 2 - HINGE_GAP_MM, 0);
const doorKnuckle = cylinder(KNUCKLE_H, KNUCKLE_R).translate(0, 0, -KNUCKLE_H / 2);
const doorShape = doorPanel.union(doorKnuckle).color('plate');
const doorPart = door.part('door', doorShape);

// Wall hinge connector: inside the mortise so the axis line intersects the
// wall's BREP (Gate 2). Axis [0,0,-1] means positive revolute pose rotates
// the child clockwise when viewed from +z, which carries the door body into
// -y (into the room).
wallPart.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: [HINGE_X, 0, HINGE_Z] },
  axis: [0, 0, -1],
});

// Door hinge connector: at door-local origin, which sits inside the hinge
// knuckle so the axis intersects the door's BREP (Gate 2). Axis matches
// the wall connector so the mate is compatible.
doorPart.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, -1],
});

// One revolute mate: 0° = closed (door panel parallel to wall front), 95° = open.
door.mate('hinge', 'wall.hinge', 'door.hinge', 'revolute', {
  limitsDeg: [0, 95],
});

return door.solvedModel({});
