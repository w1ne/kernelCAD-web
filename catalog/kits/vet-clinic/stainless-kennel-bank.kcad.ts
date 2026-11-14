// SPDX-License-Identifier: CC0-1.0
// Stainless kennel bank, the wall of hospital cages in a clinic ward where
// patients recover. What makes one: welded stainless cage boxes three bays
// wide, each with a barred door on a frame with a slam latch and a white cage
// card, a lifted polymer floor grate over a drain pan, a stainless bowl and
// bedding inside, and the whole bank standing on a plinth with castors; a
// row of smaller cat cages can sit on top.
// The tiers choice shows one row of large dog bays or a stacked bank with a
// row of small cages above. The door choice opens the middle door.
// Millimetres, Z up, doors on -Y.
meta({
  name: "stainless-kennel-bank",
  license: 'CC0-1.0',
  title: "Three-bay stainless kennel bank",
  description: "Clinic recovery kennel bank at real size, three bays per tier: welded stainless cage boxes with barred doors on framed hinges, slam latches and cage cards, polymer floor grates over drain pans, bowls and bedding inside, on a castor plinth. Tiers choice (stacked, single) adds a row of small cat cages above the dog bays; door choice opens the middle door. Material controls: cabinet steel, door bars, floor grate polymer and bedding fabric. clinicClean, softTeal and kennelBlue presets.",
  tags: ["veterinary", "animal clinic", "kennel", "cage bank", "recovery ward", "stainless", "dog cage", "cat cage", "CC0"],
  kit: 'vet-clinic',
  category: 'prop',
  origin: "base",
  compat: ['veterinary', 'animal-clinic', 'animal-health', 'clinic', 'indoor'],
  triangleBudget: 6500,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const tiers = param('tiers', 'stacked', { choices: ['stacked', 'single'], label: 'Tiers' });
const door = param('door', 'closed', { choices: ['closed', 'open'], label: 'Middle door' });
const cabinetSteel = param('cabinetSteel', '#c3cbcd', { label: 'Cabinet stainless steel' });
const doorBars = param('doorBars', '#9ea8ab', { label: 'Door bars' });
const grate = param('grate', '#d9dfdc', { label: 'Floor grate polymer' });
const bedding = param('bedding', '#4f7fb3', { label: 'Bedding fabric' });

presets({
  clinicClean: { doorBars: '#d3d9da', grate: '#eef1ef', bedding: '#8fb3cf' },
  softTeal: { cabinetSteel: '#b4c6c7', grate: '#9bc4c2', bedding: '#2f8b8a' },
  kennelBlue: { doorBars: '#3d6fb5', grate: '#a9c1de', bedding: '#e0b21e' },
});

const p = assembly("stainless-kennel-bank");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
const cylZ = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).translate(x, y, z);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 16) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const turned = (pts: [number, number][], seg = 18) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(360, seg);
};

const BW = 560, D = 330, T = 20; // bay width, half depth, sheet thickness
const W = (3 * BW) / 2;
const card = '#f4f3ec', latch = '#5b6266';

// ---- Plinth and castors ----
add('plinth', blk(-W, -D + 30, 90, W, D, 190).color(cabinetSteel));
add('kick-plate', blk(-W + 10, -D + 22, 95, W - 10, -D + 30, 185).color(doorBars));
for (const x of [-W + 90, W - 90]) {
  for (const y of [-D + 110, D - 90]) {
    add(`castor-plate-${x}-${y}`, blk(x - 45, y - 45, 80, x + 45, y + 45, 90).color(latch));
    add(`castor-${x}-${y}`, cylX(x - 15, y, 42, 30, 42, 14).color('#26292b'));
  }
}

