// SPDX-License-Identifier: CC0-1.0
// Stormwater settling basin: the pond at the low corner of a recycling yard
// that catches run-off from the tipping and storage areas so grit, glass
// fines and silt drop out before the water leaves site.
// What makes it a settling basin rather than a pond: a grassed earth berm
// with a sloped concrete lining, a concrete inlet headwall with the yard
// drain pipe and a riprap apron under it, a concrete baffle wall across the
// basin that holds back the forebay, a square outlet riser with a steel
// trash rack and an outlet pipe through the berm, a staff gauge marked in
// bands, a concrete ramp up the berm for the desilting excavator, and a
// steel handrail along the inlet end.
// Generic visualization geometry at about real size (6.0 x 4.0 m, berm
// 0.9 m high), millimetres, Z up, ramp on -Y toward the viewer.

meta({
  name: "stormwater-settling-basin",
  license: 'CC0-1.0',
  title: "Stormwater settling basin",
  description: "Yard stormwater settling basin at about real size: grassed earth berm with a sloped concrete lining, inlet headwall with drain pipe and riprap apron, forebay baffle wall, square outlet riser with steel trash rack and outlet pipe, banded staff gauge, concrete maintenance ramp and inlet handrail. Material controls: grassed berm, concrete, standing water, steelwork. summer, dryWeather, algae and weathered presets.",
  tags: ['stormwater', 'settling basin', 'sediment pond', 'detention basin', 'run-off', 'drainage', 'outlet riser', 'trash rack', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const berm = param('berm', '#6f8f4a', { label: 'Berm (grass)' });
const concrete = param('concrete', '#b3afa5', { label: 'Lining, headwall and riser (concrete)' });
const water = param('water', '#4f7f86', { label: 'Standing water' });
const steel = param('steel', '#d8a92a', { label: 'Trash rack, gauge post and handrail (steel)' });

presets({
  summer: { berm: '#6f8f4a', concrete: '#b3afa5', water: '#4f7f86', steel: '#d8a92a' },
  dryWeather: { berm: '#a99a5e', concrete: '#c2bdb1', water: '#8a7a5c', steel: '#d8a92a' },
  algae: { berm: '#5d7f3c', concrete: '#9fa094', water: '#5f8a3e', steel: '#7f8a8c' },
  weathered: { berm: '#7c7a52', concrete: '#8f8a80', water: '#4a5f5c', steel: '#8a5a3a' },
});

const p = assembly("stormwater-settling-basin");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const frustum = (x: number, w0: number, d0: number, z0: number, w1: number, d1: number, z1: number) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [z0, z1].map((z) => ({ plane: 'XY' as const, origin: [x, 0, z] as [number, number, number] })),
  ruled: true,
});

const TOP = 900;
const FLOOR = 200;
// Earth berm with a sloped outside, and the basin cut into it.
const cut = frustum(0, 3000, 1200, FLOOR, 4800, 2800, TOP + 10);
add("berm", frustum(0, 6000, 4000, 0, 5200, 3200, TOP).subtract(cut).color(berm));
// Concrete lining: a thin sloped shell on the cut faces.
const liner = frustum(0, 3060, 1260, FLOOR - 40, 4860, 2860, TOP + 4).subtract(cut);
add("lining", liner.color(concrete));
// Standing water at 600 mm, sized to the sloped sides at that level.
const WZ = 600;
const k = (WZ - FLOOR) / (TOP + 10 - FLOOR);
add("water", frustum(0, 3000, 1200, FLOOR, 3000 + 1800 * k, 1200 + 1600 * k, WZ).color(water));

// Forebay baffle wall across the basin, just under the top of the berm.
const BX = -900;
const bk = (x: number) => 1200 + (1600 * (x - FLOOR)) / (TOP + 10 - FLOOR);
add("baffle-wall", blk(BX, 0, FLOOR, 160, bk(TOP - 120) - 60, TOP - 120 - FLOOR).color(concrete));

// Inlet headwall on the -X berm with the yard drain pipe and a riprap apron.
add("headwall", blk(-2700, 0, TOP - 500, 260, 1500, 760).color(concrete));
for (const s of [-1, 1]) add(`headwall-wing-${s}`, path().moveTo(0, 0).lineTo(900, 0).lineTo(0, 760).close().extrude(160).rotateX(90).translate(-2570, s * 750 + 80, TOP - 500).color(concrete));
add("inlet-pipe", cylinder(700, 230, 18).subtract(cylinder(720, 180, 18).translate(0, 0, -10)).rotateY(90).translate(-2900, 0, TOP - 120).color('#5d6266'));
const stones: [number, number, number, number][] = [
  [-2280, -260, 560, 130], [-2240, 120, 540, 150], [-2160, 380, 470, 120], [-2050, -120, 400, 140],
  [-1980, 240, 350, 110], [-2120, -460, 470, 110], [-1900, -320, 300, 120], [-1880, 40, 290, 100],
];
for (const [x, y, z, r] of stones) add(`riprap-${x}-${y}`, sphere(r).scale(1, 1, 0.6).translate(x, y, z).color('#8d877c'));

// Outlet riser near the +X end: concrete box, steel trash rack on top,
// outlet pipe through the berm.
const RX = 1300;
add("riser", blk(RX, 0, FLOOR, 700, 700, TOP + 100 - FLOOR).subtract(blk(RX, 0, FLOOR + 200, 540, 540, TOP)).color(concrete));
for (let i = 0; i < 6; i++) add(`rack-bar-${i}`, blk(RX - 275 + i * 110, 0, TOP + 100, 20, 700, 30).color(steel));
add("rack-frame-a", blk(RX, -340, TOP + 100, 700, 30, 50).color(steel));
add("rack-frame-b", blk(RX, 340, TOP + 100, 700, 30, 50).color(steel));
for (let i = 0; i < 3; i++) add(`riser-orifice-${i}`, cylinder(8, 45, 12).rotateX(90).translate(RX - 160 + i * 160, -352, FLOOR + 360 + i * 110).color('#2f3437'));
add("outlet-pipe", cylinder(1900, 190, 18).rotateY(90).translate(RX + 300, 0, FLOOR + 180).color('#5d6266'));
add("outlet-endwall", blk(3100, 0, 0, 200, 1000, 700).color(concrete));

// Staff gauge: a post with depth bands, in the forebay.
add("gauge-post", blk(-1700, -700, FLOOR, 80, 60, 1400).color(steel));
for (let i = 0; i < 6; i++) add(`gauge-band-${i}`, blk(-1700, -732, FLOOR + 300 + i * 160, 90, 6, 80).color(i % 2 ? '#c0392b' : '#f2f2ec'));

// Concrete maintenance ramp up the -Y berm for the desilting excavator.
add("ramp", path().moveTo(0, 0).lineTo(2700, 0).lineTo(0, TOP).close().extrude(1200)
  .rotateX(90).rotateZ(-90).translate(600, -1500, 0).color(concrete));
for (const s of [-1, 1]) add(`ramp-kerb-${s}`, box(120, 2850, 120, true).rotateX(18.4).translate(s * 660, -2830, TOP / 2 + 66).color(concrete));

// Handrail along the inlet end of the berm.
for (const y of [-1300, -400, 400, 1300]) add(`rail-post-${y}`, blk(-2450, y, TOP - 40, 50, 50, 1140).color(steel));
add("rail-top", blk(-2450, 0, TOP + 1060, 50, 2700, 50).color(steel));
add("rail-mid", blk(-2450, 0, TOP + 560, 40, 2700, 40).color(steel));
add("warning-sign", blk(-2420, -850, TOP + 650, 6, 420, 300).color('#f2f2ec'));
add("warning-sign-band", blk(-2424, -850, TOP + 860, 4, 420, 70).color('#2f6fa8'));

return p.model();
