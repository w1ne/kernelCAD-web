// NEMA 17 motor mounting plate: 60 x 60 x 5 mm, a 22.5 mm pilot bore for the
// motor boss, and four M3 clearance holes (ISO 273 normal, 3.4 mm) on the
// 31 mm NEMA 17 bolt square. Hole u/v are offsets from the top-face centre.
const side = 60;
const t = 5;
const half = 31 / 2;

return box(side, side, t)
  .hole('top', { u: 0, v: 0, diameter: 22.5, depth: 'through', name: 'pilotBore' })
  .holes('top', {
    positions: [
      { u: -half, v: -half },
      { u: half, v: -half },
      { u: half, v: half },
      { u: -half, v: half },
    ],
    diameter: 3.4,
    depth: 'through',
    name: 'm3Clear',
  });
