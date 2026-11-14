// Solar panel wash cart: the hand-pushed trolley a cleaning crew walks down
// the rows of a solar farm with.
// What makes it one rather than a box on wheels: a rotomoulded water tank
// with rounded shoulders, a screw fill cap and moulded strap grooves, sitting
// in a tubular steel frame with a looped push handle, two pneumatic wheels
// on hubs and a front kick-stand, a battery pump box with a pressure gauge, a
// hose reel with a coil of hose and a crank, and a telescopic water-fed pole
// with a wide brush head stowed along the side.
// Generic visualization geometry at real size (about 1.25 m long, 1.0 m to the
// handle), millimetres, Z up, wheels and stand on z = 0.
meta({
  name: 'solar-panel-wash-cart',
  license: 'CC0-1.0',
  title: 'Solar panel wash cart',
  description: 'Two-wheel solar panel wash cart at real size: rotomoulded water tank with fill cap and strap grooves in a tubular steel frame with looped push handle, pneumatic wheels on hubs and a kick-stand, battery pump box with pressure gauge, hose reel with coiled hose and crank, and a telescopic water-fed pole with brush head stowed along the side. Tank choice 120 or 200 litres. Material controls: frame steel, tank polymer, tyre and hose rubber, brush and pump accent; fieldService, highVisibility and weathered presets.',
  tags: ['wash cart', 'solar panel cleaning', 'water-fed pole', 'hose reel', 'O&M', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1900
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const tank = param('tank', '200L', { choices: ['120L', '200L'], label: 'Tank size' });
const frameSteel = param('frameSteel', '#5f6a6e', { label: 'Frame and handle steel' });
const tankPolymer = param('tankPolymer', '#e5e6df', { label: 'Water tank polymer' });
const rubber = param('rubber', '#22272a', { label: 'Tyres and hose rubber' });
const accent = param('accent', '#2f74b5', { label: 'Pump box, reel and brush accent' });
presets({
  fieldService: { frameSteel: '#68787b', tankPolymer: '#cdd2cb', accent: '#3b7d4f' },
  highVisibility: { frameSteel: '#3b4245', tankPolymer: '#f0e3b8', accent: '#e07a1f' },
  weathered: { frameSteel: '#76736a', tankPolymer: '#c9c3ad', rubber: '#34342f', accent: '#5b7486' },
});

const p = assembly('solar-panel-wash-cart');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Tube from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const big = tank.value === '200L';
const TL = big ? 760 : 600;   // tank length along X
const TW = 520;               // tank width along Y
const TH = big ? 560 : 440;   // tank height
const WR = 202;               // wheel radius
const AX = -260;              // wheel axle x
const ZF = 230;               // frame deck height

// Tubular frame: two side rails, cross tubes, the looped push handle and kick-stand.
for (const s of [-1, 1]) {
  const y = s * (TW / 2 + 30);
  const k = s < 0 ? 'left' : 'right';
  add(`frame-rail-${k}`, rod([-TL / 2 - 60, y, ZF], [TL / 2 + 80, y, ZF], 16, 8).color(frameSteel));
  add(`handle-upright-${k}`, rod([-TL / 2 - 60, y, ZF], [-TL / 2 - 300, y, 980], 16, 8).color(frameSteel));
  add(`stand-leg-${k}`, rod([TL / 2 + 40, y, ZF], [TL / 2 + 80, y, 6], 14, 6).color(frameSteel));
  add(`axle-hanger-${k}`, box(60, 8, ZF - WR + 20, true).translate(AX, y, WR + (ZF - WR) / 2).color(frameSteel));
}
add('handle-grip', rod([-TL / 2 - 300, -TW / 2 - 30, 980], [-TL / 2 - 300, TW / 2 + 30, 980], 18, 8).color(rubber));
for (const [i, x] of [-TL / 2 - 60, 0, TL / 2 + 80].entries()) {
  add(`cross-tube-${i}`, rod([x, -TW / 2 - 30, ZF], [x, TW / 2 + 30, ZF], 14, 6).color(frameSteel));
}
add('stand-foot', rod([TL / 2 + 80, -TW / 2 - 30, 12], [TL / 2 + 80, TW / 2 + 30, 12], 12, 6).color(frameSteel));
add('axle', rod([AX, -TW / 2 - 110, WR], [AX, TW / 2 + 110, WR], 12, 8).color(frameSteel));

// Pneumatic wheels: tyre, hub and hub cap.
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  const y = s * (TW / 2 + 90);
  add(`wheel-${k}-tyre`, turned([[110, -40], [WR - 30, -45], [WR, -25], [WR, 25], [WR - 30, 45], [110, 40]]).rotateX(90).translate(AX, y, WR).color(rubber));
  add(`wheel-${k}-hub`, turned([[0, -35], [112, -35], [112, 35], [0, 35]]).rotateX(90).translate(AX, y, WR).color(accent));
  add(`wheel-${k}-cap`, cylinder(20, 34, 8).rotateX(90).translate(AX, y + s * 45 + (s > 0 ? 20 : 0), WR).color(frameSteel));
}

// Rotomoulded tank: rounded-shoulder section along X, end caps, fill cap, strap grooves.
const R = 70;
const sec = [[-TW / 2 + R, 0], [TW / 2 - R, 0], [TW / 2, R], [TW / 2, TH - R], [TW / 2 - R, TH], [-TW / 2 + R, TH], [-TW / 2, TH - R], [-TW / 2, R]];
add('tank-body', alongX(sec, -TL / 2 + 30, TL - 60).translate(0, 0, ZF + 16).color(tankPolymer));
const inset = sec.map(([y, z]) => [y * 0.9, z * 0.9 + TH * 0.05]);
add('tank-end-rear', alongX(inset, -TL / 2, 30).translate(0, 0, ZF + 16).color(tankPolymer));
add('tank-end-front', alongX(inset, TL / 2 - 30, 30).translate(0, 0, ZF + 16).color(tankPolymer));
for (const [i, x] of [-TL / 4, TL / 4].entries()) {
  add(`tank-strap-${i}`, alongX(sec.map(([y, z]) => [y * 1.02, z * 1.02 - 4]), x - 20, 40).translate(0, 0, ZF + 16).color(frameSteel));
}
add('fill-neck', cylinder(30, 80, 16).translate(TL / 4 - 120, 0, ZF + 16 + TH).color(tankPolymer));
add('fill-cap', turned([[0, 0], [92, 0], [92, 28], [80, 36], [0, 36]]).translate(TL / 4 - 120, 0, ZF + 46 + TH).color(accent));
add('level-window', box(TL * 0.5, 4, 26, true).translate(0, -TW / 2 - 2, ZF + 16 + TH * 0.5).color(rubber));

// Battery pump box with pressure gauge at the handle end.
const ZT = ZF + 16 + TH;
add('pump-box', box(220, 300, 170, true).translate(-TL / 2 - 140, 0, ZF + 110).color(accent));
add('pump-box-lid', box(232, 312, 14, true).translate(-TL / 2 - 140, 0, ZF + 202).color(frameSteel));
add('pressure-gauge', cylinder(18, 40, 16).rotateY(-90).translate(-TL / 2 - 250, 80, ZF + 140).color(tankPolymer));
add('pump-switch', box(20, 34, 44, true).translate(-TL / 2 - 258, -70, ZF + 140).color(rubber));

// Hose reel on the tank top: two flanges, drum, coil of hose, crank.
const XR = -TL / 4 + 40;
const ZR = ZT + 170;
add('reel-stand-left', box(60, 12, 170, true).translate(XR, -170, ZT + 85).color(frameSteel));
add('reel-stand-right', box(60, 12, 170, true).translate(XR, 170, ZT + 85).color(frameSteel));
add('reel-flanges', turned([[0, -160], [150, -160], [150, -150], [0, -150]]).rotateX(90).translate(XR, 0, ZR).color(accent));
add('reel-flange-far', turned([[0, 150], [150, 150], [150, 160], [0, 160]]).rotateX(90).translate(XR, 0, ZR).color(accent));
add('reel-hose-coil', turned([[60, -148], [120, -148], [128, -120], [128, 120], [120, 148], [60, 148]]).rotateX(90).translate(XR, 0, ZR).color(rubber));
add('reel-crank-arm', box(12, 12, 110, true).translate(XR, 172, ZR + 55).color(frameSteel));
add('reel-crank-knob', cylinder(50, 12, 8).rotateX(-90).translate(XR, 172, ZR + 110).color(rubber));

// Telescopic water-fed pole with brush head, stowed along the right side.
const YP = TW / 2 + 60;
add('pole-lower', rod([-TL / 2 - 200, YP, 760], [TL / 2 + 60, YP, 380], 18, 8).color(accent));
add('pole-upper', rod([TL / 2 + 60, YP, 380], [TL / 2 + 420, YP, 230], 13, 8).color(frameSteel));
add('pole-clip-rear', box(30, 50, 60, true).translate(-TL / 2 - 140, YP - 20, 720).color(rubber));
add('pole-clip-front', box(30, 50, 60, true).translate(TL / 2 - 40, YP - 20, 420).color(rubber));
add('brush-block', box(110, 560, 40, true).rotateY(-22).translate(TL / 2 + 450, YP, 210).color(accent));
add('brush-bristles', box(90, 540, 60, true).rotateY(-22).translate(TL / 2 + 430, YP, 165).color(tankPolymer));
add('pole-hose', rod([XR + 150, 150, ZR - 60], [-TL / 2 - 200, YP, 770], 8, 6).color(rubber));

return p.model();
