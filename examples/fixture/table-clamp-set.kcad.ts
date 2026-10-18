// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// A 36 mm tall workpiece clamped on a T-slot table with two M10 clamp sets:
// T-slot nut in the channel, clamping stud, strap clamp over the workpiece,
// step block under the tail, flange nut on top. All hardware comes from
// lib.fixture (nominal envelope solids).
const tableT = 24;
const slot = 12; // channel opening for M10 T-slot nuts
const clampT = 12; // M10 strap clamp thickness
const workH = 36; // level with the M10 step block's step-3 tread
const studBottom = tableT - 7.6; // wing tops (DIN 508 k = 7) 0.6 below the surface
const clampZ = tableT + workH;
const spacing = 80;

// Table section with one T-slot channel along X. The channel follows the
// DIN 508 M10 nut plus clearance: 11.4 + 0.6 opening, 17.5 + 0.8 internal,
// 7 + 0.6 opening depth, 7 + 0.4 internal depth.
const table = box(400, 130, tableT, true)
  .translate(0, 0, tableT / 2)
  .subtract(
    box(400, 12, 7.6, true).translate(0, 0, tableT - 3.8),
    box(400, 18.3, 7.4, true).translate(0, 0, tableT - 7.6 - 3.7),
  )
  .finish('steel');
const work = box(50, 70, workH, true)
  .translate(0, 0, tableT + workH / 2)
  .finish('aluminium');

const fixture = assembly('t-slot-clamp-set');
fixture.part('table', table);
fixture.part('workpiece', work);

for (const side of ['left', 'right'] as const) {
  const x = side === 'left' ? -spacing : spacing;
  const outward = side === 'left' ? -1 : 1;
  const tNut = await lib.fixture.tSlotNut({ thread: 'M10' });
  const stud = await lib.fixture.clampStud({ thread: 'M10', lengthMm: 80 });
  const clamp = await lib.fixture.strapClamp({ thread: 'M10' });
  const block = await lib.fixture.stepBlock({ thread: 'M10' });
  const nut = await lib.fixture.flangeNut({ thread: 'M10' });

  fixture.part(`${side}-t-nut`, tNut.translate(x, 0, tableT - 0.6).finish('steel'));
  fixture.part(`${side}-stud`, stud.translate(x, 0, studBottom).finish('stainless'));
  // The clamp's nose points toward the workpiece: mirror the left one.
  const clampPlaced = side === 'left' ? clamp.rotateZ(180) : clamp;
  fixture.part(`${side}-clamp`, clampPlaced.translate(x, 0, clampZ).finish('steel'));
  // Step block under the tail: the tail sits 77 mm out from the stud, the
  // tread-3 center is 9 mm out from the block origin. 8 mm inboard of the tail
  // keeps the tail on tread 3, clear of the taller step-4 riser.
  const blockPlaced = side === 'left' ? block.rotateZ(180) : block;
  fixture.part(
    `${side}-step-block`,
    blockPlaced.translate(x + outward * (77 - 8 - 9), 0, tableT).finish('anodized'),
  );
  fixture.part(`${side}-flange-nut`, nut.translate(x, 0, clampZ + clampT).finish('steel'));
}

return fixture.model();
