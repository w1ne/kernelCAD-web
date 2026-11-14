// SPDX-License-Identifier: CC0-1.0
// Manual sorting platform: the open steel mezzanine at a smaller recycling
// site where pickers stand on grated walkways either side of a sort belt and
// drop each material through a floor chute into its own concrete storage bay
// underneath. What makes it a sort platform rather than a plain conveyor:
// the raised walkways with handrails, knee rails and toe boards; the
// yellow-lipped drop chutes in the walkway beside each picking station; the
// concrete push-wall bays below, open to the outside so a loader can clear
// each sorted pile; and the stair that climbs to the deck beside the feed
// hopper. Residue rides off the head end into a skip.
// Generic visualization geometry at about real size (8 m deck, 4 m wide,
// deck 2.4 m up), millimetres, Z up, belt runs along +Y, stair toward -Y.

meta({
  name: "manual-sort-platform",
  license: 'CC0-1.0',
  title: "Manual sorting platform",
  description: "Open steel picking mezzanine at about real size: grated walkways either side of a sort belt, handrails with knee rails and toe boards, yellow-lipped drop chutes into six concrete storage bays below holding sorted piles, feed hopper, stair to the deck and a residue skip at the head end. Material controls: steel frame, walkway grating, concrete bays, handrails and safety trim; mixed or empty stream. plant, galvanised, weathered and highVisibility presets.",
  tags: ['sort platform', 'picking platform', 'picking mezzanine', 'hand sorting', 'sort belt', 'storage bays', 'push wall', 'drop chute', 'recycling', 'materials recovery', 'waste management', 'sorting', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#3d6f8f', { label: 'Columns, beams and belt frame (paint)' });
const grating = param('grating', '#9aa1a5', { label: 'Walkway grating and stair treads' });
const concrete = param('concrete', '#b7b2a6', { label: 'Storage bay walls (concrete)' });
const safety = param('safety', '#f0b429', { label: 'Handrails and chute lips' });
const load = param('load', 'mixed', { choices: ['mixed', 'empty'], label: 'Belt and bays' });

presets({
  plant: { steel: '#3d6f8f', grating: '#9aa1a5', concrete: '#b7b2a6', safety: '#f0b429' },
  galvanised: { steel: '#a4acb0', grating: '#c3c8cb', concrete: '#c4c0b6', safety: '#e2b31f' },
  weathered: { steel: '#5a5650', grating: '#7d7b72', concrete: '#9a958a', safety: '#a8893f' },
  highVisibility: { steel: '#3d7a4a', grating: '#a4acb0', concrete: '#bdb8ac', safety: '#f2d21b' },
});

const p = assembly("manual-sort-platform");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const cylX = (x: number, y: number, z: number, len: number, r: number, seg = 14) => cylinder(len, r, seg).rotateY(90).translate(x, y, z);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const funnel = (wTop: number, wBot: number, zBot: number, zTop: number) => rect(wBot, wBot).loft([rect(wTop, wTop)], {
  planes: [zBot, zTop].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});
// (y, z) side profile extruded along X, centred on x = 0.
const profileYZ = (pts, t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
// Bar from (y0, z0) to (y1, z1) in the YZ plane at x, cross-section w x t.
const rodYZ = (x: number, y0: number, z0: number, y1: number, z1: number, w: number, t: number) => {
  const len = Math.hypot(y1 - y0, z1 - z0);
  return box(w, len, t, true).rotateX((Math.atan2(z1 - z0, y1 - y0) * 180) / Math.PI).translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
};
const heap = (x: number, y: number, r: number) => sphere(r).subtract(box(3 * r, 3 * r, 2 * r, true).translate(0, 0, -r)).translate(x, y, 0);

const HX = 2000, HY = 4000, ZP = 2400, ZB = ZP + 900, BW = 1000, FX = 600;
const bayY = [-2700, 0, 2700];

// Concrete storage bays under each walkway, open to the outside.
add("bay-spine", blk(0, 0, 0, 2 * FX - 100, 2 * HY, 2000).color(concrete));
for (const y of [-HY, -1350, 1350, HY]) for (const s of [-1, 1]) {
  add(`bay-wall-${y}-${s}`, blk(s * (FX + 650), y, 0, 1300, 300, 2000).color(concrete));
  add(`bay-wall-cap-${y}-${s}`, blk(s * (FX + 650), y, 2000, 1340, 340, 40).color('#8e8a80'));
}

// Columns and deck beams.
for (const s of [-1, 1]) for (const y of [-HY, -1350, 1350, HY]) add(`column-${s}-${y}`, blk(s * (HX - 75), y, 2040, 150, 150, ZP - 2240).color(steel));
for (const s of [-1, 1]) add(`edge-beam-${s}`, blk(s * (HX - 75), 0, ZP - 200, 150, 2 * HY + 150, 200).color(steel));
for (const y of [-HY, -1350, 1350, HY]) add(`cross-beam-${y}`, blk(0, y, ZP - 200, 2 * HX, 150, 200).color(steel));

// Grated walkways with drop chutes beside each picking station.
let n = 0;
for (const s of [-1, 1]) {
  const wx = s * (FX + (HX - FX) / 2);
  add(`walkway-${s}`, blk(wx, 0, ZP - 40, HX - FX, 2 * HY, 40).color(grating));
  for (let k = 1; k < 16; k++) add(`grating-bar-${s}-${k}`, blk(wx, -HY + k * 500, ZP, HX - FX, 30, 4).color('#6f777c'));
  for (const y of bayY) {
    const cx = s * (FX + 450), cy = y + 600;
    add(`chute-${n}`, funnel(620, 420, ZP - 700, ZP - 40).translate(cx, cy, 0).color('#b9c1c4'));
    add(`chute-mouth-${n}`, blk(cx, cy, ZP, 560, 560, 8).color('#1d2224'));
    add(`chute-lip-${n}`, blk(cx, cy, ZP, 620, 620, 120).subtract(blk(cx, cy, ZP - 10, 560, 560, 200)).color(safety));
    add(`mat-${n}`, blk(s * (FX + 500), y - 450, ZP, 700, 900, 25).color('#1d2224'));
    n++;
  }
}

// Handrails: top rail, knee rail and toe board along both outer edges and the head end.
for (const s of [-1, 1]) {
  const x = s * (HX - 30);
  const y0 = s < 0 ? -HY + 1000 : -HY;
  const len = HY - y0;
  add(`rail-top-${s}`, blk(x, (y0 + HY) / 2, ZP + 1060, 50, len, 50).color(safety));
  add(`rail-knee-${s}`, blk(x, (y0 + HY) / 2, ZP + 520, 40, len, 40).color(safety));
  add(`toe-board-${s}`, blk(x, (y0 + HY) / 2, ZP, 20, len, 150).color(safety));
  for (let y = y0; y <= HY; y += 1000) add(`rail-post-${s}-${y}`, blk(x, y, ZP, 50, 50, 1110).color(safety));
}
for (const s of [-1, 1]) {
  add(`end-rail-${s}`, blk(s * (FX + (HX - FX) / 2), HY - 25, ZP + 1060, HX - FX, 50, 50).color(safety));
  add(`end-knee-${s}`, blk(s * (FX + (HX - FX) / 2), HY - 25, ZP + 520, HX - FX, 40, 40).color(safety));
}
add("tail-rail", blk(HX / 2 + FX / 2, -HY + 25, ZP + 1060, HX - FX, 50, 50).color(safety));

// Sort belt down the middle, carried past the head end over a residue skip.
const BY0 = -HY, BY1 = HY + 1600;
add("belt-top", blk(0, (BY0 + BY1) / 2, ZB - 30, BW, BY1 - BY0, 30).color('#2b2f31'));
for (const s of [-1, 1]) {
  add(`stringer-${s}`, blk(s * (BW / 2 + 50), (BY0 + BY1) / 2, ZB - 250, 100, BY1 - BY0, 220).color(steel));
  add(`skirt-${s}`, blk(s * (BW / 2 + 15), (BY0 + BY1) / 2, ZB - 30, 30, BY1 - BY0 - 800, 120).color('#b9c1c4'));
  for (const y of [-2700, 0, 2700]) add(`belt-post-${s}-${y}`, blk(s * (BW / 2 + 50), y, ZP - 200, 80, 80, ZB - ZP - 50).color(steel));
  add(`head-leg-${s}`, blk(s * (BW / 2 + 50), BY1 - 200, 30, 100, 100, ZB - 280).color(steel));
  add(`head-foot-${s}`, blk(s * (BW / 2 + 50), BY1 - 200, 0, 200, 200, 30).color(steel));
  add(`pull-cord-${s}`, blk(s * (BW / 2 + 160), 0, ZB + 150, 14, 2 * HY - 400, 14).color('#d42a2a'));
}
for (const y of [BY0, BY1]) add(`pulley-${y}`, cylX(-BW / 2, y, ZB - 140, BW, 140, 16).color('#2b2f31'));
add("feed-hopper", funnel(1600, 1000, ZB + 80, ZB + 800).translate(0, -HY + 500, 0)
  .subtract(funnel(1480, 880, ZB + 40, ZB + 860).translate(0, -HY + 500, 0)).color('#b9c1c4'));
add("drive-motor", cylX(BW / 2 + 100, BY1, ZB - 140, 420, 120).color('#5a6266'));
add("drive-guard", blk(BW / 2 + 70, BY1, ZB - 400, 60, 420, 360).color(safety));

// Residue skip under the head end.
const skipYZ = [[-1100, 0], [1100, 0], [1500, 1300], [-1500, 1300]];
add("residue-skip", profileYZ(skipYZ, 1800).subtract(profileYZ([[-1000, 120], [1000, 120], [1380, 1400], [-1380, 1400]], 1660)).translate(0, BY1 + 300, 0).color('#d9661e'));
for (const s of [-1, 1]) add(`skip-lug-${s}`, blk(s * 950, BY1 + 300, 700, 100, 300, 200).color('#d9661e'));

// Stair from the ground up to the -X walkway beside the feed hopper.
const SX = -FX - 650, NT = 12, RS = ZP / (NT + 1), GO = 270;
for (let i = 0; i < NT; i++) add(`tread-${i}`, blk(SX, -HY - i * GO - GO / 2, ZP - RS * (i + 1) - 40, 900, GO - 10, 40).color(grating));
const YL = -HY - NT * GO;
for (const s of [-1, 1]) {
  add(`stair-stringer-${s}`, rodYZ(SX + s * 470, YL + 60, 170, -HY, ZP - 120, 40, 260).color(steel));
  add(`stair-foot-${s}`, blk(SX + s * 470, YL + 90, 0, 120, 260, 40).color(steel));
  add(`stair-rail-${s}`, rodYZ(SX + s * 470, YL + 100, 1000, -HY, ZP + 1060, 50, 50).color(safety));
  add(`stair-rail-post-${s}`, blk(SX + s * 470, YL + 150, 20, 50, 50, 1050).color(safety));
}

// The stream on the belt and the sorted piles in each bay.
if (load.value !== 'empty') {
  const items = ['#c49a6c', '#5c8fc4', '#e2e6e8', '#3d8a4f', '#d9d2bf', '#c8202a'];
  for (let i = 0; i < 16; i++) {
    const row = Math.floor(i / 2), col = i % 2;
    const x = -220 + col * 440 + ((row * 137) % 120) - 60;
    const y = -HY + 1100 + row * 820 + ((col * 251) % 300);
    const kind = (i * 5) % 3;
    const color = items[(i * 7) % items.length];
    if (kind === 0) add(`item-${i}`, box(280, 220, 20, true).rotateZ((i * 37) % 180).translate(x, y, ZB + 10).color(color));
    else if (kind === 1) add(`item-${i}`, cylinder(240, 45, 8).rotateY(90).rotateZ((i * 53) % 180).translate(x, y, ZB + 45).color(color));
    else add(`item-${i}`, cylinder(120, 35, 8).translate(x, y, ZB).color(color));
  }
  const piles = ['#c49a6c', '#5c8fc4', '#9aa0a4', '#e8e4da', '#3d8a4f', '#d9d2bf'];
  let k = 0;
  for (const s of [-1, 1]) for (const y of bayY) add(`pile-${k}`, heap(s * (FX + 700), y, 900).color(piles[k++]));
  add("residue-heap", heap(0, BY1 + 300, 700).translate(0, 0, 120).color('#6d5a3a'));
}

return p.model();
