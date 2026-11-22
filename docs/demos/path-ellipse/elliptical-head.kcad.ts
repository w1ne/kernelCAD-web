// 2:1 semi-elliptical vessel head, 200 mm outside diameter, 4 mm wall.
//
// The profile is drawn in the sketch plane with X as the radius and Y as the
// vessel axis, then revolved about the Y axis. The outside and the inside of
// the dish are quarter ellipses on one centre; a 20 mm straight flange joins
// the head to the shell.

const OUTER_RADIUS = 100;   // mm, 200 mm outside diameter
const DISH_DEPTH = 50;      // mm outside, a 2:1 ellipse (radius : depth)
const WALL = 4;             // mm
const FLANGE = 20;          // mm, straight flange below the dish

const INNER_RADIUS = OUTER_RADIUS - WALL;
const CROWN = FLANGE + DISH_DEPTH;

const profile = path()
  .moveTo(INNER_RADIUS, 0)
  .lineTo(OUTER_RADIUS, 0)
  .lineTo(OUTER_RADIUS, FLANGE)
  // Outside of the dish: counterclockwise from the flange to the crown.
  .ellipseArc(0, CROWN, OUTER_RADIUS, DISH_DEPTH)
  .lineTo(0, CROWN - WALL)
  // Inside of the dish: clockwise from the crown back to the flange.
  .ellipseArc(INNER_RADIUS, FLANGE, INNER_RADIUS, DISH_DEPTH - WALL, { clockwise: true })
  .close();

return profile.revolve();
