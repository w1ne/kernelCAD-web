// SPDX-License-Identifier: CC0-1.0
// Assisted checkout till: the countertop point-of-sale set a cashier
// works at. What makes it a till rather than a computer: a steel cash
// drawer pulled open to show note compartments and coin cups, a tilted
// touchscreen on a stand showing a grid of product keys, a receipt
// printer with paper curling out, a card terminal with a keypad in its
// cradle, a handheld barcode scanner in a stand, and a pole display
// turned to the customer. Generic visualization geometry at about real
// size (drawer 410 mm wide, screen top about 520 mm), millimetres, Z up,
// cashier side on -Y.

meta({
  name: "assisted-checkout-till",
  license: 'CC0-1.0',
  title: "Assisted checkout till",
  description: "Countertop POS till set at about real size: steel cash drawer (open or shut) with note compartments and coin cups, tilted touchscreen showing product keys, receipt printer with paper curl, card terminal with keypad, handheld barcode scanner in its stand, and a customer pole display. Material controls: housing, drawer steel, screen glass, brand accent. classicBlack, retailWhite and cafeTeal presets; drawer choice.",
  tags: ['till', 'pos', 'cash register', 'checkout', 'cash drawer', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housing = param('housing', '#2a2d31', { label: 'Housing plastic' });
const steel = param('steel', '#8d969b', { label: 'Cash drawer steel' });
const glass = param('glass', '#28465a', { label: 'Screen glass' });
const accent = param('accent', '#e0a526', { label: 'Brand accent and keys' });
const drawer = param('drawer', 'open', { choices: ['open', 'shut'], label: 'Cash drawer' });

presets({
  classicBlack: { housing: '#2a2d31', steel: '#8d969b', glass: '#28465a', accent: '#e0a526' },
  retailWhite: { housing: '#e9ebea', steel: '#b4bcc0', glass: '#22384a', accent: '#2f6fc1' },
  cafeTeal: { housing: '#2f5f63', steel: '#6f777b', glass: '#1d2f38', accent: '#f08a5d' },
});

const p = assembly("assisted-checkout-till");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

// Cash drawer: a steel box with the till tray slid out toward the cashier.
const DW = 410;
const DD = 420;
const DH = 110;
add("drawer-case", blk(0, 0, 0, DW, DD, DH).subtract(blk(0, -DD / 2, 12, DW - 30, 60, DH - 24)).color(steel));
const out = drawer.value === 'open' ? 240 : 0;
const tray = blk(0, 0, 0, DW - 34, DD - 40, DH - 30)
  .subtract(blk(0, 30, 14, DW - 60, DD - 120, DH));
add("drawer-tray", tray.translate(0, -out, 14).color(steel));
add("drawer-front", blk(0, -DD / 2 + 4 - out, 10, DW - 20, 14, DH - 20).color(housing));
add("drawer-lock", cylinder(12, 11, 10).rotateX(90).translate(DW / 2 - 50, -DD / 2 - 3 - out, 60).color(accent));
if (out > 0) {
  // Five note slots at the back, a coin insert with four cups in front.
  const notes = ['#7aa86a', '#c78a4d', '#6c8fc0', '#b86a8c', '#d2c06a'];
  for (let i = 0; i < 4; i++) add(`note-divider-${i}`, blk(-105 + i * 70, 90 - out, 28, 4, 150, 50).color(steel));
  notes.forEach((c, i) => add(`notes-${i}`, blk(-140 + i * 70, 90 - out, 28, 56, 130, 40).color(c)));
  add("coin-insert", blk(0, -55 - out, 28, DW - 70, 100, 30).color(housing));
  for (let i = 0; i < 4; i++) add(`coins-${i}`, cylinder(14, 30, 12).translate(-135 + i * 90, -55 - out, 50).color(i % 2 ? '#c9a54a' : '#c3c7c9'));
}

// Touchscreen on a stand, tilted back toward the cashier.
add("stand-foot", blk(0, 80, DH, 220, 180, 20).color(housing));
add("stand-neck", profileYZ([[60, 0], [140, 0], [110, 220], [70, 220]], 90).translate(0, 0, DH + 20).color(housing));
const onScreen = (s: Shape) => s.rotateX(-22).translate(0, 90, DH + 230);
add("screen-bezel", onScreen(blk(0, 0, -120, 380, 40, 270)).color(housing));
add("screen-glass", onScreen(blk(0, -22, -105, 344, 6, 230)).color(glass));
add("screen-header", onScreen(blk(0, -25, 92, 344, 4, 20)).color(accent));
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    add(`key-${r}-${c}`, onScreen(blk(-120 + c * 66, -25, 32 - r * 56, 56, 4, 44)).color(c === 3 && r === 2 ? '#3fae5a' : accent));
  }
}
add("screen-total-bar", onScreen(blk(-40, -25, -95, 240, 4, 26)).color('#e8eef0'));

// Receipt printer with paper curling out of the slot.
const PX = DW / 2 + 110;
add("printer-body", profileYZ([[-90, 0], [90, 0], [90, 130], [-40, 140], [-90, 110]], 150).translate(PX, 0, 0).color(housing));
add("printer-slot", blk(PX, -40, 136, 120, 8, 6).color('#111315'));
add("printer-button", cylinder(8, 10, 10).rotateX(90).translate(PX + 45, -90, 70).color(accent));
const curl = [];
for (let i = 0; i <= 8; i++) {
  const a = (i / 8) * 1.4;
  curl.push([-40 - 70 * Math.sin(a), 140 + 70 * (1 - Math.cos(a)) * 0.6 + i * 6]);
}
const paper = [...curl, ...curl.slice().reverse().map(([y, z]) => [y + 3, z + 3])];
add("receipt", profileYZ(paper, 100).translate(PX, 0, 0).color('#f6f3ea'));

// Card terminal in its cradle, keypad toward the cashier.
const CX = -DW / 2 - 110;
add("terminal-cradle", profileYZ([[-70, 0], [70, 0], [60, 40], [-70, 20]], 110).translate(CX, 0, 0).color(housing));
const onTerm = (s: Shape) => s.rotateX(-30).translate(CX, 0, 34);
add("terminal-body", onTerm(blk(0, 0, 0, 90, 30, 180)).color(housing));
add("terminal-screen", onTerm(blk(0, -16, 110, 70, 4, 55)).color(glass));
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) add(`pin-key-${r}-${c}`, onTerm(blk(-24 + c * 24, -17, 16 + r * 22, 18, 4, 14)).color(r === 3 ? (c === 0 ? '#c8382c' : c === 2 ? '#3fae5a' : '#e0b84a') : '#c9ced1'));

// Handheld barcode scanner standing in its holder.
const SX = PX + 20;
add("scanner-stand", blk(SX, -170, 0, 100, 100, 20).color(housing));
const gun = [[-40, 0], [-10, 0], [0, 110], [30, 140], [40, 170], [-60, 190], [-60, 150], [-30, 120]];
add("scanner-gun", profileYZ(gun, 50).translate(SX, -170, 20).color(housing));
add("scanner-window", profileYZ([[-62, 150], [-70, 150], [-70, 190], [-62, 190]], 44).translate(SX, -170, 20).color('#c8382c'));
add("scanner-trigger", blk(SX, -192, 130, 20, 14, 30).color(accent));

// Customer pole display at the back, turned to face +Y.
add("pole", cylinder(330, 14, 10).translate(-120, 200, DH).color(steel));
add("pole-display", blk(0, 0, 0, 230, 60, 70).rotateZ(25).translate(-120, 200, DH + 330).color(housing));
add("pole-display-glass", blk(0, 31, 12, 200, 4, 46).rotateZ(25).translate(-120, 200, DH + 330).color('#3cbf9a'));

return p.model();
