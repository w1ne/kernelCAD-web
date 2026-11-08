// SPDX-License-Identifier: CC0-1.0
// Float-sink separator: the long water tank in a plastics washing line that
// splits shredded flakes by density. Polyolefin (PP/PE) flakes float and are
// pushed along the surface by slow paddle drums to the far end, where they
// spill out onto a dewatering screw; PET, PVC and grit sink to a screw
// conveyor in the tank bottom that lifts them out on an inclined auger.
// What makes it that machine rather than a vat: the open stainless tank
// brimming with water and floating flakes, the row of paddle drums across
// it, the feed screw dropping flakes in at one end, and the two inclined
// screws carrying floats and sinks out separately. Generic visualization
// geometry at about real size (8.6 m long, 2.6 m wide, 3.3 m high),
// millimetres, Z up, tank along X, walkway on the far (+Y) side.

meta({
  name: "float-sink-separator",
  license: 'CC0-1.0',
  title: "Float-sink separator",
  description: "Float-sink separation tank for a plastics washing line at about real size: open stainless tank on legs filled with water, floating PP/PE flakes, four paddle drums with geared motors across the tank, inclined feed screw dropping flakes in at the low end, inclined sink-screw lifting PET out of the tank bottom, dewatering screw taking the floats out at the far end, far-side walkway with handrail. Material controls: stainless tank, water, floating flakes, machine paint. washLine, weathered, coloured and highVisibility presets.",
  tags: ["recycling", "float-sink", "sink-float tank", "density separation", "plastics washing", "PET", "PP", "PE", "flakes", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 4600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tank = param('tank', '#b9c0c3', { label: 'Tank (stainless steel)' });
const water = param('water', '#4f93b8', { label: 'Wash water' });
const flakes = param('flakes', '#e8e3d2', { label: 'Floating flakes (PP/PE)' });
const paint = param('paint', '#2f6f9e', { label: 'Drives and screws (paint)' });

presets({
  washLine: { tank: '#b9c0c3', water: '#4f93b8', flakes: '#e8e3d2', paint: '#2f6f9e' },
  weathered: { tank: '#959b98', water: '#56766a', flakes: '#c9c1a8', paint: '#56605a' },
  coloured: { tank: '#b9c0c3', water: '#3f88b0', flakes: '#d84b3a', paint: '#3c7a4e' },
  highVisibility: { tank: '#cdd3d6', water: '#4f93b8', flakes: '#f2c230', paint: '#e3742b' },
});

const p = assembly("float-sink-separator");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const dark = '#23282c';
const pet = '#7fb7d9';

// Tank: open box with a hopper bottom, on legs; water just below the rim.
const TL = 5600, TW = 1700, ZT = 700, TH = 1300;
const ZW = ZT + TH - 50;
add("tank-shell", blk(0, 0, ZT, TL, TW, TH).subtract(blk(0, 0, ZT + 60, TL - 80, TW - 80, TH)).color(tank));
add("tank-hopper", profileXZ([[-TL / 2, ZT], [TL / 2, ZT], [TL / 2 - 300, ZT - 380], [-TL / 2 + 300, ZT - 380]], TW).color(tank));
add("tank-rim", blk(0, -TW / 2 - 20, ZT + TH - 60, TL + 40, 40, 60).color(tank));
add("water", blk(0, 0, ZW - 20, TL - 80, TW - 80, 20).color(water));
for (const x of [-TL / 2 + 200, -TL / 6, TL / 6, TL / 2 - 200]) for (const s of [-1, 1]) {
  add(`leg-${Math.round(x)}-${s < 0 ? 'f' : 'b'}`, blk(x, s * (TW / 2 - 60), 0, 120, 120, ZT - 380 + 10).color(tank));
  add(`foot-${Math.round(x)}-${s < 0 ? 'f' : 'b'}`, blk(x, s * (TW / 2 - 60), 0, 240, 240, 20).color(tank));
}
for (const s of [-1, 1]) add(`stiffener-${s < 0 ? 'f' : 'b'}`, blk(0, s * (TW / 2 + 20), ZT + 500, TL, 40, 100).color(tank));

// Floating flakes on the surface, thinning toward the feed end.
for (let i = 0; i < 48; i++) {
  const x = -TL / 2 + 900 + Math.floor(i / 4) * 380 + ((i * 137) % 160);
  const y = -TW / 2 + 260 + (i % 4) * 360 + ((i * 89) % 140);
  add(`flake-${i}`, box(240 + (i % 3) * 60, 170, 12, true).rotateZ(i * 53).rotateX(i % 2 ? 5 : -4).translate(x, y, ZW + 14).color(i % 5 === 0 ? '#c64a3c' : flakes));
}

// Paddle drums across the tank, each with a geared motor on the +Y side.
for (let d = 0; d < 4; d++) {
  const x = -TL / 2 + 1200 + d * 1150;
  const zd = ZW + 160;
  add(`drum-shaft-${d}`, cylinder(TW + 300, 50, 10).rotateX(90).translate(x, TW / 2 + 150, zd).color('#a9b1b5'));
  for (let k = 0; k < 4; k++) add(`paddle-${d}-${k}`, box(26, TW - 160, 300, true).translate(0, 0, 150).rotateY(k * 45 + d * 20).translate(x, 0, zd).color(dark));
  add(`drum-motor-${d}`, cylinder(380, 130, 12).rotateX(-90).translate(x, TW / 2 + 160, zd).color(paint));
  add(`drum-gearbox-${d}`, blk(x, TW / 2 + 200, zd - 180, 260, 140, 300).color(paint));
}

// Inclined screw tube between two points in the XZ plane.
const screw = (x0: number, z0: number, x1: number, z1: number, r: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = (Math.atan2(x1 - x0, z1 - z0) * 180) / Math.PI;
  return cylinder(len, r, 14).rotateY(ang).translate(x0, 0, z0);
};

// Feed screw dropping washed flakes in at the -X end.
const FX0 = -TL / 2 - 2200, FZ0 = 400, FX1 = -TL / 2 + 300, FZ1 = ZW + 650;
add("feed-hopper", profileXZ([[FX0 - 500, FZ0 + 900], [FX0 + 500, FZ0 + 900], [FX0 + 200, FZ0 + 200], [FX0 - 200, FZ0 + 200]], 900).color(tank));
add("feed-screw", screw(FX0, FZ0 + 300, FX1, FZ1, 200).color(paint));
add("feed-motor", cylinder(350, 150, 12).rotateY(90).translate(FX1 - 50, 0, FZ1 + 150).color(dark));
add("feed-spout", blk(FX1, 0, FZ1 - 500, 300, 300, 450).color(paint));
add("feed-stand", blk(FX0 + 200, 0, 0, 200, 600, FZ0 + 200).color(paint));

// Sink screw: lifts PET out of the hopper bottom at the -X end, toward -Y.
const SY = -TW / 2 - 450;
add("sink-screw", screw(-TL / 2 + 600, ZT - 250, -TL / 2 - 1100, ZT + 2300, 180).translate(0, SY, 0).color(paint));
add("sink-boot", blk(-TL / 2 + 600, SY / 2, ZT - 380, 400, -SY, 330).color(tank));
add("sink-spout", blk(-TL / 2 - 1100, SY, ZT + 1600, 280, 280, 650).color(paint));
add("sink-motor", cylinder(320, 130, 12).translate(-TL / 2 - 1150, SY, ZT + 2300).color(dark));
add("sink-bin", blk(-TL / 2 - 1100, SY, 0, 900, 900, 700).subtract(blk(-TL / 2 - 1100, SY, 80, 820, 820, 700)).color('#4b8c3a'));
for (let i = 0; i < 8; i++) add(`pet-${i}`, box(80, 60, 8, true).rotateZ(i * 47).rotateX(20).translate(-TL / 2 - 1350 + (i % 3) * 200, SY - 250 + (i % 4) * 140, 640).color(pet));

// Floats spill over a weir at the +X end onto an inclined dewatering screw.
add("weir-lip", blk(TL / 2 + 150, 0, ZW - 300, 300, TW - 300, 300).color(tank));
add("float-trough", profileXZ([[TL / 2 - 40, ZW + 10], [TL / 2 + 400, ZW - 300], [TL / 2 + 400, ZW - 380], [TL / 2 - 40, ZW - 80]], TW - 300).color(tank));
add("dewatering-screw", screw(TL / 2 + 600, ZW - 600, TL / 2 + 2400, ZW + 1100, 220).color(paint));
add("dewatering-screen", screw(TL / 2 + 650, ZW - 560, TL / 2 + 1500, ZW + 220, 240).color('#7e8a8f'));
add("dewatering-motor", cylinder(380, 160, 12).rotateY(47).translate(TL / 2 + 2400, 0, ZW + 1100).color(dark));
add("dewatering-stand", blk(TL / 2 + 2100, 0, 0, 220, 600, ZW + 650).color(paint));
add("float-sump", blk(TL / 2 + 700, 0, 0, 800, 900, ZW - 600).color(tank));

// Far-side walkway with handrail.
const YWK = TW / 2 + 900;
add("walkway", blk(0, YWK, ZT + TH - 900, TL, 800, 40).color('#8c9196'));
for (const x of [-TL / 2 + 100, 0, TL / 2 - 100]) {
  add(`walk-post-${Math.round(x)}`, blk(x, YWK, 0, 100, 100, ZT + TH - 900).color(paint));
  add(`rail-post-${Math.round(x)}`, blk(x, YWK + 370, ZT + TH - 860, 50, 50, 1100).color('#f2c230'));
}
add("handrail", blk(0, YWK + 370, ZT + TH + 200, TL, 50, 50).color('#f2c230'));
add("knee-rail", blk(0, YWK + 370, ZT + TH - 340, TL, 40, 40).color('#f2c230'));

return p.model();
