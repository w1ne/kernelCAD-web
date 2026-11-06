// SPDX-License-Identifier: CC0-1.0
// Card payment terminal: PIN pad on a swivel stand, or a portable terminal
// with a built-in receipt printer in its charging base.
// What makes it a card terminal rather than a block: a slim tilted handset with
// a screen at the top, a 4 x 3 number keypad over a row of cancel / clear /
// enter keys, a raised chip-reader lip with a card slot at the bottom edge, a
// magstripe groove down one side and a contactless mark, held up towards the
// customer on a swivel stand or a charging cradle.
// Generic visualization geometry at real size (PIN pad handset 84 x 190 mm,
// about 210 mm tall on its stand), millimetres, Z up, screen facing -Y, counter
// top on z = 0.
meta({
  name: 'payment-terminal',
  license: 'CC0-1.0',
  title: 'Payment terminal',
  description: 'Card payment terminal: slim handset with screen, 4 x 3 keypad over cancel, clear and enter keys, chip-reader lip with card slot, magstripe groove and contactless mark; as a PIN pad on a weighted swivel stand or a portable terminal with receipt printer in a charging base. Material controls: ABS housing, display glass, rubber keys, enter key. Clean-store and night-restock presets.',
  tags: ['payment terminal', 'card reader', 'PIN pad', 'POS terminal', 'chip and PIN', 'contactless', 'checkout', 'retail', 'grocery', 'shop', 'low poly', 'scene prop', 'CC0'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const type = param('type', 'pinpad', { choices: ['pinpad', 'portable'], label: 'Terminal type' });
const abs = param('abs', '#2c3a42', { label: 'Housing (ABS plastic)' });
const glass = param('glass', '#79c3ce', { label: 'Display glass' });
const rubber = param('rubber', '#4a5257', { label: 'Keys, slot and stand pads (rubber)' });
const enterKey = param('enterKey', '#33a35a', { label: 'Enter key (green enamel)' });

presets({
  cleanStore: {
    abs: '#e5e9e9',
    glass: '#9ccfd6',
    rubber: '#9aa5aa',
    enterKey: '#2f9a55',
  },
  nightRestock: {
    abs: '#1d262b',
    glass: '#3e6677',
    rubber: '#262b2e',
    enterKey: '#d8a12a',
  },
});

const p = assembly('payment-terminal');
const add = (name, shape) => p.part(name, shape.scale(scale));

const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Extrude a (y, z) side profile across X, centred on x = 0.
const side = (pts, width) => extrudePolygon(pts, width).rotateX(90).rotateZ(90).translate(-width / 2, 0, 0);

const portable = type.value === 'portable';
const L = portable ? 250 : 190;
const W = 84;
const TILT = portable ? 22 : 32;
const ORIGIN = portable ? [0, -95, 62] : [0, -80, 112];
// Everything on the handset is authored lying flat (y up the handset, z out of
// the screen), then tilted towards the customer and lifted onto the stand.
const onHandset = (shape) => shape.rotateX(TILT).translate(ORIGIN[0], ORIGIN[1], ORIGIN[2]);

// Handset shell: chip-reader lip at the bottom, flat face, and on the portable
// a printer hump at the top end.
const shell = portable
  ? [[0, 0], [L, 0], [L, 40], [L - 12, 52], [180, 52], [170, 24], [50, 24], [20, 38], [0, 38]]
  : [[0, 0], [L, 0], [L, 18], [L - 8, 24], [50, 24], [20, 38], [0, 38]];
add('handset', onHandset(side(shell, W)).color(abs));
add('card-slot', onHandset(box(64, 4, 5, true).translate(0, -1, 26)).color(rubber));
add('magstripe-groove', onHandset(box(4, 120, 6, true).translate(W / 2, 110, 14)).color(rubber));
add('screen-bezel', onHandset(box(70, 64, 2, true).translate(0, 136, 25)).color(rubber));
add('screen', onHandset(box(62, 56, 2, true).translate(0, 136, 27)).color(glass));
add('contactless-mark', onHandset(turned([[9, 0], [13, 0], [13, 2], [9, 2]]).translate(0, 136, 28)).color(abs));

// Keypad: four rows of three number keys, then cancel / clear / enter.
for (let r = 0; r < 4; r += 1) {
  for (let c = 0; c < 3; c += 1) {
    add(`key-${r}-${c}`, onHandset(box(19, 10, 4, true).translate((c - 1) * 23, 96 - r * 13, 26)).color(rubber));
  }
}
add('key-cancel', onHandset(box(19, 10, 4, true).translate(-23, 44, 27)).color(rubber));
add('key-clear', onHandset(box(19, 10, 4, true).translate(0, 44, 27)).color(glass));
add('key-enter', onHandset(box(19, 10, 4, true).translate(23, 44, 27)).color(enterKey));

if (portable) {
  // Printer cover, tear bar and the charging base.
  add('printer-cover', onHandset(side([[184, 52], [L - 14, 52], [L - 14, 55], [184, 55]], W - 16)).color(rubber));
  add('tear-bar', onHandset(box(W - 10, 6, 4, true).translate(0, 183, 54)).color(abs));
  add('charging-base', side([[-125, 0], [60, 0], [60, 95], [20, 108], [-106, 57], [-112, 70], [-125, 66]], W + 30).color(abs));
  add('base-pad', box(W + 34, 189, 4, true).translate(0, -32, 2).color(rubber));
  add('charge-led', box(10, 4, 4, true).translate(0, -127, 30).color(enterKey));
} else {
  // Weighted base, swivel collar, neck and the cradle plate under the handset.
  add('stand-base', turned([[0, 0], [78, 0], [78, 8], [64, 18], [0, 18]]).color(abs));
  add('stand-pad', turned([[0, 0], [76, 0], [76, 3], [0, 3]]).color(rubber));
  add('swivel-collar', turned([[0, 0], [26, 0], [26, 14], [20, 20], [0, 20]]).translate(0, 6, 18).color(rubber));
  add('stand-neck', turned([[0, 0], [14, 0], [14, 120], [0, 120]]).translate(0, 6, 34).color(abs));
  add('cradle', onHandset(side([[-6, -10], [L - 30, -10], [L - 30, 0], [8, 0], [8, 30], [-6, 30]], W + 6)).color(abs));
}

return p.model();
