// SPDX-License-Identifier: CC0-1.0
// Material chipper: the towable disc chipper a green-waste yard or wood
// recycling bay uses to turn branches, brush and pallet offcuts into
// chips. What makes it that machine rather than a shredder: a big flared
// infeed chute with a yellow control bar around its mouth, a toothed feed
// roller pulling wood in toward a heavy vertical cutting disc in a round
// housing, a tall discharge spout with an adjustable deflector cap that
// blows the chips out, an engine under a hood, and a single-axle trailer
// chassis with fenders, drawbar and jack stand.
// Generic visualization geometry at about real size (2.0 m wide, 5.6 m
// long, 2.9 m high), millimetres, Z up, infeed mouth toward -Y.

meta({
  name: "material-chipper",
  license: 'CC0-1.0',
  title: "Material chipper",
  description: "Towable disc wood chipper at about real size: flared infeed chute with a yellow control bar and infeed tray, toothed feed roller, round cutting-disc housing, tall discharge spout with deflector cap, engine hood with vent grille and exhaust, single-axle trailer chassis with tyres, fenders, drawbar and jack stand, and a branch being fed in with chips scattered on the tray. Material controls: body paint, chassis and tyres, steel, wood. plant, weathered, municipal and highVisibility presets.",
  tags: ["recycling", "wood chipper", "disc chipper", "brush chipper", "green waste", "wood recycling", "trailer", "materials recovery", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const bodyPaint = param('bodyPaint', '#e8722a', { label: 'Body and hood (paint)' });
const chassis = param('chassis', '#2b2f33', { label: 'Chassis and tyres' });
const steel = param('steel', '#b9c0c3', { label: 'Disc, roller and fittings (steel)' });
const wood = param('wood', '#a77d4d', { label: 'Branches and chips (wood)' });

presets({
  plant: { bodyPaint: '#e8722a', chassis: '#2b2f33', steel: '#b9c0c3', wood: '#a77d4d' },
  weathered: { bodyPaint: '#a8664a', chassis: '#3d3a36', steel: '#8f918c', wood: '#7d6a4f' },
  municipal: { bodyPaint: '#2f7d4f', chassis: '#2b2f33', steel: '#c3c9cc', wood: '#b88c55' },
  highVisibility: { bodyPaint: '#f2c230', chassis: '#23282c', steel: '#cdd3d6', wood: '#c49b5b' },
});

const p = assembly("material-chipper");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const tyre = '#1d2023';

// Trailer chassis: two rails, axle, wheels with fenders, drawbar and jack.
const ZF = 480; // top of the frame rails
for (const s of [-1, 1]) add(`frame-rail-${s < 0 ? 'l' : 'r'}`, blk(s * 420, 600, ZF - 140, 100, 3600, 140).color(chassis));
for (const y of [-1100, 600, 2300]) add(`cross-member-${y < 0 ? 'f' : y > 1000 ? 'b' : 'm'}`, blk(0, y, ZF - 140, 940, 100, 140).color(chassis));
add("axle", cylinder(1500, 50, 10).rotateY(90).translate(-750, 400, 360).color(chassis));
for (const s of [-1, 1]) {
  const x = s * 760;
  add(`tyre-${s < 0 ? 'l' : 'r'}`, cylinder(260, 360, 18).rotateY(90).translate(x - 130, 400, 360).color(tyre));
  add(`rim-${s < 0 ? 'l' : 'r'}`, cylinder(272, 190, 12).rotateY(90).translate(x - 136, 400, 360).color(steel));
  add(`fender-${s < 0 ? 'l' : 'r'}`, profileYZ([[-520, 360], [-420, 760], [420, 760], [520, 360], [460, 360], [370, 700], [-370, 700], [-460, 360]], 300).translate(x, 400, 0).color(bodyPaint));
}
add("drawbar", extrudePolygon([[-420, 2350], [420, 2350], [60, 3500], [-60, 3500]], 120).translate(0, 0, ZF - 260).color(chassis));
add("hitch-eye", cylinder(60, 110, 12).translate(0, 3560, ZF - 260).color(steel));
add("jack-tube", cylinder(ZF - 40, 45, 10).translate(0, 3150, 40).color(steel));
add("jack-foot", blk(0, 3150, 0, 220, 220, 40).color(chassis));
add("jack-crank", blk(0, 3150, ZF + 60, 40, 200, 40).color(steel));

// Round cutting-disc housing standing on the frame, axis along Y.
const YD = -400, ZD = 1150, RD = 640;
add("disc-housing", cylinder(380, RD, 22).rotateX(90).translate(0, YD + 190, ZD).color(bodyPaint));
add("housing-rim", cylinder(400, RD + 30, 22).rotateX(90).translate(0, YD + 200, ZD).subtract(cylinder(420, RD - 20, 22).rotateX(90).translate(0, YD + 210, ZD)).color(chassis));
add("housing-cradle", blk(0, YD, ZF, 900, 420, ZD - RD - ZF + 120).color(chassis));
add("disc-bearing", cylinder(260, 170, 14).rotateX(90).translate(0, YD + 450, ZD).color(steel));

// Flared infeed chute with feed roller, tray and yellow control bar.
const Y0 = YD - 190, LC = 1250;
const chuteOut = rectPath(330, 260).loft([rectPath(720, 520)], { spacing: LC, ruled: true });
const chuteIn = rectPath(290, 220).loft([rectPath(680, 480)], { spacing: LC + 20, ruled: true });
add("infeed-chute", chuteOut.subtract(chuteIn.translate(0, 0, -10)).rotateX(90).translate(0, Y0, 1000).color(bodyPaint));
add("infeed-tray", blk(0, Y0 - LC - 250, 480, 1440, 500, 40).color(bodyPaint));
add("control-bar-top", blk(0, Y0 - LC - 80, 1540, 1540, 60, 60).color('#f2c230'));
for (const s of [-1, 1]) add(`control-bar-side-${s < 0 ? 'l' : 'r'}`, blk(s * 770, Y0 - LC - 80, 520, 60, 60, 1080).color('#f2c230'));
add("feed-roller", cylinder(560, 150, 14).rotateY(90).translate(-280, Y0 - 250, 1080).color(steel));
for (let k = 0; k < 6; k++) add(`roller-tooth-${k}`, blk(0, 0, 140, 560, 40, 50).rotateX(k * 60).translate(0, Y0 - 250, 1080).color(chassis));
add("roller-motor", cylinder(200, 120, 12).rotateY(90).translate(-480, Y0 - 250, 1080).color(chassis));

// Tall discharge spout with a deflector cap, blowing toward +Y.
add("spout-base", blk(0, YD + 40, ZD + RD - 120, 380, 360, 520).color(bodyPaint));
const SL = 1300, SA = 25;
add("spout-tube", blk(0, 0, 0, 340, 320, SL).rotateX(-SA).translate(0, YD + 40, ZD + RD + 340).color(bodyPaint));
const top = [0, YD + 40 + SL * Math.sin(SA * Math.PI / 180), ZD + RD + 340 + SL * Math.cos(SA * Math.PI / 180)];
add("deflector-cap", profileYZ([[-200, 0], [260, -40], [420, -240], [380, -260], [220, -90], [-200, -40]], 420).translate(0, top[1], top[2] + 40).color(bodyPaint));
add("spout-crank", cylinder(300, 20, 8).translate(-240, YD + 300, ZD + RD + 400).color(steel));

// Engine under a hood behind the disc, with grille, exhaust and fuel tank.
add("engine-hood", profileYZ([[0, ZF], [1800, ZF], [1800, 1350], [1600, 1550], [200, 1550], [0, 1400]], 1100).translate(0, 0, 0).color(bodyPaint));
for (let i = 0; i < 6; i++) add(`grille-slat-${i}`, blk(-556, 500 + i * 150, 820, 12, 90, 500).color(chassis));
add("exhaust-stack", cylinder(600, 55, 10).translate(380, 1500, 1550).color(chassis));
add("exhaust-cap", cylinder(40, 70, 10).translate(380, 1500, 2150).color(steel));
add("fuel-tank", blk(-430, 2050, ZF, 260, 400, 380).color(chassis));
add("fuel-cap", cylinder(40, 50, 10).translate(-430, 2050, ZF + 380).color('#f2c230'));
add("control-box", blk(-570, 1300, 1100, 40, 360, 260).color(chassis));
add("hour-meter", blk(-592, 1300, 1160, 6, 200, 120).color('#d7dadc'));

// A branch being fed in, with chips scattered on the tray.
add("branch", cylinder(2200, 70, 10).translate(0, 0, -1100).rotateX(90 - 12).rotateZ(6).translate(-60, Y0 - 900, 900).color(wood));
for (const [i, [a, l]] of ([[30, 600], [-40, 500], [60, 450]] as [number, number][]).entries()) {
  add(`twig-${i}`, cylinder(l, 25, 8).rotateX(90 - 20).rotateZ(a).translate(-60, Y0 - 1400 - i * 300, 820 + i * 60).color(wood));
}
for (let i = 0; i < 12; i++) add(`chip-${i}`, box(60, 40, 12, true).rotateZ(i * 41).translate(-560 + i * 95, Y0 - LC - 250 + 140 * Math.sin(i * 1.9), 526).color(wood));

return p.model();
