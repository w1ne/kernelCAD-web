// SPDX-License-Identifier: CC0-1.0
// Competition track hurdle: what makes it one is the wide striped top board
// held up on two telescoping uprights, each standing on an L-shaped base whose
// long foot runs back toward the approaching runner and carries a sliding
// counterweight, so the hurdle tips over forward when it is hit. Upright
// tubes have locking knobs at the height holes; diagonal braces stiffen the
// corner; rubber end caps sit on the track. Generic visualization geometry at
// about real size (1.2 m wide, set heights 762-1067 mm), millimetres, Z up,
// runner approaching from +X, feet on z = 0.
meta({
  name: 'track-hurdle',
  license: 'CC0-1.0',
  title: 'Track hurdle',
  description: "Competition track hurdle at about real size: 1.2 m striped top board on two telescoping uprights with height-lock knobs, L-shaped steel bases with diagonal braces, sliding counterweights and rubber end caps. The heightClass choice sets the board to the youth, women's 100 m, men's 400 m or men's 110 m height. Material controls: anodized aluminium, painted base steel, board polymer, board stripes, foot rubber; clubColors, trainingYellow and weathered presets.",
  tags: ['track hurdle', 'hurdle', 'athletics', 'track and field', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const heightClass = param('heightClass', 'women100m', { choices: ['youth', 'women100m', 'men400m', 'men110m'], label: 'Set height' });
const anodizedAluminium = param('anodizedAluminium', '#bcc4c7', { label: 'Anodized aluminium uprights' });
const baseSteel = param('baseSteel', '#2c3136', { label: 'Painted base steel' });
const crossbarPolymer = param('crossbarPolymer', '#f3f1ea', { label: 'Board polymer' });
const boardStripe = param('boardStripe', '#1d1f21', { label: 'Board stripes' });
const footRubber = param('footRubber', '#3a3f42', { label: 'Foot rubber' });
presets({
  clubColors: { anodizedAluminium: '#a5b0b2', boardStripe: '#d84b40', baseSteel: '#2f4f7a' },
  trainingYellow: { crossbarPolymer: '#f2cf3a', boardStripe: '#24272a', baseSteel: '#3d4247' },
  weathered: { anodizedAluminium: '#8f9699', baseSteel: '#5a4f45', crossbarPolymer: '#d8d2c2', boardStripe: '#4a4743', footRubber: '#55534e' },
});

const p = assembly('track-hurdle');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Top of the board: World Athletics set heights.
const TOP = { youth: 762, women100m: 838, men400m: 914, men110m: 1067 }[heightClass.value];
const W = 1200;          // board width (along Y)
const BOARD_H = 70;
const BOARD_T = 12;
const FOOT_L = 700;      // foot length back toward the runner (+X)
const TUBE = 30;         // outer upright tube
const INNER = 24;        // inner telescoping tube
const SLEEVE_TOP = 640;  // top of the fixed outer tube
const uy = W / 2 - 40;   // upright centre

// Top board: rounded-edge plank, the face toward the runner, with stripes.
const boardZ = TOP - BOARD_H / 2;
add('top-board', extrudePolygon(filletPolygon([[-BOARD_T / 2, -BOARD_H / 2], [BOARD_T / 2, -BOARD_H / 2], [BOARD_T / 2, BOARD_H / 2], [-BOARD_T / 2, BOARD_H / 2]], 4), W)
  .rotateX(90).translate(0, W / 2, boardZ).color(crossbarPolymer));
// Alternating stripes on both faces, angled like the classic chevron board.
for (let i = 0; i < 5; i++) {
  const y = -W / 2 + 120 + i * 240;
  for (const sx of [-1, 1]) {
    add(`stripe-${i + 1}-${sx < 0 ? 'back' : 'front'}`, extrudePolygon([[-60, -BOARD_H / 2 + 1], [60, -BOARD_H / 2 + 1], [80, BOARD_H / 2 - 1], [-40, BOARD_H / 2 - 1]], 1.5)
      .rotateX(90).rotateZ(90).translate(sx * (BOARD_T / 2 + 0.2) - (sx < 0 ? 1.5 : 0), y, boardZ).color(boardStripe));
  }
}

for (const [side, sy] of [['left', -1], ['right', 1]]) {
  const y = sy * uy;
  // Board mounting bracket clamping the board to the inner tube.
  add(`${side}-board-bracket`, box(BOARD_T + 10, 46, BOARD_H - 8, true).translate(0, y, boardZ).color(anodizedAluminium));
  // Telescoping uprights: fixed outer tube and sliding inner tube.
  add(`${side}-outer-tube`, box(TUBE, TUBE, SLEEVE_TOP - 30, true).translate(0, y, 30 + (SLEEVE_TOP - 30) / 2).color(anodizedAluminium));
  add(`${side}-inner-tube`, box(INNER, INNER, boardZ - SLEEVE_TOP + 40, true).translate(0, y, SLEEVE_TOP - 40 + (boardZ - SLEEVE_TOP + 40) / 2).color(anodizedAluminium));
  add(`${side}-sleeve-collar`, box(TUBE + 8, TUBE + 8, 16, true).translate(0, y, SLEEVE_TOP - 8).color(baseSteel));
  // Height-lock knob on the runner side of the collar.
  add(`${side}-lock-knob`, cylinder(18, 12, 10).rotateY(90).translate(TUBE / 2 + 4, y, SLEEVE_TOP - 8).color(footRubber));
  // Height holes up the outer tube.
  for (let k = 0; k < 4; k++) add(`${side}-height-mark-${k + 1}`, box(1.2, 10, 10, true).translate(TUBE / 2 + 0.4, y, SLEEVE_TOP - 90 - k * 60).color(baseSteel));

  // L-base: a short cross foot under the upright and the long foot back to +X.
  add(`${side}-base-foot`, box(FOOT_L, 40, 30, true).translate(FOOT_L / 2 - 20, y, 15).color(baseSteel));
  add(`${side}-cross-foot`, box(40, 160, 30, true).translate(0, y - sy * 40, 15).color(baseSteel));
  // Diagonal brace from the foot up to the upright.
  const bx = 260;
  const bz = 300;
  const len = Math.hypot(bx, bz);
  add(`${side}-brace`, box(22, 18, len, true).rotateY(-(Math.atan2(bx, bz) * 180) / Math.PI).translate(bx / 2 + 6, y, 30 + bz / 2 - 10).color(baseSteel));
  // Sliding counterweight on the long foot, with a clamp screw.
  add(`${side}-counterweight`, extrudePolygon(filletPolygon([[-70, -36], [70, -36], [70, 36], [-70, 36]], 10), 48).translate(470, y, 22).color(anodizedAluminium));
  add(`${side}-weight-screw`, cylinder(14, 10, 10).translate(470, y, 70).color(footRubber));
  // Rubber caps at the foot ends.
  add(`${side}-end-cap-back`, box(16, 44, 34, true).translate(FOOT_L - 14, y, 17).color(footRubber));
  for (const s2 of [-1, 1]) add(`${side}-end-cap-${s2 < 0 ? 'out' : 'in'}`, box(44, 16, 34, true).translate(0, y - sy * 40 + s2 * 86, 17).color(footRubber));
}

return p.model();
