// A tray with a 2 mm wall and a lid that plugs into it, from one outline.
//
// The outline is 60 × 40 mm with R6 corners. `offset(-2)` gives the cavity
// profile: the sides move in 2 mm and the corners become R4, so the wall is
// 2 mm thick everywhere. `offset(-2.2)` gives the lid plug: 0.2 mm clear of
// the wall all round.

// The outline runs counter-clockwise, so each convex corner bulges to the right
// of travel: a negative radiusArc radius.
const outline = path()
  .moveTo(-24, -20).lineTo(24, -20).radiusArc(30, -14, -6)
  .lineTo(30, 14).radiusArc(24, 20, -6)
  .lineTo(-24, 20).radiusArc(-30, 14, -6)
  .lineTo(-30, -14).radiusArc(-24, -20, -6)
  .close();

const cavity = await outline.offset(-2);
const plug = await outline.offset(-2.2);

// Tray: 20 mm tall, 2 mm floor.
const tray = outline.extrude(20).subtract(cavity.extrude(18).translate(0, 0, 2));

// Lid: a 2 mm plate on the rim with a 3 mm plug that enters the tray.
const lid = outline.extrude(2).translate(0, 0, 20).union(plug.extrude(3).translate(0, 0, 17));

return [tray.color('#3b82c4'), lid.color('#e8a33d')];
