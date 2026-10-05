// Mechanical-core pattern example: a small servo mounting plate.
//
// The base plate uses feature-level holes for named bore refs, then cuts a
// grid-patterned field of vent slots as one editable repeated-feature record.

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

// Vents are through-slots: one slot cutter patterned as a 5 x 2 grid and
// subtracted. box() is corner-anchored (plate x 0..70, y 0..42, z 0..4); the
// 31 x 31 mm slot field is centred on the plate, clear of the four mounting
// holes, with a 3 mm web between the two rows.
const ventSlot = box(3, 14, 6)
  .patternGrid({
    x: { count: 5, direction: [1, 0, 0], spacing: 7 },
    y: { count: 2, direction: [0, 1, 0], spacing: 17 },
  })
  .translate(19.5, 5.5, -1);

return plate.subtract(ventSlot);
