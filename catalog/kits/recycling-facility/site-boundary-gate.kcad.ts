// SPDX-License-Identifier: CC0-1.0
// Site boundary gate: the double swing gate in the security palisade at a
// recycling centre or landfill entrance, locked outside opening hours. What
// makes it that gate rather than a boom barrier: two braced leaves of
// triple-pointed steel palisade pales hung on square gate posts, palisade
// fence runs either side, a drop bolt and padlocked chain at the meeting
// stiles, a "keep gate clear" plate, a site sign with opening hours on the
// fence, and a concrete threshold the leaves swing over.
// Generic visualization geometry at about real size (9.6 m wide, 2.6 m tall),
// millimetres, Z up, street side on -Y; the leaves swing inward to +Y.

meta({
  name: "site-boundary-gate",
  license: 'CC0-1.0',
  title: "Site boundary gate",
  description: "Double-leaf palisade site entrance gate at about real size: two braced leaves of triple-pointed pales on square gate posts with caps and hinges, palisade fence runs either side, drop bolt and padlocked chain, keep-gate-clear plate, site sign with opening hours and a concrete threshold. Gate open or closed. Material controls: palisade, gate posts, sign board and sign band. green, galvanised, black and weathered presets.",
  tags: ["recycling", "gate", "palisade", "security fence", "site entrance", "sign", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const palisade = param('palisade', '#2f5e3c', { label: 'Palisade pales and rails (paint)' });
const posts = param('posts', '#26292b', { label: 'Gate posts (paint)' });
const signBoard = param('signBoard', '#f2f2ee', { label: 'Sign board' });
const signBand = param('signBand', '#2f8a4f', { label: 'Sign header band' });
const gateState = param('gateState', 'closed', { choices: ['closed', 'open'], label: 'Gate' });

presets({
  green: { palisade: '#2f5e3c', posts: '#26292b', signBoard: '#f2f2ee', signBand: '#2f8a4f' },
  galvanised: { palisade: '#a9b0b2', posts: '#8e9598', signBoard: '#f2f2ee', signBand: '#2f5d9a' },
  black: { palisade: '#1f2224', posts: '#1f2224', signBoard: '#f5f3e8', signBand: '#c8322a' },
  weathered: { palisade: '#5b6650', posts: '#4a4640', signBoard: '#d8d4c4', signBand: '#5f7a58' },
});

const p = assembly("site-boundary-gate");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

// One triple-pointed palisade pale, 70 mm wide, standing on z = 0.
const PH = 2400;
const pale = profileXZ([[-35, 0], [35, 0], [35, PH - 60], [30, PH], [12, PH - 50], [0, PH - 10], [-12, PH - 50], [-30, PH], [-35, PH - 60]], 6);

// Gate leaves: built with the hinge at x = 0, extending toward dir.
type Col = typeof palisade;
const L = 2350, G0 = 80;
const leaf = (dir: number, name: string) => {
  const parts: [string, Shape, Col][] = [];
  for (const z of [G0 + 250, G0 + 1250, G0 + 2050]) parts.push([`rail-${z}`, blk(dir * (L / 2 + 40), 15, z, L - 20, 40, 50), palisade]);
  for (const x of [60, L - 30]) parts.push([`stile-${x}`, blk(dir * x, 15, G0 + 100, 60, 60, 2050), palisade]);
  const n = Math.floor((L - 60) / 125);
  for (let k = 0; k < n; k++) parts.push([`pale-${k}`, pale.translate(dir * (110 + k * 125), -10, G0 + 80), palisade]);
  const bl = Math.hypot(L - 160, 900);
  parts.push(['brace', box(bl, 30, 50, true).rotateY(dir * (Math.atan2(900, L - 160) * 180) / Math.PI).translate(dir * (L / 2 + 30), 30, G0 + 780), palisade]);
  for (const z of [G0 + 300, G0 + 1900]) parts.push([`hinge-${z}`, cylinder(120, 30, 10).translate(0, 15, z), posts]);
  return parts.map(([n2, s, c]) => [`${name}-${n2}`, s, c] as [string, Shape, Col]);
};
const open = gateState.value === 'open';
const hang = (parts: [string, Shape, Col][], hx: number, ang: number) => {
  for (const [n, s, c] of parts) add(n, (open ? s.rotateZ(ang) : s).translate(hx, 0, 0).color(c));
};
hang(leaf(1, 'leaf-l'), -L - 100, 78);
hang(leaf(-1, 'leaf-r'), L + 100, -78);

// Drop bolt, padlocked chain and a keep-clear plate on the meeting stiles.
const meet = (s: Shape, hx: number, ang: number) => (open ? s.translate(-hx, 0, 0).rotateZ(ang).translate(hx, 0, 0) : s);
add("drop-bolt", meet(cylinder(700, 14, 8).translate(-110, -30, 30), -L - 100, 78).color('#a8b4b6'));
add("drop-bolt-guide", meet(blk(-110, -30, 300, 50, 40, 60), -L - 100, 78).color('#a8b4b6'));
if (!open) {
  for (let k = 0; k < 7; k++) add(`chain-link-${k}`, (k % 2 ? blk(0, 0, -8, 44, 8, 16) : blk(0, 0, -8, 44, 16, 8)).translate(-90 + k * 30, -40, 1150).color('#8a9196'));
  add("padlock-body", blk(0, -45, 1050, 60, 25, 70).color('#c9a227'));
  add("padlock-shackle", torus(20, 5, 10).rotateX(90).translate(0, -45, 1125).color('#a8b4b6'));
}
add("keep-clear-plate", meet(blk(-900, -18, 1400, 700, 4, 300), -L - 100, 78).color('#c8322a'));
add("keep-clear-text", meet(blk(-900, -22, 1490, 520, 4, 60), -L - 100, 78).color('#f2f2ee'));
add("keep-clear-bar", meet(blk(-900, -22, 1580, 400, 4, 50), -L - 100, 78).color('#f2f2ee'));

// Square gate posts with caps, on concrete pads, and the threshold.
for (const s of [-1, 1]) {
  add(`gate-post-${s < 0 ? 'l' : 'r'}`, blk(s * (L + 180), 15, 0, 160, 160, 2650).color(posts));
  add(`gate-post-cap-${s < 0 ? 'l' : 'r'}`, blk(s * (L + 180), 15, 2650, 200, 200, 30).color(posts));
  add(`gate-post-pad-${s < 0 ? 'l' : 'r'}`, blk(s * (L + 180), 15, 0, 500, 500, 40).color('#a39e93'));
}
add("threshold", blk(0, 15, 0, 2 * L + 200, 300, 20).color('#a39e93'));
add("gate-stop", blk(0, 120, 20, 160, 80, 60).color('#d7a52b'));

// Palisade fence runs either side of the gate.
const F0 = L + 260, FL = 2200;
for (const s of [-1, 1]) {
  const x0 = s * F0, x1 = s * (F0 + FL);
  const sd = s < 0 ? 'l' : 'r';
  add(`fence-post-${sd}`, blk(x1, 30, 0, 100, 100, 2500).color(palisade));
  for (const z of [400, 2000]) add(`fence-rail-${sd}-${z}`, blk((x0 + x1) / 2, 30, z, FL, 40, 50).color(palisade));
  for (let k = 0; k < 17; k++) add(`fence-pale-${sd}-${k}`, pale.translate(x0 + s * (60 + k * 125), 0, 40).color(palisade));
}

// Site sign with opening hours on the -X fence run.
const SX = -(F0 + FL / 2), SZ = 900, SW = 1500, SH = 1000, SY = -16;
add("sign-board", blk(SX, SY, SZ, SW, 10, SH).color(signBoard));
add("sign-band", blk(SX, SY - 7, SZ + SH - 260, SW, 6, 260).color(signBand));
add("sign-logo", torus(80, 22, 12).rotateX(90).translate(SX - SW / 2 + 140, SY - 12, SZ + SH - 130).color('#f2f2ee'));
add("sign-title", blk(SX + 80, SY - 12, SZ + SH - 160, 1000, 6, 70).color('#f2f2ee'));
for (let k = 0; k < 5; k++) add(`sign-hours-${k}`, blk(SX - 150 + (k % 2) * 40, SY - 8, SZ + 560 - k * 100, 1050 - (k % 2) * 160, 6, 40).color('#3a3d40'));
add("sign-warning", blk(SX + 520, SY - 8, SZ + 90, 300, 6, 220).color('#f0c419'));
add("sign-warning-mark", extrudePolygon([[-90, 0], [90, 0], [0, 150]], 6).rotateX(90).translate(SX + 520, SY - 12, SZ + 125).color('#1c1d1e'));
for (const s of [-1, 1]) add(`sign-clamp-${s < 0 ? 'l' : 'r'}`, blk(SX + s * 600, SY + 10, SZ + 400, 60, 30, 40).color('#a8b4b6'));

return p.model();
