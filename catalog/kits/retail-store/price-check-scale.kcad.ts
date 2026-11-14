// SPDX-License-Identifier: CC0-1.0
// Price-check scale: the countertop produce scale beside the fruit aisle.
// What makes it a scale rather than a till: a raked keypad console in front
// of a stainless weighing tray with a raised lip, a slim pole at the back
// carrying a tilted readout head whose seven-segment digits show the weight
// and the price, and a label-printer bulge on the side with its tear-off
// slot. Generic visualization geometry at about real size (0.36 m wide,
// 0.6 m tall), millimetres, Z up, front on -Y.

meta({
  name: "price-check-scale",
  license: 'CC0-1.0',
  title: "Price-check scale",
  description: "Countertop produce scale at about real size: raked keypad console, stainless weighing tray with a raised lip, rear pole carrying a tilted readout head with seven-segment weight and price digits, side label printer with tear-off slot, rubber feet. Material controls: housing, platter, display bezel and readout glow. deliWhite, charcoal and retroOrange presets.",
  tags: ['scale', 'weighing scale', 'produce scale', 'price check', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#e9ecec', { label: 'Housing plastic' });
const platter = param('platter', '#c3cacc', { label: 'Stainless platter' });
const bezel = param('bezel', '#25303a', { label: 'Display bezel' });
const readout = param('readout', '#86f060', { label: 'Readout glow' });

presets({
  deliWhite: { housing: '#e9ecec', platter: '#c3cacc', bezel: '#25303a', readout: '#86f060' },
  charcoal: { housing: '#3a3f44', platter: '#aab3b6', bezel: '#15191c', readout: '#ff9a3a' },
  retroOrange: { housing: '#e0782c', platter: '#d0d5d6', bezel: '#f3efe6', readout: '#d23a2a' },
});

const p = assembly("price-check-scale");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 360;
const FZ = 8;

// Rubber feet and the housing with a raked keypad console at the front.
for (const [k, x, y] of [['lf', -1, -1], ['rf', 1, -1], ['lb', -1, 1], ['rb', 1, 1]]) {
  add(`foot-${k}`, cylinder(FZ, 16, 10).translate(x * (W / 2 - 30), y * 160, 0).color('#1c1f22'));
}
add("housing", profileYZ([[-200, 0], [190, 0], [190, 92], [-110, 92], [-200, 50]], W).translate(0, 0, FZ).color(housing));

// Keypad: built flat at the origin, then laid onto the console slope.
const SLOPE = (Math.atan2(42, 90) * 180) / Math.PI;
const onSlope = (s: Shape) => s.rotateX(SLOPE).translate(0, -155, FZ + 71);
add("keypad-panel", onSlope(blk(0, 0, 0, 320, 82, 2)).color(bezel));
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 8; c++) {
    const fn = c >= 6;
    add(`key-${r}-${c}`, onSlope(blk(-133 + c * 38, -24 + r * 24, 2, 28, 17, 6)).color(fn ? readout : housing));
  }
}

// Weighing tray: stainless plate with a raised rim on a dark gap ring.
add("tray-gap", blk(0, 40, FZ + 92, 334, 284, 4).color('#2a2e31'));
add("tray", blk(0, 40, FZ + 96, 330, 280, 20).subtract(blk(0, 40, FZ + 102, 312, 262, 30)).color(platter));
add("tray-badge", blk(-120, -88, FZ + 102, 60, 10, 2).color(bezel));

// Label printer bulge on the -X side, with its tear-off slot.
add("printer", blk(-W / 2 - 40, 20, FZ, 80, 200, 80).color(housing));
add("printer-slot", blk(-W / 2 - 81, 20, FZ + 52, 4, 150, 8).color('#1c1f22'));
add("printer-label", blk(-W / 2 - 84, 20, FZ + 30, 3, 70, 22).color('#f6f3ea'));

// Pole and the tilted readout head facing the customer.
add("pole", cylinder(340, 20, 12).translate(0, 160, FZ + 92).color(platter));
add("pole-collar", cylinder(16, 34, 12).translate(0, 160, FZ + 92).color(housing));
const head = (s: Shape) => s.rotateX(-12).translate(0, 150, 530);
add("head", head(extrudeRoundedRect(320, 150, 22, 60, { axis: 'y' }).translate(0, -30, 0)).color(housing));
add("screen", head(blk(0, -31, -60, 276, 4, 118)).color(bezel));

// Seven-segment digits: weight on the top row, price on the bottom row.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const digit = (n: number, x: number, z: number) => {
  const w = 20;
  const h = 36;
  const t = 4;
  const hz = { a: h, g: h / 2, d: 0 };
  const vx = { b: [w / 2, (3 * h) / 4], c: [w / 2, h / 4], e: [-w / 2, h / 4], f: [-w / 2, (3 * h) / 4] };
  let s: Shape | undefined;
  for (const k of SEG[n]) {
    const seg = k in hz ? blk(x, -34, z + hz[k] - t / 2, w, 3, t) : blk(x + vx[k][0], -34, z + vx[k][1] - h / 4, t, 3, h / 2);
    s = s ? s.union(seg) : seg;
  }
  return s;
};
[[1, 2, 4, 5], [3, 4, 9]].forEach((num, row) => {
  const z = row === 0 ? 4 : -48;
  num.forEach((n, i) => add(`digit-${row}-${i}`, head(digit(n, -40 + i * 32 - (row ? 0 : 16), z)).color(readout)));
  add(`point-${row}`, head(blk(row ? -24 : -40, -34, z, 7, 3, 7)).color(readout));
  add(`unit-${row}`, head(blk(-112, -34, z + 8, 26, 3, 20)).color(row ? '#f2c94c' : '#ffffff'));
});

return p.model();
