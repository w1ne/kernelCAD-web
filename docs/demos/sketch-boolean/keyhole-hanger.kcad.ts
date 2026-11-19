// A keyhole hanger plate, 70 × 36 × 3 mm, for two M4 pan-head screws 44 mm
// apart. Every profile is stated as simple shapes and combined with sketch
// booleans; no intersection point is computed by hand.
//
// - intersect: the 70 × 36 blank clipped by an R37 disc gives the outline
//   with four arched corners.
// - union: an Ø9 entry hole, a 4.5 mm slot and its round end give one keyhole.
// - subtract: the two keyholes become holes of the outline.

const blank = path().moveTo(-35, -18).lineTo(35, -18).lineTo(35, 18).lineTo(-35, 18).close();
const outline = await blank.intersect(path().circle(0, 0, 37));

// The screw head (Ø8) enters at y = -4. The plate then drops 10 mm, so the
// shank (Ø4) sits in the slot end at y = 6.
async function keyhole(cx: number) {
  const entry = path().circle(cx, -4, 4.5);
  const slot = path().moveTo(cx - 2.25, -4).lineTo(cx + 2.25, -4).lineTo(cx + 2.25, 6).lineTo(cx - 2.25, 6).close();
  const slotEnd = path().circle(cx, 6, 2.25);
  return entry.union([slot, slotEnd]);
}

const profile = await outline.subtract([await keyhole(-22), await keyhole(22)]);
const plate = profile.extrude(3);

// Check gauges, not catalog parts: an Ø4 shank through the plate and an Ø8
// head above it, at the hang position of each keyhole.
const gauge = (cx: number) =>
  path().circle(cx, 6, 2).extrude(9).translate(0, 0, -6)
    .union(path().circle(cx, 6, 4).extrude(3).translate(0, 0, 3));

return [plate.color('#3b82c4'), gauge(-22).color('#c9ccd1'), gauge(22).color('#c9ccd1')];
