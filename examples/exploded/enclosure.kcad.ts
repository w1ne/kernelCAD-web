// Exploded assembly views — a small enclosure: base plate, four standoffs,
// a board, a lid, and four screws. inspect({ of: 'bom' }) groups the
// standoffs (qty 4) and screws (qty 4); exploded render / svg-drawing
// balloons those unique items.
//
// Run:
//   npx tsx src/agent/cli/index.ts render examples/exploded/enclosure.kcad.ts \
//     --explode 1.5 --explode-mode radial --width 512 --height 512 \
//     --out examples/exploded/enclosure-exploded.png --no-watermark --environment studio \
//     --no-mechanism-check
//   npx tsx src/agent/cli/index.ts export svg-drawing examples/exploded/enclosure.kcad.ts \
//     -o examples/exploded/enclosure-drawing.svg \
//     --explode 1.5 --explode-mode radial --balloons --parts-list
//
// MCP equivalent:
//   render_preview({ file, explode: { factor: 1.5, mode: 'radial' }, views: ['iso'], width: 512, height: 512 })
//   export({ target: 'model', file, format: 'svg-drawing', output_path,
//            options: { format: 'svg-drawing', exploded: { factor: 1.5, mode: 'radial' }, balloons: true, partsList: true } })
//
// Expected: isometric PNG shows the stack pulled apart; the drawing's iso
// cell is labelled ISOMETRIC — EXPLODED, with five item balloons matching
// BOM rows (plate, standoff_0 qty 4, board, lid, screw_0 qty 4) and a
// parts-list table above the title block.

const PLATE_W = 80;
const PLATE_D = 60;
const PLATE_H = 3;
const STANDOFF_H = 12;
const BOARD_H = 1.6;
const LID_H = 2;
const INSET = 8;
const BOARD_Z = PLATE_H + STANDOFF_H;
const LID_Z = BOARD_Z + BOARD_H;
const SCREW_Z = LID_Z + LID_H;

const arm = assembly('enclosure');

const plate = arm.part('plate', box(PLATE_W, PLATE_D, PLATE_H), { material: 'aluminum' });
const standoffXY: Array<[number, number]> = [
  [INSET, INSET],
  [PLATE_W - INSET, INSET],
  [INSET, PLATE_D - INSET],
  [PLATE_W - INSET, PLATE_D - INSET],
];
for (let i = 0; i < 4; i++) {
  const [x, y] = standoffXY[i]!;
  plate.connector(`s${i}`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [x, y, PLATE_H] },
    normal: [0, 0, 1],
  });
}
plate.connector('board', {
  type: 'frame',
  origin: { kind: 'vec3', value: [6, 6, BOARD_Z] },
  normal: [0, 0, 1],
});
plate.connector('lid', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, LID_Z] },
  normal: [0, 0, 1],
});
for (let i = 0; i < 4; i++) {
  const [x, y] = standoffXY[i]!;
  plate.connector(`screw${i}`, {
    type: 'frame',
    origin: { kind: 'vec3', value: [x, y, SCREW_Z] },
    normal: [0, 0, 1],
  });
}

for (let i = 0; i < 4; i++) {
  arm.part(`standoff_${i}`, cylinder(3, STANDOFF_H), { material: 'pla' })
    .connector('bottom', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      normal: [0, 0, 1],
    });
  arm.mate(`plate-standoff-${i}`, `plate.s${i}`, `standoff_${i}.bottom`, 'fastened');
}

arm.part('board', box(PLATE_W - 12, PLATE_D - 12, BOARD_H), { material: 'pla' })
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    normal: [0, 0, 1],
  });
arm.mate('plate-board', 'plate.board', 'board.mount', 'fastened');

arm.part('lid', box(PLATE_W, PLATE_D, LID_H), { material: 'abs' })
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    normal: [0, 0, 1],
  });
arm.mate('plate-lid', 'plate.lid', 'lid.mount', 'fastened');

for (let i = 0; i < 4; i++) {
  arm.part(`screw_${i}`, cylinder(1.5, 6), { material: 'steel' })
    .connector('tip', {
      type: 'frame',
      origin: { kind: 'vec3', value: [0, 0, 0] },
      normal: [0, 0, 1],
    });
  arm.mate(`plate-screw-${i}`, `plate.screw${i}`, `screw_${i}.tip`, 'fastened');
}

return arm.model();