// One tier of three cage boxes, floor at z0, interior height h.
const tier = (name: string, z0: number, h: number, big: boolean) => {
  const z1 = z0 + h;
  add(`${name}-top`, blk(-W, -D, z1, W, D, z1 + T).color(cabinetSteel));
  add(`${name}-floor`, blk(-W, -D, z0 - T, W, D, z0).color(cabinetSteel));
  add(`${name}-back`, blk(-W, D - T, z0, W, D, z1).color(cabinetSteel));
  for (let k = 0; k <= 3; k++) {
    const x = -W + k * BW;
    add(`${name}-wall-${k}`, blk(x - T / 2, -D, z0, x + T / 2, D, z1).color(cabinetSteel));
  }
  for (let b = 0; b < 3; b++) {
    const cx = -W + BW / 2 + b * BW;
    const x0 = cx - BW / 2 + T, x1 = cx + BW / 2 - T;
    // Drain pan, floor grate and contents.
    add(`${name}-pan-${b}`, blk(x0, -D + 30, z0, x1, D - T, z0 + 25).color(doorBars));
    const ng = big ? 9 : 6;
    for (let g = 0; g < ng; g++) {
      const gx = x0 + 20 + ((x1 - x0 - 40) * g) / (ng - 1);
      add(`${name}-grate-${b}-${g}`, blk(gx - 14, -D + 40, z0 + 45, gx + 14, D - T - 10, z0 + 70).color(grate));
    }
    add(`${name}-grate-rails-${b}`, blk(x0 + 4, -D + 40, z0 + 25, x1 - 4, -D + 60, z0 + 50).color(grate));
    add(`${name}-bowl-${b}`, turned([[0, 0], [70, 0], [95, 60], [86, 60], [62, 12], [0, 12]], 16).translate(cx + (x1 - x0) * 0.28, -D + 150, z0 + 70).color('#d4dadb'));
    if (b !== 1 || !big) add(`${name}-blanket-${b}`, blk(x0 + 30, -D + 60, z0 + 70, x0 + (x1 - x0) * 0.6, D - 60, z0 + 120).color(bedding));
    add(`${name}-vent-${b}`, blk(cx - 120, D - T - 4, z1 - 120, cx + 120, D - T, z1 - 60).color(latch));

    // Door: framed, barred, hinged on its left post.
    const open = door.value === 'open' && b === 1 && big;
    const dz0 = z0 + 10, dz1 = z1 - 10, dw = x1 - x0 - 10;
    const parts: [string, Shape, string][] = [];
    parts.push(['frame-left', blk(0, -14, dz0, 28, 0, dz1), doorBars]);
    parts.push(['frame-right', blk(dw - 28, -14, dz0, dw, 0, dz1), doorBars]);
    parts.push(['frame-bottom', blk(0, -14, dz0, dw, 0, dz0 + 34), doorBars]);
    parts.push(['frame-top', blk(0, -14, dz1 - 34, dw, 0, dz1), doorBars]);
    parts.push(['cross-bar', blk(0, -12, (dz0 + dz1) / 2 - 8, dw, -2, (dz0 + dz1) / 2 + 8), doorBars]);
    const nb = Math.round(dw / 55);
    for (let k = 1; k < nb; k++) parts.push([`bar-${k}`, cylZ((dw * k) / nb, -7, dz0 + 34, dz1 - dz0 - 68, 6, 8), doorBars]);
    parts.push(['latch', blk(dw - 70, -40, (dz0 + dz1) / 2 - 30, dw - 10, -14, (dz0 + dz1) / 2 + 30), latch]);
    parts.push(['card-holder', blk(dw * 0.5 - 90, -22, dz1 - 34 - 130, dw * 0.5 + 90, -14, dz1 - 40), card]);
    for (const [pn, s, c] of parts) {
      const placed = open ? s.rotateZ(-100).translate(x0 + 5, -D, 0) : s.translate(x0 + 5, -D, 0);
      add(`${name}-door-${b}-${pn}`, placed.color(c));
    }
    for (const hz of [dz0 + 80, dz1 - 80]) add(`${name}-hinge-${b}-${hz}`, cylZ(x0 + 2, -D - 8, hz - 30, 60, 10, 10).color(latch));
  }
};
tier('lower', 190 + T, 760, true);
if (tiers.value === 'stacked') tier('upper', 190 + T + 760 + 2 * T, 520, false);

return p.model();
