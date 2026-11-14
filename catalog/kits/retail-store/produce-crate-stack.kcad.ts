// SPDX-License-Identifier: CC0-1.0
// Produce crate stack: the floor stack of fruit crates at the end of the
// produce aisle. What makes it a crate stack rather than a box pile: four
// tapered 600 x 400 plastic crates, two wide and two high, each with rows
// of vent slots, a thick top rim and a hand-hold cut through each end; the
// top crates are heaped with fruit just over the rim, the lower ones show
// fruit through their vents, and a price ticket on a stake sits in the
// front crate. Generic visualization geometry at about real size (1.2 m
// wide, 0.55 m tall), millimetres, Z up, front on -Y.

meta({
  name: "produce-crate-stack",
  license: 'CC0-1.0',
  title: "Produce crate stack",
  description: "Two-by-two stack of tapered 600 x 400 plastic produce crates at about real size: vent slot rows, thick top rims, end hand-holds, fruit heaped over the rim of the top crates and visible through the lower vents, crate stickers and a price ticket on a stake. Material controls: crate plastic, fruit, fruit blush and ticket card. redApples, navelOranges and limes presets.",
  tags: ['produce crate', 'fruit crate', 'vegetable crate', 'crate stack', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 7000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const crate = param('crate', '#3e8a4a', { label: 'Crate plastic' });
const fruit = param('fruit', '#c5302b', { label: 'Fruit' });
const blush = param('blush', '#e2a23a', { label: 'Fruit blush (second tone)' });
const ticket = param('ticket', '#f6f1e2', { label: 'Ticket card' });

presets({
  redApples: { crate: '#3e8a4a', fruit: '#c5302b', blush: '#e2a23a', ticket: '#f6f1e2' },
  navelOranges: { crate: '#26292c', fruit: '#f08a1c', blush: '#f6ad3c', ticket: '#fff3c4' },
  limes: { crate: '#2f6fb0', fruit: '#6fae34', blush: '#a8cc48', ticket: '#f6f1e2' },
});

const p = assembly("produce-crate-stack");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();

const H = 240;

// One tapered crate at the origin: open tub, rim, vent slots and end hand-holds.
let shell = rectPath(290, 190).loft(rectPath(300, 200), { spacing: H, ruled: true })
  .subtract(rectPath(281, 181).loft(rectPath(291, 191), { spacing: H, ruled: true }).translate(0, 0, 10));
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 5; c++) shell = shell.subtract(blk(-224 + c * 112, 0, 40 + r * 52, 78, 460, 22));
}
for (const z of [70, 120]) {
  for (const y of [-110, 0, 110]) shell = shell.subtract(blk(0, y, z, 660, 70, 22));
}
shell = shell.subtract(blk(0, 0, 178, 660, 130, 34));
const rim = blk(0, 0, H - 14, 610, 410, 14).subtract(blk(0, 0, H - 20, 576, 376, 30));

const fruitBall = sphere(50);
for (const [id, x] of [['l', -305], ['r', 305]]) {
  for (const [lvl, z] of [['lo', 0], ['up', H]]) {
    const k = `${id}-${lvl}`;
    add(`crate-${k}`, shell.translate(x, 0, z).color(crate));
    add(`rim-${k}`, rim.translate(x, 0, z).color(crate));
    add(`sticker-${k}`, blk(x + 170, -197, z + 182, 110, 4, 40).color(ticket));
    // Fruit volume inside: seen through the vents of the lower crates.
    add(`fill-${k}`, blk(x, 0, z + 10, 560, 360, lvl === 'up' ? 180 : 190).color(fruit));
    if (lvl === 'up') {
      // Heaped top layer, alternating fruit tones.
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          const tone = (i + j + (id === 'l' ? 0 : 1)) % 3 === 0 ? blush : fruit;
          add(`fruit-${k}-${i}-${j}`, fruitBall.translate(x - 224 + i * 112, -118 + j * 118, z + 205 + ((i + j) % 2) * 12).color(tone));
        }
      }
    }
  }
}

// Price ticket on a stake in the front of the upper-left crate.
add("ticket-stake", blk(-460, -150, H + 190, 8, 8, 170).color('#8a6440'));
add("ticket-card", blk(-460, -156, H + 330, 170, 4, 110).color(ticket));
add("ticket-band", blk(-460, -159, H + 410, 170, 4, 26).color('#c8232c'));
add("ticket-price", blk(-430, -159, H + 345, 80, 4, 40).color('#26292c'));

return p.model();
