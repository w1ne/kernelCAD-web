// SPDX-License-Identifier: CC0-1.0
// Greenhouse tunnel bay: a small polytunnel (hoop house) for year-round
// growing. What makes it a polytunnel: a row of galvanised round-top hoops
// on ground posts tied by a ridge purlin, one sheet of polyethylene film
// stretched over the crown and locked into wiggle-wire channels along the
// hip, roll-up side curtains wound onto a pipe with an end crank so the
// sides can be opened for ventilation, timber hip boards at the base,
// framed end walls with a hinged door, and raised beds of crops inside.
// Generic visualization geometry at about real size (3 m wide, 4 m long,
// 2.7 m to the crown), millimetres, Z up, door end toward -Y.

meta({
  name: "greenhouse-tunnel-bay",
  license: 'CC0-1.0',
  title: "Greenhouse tunnel bay",
  description: "Polytunnel bay at about real size (3 m x 4 m, 2.7 m crown): galvanised round-top hoops on ground posts with a ridge purlin, polyethylene film locked into hip wiggle-wire channels, roll-up side curtains on a crank pipe, timber hip boards, framed end walls with a hinged door, and raised crop beds inside. Material controls: hoop steel, poly film, timber and crops, plus side curtains (rolled up or closed). galvanised, weathered, whiteFilm and highVisibility presets.",
  tags: ['polytunnel', 'hoop house', 'greenhouse', 'roll-up sides', 'hydroponics', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 6000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('hoopSteel', '#a7aeb1', { label: 'Hoops, posts and purlin (galvanised steel)' });
const film = param('polyFilm', '#cfe3dc', { label: 'Polyethylene film' });
const timber = param('timber', '#9a6f45', { label: 'Hip boards, end-wall framing and door' });
const crop = param('crop', '#4f8f3a', { label: 'Crops in the raised beds' });
const sides = param('sideCurtains', 'rolled up', { choices: ['rolled up', 'closed'], label: 'Side curtains' });

presets({
  galvanised: { hoopSteel: '#a7aeb1', polyFilm: '#cfe3dc', timber: '#9a6f45', crop: '#4f8f3a' },
  weathered: { hoopSteel: '#83888a', polyFilm: '#b9c4b4', timber: '#6f6253', crop: '#6a8a45' },
  whiteFilm: { hoopSteel: '#a7aeb1', polyFilm: '#eef0ec', timber: '#b3895c', crop: '#3f7f34' },
  highVisibility: { hoopSteel: '#e87832', polyFilm: '#d9f0e6', timber: '#f2c84b', crop: '#3c9a3a' },
});

const p = assembly("greenhouse-tunnel-bay");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylY = (x: number, y: number, z: number, len: number, r: number, seg = 10) => cylinder(len, r, seg).rotateX(-90).translate(x, y, z);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 10) => cylinder(len, r, seg).translate(x, y, z);

// Hoop geometry in the XZ plane: vertical legs to LEG, round top of radius R.
const W = 1500, LEG = 1200, R = 1500, L = 4000;
const arc = (r: number, from: number, to: number, steps: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push([r * Math.cos(a), LEG + r * Math.sin(a)]);
  }
  return pts;
};
// Closed XZ outline -> extruded slab of thickness t starting at y.
const slab = (pts: [number, number][], y: number, t: number) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, z] of pts.slice(1)) pb = pb.lineTo(x, z);
  return pb.close().extrude(t).rotateX(90).translate(0, y + t, 0);
};
// One hoop: a 40 mm square-section band following the tunnel outline.
const hoop = (y: number) => {
  const o = 20;
  const outer: [number, number][] = [[-W - o, 0], ...arc(R + o, Math.PI, 0, 18), [W + o, 0]];
  const inner: [number, number][] = [[W - o, 0], ...arc(R - o, 0, Math.PI, 18), [-W + o, 0]];
  return slab([...outer, ...inner], y - 20, 40);
};

// Hoops on ground posts, ridge purlin and hip rails.
const hoopYs = [-L / 2, -L / 6, L / 6, L / 2];
hoopYs.forEach((y, i) => {
  add(`hoop-${i}`, hoop(y).color(steel));
  for (const x of [-W, W]) add(`ground-post-${i}-${x}`, cylZ(x, y, 0, 140, 30, 8).color('#6d7275'));
});
add("ridge-purlin", cylY(0, -L / 2, LEG + R - 45, L, 21).color(steel));
for (const x of [-W + 15, W - 15]) add(`hip-rail-${x}`, cylY(x, -L / 2, 1080, L, 17, 8).color(steel));

// Timber hip boards along both sides at ground level.
for (const x of [-W + 10, W - 10]) add(`hip-board-${x}`, blk(x, 0, 0, 40, L, 220).color(timber));

// Film over the crown: a 6 mm shell from hip to hip, locked into
// wiggle-wire channels on the hip rails.
const FO = R + 26, FI = R + 20;
const filmOutline: [number, number][] = [
  [-FO, 1080], ...arc(FO, Math.PI, 0, 22), [FO, 1080],
  [FI, 1080], ...arc(FI, 0, Math.PI, 22), [-FI, 1080],
];
add("film-crown", slab(filmOutline, -L / 2 - 20, L + 40).color(film));
for (const x of [-W - 30, W + 30]) add(`wiggle-channel-${x}`, blk(x, 0, 1060, 14, L + 40, 30).color('#7d8386'));

