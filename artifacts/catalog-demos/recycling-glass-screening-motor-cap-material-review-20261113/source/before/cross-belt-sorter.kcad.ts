// SPDX-License-Identifier: CC0-1.0
// Cross-belt sorter: a closed loop of carriers, each carrying its own short
// belt that runs across the direction of travel. When a carrier reaches the
// right destination its belt fires and throws the item sideways into a
// chute. What makes it that sorter rather than a conveyor: the oval track
// with carriers following the curved ends, each carrier's cross-belt and end
// rollers, an induction belt merging items onto the loop at an angle, and a
// row of sloped discharge chutes off the straight feeding bulk bags, one
// item part-way down a chute.
// Generic visualization geometry at about real size (8.2 m long loop on a
// 1.5 m deck), millimetres, Z up, discharge side on -Y.

meta({
  name: "cross-belt-sorter",
  license: 'CC0-1.0',
  title: "Cross-belt sorter",
  description: "Loop cross-belt sorter at about real size: oval track on legs with 22 carriers following the curved ends, each with its own cross-running belt and end rollers, an angled induction belt merging items onto the loop, four sloped discharge chutes off the straight into bulk bags with destination signs, and one item sliding down a chute. Load set to loaded or empty. Material controls: track frame, carriers, belts and chutes. plant, weathered, stainless and highVisibility presets.",
  tags: ["recycling", "cross-belt", "loop sorter", "carrier", "induction", "discharge chute", "bulk bag", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 5000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#3d4f63', { label: 'Track frame (paint)' });
const carrier = param('carrier', '#e0a526', { label: 'Carriers (paint)' });
const belt = param('belt', '#24272a', { label: 'Cross-belts (rubber)' });
const chute = param('chute', '#b6bec1', { label: 'Discharge chutes (galvanised)' });
const load = param('load', 'loaded', { choices: ['loaded', 'empty'], label: 'Load' });

presets({
  plant: { frame: '#3d4f63', carrier: '#e0a526', belt: '#24272a', chute: '#b6bec1' },
  weathered: { frame: '#4d5652', carrier: '#a88a4a', belt: '#2c2a28', chute: '#8e9294' },
  stainless: { frame: '#8a9196', carrier: '#d0d4d6', belt: '#2f6bb5', chute: '#c9ccce' },
  highVisibility: { frame: '#2f6b8f', carrier: '#f0c419', belt: '#1c1d1e', chute: '#e2462e' },
});

const p = assembly("cross-belt-sorter");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const loaded = load.value === 'loaded';

// Oval track: straights along X joined by semicircles of radius R.
const LS = 4000, R = 1000, TZ = 1500;
const oval = (r: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (Math.PI * k) / 12; pts.push([LS / 2 + r * Math.cos(a), r * Math.sin(a)]); }
  for (let k = 0; k <= 12; k++) { const a = Math.PI / 2 + (Math.PI * k) / 12; pts.push([-LS / 2 + r * Math.cos(a), r * Math.sin(a)]); }
  return pts;
};
const ring = (r0: number, r1: number, z: number, h: number) => extrudePolygon(oval(r1), h).subtract(extrudePolygon(oval(r0), h + 2).translate(0, 0, -1)).translate(0, 0, z);
add("track-girder", ring(R - 330, R + 330, TZ - 260, 180).color(frame));
add("inner-rail", ring(R - 300, R - 250, TZ - 80, 40).color('#9aa1a4'));
add("outer-rail", ring(R + 250, R + 300, TZ - 80, 40).color('#9aa1a4'));
for (const x of [-LS / 2, 0, LS / 2]) {
  for (const s of [-1, 1]) {
    add(`leg-${x + LS}-${s < 0 ? 'f' : 'b'}`, blk(x, s * R, 0, 140, 140, TZ - 260).color(frame));
    add(`foot-${x + LS}-${s < 0 ? 'f' : 'b'}`, blk(x, s * R, 0, 280, 280, 16).color(frame));
  }
}
for (const s of [-1, 1]) {
  add(`end-leg-${s < 0 ? 'l' : 'r'}`, blk(s * (LS / 2 + R), 0, 0, 140, 140, TZ - 260).color(frame));
  add(`end-foot-${s < 0 ? 'l' : 'r'}`, blk(s * (LS / 2 + R), 0, 0, 280, 280, 16).color(frame));
}
add("drive-unit", blk(LS / 2 - 600, 0, TZ - 520, 900, 500, 260).color('#5d6366'));
add("drive-motor", cylinder(500, 140, 12).rotateX(90).translate(LS / 2 - 600, 250, TZ - 390).color(carrier));

// Carriers around the loop: position and heading at arc length s.
const P = 2 * LS + 2 * Math.PI * R, N = 22;
const at = (s: number): [number, number, number] => {
  if (s < LS) return [-LS / 2 + s, -R, 0];
  s -= LS;
  if (s < Math.PI * R) { const a = -Math.PI / 2 + s / R; return [LS / 2 + R * Math.cos(a), R * Math.sin(a), (a * 180) / Math.PI + 90]; }
  s -= Math.PI * R;
  if (s < LS) return [LS / 2 - s, R, 180];
  s -= LS;
  const a = Math.PI / 2 + s / R;
  return [-LS / 2 + R * Math.cos(a), R * Math.sin(a), (a * 180) / Math.PI + 90];
};
const items = ['#b48a5a', '#2f6fb5', '#c9b089', '#4f8a5c', '#e9e6dc', '#c84a3a'];
for (let k = 0; k < N; k++) {
  const [x, y, h] = at((k * P) / N + 200);
  const place = (s: Shape) => s.rotateZ(h).translate(x, y, TZ);
  add(`carrier-${k}`, place(blk(0, 0, -60, 560, 760, 60)).color(carrier));
  add(`cross-belt-${k}`, place(blk(0, 0, 0, 500, 700, 14)).color(belt));
  for (const s of [-1, 1]) add(`carrier-roller-${k}-${s < 0 ? 'i' : 'o'}`, place(cylinder(520, 32, 8).rotateY(90).translate(-260, s * 360, -10)).color('#9aa1a4'));
  if (loaded && k % 3 !== 1) {
    const bag = k % 2 === 0;
    const item = bag
      ? sphere(170).scale([1.3, 1.0, 0.6]).translate(0, 0, 100)
      : blk(0, 0, 14, 300 + (k % 4) * 40, 260, 180 + (k % 3) * 40).rotateZ((k * 23) % 40);
    add(`item-${k}`, place(item).color(items[k % items.length]));
  }
}

// Induction belt merging onto the far straight at an angle.
const IA = 35, IL = 2600;
const ind = (s: Shape) => s.rotateZ(-IA).translate(-650, R + 1200, 0);
add("induction-belt", ind(blk(0, 0, TZ + 30, IL, 640, 14)).color(belt));
for (const s of [-1, 1]) add(`induction-stringer-${s < 0 ? 'f' : 'b'}`, ind(blk(0, s * 350, TZ - 140, IL, 60, 180)).color(frame));
for (const x of [-IL / 2 + 200, IL / 2 - 400]) for (const s of [-1, 1]) add(`induction-leg-${x + IL}-${s < 0 ? 'f' : 'b'}`, ind(blk(x, s * 350, 0, 80, 80, TZ - 140)).color(frame));
if (loaded) for (const x of [-700, 100]) add(`induction-item-${x + 1000}`, ind(blk(x, 0, TZ + 44, 320, 260, 200)).color(items[(x + 1000) % 5]));

// Discharge chutes off the near straight into bulk bags.
const SL = 1500, SA = 25;
const dests = ['#2f6fb5', '#4f8a5c', '#c8322a', '#f0ae32'];
[-1500, -500, 500, 1500].forEach((cx, i) => {
  const yc = -R - 380 - (SL / 2) * Math.cos((SA * Math.PI) / 180);
  const zc = TZ - 120 - (SL / 2) * Math.sin((SA * Math.PI) / 180);
  const slope = (s: Shape) => s.rotateX(SA).translate(cx, yc, zc);
  add(`chute-${i}`, slope(blk(0, 0, 0, 640, SL, 16)).color(chute));
  for (const s of [-1, 1]) add(`chute-wall-${i}-${s < 0 ? 'l' : 'r'}`, slope(blk(s * 320, 0, 0, 16, SL, 220)).color(chute));
  const yEnd = yc - (SL / 2) * Math.cos((SA * Math.PI) / 180);
  add(`chute-hanger-${i}`, blk(cx, -R - 380, 0, 60, 60, TZ - 120).color(frame));
  add(`bulk-bag-${i}`, blk(cx, yEnd - 250, 0, 860, 860, 640).subtract(blk(cx, yEnd - 250, 140, 800, 800, 600)).color('#e9e6dc'));
  add(`bag-fill-${i}`, sphere(420).scale([1, 1, 0.45]).translate(cx, yEnd - 250, 480).subtract(blk(cx, yEnd - 250, 0, 900, 900, 330)).color(items[(i * 2) % items.length]));
  for (const s of [-1, 1]) add(`bag-loop-${i}-${s < 0 ? 'l' : 'r'}`, blk(cx + s * 380, yEnd - 680, 640, 60, 20, 160).color('#e9e6dc'));
  add(`dest-sign-${i}`, blk(cx, -R - 400, TZ - 520, 420, 20, 220).color(dests[i]));
});
if (loaded) add("sliding-item", blk(0, 0, 16, 300, 260, 180).rotateX(25).translate(-500, -R - 1050, TZ - 400).color(items[0]));

return p.model();
