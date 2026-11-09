// SPDX-License-Identifier: CC0-1.0
// Cover-soil spreader: the towed hopper spreader a landfill uses to lay the
// daily cover of soil over the working face at the end of each shift. A
// flared steel hopper heaped with soil rides on a tandem axle with big
// flotation tyres. A floor chain inside carries the soil back through a
// metering door onto two spinning discs, which throw it out in a wide fan.
// A drawbar with a parking jack hitches it to a compactor or a tractor.
// What makes it a spreader rather than a trailer: the flared hopper heaped
// with soil, the twin finned spinner discs under the rear door, the
// tandem flotation wheels and the hitch drawbar. Generic visualization
// geometry at about real size (6.6 m long, 2.6 m wide, 2.7 m high),
// millimetres, Z up, towed toward -X.

meta({
  name: "cover-soil-spreader",
  license: 'CC0-1.0',
  title: "Cover-soil spreader",
  description: "Towed landfill cover-soil spreader at about real size: flared steel hopper heaped with soil on a box-section chassis, tandem axle with four wide flotation tyres and mudguards, rear metering door over twin finned spinner discs, drawbar with hitch eye and parking jack, rear light bar and side ladder. Material controls: hopper paint, chassis paint, tyres, soil. landfill, weathered, highVisibility and sandCover presets.",
  tags: ["recycling", "landfill", "daily cover", "spreader", "trailer", "soil", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2700,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const body = param('body', '#c8571e', { label: 'Hopper paint' });
const chassis = param('chassis', '#2b2f33', { label: 'Chassis and drawbar paint' });
const tyres = param('tyres', '#1c1d1f', { label: 'Tyres (rubber)' });
const soil = param('soil', '#6b4f32', { label: 'Cover soil' });

presets({
  landfill: { body: '#c8571e', chassis: '#2b2f33', tyres: '#1c1d1f', soil: '#6b4f32' },
  weathered: { body: '#9a5a36', chassis: '#3b3a36', tyres: '#2a2927', soil: '#7a6248' },
  highVisibility: { body: '#e8c020', chassis: '#2b2f33', tyres: '#1c1d1f', soil: '#5f4630' },
  sandCover: { body: '#2f7a46', chassis: '#4a4f54', tyres: '#1c1d1f', soil: '#c7a36a' },
});

const p = assembly("cover-soil-spreader");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
const taper = (w0: number, d0: number, a: [number, number, number], w1: number, d1: number, b: [number, number, number]) => rect(w0, d0).loft([rect(w1, d1)], {
  planes: [{ plane: 'XY' as const, origin: a }, { plane: 'XY' as const, origin: b }],
  ruled: true,
});
const steel = '#9aa1a5';
const amber = '#f0a020';

// Chassis: two box rails, cross members, drawbar to the hitch eye at -X.
const RZ = 900, X0 = -1600, X1 = 2600;
for (const s of [-1, 1]) add(`rail-${s < 0 ? 'f' : 'b'}`, blk((X0 + X1) / 2, s * 520, RZ, X1 - X0, 160, 220).color(chassis));
for (const x of [X0 + 100, 0, 1300, X1 - 100]) add(`cross-${x}`, blk(x, 0, RZ, 140, 1200, 180).color(chassis));
for (const s of [-1, 1]) add(`drawbar-arm-${s < 0 ? 'f' : 'b'}`, profileXZ([[X0 - 2000, 700], [X0, RZ], [X0, RZ + 200], [X0 - 2000, 840]], 120).rotateZ(s * 14).translate(X0, s * 520, 0).translate(-X0, 0, 0).color(chassis));
add("drawbar-nose", blk(X0 - 2050, 0, 680, 300, 220, 180).color(chassis));
add("hitch-eye", torus(90, 30, 10).rotateX(90).translate(X0 - 2260, 0, 770).color(steel));
add("jack-tube", blk(X0 - 1700, -60, 160, 110, 110, 700).color(chassis));
add("jack-foot", blk(X0 - 1700, -60, 0, 280, 280, 40).color(chassis));
add("jack-inner", blk(X0 - 1700, -60, 40, 70, 70, 140).color(steel));
add("jack-crank", blk(X0 - 1700, -170, 800, 40, 220, 40).color(steel));

// Tandem axle, wide flotation tyres and mudguards.
const TR = 560, TW = 420, ZA = TR + 30; // tread lugs stand proud of the tyre, so lift the axle to keep them above the ground
for (const ax of [600, 1800]) {
  add(`axle-${ax}`, cylinder(2560, 80, 10).rotateX(90).translate(ax, 1280, ZA).color(chassis));
  for (const s of [-1, 1]) {
    const y0 = s < 0 ? -760 : 760 + TW;
    add(`tyre-${s < 0 ? 'f' : 'b'}-${ax}`, cylinder(TW, TR, 22).rotateX(90).translate(ax, y0, ZA).color(tyres));
    add(`rim-${s < 0 ? 'f' : 'b'}-${ax}`, cylinder(TW + 20, 300, 16).rotateX(90).translate(ax, y0 + 10, ZA).color(steel));
    add(`hub-${s < 0 ? 'f' : 'b'}-${ax}`, cylinder(80, 120, 10).rotateX(90).translate(ax, s < 0 ? -760 - TW : 760 + TW + 80, ZA).color(chassis));
    for (let k = 0; k < 9; k++) add(`tread-${s < 0 ? 'f' : 'b'}-${ax}-${k}`, blk(0, 0, TR - 15, 90, TW - 60, 30).rotateY(k * 40 + 20).translate(ax, s * (760 + TW / 2), ZA).color(tyres));
  }
  add(`spring-hanger-${ax}`, blk(ax, 0, TR + 60, 260, 1100, RZ - TR - 60).color(chassis));
}
for (const s of [-1, 1]) add(`mudguard-${s < 0 ? 'f' : 'b'}`, profileXZ([[0, 1180], [-60, 1300], [2400, 1300], [2460, 1180], [2420, 1160], [2380, 1260], [20, 1260], [-20, 1160]], TW + 80).translate(0, s * (760 + TW / 2), 0).color(body));

// Hopper: a flared box on the chassis, open at the top and heaped with soil.
const HZ = RZ + 220, HL = 3800, HC = 800, HB = 1300, HT = 2500, HH = 1250;
add("hopper", taper(HL, HB, [HC, 0, HZ], HL + 300, HT, [HC, 0, HZ + HH]).subtract(taper(HL - 120, HB - 120, [HC, 0, HZ + 80], HL + 180, HT - 120, [HC, 0, HZ + HH + 2])).color(body));
add("hopper-rim", blk(HC, 0, HZ + HH - 60, HL + 380, HT + 60, 60).subtract(blk(HC, 0, HZ + HH - 80, HL + 180, HT - 140, 120)).color(body));
add("soil-heap", taper(HL + 120, HT - 140, [HC, 0, HZ + HH - 140], 1600, 700, [HC - 300, 100, HZ + HH + 450]).color(soil));
for (let i = 0; i < 10; i++) {
  const x = HC - 1500 + (i % 5) * 740 + ((i * 37) % 100);
  const y = i < 5 ? -650 : 500;
  add(`clod-${i}`, box(260, 200, 160, true).rotateX(i * 29).rotateZ(i * 43).translate(x, y, HZ + HH + 40 + ((i * 17) % 3) * 40).color(i % 3 === 0 ? '#5a4029' : soil));
}

// Rear: metering door, twin finned spinner discs, light bar.
const BX = HC + HL / 2;
add("metering-door", blk(BX + 40, 0, HZ + 120, 60, 900, 520).color(body));
add("door-ram", cylinder(500, 40, 10).translate(BX + 100, -520, HZ + 400).color(steel));
add("spinner-deck", blk(BX + 400, 0, RZ - 60, 700, 1500, 40).color(chassis));
for (const s of [-1, 1]) {
  const sy = s * 380;
  add(`spinner-gearbox-${s < 0 ? 'f' : 'b'}`, cylinder(220, 110, 12).translate(BX + 420, sy, RZ - 280).color(chassis));
  add(`spinner-disc-${s < 0 ? 'f' : 'b'}`, cylinder(30, 330, 20).translate(BX + 420, sy, RZ - 320).color(steel));
  for (let k = 0; k < 4; k++) add(`spinner-fin-${s < 0 ? 'f' : 'b'}-${k}`, blk(150, 0, 0, 300, 25, 70).rotateZ(k * 90 + (s < 0 ? 20 : 65)).translate(BX + 420, sy, RZ - 290).color(steel));
  add(`soil-throw-${s < 0 ? 'f' : 'b'}`, box(160, 120, 90, true).rotateZ(30 * s).translate(BX + 700, sy + s * 260, RZ - 250).color(soil));
}
add("deflector", profileXZ([[BX + 60, RZ - 40], [BX + 820, RZ - 40], [BX + 820, RZ - 120], [BX + 60, RZ + 300]], 1500).color(body));
add("light-bar", blk(BX + 860, 0, RZ - 60, 60, 2200, 140).color(chassis));
for (const s of [-1, 1]) add(`tail-lamp-${s < 0 ? 'f' : 'b'}`, blk(BX + 895, s * 980, RZ - 40, 20, 180, 100).color('#c8302a'));
add("beacon", cylinder(180, 80, 12).translate(BX - 150, -900, HZ + HH).color(amber));
add("beacon-post", blk(BX - 150, -900, HZ + HH - 300, 60, 60, 300).color(chassis));

// Side ladder on the front face for checking the load.
for (const sx of [-1, 1]) add(`ladder-rail-${sx}`, blk(-700 + sx * 200, -HB / 2 - 360, HZ - 500, 50, 50, HH + 500).color(chassis));
for (let k = 0; k < 5; k++) add(`ladder-rung-${k}`, blk(-700, -HB / 2 - 360, HZ - 380 + k * 300, 400, 40, 30).color(chassis));
add("ladder-stay", blk(-700, -HB / 2 - 200, HZ + HH - 300, 440, 340, 40).color(chassis));

return p.model();
