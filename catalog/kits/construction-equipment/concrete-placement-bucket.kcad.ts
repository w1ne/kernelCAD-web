// SPDX-License-Identifier: CC0-1.0
// Concrete placement bucket: the upright crane skip a tower crane swings from
// the truck to the pour, opening a gate at the bottom to drop concrete into
// the formwork.
// What makes it one rather than a box: a round hopper that tapers to a narrow
// outlet, rolled rim and stiffening bands, trunnion pins carrying a lifting
// bail that meets at a crane eye, a four-leg stand frame with a skid ring, a
// sliding clam gate worked by a long hand lever, and a rubber elephant-trunk
// hose hanging from the outlet - with a load of grey concrete in the mouth.
// Generic visualization geometry at real size (1 m3 bucket is about 1.5 m
// across and 2.4 m to the eye), millimetres, Z up, skid ring on z = 0.
meta({
  name: "concrete-placement-bucket",
  license: 'CC0-1.0',
  title: "Concrete placement bucket",
  description: "Upright crane concrete bucket at real size: round hopper tapering to a narrow outlet with rolled rim and stiffening bands, trunnion pins and a lifting bail meeting at a crane eye, four-leg stand on a skid ring, sliding clam gate with a long hand lever, rubber elephant-trunk hose, and a load of concrete in the mouth. Capacity choice 0.5 or 1.0 m3. Material controls: bucket paint, bail and frame steel, hose rubber, wet concrete; craneYellow, highVisibility and weathered presets.",
  tags: ['concrete bucket', 'crane skip', 'concrete placement', 'tower crane', 'pour', 'construction equipment', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 3000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const capacity = param('capacity', '1.0m3', { choices: ['0.5m3', '1.0m3'], label: 'Bucket capacity' });
const bucketPaint = param('bucketPaint', '#d9a21b', { label: 'Bucket paint' });
const frameSteel = param('frameSteel', '#4c5459', { label: 'Bail and frame steel' });
const hoseRubber = param('hoseRubber', '#1f2224', { label: 'Hose rubber' });
const concrete = param('concrete', '#8f918c', { label: 'Wet concrete' });
presets({
  craneYellow: { bucketPaint: '#f0c419', frameSteel: '#2f3437' },
  highVisibility: { bucketPaint: '#e8641c', frameSteel: '#d8dcdc' },
  weathered: { bucketPaint: '#a6834a', frameSteel: '#5d5a52', concrete: '#a7a59c' },
});

const p = assembly('concrete-placement-bucket');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Revolve an (r, z) profile about Z.
const turned = (pts, n) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve(n);
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

const big = capacity.value === '1.0m3';
const RT = big ? 720 : 560;    // rim radius
const RO = 190;                // outlet radius
const ZO = 520;                // outlet (bottom of cone)
const ZT = big ? 1700 : 1420;  // rim height
const T = 10;                  // plate thickness
// Radius of the cone at height z.
const rAt = (z) => RO + ((RT - RO) * (z - ZO)) / (ZT - ZO);

// Hopper: thin conical shell, rolled rim, outlet neck, two stiffening bands.
add('hopper-shell', turned([[RO, ZO], [RO + T, ZO], [RT + T, ZT], [RT, ZT]]).color(bucketPaint));
add('rolled-rim', turned([[RT - 10, ZT - 20], [RT + 40, ZT - 20], [RT + 40, ZT + 20], [RT - 10, ZT + 20]]).color(bucketPaint));
add('outlet-neck', turned([[RO - 30, ZO - 140], [RO + 20, ZO - 140], [RO + 20, ZO + 20], [RO - 30, ZO + 20]]).color(bucketPaint));
for (const [i, f] of [0.38, 0.72].entries()) {
  const z = ZO + f * (ZT - ZO);
  add(`stiffening-band-${i}`, turned([[rAt(z) - 5, z - 30], [rAt(z) + 25, z - 30], [rAt(z) + 25, z + 30], [rAt(z) - 5, z + 30]]).color(bucketPaint));
}
add('concrete-load', turned([[0, ZO], [RO, ZO], [rAt(ZT - 140), ZT - 140], [rAt(ZT - 140) * 0.6, ZT - 90], [0, ZT - 60]]).color(concrete));
add('concrete-splash', turned([[RT - 6, ZT + 20], [RT + 36, ZT + 20], [RT + 30, ZT + 32], [RT, ZT + 32]], 12).color(concrete));

// Trunnions and lifting bail meeting at the crane eye.
const ZP = ZO + 0.72 * (ZT - ZO);
const XP = rAt(ZP) + 60;
const ZE = ZT + (big ? 900 : 760);
for (const s of [-1, 1]) {
  const k = s < 0 ? 'left' : 'right';
  add(`trunnion-${k}`, cylinder(90, 55, 12).rotateY(90).translate(s > 0 ? rAt(ZP) : -rAt(ZP) - 90, 0, ZP).color(frameSteel));
  add(`trunnion-cap-${k}`, cylinder(20, 75, 12).rotateY(90).translate(s > 0 ? XP + 30 : -XP - 50, 0, ZP).color(frameSteel));
  add(`bail-arm-${k}`, rod([s * (XP + 10), 0, ZP], [s * (XP + 10), 0, ZT + 220], 32, 8).color(frameSteel));
  add(`bail-sling-${k}`, rod([s * (XP + 10), 0, ZT + 220], [s * 70, 0, ZE - 40], 32, 8).color(frameSteel));
}
add('crane-eye-plate', box(160, 30, 170, true).translate(0, 0, ZE).color(frameSteel));
add('crane-eye', turned([[45, -18], [85, -18], [85, 18], [45, 18]], 16).rotateX(90).translate(0, 0, ZE + 130).color(frameSteel));

// Stand frame: four splayed legs from a collar to a skid ring.
const ZC = ZO + 160;
add('stand-collar', turned([[rAt(ZC) - 5, ZC - 30], [rAt(ZC) + 30, ZC - 30], [rAt(ZC) + 30, ZC + 30], [rAt(ZC) - 5, ZC + 30]]).color(frameSteel));
add('skid-ring', turned([[RT - 120, 0], [RT - 50, 0], [RT - 50, 60], [RT - 120, 60]], 16).color(frameSteel));
for (let i = 0; i < 4; i++) {
  const a = ((i * 90 + 45) * Math.PI) / 180;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  add(`stand-leg-${i}`, rod([(rAt(ZC) + 20) * c, (rAt(ZC) + 20) * sn, ZC], [(RT - 85) * c, (RT - 85) * sn, 30], 26, 6).color(frameSteel));
}

// Sliding clam gate under the outlet, worked by a long hand lever.
add('gate-guides', box(RO * 2 + 160, RO * 2 + 80, 30, true).translate(0, 0, ZO - 160).color(frameSteel));
add('gate-plate', box(RO * 2 + 40, RO * 2 + 40, 24, true).translate(120, 0, ZO - 190).color(bucketPaint));
add('gate-pivot', cylinder(60, 30, 8).translate(RO + 130, -RO - 40, ZO - 220).color(frameSteel));
add('gate-lever', rod([RO + 130, -RO - 40, ZO - 160], [RT + 300, -RO - 260, ZT - 200], 22, 6).color(frameSteel));
add('gate-lever-grip', rod([RT + 300, -RO - 260, ZT - 200], [RT + 320, -RO - 280, ZT - 20], 26, 8).color(hoseRubber));

// Rubber elephant-trunk hose from the outlet, flopping over to one side.
const hose = [[0, 0, ZO - 175], [-40, 0, ZO - 300], [-170, 0, ZO - 370], [-360, 0, ZO - 385]];
for (let i = 0; i < hose.length - 1; i++) {
  add(`hose-${i}`, rod(hose[i], hose[i + 1], 120, 12).color(hoseRubber));
}
add('hose-clamp', turned([[RO + 18, ZO - 175], [RO + 30, ZO - 175], [RO + 30, ZO - 135], [RO + 18, ZO - 135]], 16).color(frameSteel));

return p.model();
