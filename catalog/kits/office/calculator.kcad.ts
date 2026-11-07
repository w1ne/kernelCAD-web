// SPDX-License-Identifier: CC0-1.0
// Desktop calculator: a wedge-shaped desk calculator. What makes it one is the
// case rising from a thin front edge to a thicker back, a wide LCD in a dark
// surround near the top showing a row of digits, a solar strip above it, a
// row of small memory keys, and a four-by-five keypad of sculpted keycaps
// whose operator column and ON/C key stand out in an accent colour.
// Generic visualization geometry at about real size (about 150 x 190 mm,
// 31 mm tall at the back), millimetres, Z up, front toward -Y, lowest point
// on z = 0.
meta({
  name: 'calculator',
  license: 'CC0-1.0',
  title: 'Desktop calculator',
  description: "Wedge desk calculator: rounded case rising toward the back, wide LCD with digits in a dark surround, segmented solar strip, five memory keys and a four-by-five keypad of sculpted keycaps with an accent operator column and ON/C key. Material controls: case polymer, LCD glass, keycap plastic, function-key accent; professional, classroom and retro presets.",
  tags: ['calculator', 'desktop calculator', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 2400,
});

const polymer = param('polymer', '#3a4248', { label: 'Case polymer' });
const lcdGlass = param('lcdGlass', '#9fb39a', { label: 'LCD glass' });
const keycapPlastic = param('keycapPlastic', '#e4e3dc', { label: 'Keycap plastic' });
const functionKey = param('functionKey', '#e0703c', { label: 'Function-key accent' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { polymer: '#3a4248', lcdGlass: '#9fb39a', keycapPlastic: '#e4e3dc', functionKey: '#e0703c' },
  classroom: { polymer: '#2f74b5', lcdGlass: '#b9c8a6', keycapPlastic: '#f4f1e6', functionKey: '#f0c33c' },
  retro: { polymer: '#cbbd9e', lcdGlass: '#8a9a7a', keycapPlastic: '#5a5149', functionKey: '#b5462f' },
});

const office = assembly('calculator');
const add = (name, shape) => office.part(name, shape.scale(k));

// Rounded rectangle w x d with corner radius r, as points.
const rrPts = (w, d, r) => {
  const pts = [];
  for (const [cx, cy, a0] of [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270]]) {
    for (let i = 0; i <= 3; i += 1) {
      const a = ((a0 + i * 30) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return pts;
};
const rrect = (w, d, r) => {
  const pts = rrPts(w, d, r);
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Sculpted keycap: a rounded base tapering to a smaller top.
const keycap = (w, d, h) =>
  rrect(w, d, 2.5).loft([rrect(w - 4, d - 3, 2)], {
    planes: [{ plane: 'XY', origin: [0, 0, 0] }, { plane: 'XY', origin: [0, 0, h] }],
    ruled: true,
  });

// Case: a rounded plan prism with its top cut to a slope, 15 mm at the front
// edge and 31 mm at the back.
const W = 150;
const D = 190;
const SLOPE = (Math.atan2(16, D) * 180) / Math.PI;
const TOP_MID = 23;
const cutter = box(400, 400, 100, true).translate(0, 0, 50).rotateX(SLOPE).translate(0, 0, TOP_MID);
add('case', extrudePolygon(rrPts(W, D, 12), 34).subtract(cutter).color(polymer));

// Everything on the top deck is laid out flat (z = 0 on the deck surface,
// y along the slope) and then tipped onto it.
const deck = (shape) => shape.rotateX(SLOPE).translate(0, 0, TOP_MID);

// Display: dark surround, LCD glass and a row of digits.
add('display-surround', deck(extrudePolygon(rrPts(132, 46, 6), 1.5).translate(0, 50, -0.5)).color(polymer));
add('lcd', deck(extrudePolygon(rrPts(116, 30, 3), 1).translate(0, 50, 0.5)).color(lcdGlass));
for (let i = 0; i < 6; i += 1) {
  add(`digit-${i + 1}`, deck(box(5, 14, 0.4, true).translate(46 - i * 10, 50, 1.6)).color(polymer));
}
// Solar strip of four cells.
add('solar-strip', deck(extrudePolygon(rrPts(64, 10, 1.5), 1).translate(30, 83, 0)).color(lcdGlass));
for (let i = 1; i < 4; i += 1) {
  add(`solar-divider-${i}`, deck(box(1, 10, 0.4, true).translate(-2 + i * 16, 83, 1.1)).color(polymer));
}
// Maker plate to the left of the solar strip.
add('maker-plate', deck(box(34, 6, 0.6, true).translate(-42, 83, 0.3)).color(keycapPlastic));

// Memory keys: a row of five small keys.
for (let i = 0; i < 5; i += 1) {
  add(`memory-key-${i + 1}`, deck(keycap(20, 11, 3).translate(-52 + i * 26, 14, 0)).color(i === 4 ? functionKey : keycapPlastic));
}
// Main keypad, four columns by five rows; the right column is the operators.
const COLS = [-48, -16, 16, 48];
const ROWS = [-6, -24, -42, -60, -78];
ROWS.forEach((y, r) => {
  COLS.forEach((x, c) => {
    const accent = c === 3 || (r === 0 && c === 0);
    add(`key-r${r + 1}-c${c + 1}`, deck(keycap(26, 14, 4).translate(x, y, 0)).color(accent ? functionKey : keycapPlastic));
  });
});

return office.model();
