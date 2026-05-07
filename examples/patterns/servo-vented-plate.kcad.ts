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
  .translate(-14, -5.5, 2.6);

return plate.union(ventBar);
