// SPDX-License-Identifier: CC0-1.0
// Cash drawer: the steel till drawer that sits under a POS terminal.
// What makes it a cash drawer rather than a box: a low steel cabinet with a
// drawer sprung part-way open, a till tray inside with five note
// compartments under spring clips at the back and eight coin cups at the
// front, a key lock on the faceplate, a media slot for cheques, and the
// printer-driven RJ cable out of the back. Banknotes and coins sit in the
// tray so the drawer reads as a working till. Generic visualization geometry
// at about real size (410 x 415 x 100 mm), millimetres, Z up, front toward
// -Y, feet on z = 0.

meta({
  name: "cash-drawer",
  license: 'CC0-1.0',
  title: "Cash drawer",
  description: "POS cash drawer at about real size: low steel cabinet with the drawer sprung open, a till tray with five note compartments under spring clips and eight coin cups, a key lock and cheque media slot on the faceplate, and the RJ trigger cable out of the back, with notes and coins in the tray. Material controls: cabinet steel, till tray, banknotes, coins. blackSteel, whiteSteel and stainless presets; drawer open or closed.",
  tags: ['cash drawer', 'till', 'cash register drawer', 'pos', 'checkout', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 2500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const cabinet = param('cabinet', '#26292c', { label: 'Cabinet steel' });
const tray = param('tray', '#6a7078', { label: 'Till tray' });
const notes = param('notes', '#7fae7a', { label: 'Banknotes' });
const coins = param('coins', '#c9a24a', { label: 'Coins' });
const drawer = param('drawer', 'open', { choices: ['open', 'closed'], label: 'Drawer' });

presets({
  blackSteel: { cabinet: '#26292c', tray: '#6a7078', notes: '#7fae7a', coins: '#c9a24a' },
  whiteSteel: { cabinet: '#e6e8e8', tray: '#4a5058', notes: '#8a9fc8', coins: '#bfc4c6' },
  stainless: { cabinet: '#a9b0b4', tray: '#3a3f45', notes: '#d39a6a', coins: '#c9a24a' },
});

const p = assembly("cash-drawer");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const W = 410;
const D = 415;
const H = 100;
const OUT = drawer.value === 'open' ? 330 : 0;

// Cabinet shell: top, sides, back and floor so the opening shows dark inside.
add("cabinet-top", blk(0, 0, H - 2, W, D, 2 + 0).color(cabinet));
add("cabinet-top-lip", blk(0, -D / 2 + 6, H - 8, W, 12, 6).color(cabinet));
add("cabinet-left", blk(-W / 2 + 1, 0, 6, 2, D, H - 8).color(cabinet));
add("cabinet-right", blk(W / 2 - 1, 0, 6, 2, D, H - 8).color(cabinet));
add("cabinet-back", blk(0, D / 2 - 1, 6, W, 2, H - 8).color(cabinet));
add("cabinet-floor", blk(0, 0, 6, W, D, 2).color(cabinet));
add("cabinet-inside", blk(0, 0, 8, W - 4, D - 4, 1).color('#0f1012'));
for (const x of [-W / 2 + 30, W / 2 - 30]) {
  for (const y of [-D / 2 + 30, D / 2 - 30]) add(`foot-${x < 0 ? "l" : "r"}-${y < 0 ? "f" : "b"}`, cylinder(6, 14, 10).translate(x, y, 0).color('#121314'));
}

// RJ trigger cable out of the back.
add("cable-boot", blk(-120, D / 2 + 8, 20, 20, 16, 14).color('#d8d8d2'));
add("cable", cylinder(160, 3, 6).rotateX(-90).translate(-120, D / 2 + 16, 27).color('#d8d8d2'));

// Drawer: faceplate with lock and media slot, side rails and the till tray.
const y0 = -D / 2 - OUT;
const DW = W - 20;
const DD = D - 20;
add("faceplate", blk(0, y0 - 6, 10, W - 4, 12, 50).color(cabinet));
add("pull-lip", blk(0, y0 - 14, 12, W - 80, 6, 10).color(cabinet));
add("media-slot", blk(0, y0 - 13, 44, 200, 2, 6).color('#0f1012'));
add("lock", cylinder(4, 13, 14).rotateX(90).translate(140, y0 - 12, 32).color('#c0c4c6'));
add("lock-key", blk(140, y0 - 17, 28, 3, 2, 10).color('#3a3d40'));
add("drawer-floor", blk(0, y0 + DD / 2, 12, DW, DD, 4).color(tray));
add("drawer-left", blk(-DW / 2 + 4, y0 + DD / 2, 12, 8, DD, 34).color(cabinet));
add("drawer-right", blk(DW / 2 - 4, y0 + DD / 2, 12, 8, DD, 34).color(cabinet));

// Tray: front coin cups, back note compartments with dividers and clips.
const T = DW - 16;
const coinY = y0 + 55;
const cupW = T / 8;
for (let i = 0; i < 8; i++) {
  const x = -T / 2 + cupW * (i + 0.5);
  add(`cup-${i}`, blk(x, coinY, 16, cupW - 6, 80, 18).subtract(blk(x, coinY, 20, cupW - 14, 72, 20)).color(tray));
  const stack = 2 + ((i * 3) % 4);
  for (let k = 0; k < stack; k++) {
    const r = 9 + (i % 4) * 1.5;
    add(`coin-${i}-${k}`, cylinder(3, r, 10).translate(x + (k % 2) * 3 - 1.5, coinY - 18 + k * 9, 20 + k * 0.5).color(i >= 6 ? '#bfc4c6' : coins));
  }
}
const noteY0 = coinY + 50;
const noteD = DD - 70;
add("coin-wall", blk(0, noteY0 - 4, 16, T, 6, 24).color(tray));
const noteW = T / 5;
for (let i = 0; i < 5; i++) {
  const x = -T / 2 + noteW * (i + 0.5);
  if (i > 0) add(`divider-${i}`, blk(-T / 2 + noteW * i, noteY0 + noteD / 2, 16, 4, noteD, 24).color(tray));
  const stack = 12 + (i % 3) * 4;
  const tint = i === 0 ? '#d39a6a' : i === 4 ? '#8a9fc8' : notes;
  add(`notes-${i}`, blk(x, noteY0 + noteD / 2, 16, noteW - 14, noteD - 20, stack).color(tint));
  add(`note-print-${i}`, blk(x - 10, noteY0 + noteD / 2 - 20, 16 + stack, 22, 40, 0.5).color('#3c5a3a'));
  // Spring clip: a pressed steel arm hinged at the back, resting on the notes.
  add(`clip-arm-${i}`, blk(x, noteY0 + noteD / 2 + 20, 17 + stack, 8, noteD - 60, 3).color('#c0c4c6'));
  add(`clip-roller-${i}`, cylinder(noteW - 30, 5, 8).rotateY(90).translate(x - (noteW - 30) / 2, noteY0 + 40, 22 + stack).color('#c0c4c6'));
}

return p.model();
