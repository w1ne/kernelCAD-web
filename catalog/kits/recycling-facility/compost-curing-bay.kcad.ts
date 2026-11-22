// SPDX-License-Identifier: CC0-1.0
// Compost curing bay: the three-sided bay where shredded green waste sits
// for weeks after the active windrows, slowly turning to finished compost.
// What makes it a curing bay rather than a concrete wall: interlocking
// precast push-wall blocks (studs on top, staggered courses) on three sides
// with the front open for a loader, a steaming heap that slopes from the
// back wall out past the wing walls, two long-stem temperature probes with
// dial heads stuck in the heap, a perforated aeration pipe along the front
// edge, and a bay number board on the back wall.
// Generic visualization geometry at about real size (6.4 x 4 m bay, blocks
// 1600 x 800 x 800 mm), millimetres, Z up, open front on -Y.

meta({
  name: "compost-curing-bay",
  license: 'CC0-1.0',
  title: "Compost curing bay",
  description: "Three-sided compost curing bay at about real size: staggered interlocking precast concrete push-wall blocks with studs, a sloping compost heap spilling out of the open front, two long-stem temperature probes with dial heads, a perforated aeration pipe and a numbered bay board. Stage choice (curing heap, empty bay). Material controls: concrete blocks, compost, steel probes and pipe, signage. greenWaste, matureCompost and weathered presets.",
  tags: ['compost bay', 'curing bay', 'push wall', 'lego blocks', 'green waste', 'composting', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#a7a49b', { label: 'Push-wall blocks (precast concrete)' });
const compost = param('compost', '#4a3424', { label: 'Compost heap' });
const steel = param('steel', '#8e979b', { label: 'Probes and aeration pipe (steel)' });
const signage = param('signage', '#e7d54a', { label: 'Bay board' });
const stage = param('stage', 'curing', { choices: ['curing', 'empty'], label: 'Bay stage' });

presets({
  matureCompost: { concrete: '#a7a49b', compost: '#3b2a1f', steel: '#8e979b', signage: '#e7d54a' },
  greenWaste: { concrete: '#b3b0a6', compost: '#6b5a33', steel: '#9aa2a5', signage: '#4c9a52' },
  weathered: { concrete: '#8b887f', compost: '#3f2f22', steel: '#75603f', signage: '#c3b247' },
});

const p = assembly("compost-curing-bay");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);

const BL = 1600;
const BT = 800;
const IN = 2400;
const BACK = 1600;
const FRONT = -1600;

// Floor pad.
add("floor-pad", blk(0, -200, 0, 2 * IN + 2 * BT + 400, BACK - FRONT + BT + 1200, 40).color(concrete));

// A precast block with a 10 mm joint, running along X or Y.
const block = (name: string, cx: number, cy: number, cz: number, len: number, alongX: boolean, studs: boolean) => {
  const w = alongX ? len - 10 : BT;
  const d = alongX ? BT : len - 10;
  add(name, blk(cx, cy, cz, w, d, BT - 6).color(concrete));
  if (!studs) return;
  const n = len > BL / 2 + 1 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const off = n === 2 ? (i === 0 ? -len / 4 : len / 4) : 0;
    add(`${name}-stud-${i}`, cylinder(70, 170, 12).translate(cx + (alongX ? off : 0), cy + (alongX ? 0 : off), cz + BT - 6).color(concrete));
  }
};
// Back wall: three blocks below, two blocks and two halves above (staggered).
for (let i = -1; i <= 1; i++) block(`back-c1-${i + 1}`, i * BL, BACK, 40, BL, true, false);
for (const [x, len, i] of [[-2000, 800, 0], [-800, 1600, 1], [800, 1600, 2], [2000, 800, 3]]) block(`back-c2-${i}`, x, BACK, 40 + BT, len, true, true);
// Wing walls run from the back face out past the open front, staggered too.
for (const sx of [-1, 1]) {
  const x = sx * (IN + BT / 2);
  const t = sx < 0 ? 'l' : 'r';
  for (const [y, len, i] of [[1200, 1600, 0], [-400, 1600, 1], [-1600, 800, 2]]) block(`wing-${t}-c1-${i}`, x, y, 40, len, false, false);
  for (const [y, len, i] of [[1600, 800, 0], [400, 1600, 1], [-1200, 1600, 2]]) block(`wing-${t}-c2-${i}`, x, y, 40 + BT, len, false, true);
}

// The heap: slopes from high against the back wall out past the wings.
if (stage.value === 'curing') {
  const yb = BACK - BT / 2 - 5;
  add("heap", profileYZ([
    [yb, 40], [yb, 1380], [yb - 350, 1500], [yb - 800, 1470], [yb - 1300, 1250],
    [yb - 1900, 880], [yb - 2500, 500], [yb - 3000, 220], [yb - 3400, 40],
  ], 2 * IN - 20).color(compost));
  // The crest domes up above the walls, the way a loader tips it.
  add("heap-crest", sphere(1000).scale([2.3, 1.5, 0.95]).translate(0, 250, 1200).color(compost));
  add("heap-shoulder", sphere(800).scale([1.6, 1.4, 0.8]).translate(-1100, -900, 700).color(compost));
  // Clods and a loader bucket's last scoop on the face of the heap.
  const clods = [[-1500, -500, 1050, 260], [-300, -900, 820, 300], [900, -300, 1180, 240], [1700, -1100, 640, 280], [-900, -400, 1600, 220], [300, -500, 1750, 260], [-1900, -1300, 520, 230]];
  clods.forEach(([x, y, z, r], i) => add(`clod-${i}`, sphere(r).scale([1.3, 1.1, 0.95]).translate(x, y, z).color(compost)));
  add("scoop-mound", sphere(600).scale([1.4, 1, 0.45]).translate(1300, -1950, 40).subtract(blk(1300, -1950, -700, 3000, 3000, 740)).color(compost));
  // Temperature probes: long stems with dial heads facing the yard.
  for (const [x, y, z, i] of [[-900, -1000, 1050, 0], [800, -300, 1950, 1]]) {
    add(`probe-stem-${i}`, cylinder(900, 9, 8).translate(x, y, z - 400).color(steel));
    add(`probe-handle-${i}`, cylinder(220, 12, 8).rotateY(90).translate(x - 110, y, z + 500).color(steel));
    add(`probe-dial-${i}`, cylinder(40, 70, 16).rotateX(90).translate(x, y - 10, z + 420).color(steel));
    add(`probe-face-${i}`, cylinder(4, 58, 16).rotateX(90).translate(x, y - 50, z + 420).color(signage));
    add(`probe-needle-${i}`, blk(x + 15, y - 54, z + 405, 50, 3, 8).color(compost));
  }
}

// Perforated aeration pipe along the front of the bay.
const PY = FRONT - 900;
add("aeration-pipe", cylinder(2 * IN + 600, 110, 16).rotateY(90).translate(-IN - 300, PY, 110).color(steel));
for (let i = 0; i < 12; i++) add(`aeration-hole-${i}`, cylinder(6, 26, 8).rotateX(90).translate(-IN + 100 + i * 410, PY - 108, 120).color(compost));
add("aeration-elbow", cylinder(700, 110, 16).translate(-IN - 300, PY, 110).color(steel));
add("aeration-blower", blk(-IN - 300, PY, 800, 420, 380, 360).color(steel));
add("aeration-blower-grille", blk(-IN - 300, PY - 192, 860, 300, 6, 240).color(compost));

// Bay board on the back wall top: "3" in seven-segment strokes.
const SEG = { a: [0, 1, 1], b: [1, 0.5, 0], c: [1, -0.5, 0], d: [0, -1, 1], e: [-1, -0.5, 0], f: [-1, 0.5, 0], g: [0, 0, 1] };
const BZ = 40 + 2 * BT + 500;
for (const sx of [-1, 1]) add(`board-post-${sx < 0 ? 'l' : 'r'}`, blk(sx * 380, BACK - 300, BZ - 500, 60, 60, 1120).color(steel));
add("board", blk(0, BACK - 340, BZ + 80, 1000, 30, 560).color(signage));
for (const s of 'abcdg') {
  const [sx, sz, horiz] = SEG[s];
  add(`board-seg-${s}`, blk(sx * 130, BACK - 360, BZ + 360 + sz * 200 - (horiz ? 25 : 90), horiz ? 230 : 50, 10, horiz ? 50 : 180).color(compost));
}

return p.model();
