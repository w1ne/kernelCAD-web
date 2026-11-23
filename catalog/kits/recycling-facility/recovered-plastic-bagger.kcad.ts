// SPDX-License-Identifier: CC0-1.0
// Recovered-plastic bagger: the big-bag (FIBC) filling station where clean
// flake or regrind is weighed into one-tonne bulk bags. What makes it a
// big-bag filler: a four-post steel frame with a fill head on a cross beam,
// an inclined screw conveyor feeding the head from a floor hopper, the
// white woven bag hung by its four corner loops from hooks and sitting on
// a pallet on a platform weigh scale, a vibrating deck under the scale and
// a weight indicator on the frame.
// Generic visualization geometry at about real size (3.2 m wide, 1.6 m
// deep, 3.4 m high), millimetres, Z up, bag loading side toward -Y.

meta({
  name: "recovered-plastic-bagger",
  license: 'CC0-1.0',
  title: "Recovered-plastic bagger",
  description: "Big-bag (FIBC) filling station for recycled plastic flake at about real size: four-post steel frame with fill head and inflatable spout, inclined screw conveyor from a floor hopper, woven bulk bag hung from four loop hooks on a pallet on a weigh scale, weight indicator and flake spill. Material controls: frame, bulk bag, pallet and flake. plant, foodGrade, regrind and weathered presets.",
  tags: ["recycling", "plastics", "bagger", "big bag", "FIBC", "bulk bag filler", "flake", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const frame = param('frame', '#d4572a', { label: 'Frame and conveyor (paint)' });
const bag = param('bag', '#eceee6', { label: 'Bulk bag (woven PP)' });
const pallet = param('pallet', '#b08a58', { label: 'Pallet (timber)' });
const flake = param('flake', '#6fb4d8', { label: 'Plastic flake' });

presets({
  plant: { frame: '#d4572a', bag: '#eceee6', pallet: '#b08a58', flake: '#6fb4d8' },
  foodGrade: { frame: '#c6ccce', bag: '#f6f6f2', pallet: '#3a6ea8', flake: '#e4ecef' },
  regrind: { frame: '#3f7f4a', bag: '#c8b98a', pallet: '#8a6a44', flake: '#3c3f42' },
  weathered: { frame: '#8a5a40', bag: '#cfcab8', pallet: '#7d6648', flake: '#5f8fa8' },
});

const p = assembly("recovered-plastic-bagger");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const loftAt = (x: number, y: number, profiles: ReturnType<typeof rect>[], zs: number[]) => profiles[0].loft(profiles.slice(1), {
  planes: zs.map((z) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
  ruled: true,
});
const dark = '#2a2e31';

const H = 3300;               // frame height
const SZ = 200;               // scale top
const PZ = SZ + 140;          // pallet top / bag bottom
const BH = 1450;              // filled bag height

// Scale platform and vibrating deck.
add("scale-base", blk(0, 0, 0, 1500, 1500, 120).color(dark));
add("scale-deck", blk(0, 0, 120, 1400, 1400, SZ - 120).color('#9aa3a6'));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(`load-cell-${sx}-${sy}`, blk(sx * 760, sy * 760, 0, 120, 120, 160).color(dark));

// Pallet: deck boards on three runners.
for (const y of [-450, 0, 450]) add(`pallet-runner-${y}`, blk(0, y, SZ, 1200, 120, 100).color(pallet));
for (let i = 0; i < 7; i++) add(`pallet-board-${i}`, blk(-540 + i * 180, 0, SZ + 100, 140, 1200, 22).color(pallet));

// Bulk bag: bulged body, top skirt drawn up to the spout, corner loops.
add("bag-body", loftAt(0, 0, [rect(1000, 1000), rect(1080, 1080), rect(1060, 1060), rect(980, 980)], [PZ + 22, PZ + 260, PZ + BH - 200, PZ + BH]).color(bag));
add("bag-top", loftAt(0, 0, [rect(980, 980), rect(260, 260)], [PZ + BH, PZ + BH + 220]).color(bag));
add("bag-inlet", cylinder(380, 130, 12).translate(0, 0, PZ + BH + 200).color(bag));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  const x = sx * 470, y = sy * 470;
  add(`bag-loop-${sx}-${sy}`, box(60, 20, 520, true).rotateY(sx * 8).rotateX(-sy * 8).translate(x + sx * 25, y + sy * 25, PZ + BH + 220).color(bag));
  add(`bag-seam-${sx}-${sy}`, blk(x + sx * 18, y + sy * 18, PZ + 260, 30, 30, BH - 460).color('#d6d8ce'));
}
add("bag-label", blk(0, -545, PZ + 600, 420, 6, 300).color('#e8e6dc'));
add("bag-label-text", blk(0, -549, PZ + 820, 300, 4, 50).color(flake));

// Frame: four posts, top ring beams, loop-hook arms.
for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
  add(`post-${sx}-${sy}`, blk(sx * 800, sy * 750, 0, 120, 120, H).color(frame));
  add(`post-foot-${sx}-${sy}`, blk(sx * 800, sy * 750, 0, 240, 240, 20).color(dark));
}
for (const sy of [-1, 1]) add(`beam-x-${sy}`, blk(0, sy * 750, H - 140, 1720, 120, 140).color(frame));
for (const sx of [-1, 1]) add(`beam-y-${sx}`, blk(sx * 800, 0, H - 140, 120, 1620, 140).color(frame));
const HZ = PZ + BH + 500; // hook height
add("hook-carriage", blk(0, 0, HZ + 80, 1200, 1200, 60).subtract(blk(0, 0, HZ, 900, 900, 300)).color(frame));
for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(`hook-${sx}-${sy}`, blk(sx * 495, sy * 495, HZ - 60, 40, 40, 140).color(dark));
for (const sx of [-1, 1]) add(`carriage-hanger-${sx}`, blk(sx * 560, 0, HZ + 140, 60, 60, H - 140 - HZ - 140).color(frame));

// Fill head: spout with inflatable collar, butterfly valve, vent filter.
add("fill-spout", cylinder(HZ + 200 - (PZ + BH + 360), 120, 12).translate(0, 0, PZ + BH + 360).color('#b9bfc2'));
add("inflatable-collar", torus(140, 30, 14).translate(0, 0, PZ + BH + 520).color(dark));
add("fill-valve", cylinder(160, 150, 12).translate(0, 0, HZ + 200).color(dark));
add("fill-head", loftAt(0, 0, [rect(300, 300), rect(520, 520)], [HZ + 360, H - 140]).color('#b9bfc2'));
add("vent-filter", cylinder(500, 90, 12).translate(320, 220, HZ + 380).color(bag));
add("vent-pipe", blk(240, 160, HZ + 380, 140, 60, 60).color('#b9bfc2'));

// Inclined screw conveyor from a floor hopper on the -X side up to the head.
const sx0 = -2200, sz0 = 700, sx1 = -150, sz1 = H + 160;
const len = Math.hypot(sx1 - sx0, sz1 - sz0), ang = (Math.atan2(sz1 - sz0, sx1 - sx0) * 180) / Math.PI;
add("screw-tube", cylinder(len, 110, 14).rotateY(90 - ang).translate(sx0, 0, sz0).color(frame));
for (let i = 1; i < 5; i++) {
  const t = i / 5;
  add(`screw-flange-${i}`, cylinder(30, 140, 14).rotateY(90 - ang).translate(sx0 + t * (sx1 - sx0), 0, sz0 + t * (sz1 - sz0)).color(dark));
}
add("screw-head", blk(-120, 0, H + 40, 300, 300, 280).color(frame));
add("screw-motor", cylinder(380, 120, 14).rotateY(90).translate(30, 0, H + 180).color('#3f7f4a'));
add("screw-drop", blk(0, 0, H - 140, 220, 220, 180).color('#b9bfc2'));
add("screw-support", blk(-1500, 0, 0, 100, 100, 1500).color(frame));
add("floor-hopper", loftAt(-2350, 0, [rect(360, 360), rect(1000, 1000)], [120, 900]).subtract(loftAt(-2350, 0, [rect(320, 320), rect(940, 940)], [180, 920])).color(frame));
add("hopper-legs", blk(-2350, 0, 0, 500, 500, 140).color(dark));
add("hopper-flake", sphere(380).subtract(blk(0, 0, -400, 800, 800, 400)).translate(-2350, 0, 650).color(flake));

// Weight indicator on the front-left post, and a small flake spill.
add("indicator-arm", blk(-800, -900, 1300, 60, 300, 60).color(frame));
add("indicator", box(360, 120, 260, true).rotateX(-10).translate(-800, -1080, 1480).color('#c9ced1'));
add("indicator-display", box(260, 6, 90, true).rotateX(-10).translate(-800, -1143, 1520).color('#3fbf6a'));
add("spill", sphere(600).subtract(blk(0, 0, -600, 1300, 1300, 1120)).translate(500, -820, -520).color(flake));

return p.model();
