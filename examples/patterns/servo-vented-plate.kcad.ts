// Mechanical-core pattern example: a small servo mounting plate.
//
// The base plate uses feature-level holes for named bore refs, then adds a
// grid-patterned vent insert as one editable repeated-feature record.

const plate = box(70, 42, 4)
  .holes('top', {
    positions: [
      { u: -27, v: -14 }, { u: 27, v: -14 },
      { u: -27, v: 14 }, { u: 27, v: 14 },
    ],
    diameter: 3.2,
    depth: 'through',
    name: 'servoMounts',
  });

const ventBar = box(3, 18, 1.2)
  .patternGrid({
    x: { count: 5, direction: [1, 0, 0], spacing: 7 },
    y: { count: 2, direction: [0, 1, 0], spacing: 11 },
  })
  // box() is corner-anchored (plate x 0..70, y 0..42, z 0..4). Centre the
  // 31 x 29 mm bar grid on the plate and stand it on the top face; the old
  // offset assumed a centred plate and left two bars floating beside it
  // (union.disconnected).
  .translate(19.5, 6.5, 4);

return plate.union(ventBar);
