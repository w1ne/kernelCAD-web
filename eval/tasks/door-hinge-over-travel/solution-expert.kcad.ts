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
// - Mount the wall's hinge connector a small clearance OFF the wall front
//   face (HINGE_GAP_MM below). With a finite-thickness door pivoting at a
//   front-face edge, the door's BACK-face hinge-side corner would otherwise
//   graze (and at 95° punch into) the wall as the door opens.
// - Use axis [0, 0, -1] for both connectors so that positive joint travel
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
const HINGE_GAP_MM =    5; // clearance between hinge axis and wall front face;
                           // without this gap the door's back-face hinge-side
                           // corner intrudes into the wall at large angles.

const door = assembly('door-hinge-over-travel');

// Wall: centered horizontally at x=0, sitting on the ground (z=0..WALL_H),
// front face at y=0, depth extending into +y. The "room" is the half-space y<0.
const wallShape = box(WALL_W, WALL_T, WALL_H, true)
  .translate(0, WALL_T / 2, WALL_H / 2)
  .color('frame');
const wallPart = door.part('wall', wallShape);

// Door: authored in its own local frame so its hinge edge sits at local origin.
// The body extends in +x (away from the hinge along the wall's front at pose 0)
// and in -y (into the room) by DOOR_T thickness; centered vertically about z=0.
const doorShape = box(DOOR_W, DOOR_T, DOOR_H, true)
  .translate(DOOR_W / 2, -DOOR_T / 2, 0)
  .color('plate');
const doorPart = door.part('door', doorShape);

// Wall hinge connector: HINGE_GAP_MM in front of the wall front face. Axis
// [0,0,-1] means positive revolute pose rotates the child clockwise when
// viewed from +z, which carries the door body into -y (into the room).
wallPart.connector('hinge', {
  type: 'axis',
  origin: { kind: 'vec3', value: [HINGE_X, -HINGE_GAP_MM, HINGE_Z] },
  axis: [0, 0, -1],
});

// Door hinge connector: at the door's hinge-edge centerline (door-local origin).
// Axis matches the wall connector so the mate is compatible.
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
