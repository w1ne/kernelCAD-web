// SPDX-License-Identifier: CC0-1.0
// Stationary compactor: the fixed waste compactor that sits at a dock or
// transfer bay and packs loose waste into a detachable roll-off receiver
// container. What makes it that machine rather than a baler: a low,
// heavily ribbed ram housing bolted to the ground, a flared charge hopper on
// top where waste is tipped in, a hydraulic ram that sweeps the charge
// chamber and drives the waste through a mouth into the container, a
// separate hydraulic power pack and keyed control panel, and a closed
// receiver container latched onto the compactor's mouth with its own
// rollers and hook-lift nose at the far end.
// Generic visualization geometry at about real size (8.2 m long, 2.4 m
// wide, 2.6 m high), millimetres, Z up, container toward +X.

meta({
  name: "stationary-compactor",
  license: 'CC0-1.0',
  title: "Stationary compactor",
  description: "Stationary waste compactor at about real size: ribbed ram housing on a ground skid, flared charge hopper with cardboard and bagged waste, ram face visible in the charge chamber, rear hydraulic cylinder housing, separate power pack with motor and oil tank, keyed control panel on a post, and a closed roll-off receiver container latched to the mouth with side ribs, rails, rollers and a hook-lift nose. Material controls: compactor paint, container paint, hydraulics, waste load. plant, weathered, municipal and highVisibility presets.",
  tags: ["recycling", "stationary compactor", "waste compactor", "roll-off container", "hydraulic ram", "transfer station", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const compactorPaint = param('compactorPaint', '#2f6db0', { label: 'Compactor body (paint)' });
const containerPaint = param('containerPaint', '#3f7a45', { label: 'Receiver container (paint)' });
const hydraulics = param('hydraulics', '#c9ced1', { label: 'Hydraulics and ram (steel)' });
const waste = param('waste', '#b58b50', { label: 'Waste load (cardboard)' });

presets({
  plant: { compactorPaint: '#2f6db0', containerPaint: '#3f7a45', hydraulics: '#c9ced1', waste: '#b58b50' },
  weathered: { compactorPaint: '#4b5d6c', containerPaint: '#5d5a3f', hydraulics: '#8f928d', waste: '#8f7754' },
  municipal: { compactorPaint: '#e2e0d6', containerPaint: '#225a8c', hydraulics: '#b9c0c3', waste: '#6f8a5a' },
  highVisibility: { compactorPaint: '#e3742b', containerPaint: '#f2c230', hydraulics: '#d0d5d3', waste: '#c49b5b' },
});

const p = assembly("stationary-compactor");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const rectPath = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
const dark = '#23282c';

// Ram housing: a low box from x -3000 to -700 with a charge opening on top.
const X0 = -3000, X1 = -700, W = 1800, H = 1250;
const XC = -1650; // charge opening centre
add("ground-skid", blk((X0 + X1) / 2, 0, 0, X1 - X0 + 200, W + 200, 120).color(dark));
add("ram-housing", blk((X0 + X1) / 2, 0, 120, X1 - X0, W, H - 120)
  .subtract(blk(XC, 0, H - 400, 1500, W - 200, 500)).color(compactorPaint));
for (const x of [-2800, -2400, -2000, -1100]) add(`housing-rib-${-x}`, blk(x, -W / 2 - 40, 120, 90, 80, H - 120).color(compactorPaint));
add("housing-top-rail", blk((X0 + X1) / 2, -W / 2 - 50, H - 90, X1 - X0, 100, 90).color(compactorPaint));
add("chamber-floor", blk(XC, 0, H - 400, 1500, W - 200, 20).color(dark));

// Ram face inside the charge chamber, pushing toward the container mouth.
add("ram-face", blk(-2330, 0, H - 400, 120, W - 220, 380).color('#f2c230'));
add("ram-guide", blk(-2530, 0, H - 400, 300, W - 400, 60).color(hydraulics));

// Flared charge hopper: a ruled loft open at the top, sitting on the opening.
const HZ = H, HH = 1000;
const outer = rectPath(780, 920).loft([rectPath(900, 1200)], { spacing: HH, ruled: true });
const inner = rectPath(740, 880).loft([rectPath(860, 1160)], { spacing: HH + 20, ruled: true });
add("charge-hopper", outer.subtract(inner).translate(XC, 0, HZ).color(compactorPaint));
add("hopper-lip", blk(XC, 0, HZ + HH - 60, 1860, 2460, 60).subtract(blk(XC, 0, HZ + HH - 80, 1700, 2300, 100)).color(dark));
for (const s of [-1, 1]) add(`hopper-stay-${s < 0 ? 'f' : 'b'}`, blk(0, 0, 0, 70, 70, 900).rotateY(-18).translate(XC - 800, s * 980, HZ - 40).color(compactorPaint));

// Waste tipped into the hopper: flattened boxes and bin bags.
const boxes: [number, number, number, number, number][] = [[-1900, -300, 30, 560, 380], [-1500, 250, -20, 620, 420], [-1150, -150, 45, 480, 360], [-1700, 450, 60, 420, 300], [-1300, -480, -35, 500, 340]];
boxes.forEach(([x, y, a, w, d], i) => add(`cardboard-${i}`, box(w, d, 160, true).rotateZ(a).rotateY(i % 2 ? 12 : -9).translate(x - 100, y, HZ + 520 + i * 60).color(waste)));
for (const [i, [x, y]] of ([[-1950, 300], [-1250, 380], [-1550, -50]] as [number, number][]).entries()) {
  add(`bin-bag-${i}`, sphere(240).scale([1.1, 0.9, 0.8]).translate(x - 100, y, HZ + 640).color(i === 1 ? '#2d6e3a' : '#1f2224'));
}

// Rear cylinder housing and the exposed cylinder at the -X end.
add("cylinder-housing", blk(X0 - 450, 0, 120, 900, 900, 760).color(compactorPaint));
add("main-cylinder", cylinder(900, 170, 14).rotateY(90).translate(X0 - 950, 0, 560).color(hydraulics));
add("cylinder-cap", cylinder(80, 220, 14).rotateY(90).translate(X0 - 1010, 0, 560).color(dark));
for (const y of [-260, 260]) add(`hose-${y < 0 ? 'f' : 'b'}`, cylinder(1400, 22, 8).rotateY(90).translate(X0 - 900, y, 900).color(dark));

// Power pack: oil tank, motor and filters on a frame beside the housing.
const PX = -2200, PY = -W / 2 - 750;
add("power-pack-frame", blk(PX, PY, 0, 1100, 700, 120).color(dark));
add("oil-tank", blk(PX + 120, PY, 120, 800, 620, 520).color(compactorPaint));
add("motor", cylinder(520, 200, 14).rotateY(90).translate(PX - 280, PY - 60, 840).color(hydraulics));
add("motor-cowl", cylinder(60, 210, 14).rotateY(90).translate(PX - 340, PY - 60, 840).color(dark));
add("pump", cylinder(220, 110, 12).rotateY(90).translate(PX + 240, PY - 60, 840).color(dark));
add("oil-filter", cylinder(260, 70, 10).translate(PX + 380, PY + 160, 640).color('#c23a2f'));
add("level-gauge", blk(PX + 120, PY - 316, 300, 60, 12, 260).color(hydraulics));

// Keyed control panel on a post near the hopper.
add("control-post", blk(-700, -W / 2 - 900, 0, 90, 90, 1300).color(dark));
add("control-box", blk(-700, -W / 2 - 900, 1250, 500, 260, 600).color('#d7dadc'));
add("control-face", blk(-700, -W / 2 - 1033, 1320, 400, 6, 440).color(dark));
add("e-stop", cylinder(30, 45, 10).rotateX(90).translate(-820, -W / 2 - 1036, 1640).color('#d43a2f'));
add("start-button", cylinder(30, 30, 10).rotateX(90).translate(-640, -W / 2 - 1036, 1640).color('#3fa64a'));
add("cycle-lamp", cylinder(30, 30, 10).rotateX(90).translate(-560, -W / 2 - 1036, 1640).color('#f2c230'));
add("key-switch", cylinder(30, 25, 10).rotateX(90).translate(-700, -W / 2 - 1036, 1460).color(hydraulics));

// Receiver container latched to the mouth: closed box, ribs, sloped nose.
const CX0 = -650, CX1 = 5200, CW = 2300, CH = 2450, CZ = 260;
add("container-body", profileXZ([[CX0, CZ], [CX1 - 500, CZ], [CX1, CZ + 900], [CX1, CZ + CH], [CX0, CZ + CH]], CW).color(containerPaint));
for (let i = 0; i < 9; i++) {
  const x = CX0 + 350 + i * 560;
  if (x < CX1 - 600) for (const s of [-1, 1]) add(`container-rib-${i}-${s < 0 ? 'f' : 'b'}`, blk(x, s * (CW / 2 + 30), CZ, 100, 60, CH).color(containerPaint));
}
for (const s of [-1, 1]) add(`container-top-rail-${s < 0 ? 'f' : 'b'}`, blk((CX0 + CX1) / 2, s * (CW / 2 + 40), CZ + CH - 120, CX1 - CX0, 80, 120).color(containerPaint));
add("receiver-collar", blk(CX0 - 60, 0, 240, 160, W + 120, H + 200).color(dark));
add("door-hinge-plate", blk(CX0 + 40, 0, CZ + CH - 200, 80, CW + 60, 200).color(containerPaint));
for (const s of [-1, 1]) {
  add(`latch-arm-${s < 0 ? 'f' : 'b'}`, blk(CX0 - 250, s * (W / 2 + 70), 700, 600, 60, 80).color('#f2c230'));
  add(`long-rail-${s < 0 ? 'f' : 'b'}`, cylinder(CX1 - CX0 - 400, 70, 10).rotateY(90).translate(CX0 + 200, s * 800, 150).color(dark));
}
for (const s of [-1, 1]) add(`roller-${s < 0 ? 'f' : 'b'}`, cylinder(220, 147, 14).rotateX(90).translate(CX1 - 600, s * 800 + 110, 147).color(dark));
for (const s of [-1, 1]) add(`rear-roller-${s < 0 ? 'f' : 'b'}`, cylinder(220, 140, 14).rotateX(90).translate(CX0 + 600, s * 800 + 110, 140).color(dark));
// Hook-lift A-frame at the nose.
for (const s of [-1, 1]) add(`a-frame-leg-${s < 0 ? 'f' : 'b'}`, blk(0, 0, 0, 120, 120, 1350).rotateX(s * 14).translate(CX1 + 120, s * 160, 200).color(containerPaint));
add("hook-bar", cylinder(500, 50, 10).rotateX(90).translate(CX1 + 120, 250, 1520).color(hydraulics));
add("container-plate", blk(1600, -CW / 2 - 62, CZ + 1500, 1400, 6, 500).color('#f2f2ee'));
add("container-plate-band", blk(1600, -CW / 2 - 66, CZ + 1660, 1200, 6, 160).color(compactorPaint));

return p.model();
