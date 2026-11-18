// SPDX-License-Identifier: CC0-1.0
// Rebar cutting machine: the GQ40/GQ50-class electric bar cutter that sits on
// every reinforcing yard, chopping deformed bar to length for the fixers.
// What makes it one rather than a box: a welded sheet-steel housing that steps
// up to a tall cutting head at the front, a squirrel-cage motor with a ribbed
// frame and fan cowl on the rear deck, a big spoked flywheel behind a belt
// guard on the side, the fixed and moving blade jaws in a cast cutting head
// with a bar stop, a roller feed stand in front, a clutch pedal and handle,
// lifting eyes and skid runners - with a length of ribbed rebar in the jaws.
// Generic visualization geometry at real size (about 1.3 m long, 0.8 m tall),
// millimetres, Z up, skids on z = 0, feed direction +X.
meta({
  name: "rebar-cutting-machine",
  license: 'CC0-1.0',
  title: "Rebar cutting machine",
  description: "Electric rebar cutter at real size: stepped sheet-steel housing on skid runners, ribbed motor with fan cowl, spoked flywheel behind a belt guard, cast cutting head with fixed and moving blade jaws and bar stop, roller feed stand, clutch pedal and lever, lifting eyes, and a length of ribbed rebar in the jaws. Capacity choice 40 or 50 mm bar. Material controls: housing paint, guard safety paint, machined steel, rubber, rebar; yardGreen, highVisibility and weathered presets.",
  tags: ['rebar cutter', 'bar cutting machine', 'reinforcement', 'rebar yard', 'construction equipment', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 3200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const capacity = param('capacity', '40mm', { choices: ['40mm', '50mm'], label: 'Bar capacity' });
const housingPaint = param('housingPaint', '#2f6fae', { label: 'Housing paint' });
const guardPaint = param('guardPaint', '#e7b416', { label: 'Guard safety paint' });
const machinedSteel = param('machinedSteel', '#9aa3a8', { label: 'Machined steel' });
const rubber = param('rubber', '#24272a', { label: 'Rubber, belt and pedal' });
const rebarSteel = param('rebarSteel', '#7a5640', { label: 'Rebar mill scale' });
presets({
  yardGreen: { housingPaint: '#3c7a4a', guardPaint: '#e2c23a' },
  highVisibility: { housingPaint: '#e0661f', guardPaint: '#f2d22e', machinedSteel: '#b7bec2' },
  weathered: { housingPaint: '#566b7c', guardPaint: '#b59a45', machinedSteel: '#7b7a72', rebarSteel: '#8a4f2d' },
});

const p = assembly('rebar-cutting-machine');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Solid across Y (width w, centred) from a side profile in [x, z] points.
const alongY = (pts, w) => extrudePolygon(pts, w).rotateX(90).translate(0, w / 2, 0);
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

const big = capacity.value === '50mm';
const W = big ? 440 : 400;    // housing width
const HB = big ? 520 : 480;   // rear deck height
const HH = big ? 720 : 660;   // cutting head height
const XF = 520;               // front face of housing
const BR = big ? 25 : 20;     // bar radius in the jaws

// Skid runners and stepped housing: low rear deck for the motor, tall front for the head.
for (const s of [-1, 1]) {
  add(`skid-${s < 0 ? 'left' : 'right'}`, alongY([[-640, 0], [600, 0], [640, 40], [640, 70], [-640, 70]], 70).translate(0, s * (W / 2 - 20), 0).color(machinedSteel));
}
add('housing', alongY([[-600, 70], [XF, 70], [XF, HH - 60], [XF - 60, HH], [180, HH], [120, HB], [-600, HB]], W).color(housingPaint));
add('housing-rear-plinth', alongY([[-620, 70], [-560, 70], [-560, 160], [-620, 160]], W + 20).color(housingPaint));
add('inspection-panel', box(320, 6, 220, true).translate(-180, -W / 2 - 3, 300).color(housingPaint));
for (const [i, x] of [-320, -40].entries()) {
  add(`panel-latch-${i}`, box(30, 10, 40, true).translate(x, -W / 2 - 8, 300).color(machinedSteel));
}
add('rating-plate', box(110, 4, 70, true).translate(300, -W / 2 - 2, 380).color(machinedSteel));

// Motor on the rear deck: ribbed frame along Y, fan cowl, terminal box.
const XM = -360;
const ZM = HB + 140;
add('motor-frame', turned([[0, -170], [128, -170], [128, 170], [0, 170]]).rotateX(90).translate(XM, 0, ZM).color(housingPaint));
for (let i = 0; i < 5; i++) {
  add(`motor-rib-${i}`, turned([[120, -150 + i * 72], [142, -146 + i * 72], [142, -134 + i * 72], [120, -130 + i * 72]]).rotateX(90).translate(XM, 0, ZM).color(housingPaint));
}
add('motor-fan-cowl', turned([[0, 0], [124, 0], [134, 30], [134, 120], [0, 120]]).rotateX(-90).translate(XM, 170, ZM).color(machinedSteel));
add('motor-feet', box(300, 300, 30, true).translate(XM, 0, HB + 15).color(machinedSteel));
add('terminal-box', box(130, 110, 90, true).translate(XM, -60, ZM + 170).color(housingPaint));
add('cable-gland', cylinder(40, 18, 8).rotateY(-90).translate(XM - 65, -60, ZM + 170).color(rubber));

// Flywheel and belt drive on the left side behind a safety guard.
const XW = -40;
const ZW = HB - 40;
const YS = -W / 2 - 50;
add('motor-pulley', turned([[0, -30], [60, -30], [60, 30], [0, 30]]).rotateX(90).translate(XM, YS, ZM).color(machinedSteel));
add('flywheel-rim', turned([[175, -32], [215, -32], [215, 32], [175, 32]]).rotateX(90).translate(XW, YS, ZW).color(machinedSteel));
add('flywheel-hub', turned([[0, -40], [55, -40], [55, 40], [0, 40]]).rotateX(90).translate(XW, YS, ZW).color(machinedSteel));
for (let i = 0; i < 6; i++) {
  add(`flywheel-spoke-${i}`, box(150, 18, 24, true).translate(110, 0, 0).rotateY(i * 60).translate(XW, YS, ZW).color(machinedSteel));
}
add('drive-belt', rod([XM, YS, ZM + 58], [XW, YS, ZW + 213], 10, 6).color(rubber));
add('drive-belt-lower', rod([XM, YS, ZM - 58], [XW, YS, ZW - 213], 10, 6).color(rubber));
add('belt-guard', alongY([[XM - 80, ZM + 60], [XM + 60, ZM + 75], [XW + 100, ZW + 230], [XW + 220, ZW + 120], [XW + 235, ZW - 60], [XW + 160, ZW - 200], [XW - 20, ZW - 235], [XW - 170, ZW - 180], [XM - 80, ZM - 70]], 12).translate(0, YS - 52, 0).color(guardPaint));
add('belt-guard-band', alongY([[XW + 220, ZW + 120], [XW + 235, ZW - 60], [XW + 160, ZW - 200], [XW + 150, ZW - 185], [XW + 210, ZW - 60], [XW + 195, ZW + 110]], 90).translate(0, YS - 6, 0).color(guardPaint));
add('flywheel-shaft', cylinder(80, 30, 8).rotateX(90).translate(XW, -W / 2 + 10, ZW).color(machinedSteel));

// Cast cutting head: crowned block with the fixed blade, the moving blade jaw and a bar stop.
const XC = XF - 120;
const ZC = HH - 30;
add('head-casting', alongY([[XF - 300, HH - 10], [XF, HH - 10], [XF, HH + 80], [XF - 60, HH + 150], [XF - 240, HH + 150], [XF - 300, HH + 80]], W - 80).color(housingPaint));
add('fixed-blade', box(30, 150, 110, true).translate(XC + 40, 0, ZC + 40).color(machinedSteel));
add('moving-blade-jaw', box(70, 170, 120, true).translate(XC - 20, 0, ZC + 120).color(machinedSteel));
add('jaw-slide', box(120, W - 140, 30, true).translate(XC - 20, 0, ZC + 195).color(machinedSteel));
add('blade-bolts', box(8, 120, 60, true).translate(XC + 59, 0, ZC + 40).color(rubber));
add('cutting-guard', alongY([[XF - 40, HH + 30], [XF + 40, HH + 30], [XF + 40, HH + 210], [XF - 40, HH + 160]], 230).color(guardPaint));
add('bar-stop-arm', rod([XF, W / 2 - 60, ZC + 60], [XF + 300, W / 2 - 60, ZC + 60], 12, 6).color(machinedSteel));
add('bar-stop-plate', box(12, 90, 90, true).translate(XF + 300, W / 2 - 60, ZC + 60).color(guardPaint));

// Roller feed stand in front of the jaws.
const XR = XF + 520;
add('feed-roller', turned([[0, -150], [40, -150], [40, 150], [0, 150]]).rotateX(90).translate(XR, 0, ZC + 15).color(machinedSteel));
for (const s of [-1, 1]) {
  add(`feed-stand-leg-${s < 0 ? 'left' : 'right'}`, rod([XR, s * 170, ZC + 15], [XR - 60, s * 230, 8], 14, 6).color(guardPaint));
  add(`feed-stand-leg-${s < 0 ? 'left' : 'right'}-rear`, rod([XR, s * 170, ZC + 15], [XR + 60, s * 230, 8], 14, 6).color(guardPaint));
}
add('feed-stand-yoke', rod([XR, -170, ZC + 15], [XR, 170, ZC + 15], 12, 6).color(guardPaint));

// Ribbed bar fed through the jaws.
const bar = rod([XC - 60, 0, ZC + 60], [XR + 500, 0, ZC + 60], BR, 8).color(rebarSteel);
add('rebar', bar);
for (let i = 0; i < 9; i++) {
  add(`rebar-rib-${i}`, box(10, BR * 2 + 8, 8, true).rotateY(i % 2 ? 30 : -30).translate(XF + 60 + i * 110, 0, ZC + 60).color(rebarSteel));
}

// Clutch pedal and hand lever, lifting eyes.
add('clutch-pedal-arm', rod([XF - 40, -W / 2 + 40, 160], [XF + 200, -W / 2 + 40, 60], 12, 6).color(machinedSteel));
add('clutch-pedal', box(110, 120, 18, true).rotateY(-12).translate(XF + 220, -W / 2 + 40, 58).color(rubber));
add('clutch-lever', rod([XF - 200, W / 2 + 30, HH - 120], [XF - 260, W / 2 + 30, HH + 230], 12, 6).color(machinedSteel));
add('clutch-lever-knob', turned([[0, 0], [24, 6], [26, 40], [0, 46]]).translate(XF - 262, W / 2 + 30, HH + 225).color(rubber));
for (const [i, x] of [-560, XF - 160].entries()) {
  const z = i === 0 ? HB : HH + 150;
  add(`lifting-eye-${i}`, turned([[22, -10], [40, -10], [40, 10], [22, 10]]).rotateX(90).translate(x, 0, z + 40).color(machinedSteel));
}

return p.model();