// Side curtains: rolled onto a crank pipe at the hip, or hanging closed.
if (sides.value === 'rolled up') {
  for (const s of [-1, 1]) {
    add(`curtain-roll-${s}`, cylY(s * (W + 70), -L / 2 - 20, 1010, L + 40, 55, 12).color(film));
    add(`roll-pipe-end-${s}`, cylY(s * (W + 70), -L / 2 - 140, 1010, 120, 20, 8).color(steel));
    add(`crank-arm-${s}`, blk(s * (W + 70), -L / 2 - 140, 860, 20, 20, 170).color(steel));
    add(`crank-handle-${s}`, cylY(s * (W + 70), -L / 2 - 240, 870, 100, 14, 8).color('#2f3234'));
  }
} else {
  for (const s of [-1, 1]) {
    add(`curtain-sheet-${s}`, blk(s * (W + 28), 0, 200, 6, L + 40, 900).color(film));
    add(`curtain-pipe-${s}`, cylY(s * (W + 50), -L / 2 - 20, 230, L + 40, 20, 8).color(steel));
  }
}

// End walls: rear fully filmed; front framed with a door and filmed gable.
const DOOR = 500, HEAD = 2100;
const headX = Math.sqrt(R * R - (HEAD - LEG) ** 2);
const gable: [number, number][] = [...arc(R, Math.PI - Math.acos(headX / R), Math.acos(headX / R), 16)];
const sidePanel = (s: number): [number, number][] => {
  const pts: [number, number][] = [[s * W, 0], [s * DOOR, 0], [s * DOOR, HEAD], [s * headX, HEAD]];
  const a0 = s < 0 ? Math.PI - Math.acos(headX / R) : Math.acos(headX / R);
  const a1 = s < 0 ? Math.PI : 0;
  return [...pts, ...arc(R, a0, a1, 6).slice(1)];
};
const rearWall: [number, number][] = [[-W, 0], ...arc(R, Math.PI, 0, 24), [W, 0]];
add("rear-wall-film", slab(rearWall, L / 2 + 10, 6).color(film));
add("front-gable-film", slab(gable, -L / 2 - 16, 6).color(film));
for (const s of [-1, 1]) add(`front-side-film-${s}`, slab(sidePanel(s), -L / 2 - 16, 6).color(film));

for (const x of [-DOOR - 45, DOOR + 45]) add(`door-post-${x}`, blk(x, -L / 2 - 30, 0, 90, 60, HEAD + 400).color(timber));
add("door-header", blk(0, -L / 2 - 30, HEAD, 2 * headX, 60, 90).color(timber));
for (const x of [-1000, 1000]) add(`end-stud-${x}`, blk(x, -L / 2 - 30, 0, 70, 50, LEG + 380).color(timber));

// Hinged door, swung open about 60 degrees on its left-hand post.
const doorLeaf = () => {
  const w = 2 * DOOR - 20, h = HEAD - 30;
  const parts = [
    blk(w / 2, 0, 0, w, 40, 70), blk(w / 2, 0, h - 70, w, 40, 70), blk(w / 2, 0, h / 2 - 35, w, 40, 70),
    blk(35, 0, 0, 70, 40, h), blk(w - 35, 0, 0, 70, 40, h),
  ];
  return { frame: parts, film: blk(w / 2, 0, 70, w - 140, 6, h - 140) };
};
const leaf = doorLeaf();
const hinge = (s: Shape) => s.rotateZ(-60).translate(-DOOR, -L / 2 - 40, 20);
leaf.frame.forEach((s, i) => add(`door-frame-${i}`, hinge(s).color(timber)));
add("door-film", hinge(leaf.film).color(film));
add("door-handle", hinge(cylZ(2 * DOOR - 100, -30, 1000, 140, 12, 8)).color('#2f3234'));

// Low-poly lettuce/herb head: a turned mound.
const plant = () => {
  let pb = path().moveTo(0, 0);
  for (const [r, z] of [[90, 0], [150, 60], [140, 140], [80, 200], [0, 215]] as [number, number][]) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, 8);
};

// Raised beds with crops down both sides of a central path.
for (const s of [-1, 1]) {
  const bx = s * 820;
  add(`bed-${s}`, blk(bx, 150, 0, 900, 3200, 300).color(timber));
  add(`bed-soil-${s}`, blk(bx, 150, 300, 820, 3120, 10).color('#4a3626'));
  for (let r = 0; r < 6; r++) {
    for (const dx of [-220, 220]) {
      const y = -1200 + r * 480, x = bx + dx;
      add(`plant-${s}-${r}-${dx}`, plant().translate(x, y + 150, 310).color(crop));
    }
  }
}
add("path-mat", blk(0, 0, 0, 640, L - 100, 8).color('#5d5f58'));

return p.model();
