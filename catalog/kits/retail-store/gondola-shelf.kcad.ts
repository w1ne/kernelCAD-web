// SPDX-License-Identifier: CC0-1.0
// Gondola shelf: one bay of a double-sided supermarket gondola run.
// What makes it a gondola rather than a bookcase: a pegboard back panel on
// slotted uprights, cantilever shelves that hang off the uprights on angled
// brackets and slope gently to the front, a deep base deck over a kick
// plate, a price-ticket rail on every shelf edge, and boxed and bottled stock
// faced up to the front so the bay reads as a working aisle.
// Generic visualization geometry at about real size (1.25 m bay, 1.8 m tall,
// 2 x 470 mm deep), millimetres, Z up, front toward -Y, feet on z = 0.

meta({
  name: "gondola-shelf",
  license: 'CC0-1.0',
  title: "Gondola shelf",
  description: "One bay of a double-sided supermarket gondola at about real size: pegboard back panel on slotted uprights, cantilever shelves on angled brackets, deep base deck over a kick plate, price-ticket rails on every shelf edge and faced-up boxed and bottled stock. Material controls: steel frame, shelf steel, ticket rail, stock packaging. grocery, pharmacy and hardware presets; stocked choice.",
  tags: ['gondola', 'supermarket shelf', 'grocery shelving', 'aisle shelving', 'retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 3500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#e3e6e4', { label: 'Steel frame' });
const shelfSteel = param('shelfSteel', '#cfd4d3', { label: 'Shelf steel' });
const ticket = param('ticket', '#e8c43a', { label: 'Ticket rail' });
const stock = param('stock', '#c8412f', { label: 'Stock packaging' });
const stocked = param('stocked', 'full', { choices: ['full', 'empty'], label: 'Stock' });

presets({
  grocery: { frame: '#e3e6e4', shelfSteel: '#cfd4d3', ticket: '#e8c43a', stock: '#c8412f' },
  pharmacy: { frame: '#f2f4f5', shelfSteel: '#e2e6e8', ticket: '#3a8fd0', stock: '#5aa86a' },
  hardware: { frame: '#3c4247', shelfSteel: '#59616a', ticket: '#e0742a', stock: '#2f5f9e' },
});

const p = assembly("gondola-shelf");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// (y, z) outline extruded `t` long along X, centred on x = 0.
const profileYZ = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const W = 1250;
const H = 1800;
const D = 470;

// Uprights with slot strips, and the pegboard back between them.
for (const x of [-W / 2, W / 2]) {
  add(`upright-${x}`, blk(x, 0, 0, 50, 60, H).color(frame));
  add(`slots-${x}`, blk(x, -31, 120, 18, 2, H - 160).color('#2c3033'));
}
add("pegboard", blk(0, 0, 150, W - 50, 20, H - 170).color(frame));
for (let r = 0; r < 20; r++) add(`peg-row-${r}`, blk(0, -11, 180 + r * 80, W - 120, 1, 6).color('#a9b0b1'));
add("header", blk(0, 0, H - 20, W + 50, 70, 20).color(frame));

// Base deck over a kick plate, both faces.
for (const side of [-1, 1]) {
  add(`base-deck-${side}`, blk(0, side * (D / 2 + 10), 110, W - 50, D - 20, 30).color(shelfSteel));
  add(`kick-${side}`, blk(0, side * (D + 5), 0, W - 50, 20, 140).color(frame));
  add(`foot-${side}-l`, blk(-W / 2, side * D / 2, 0, 50, D, 30).color(frame));
  add(`foot-${side}-r`, blk(W / 2, side * D / 2, 0, 50, D, 30).color(frame));
  add(`base-rail-${side}`, blk(0, side * (D + 18), 120, W - 50, 6, 40).color(ticket));
}

// Cantilever shelves: a sloped shelf plate with a down-turned lip, carried by
// triangular brackets hooked into the upright slots.
const SD = 400;
const shelf: number[][] = [[0, 0], [-SD, -14], [-SD, -50], [-SD + 16, -50], [-SD + 16, -34], [0, -20]];
const bracket: number[][] = [[0, 0], [-SD + 20, -12], [0, -170]];
const levels = [520, 900, 1280];
for (const side of [-1, 1]) {
  levels.forEach((z, i) => {
    // Front side is built as-is; the back side is the mirror (rotateZ 180).
    const turn = (s: Shape) => (side < 0 ? s : s.rotateZ(180));
    add(`shelf-${side}-${i}`, turn(profileYZ(shelf, W - 60).translate(0, -10, z)).color(shelfSteel));
    add(`ticket-${side}-${i}`, turn(blk(0, -SD - 12, z - 58, W - 60, 6, 40)).color(ticket));
    for (const x of [-W / 2 + 40, W / 2 - 40]) {
      add(`bracket-${side}-${i}-${x}`, turn(profileYZ(bracket, 8).translate(x, -10, z - 20)).color(frame));
    }
  });
}

// Faced-up stock on the front side: cereal-style boxes and bottles.
if (stocked.value === 'full') {
  const fill = [
    { z: 140, kind: 'box', h: 300 },
    { z: 512, kind: 'bottle', h: 260 },
    { z: 892, kind: 'box', h: 280 },
    { z: 1272, kind: 'bottle', h: 230 },
  ];
  fill.forEach((f, i) => {
    const n = f.kind === 'box' ? 6 : 8;
    const step = (W - 120) / n;
    for (let k = 0; k < n; k++) {
      const x = -W / 2 + 60 + step * (k + 0.5);
      const y = -SD / 2 - 40;
      const zf = f.z;
      if (f.kind === 'box') {
        add(`stock-${i}-${k}`, blk(x, y, zf, step - 22, 280, f.h).color(k % 2 === 0 ? stock : '#f0e4c8'));
        add(`label-${i}-${k}`, blk(x, y - 141, zf + f.h * 0.35, step - 50, 2, f.h * 0.35).color(k % 2 === 0 ? '#f0e4c8' : stock));
      } else {
        add(`bottle-${i}-${k}`, cylinder(f.h * 0.72, 40, 10).translate(x, y - 60, zf).color(k % 3 === 0 ? '#e8ece8' : stock));
        add(`neck-${i}-${k}`, cylinder(f.h * 0.28, 16, 8).translate(x, y - 60, zf + f.h * 0.72).color('#2c3033'));
      }
    }
  });
}

return p.model();
