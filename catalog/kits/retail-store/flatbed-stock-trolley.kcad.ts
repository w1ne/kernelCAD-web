// SPDX-License-Identifier: CC0-1.0
// Flatbed stock trolley: the platform truck staff push cases out to the
// shelves on.
// What makes it a platform trolley rather than a table: a low deck about a
// hand's height off the floor with a ribbed anti-slip mat, a bent tube push
// handle at one end (a U-frame with a cross brace and a rubber grip), two
// fixed and two swivel castors on forked brackets, and rubber corner bumpers.
// It can carry a stack of shrink-wrapped cases.
// Generic visualization geometry at about real size (900 x 600 mm deck,
// handle about 950 mm high), millimetres, Z up, handle at +X, castors on z = 0.

meta({
  name: "flatbed-stock-trolley",
  license: 'CC0-1.0',
  title: "Flatbed stock trolley",
  description: "Platform stock trolley at about real size: low steel deck with a ribbed anti-slip mat, bent tube U push handle with cross brace and rubber grip, two fixed and two swivel castors on forked brackets, rubber corner bumpers and an optional stack of shrink-wrapped cases. Material controls: frame, deck mat, wheels and grip, load cartons. cleanStore, warehouseBlue and safetyYellow presets.",
  tags: ['platform trolley', 'flatbed trolley', 'platform truck', 'stock trolley', 'hand cart', 'retail', 'grocery', 'shop', 'warehouse', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'warehouse', 'scene'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#2f5fa8', { label: 'Frame and handle (powder-coated steel)' });
const mat = param('mat', '#3a3f43', { label: 'Deck mat (ribbed rubber)' });
const rubber = param('rubber', '#1f2224', { label: 'Wheels, bumpers and grip (rubber)' });
const cartons = param('cartons', '#c79a5c', { label: 'Load cartons (corrugated board)' });
const load = param('load', 'cases', { choices: ['cases', 'empty'], label: 'Load' });

presets({
  cleanStore: { frame: '#c9d0d3', mat: '#3a3f43', rubber: '#2a2e31', cartons: '#c79a5c' },
  warehouseBlue: { frame: '#2f5fa8', mat: '#3a3f43', rubber: '#1f2224', cartons: '#b98f55' },
  safetyYellow: { frame: '#f2c230', mat: '#2b2e31', rubber: '#1a1c1e', cartons: '#d8b07a' },
});

const p = assembly("flatbed-stock-trolley");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

const L = 900;
const D = 600;
const WR = 62;
const DZ = 190;

// Castors: swivel pair under the free end (-X), fixed pair under the handle.
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const tag = `${sx < 0 ? 'free' : 'handle'}-${sy < 0 ? 'f' : 'b'}`;
  const x = sx * (L / 2 - 90);
  const y = sy * (D / 2 - 80);
  add(`castor-plate-${tag}`, blk(x, y, DZ - 10, 100, 90, 8).color(frame));
  if (sx < 0) add(`castor-swivel-${tag}`, cylinder(18, 26, 12).translate(x, y, DZ - 28).color(frame));
  const off = sx < 0 ? 18 : 0;
  for (const fy of [-1, 1]) add(`castor-fork-${tag}-${fy < 0 ? 'f' : 'b'}`, blk(x + off, y + fy * 26, WR - 6, 70, 6, DZ - 22 - WR + 6).color(frame));
  add(`castor-wheel-${tag}`, cylinder(40, WR, 16).rotateX(90).translate(x + off, y + 20, WR).color(rubber));
  add(`castor-hub-${tag}`, cylinder(48, 22, 10).rotateX(90).translate(x + off, y + 24, WR).color(frame));
}

// Deck: pressed steel tray with turned-down edges, ribbed mat on top.
add("deck", blk(0, 0, DZ, L, D, 30).color(frame));
add("deck-skirt", blk(0, 0, DZ - 20, L - 10, D - 10, 20).subtract(blk(0, 0, DZ - 25, L - 40, D - 40, 30)).color(frame));
add("deck-mat", blk(-10, 0, DZ + 30, L - 60, D - 40, 6).color(mat));
for (let k = 0; k < 9; k++) add(`mat-rib-${k}`, blk(-10, -(D - 80) / 2 + (k * (D - 80)) / 8, DZ + 36, L - 80, 10, 5).color(mat));

// Rubber corner bumpers.
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  add(`bumper-${sx < 0 ? 'l' : 'r'}${sy < 0 ? 'f' : 'b'}`, cylinder(50, 28, 12).translate(sx * (L / 2 - 6), sy * (D / 2 - 6), DZ - 14).color(rubber));
}

// Bent tube U handle: two uprights leaning back slightly, elbows into a top
// rail carrying the grip, a cross brace and the hinge sockets on the deck.
const HX = L / 2 - 30;
const HTOP = 950;
const HW = D - 100;
const lean = 8;
const rise = HTOP - DZ - 30;
const hEnd = (y: number) => cylinder(rise / Math.cos((lean * Math.PI) / 180), 15, 10).rotateY(lean).translate(HX, y, DZ + 30);
const topX = HX + Math.tan((lean * Math.PI) / 180) * rise;
for (const sy of [-1, 1]) {
  add(`handle-upright-${sy < 0 ? 'f' : 'b'}`, hEnd(sy * (HW / 2)).color(frame));
  add(`handle-socket-${sy < 0 ? 'f' : 'b'}`, blk(HX, sy * (HW / 2), DZ + 30, 50, 50, 50).color(frame));
  add(`handle-elbow-${sy < 0 ? 'f' : 'b'}`, sphere(19).translate(topX, sy * (HW / 2), HTOP).color(frame));
}
add("handle-top", cylinder(HW, 15, 10).rotateX(90).translate(topX, HW / 2, HTOP).color(frame));
add("handle-grip", cylinder(300, 20, 12).rotateX(90).translate(topX, 150, HTOP).color(rubber));
const braceZ = 560;
const braceX = HX + Math.tan((lean * Math.PI) / 180) * (braceZ - DZ - 30);
add("handle-brace", cylinder(HW, 12, 8).rotateX(90).translate(braceX, HW / 2, braceZ).color(frame));

// Optional load: a shrink-wrapped stack of cases.
if (load.value === 'cases') {
  const z0 = DZ + 41;
  add("case-0", blk(-200, -130, z0, 360, 260, 220).color(cartons));
  add("case-1", blk(-200, 140, z0, 360, 260, 220).color(cartons));
  add("case-2", blk(170, 0, z0, 300, 400, 260).color(cartons));
  add("case-3", blk(-190, 0, z0 + 220, 380, 420, 200).color(cartons));
  add("case-tape", blk(-190, 0, z0 + 420, 380, 60, 2).color(mat));
  add("case-label", blk(170, -201, z0 + 120, 120, 2, 80).color(frame));
}

return p.model();
