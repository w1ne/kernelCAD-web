// SPDX-License-Identifier: CC0-1.0
// Recreational inline skate: what makes it one is the soft boot on a single
// in-line aluminium frame — four wheels in a row under the sole, a heel brake
// trailing behind — with a hinged moulded cuff around the ankle, a power strap
// with buckle over the instep, laces up the toe box and a padded tongue.
// Generic visualization geometry at about real size (EU 42 boot, 80 mm
// wheels, 243 mm frame), millimetres, Z up, toe toward -X, wheels on z = 0.
meta({
  name: 'inline-skate',
  license: 'CC0-1.0',
  title: 'Inline skate',
  description: "Recreational inline skate at about real size: soft boot with toe cap, laces, padded tongue and heel counter; hinged moulded cuff with power strap and buckle; extruded aluminium frame with four 80 mm wheels, hub cores and axle bolts; heel brake pad. Material controls: synthetic boot fabric, molded cuff polymer, frame aluminium, urethane wheels, lace and strap accent; clubColors, aggressive and weathered presets.",
  tags: ['inline skate', 'roller skate', 'rollerblade', 'skating', 'sports equipment', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const syntheticBoot = param('syntheticBoot', '#3d5a78', { label: 'Synthetic boot fabric' });
const moldedCuff = param('moldedCuff', '#24292e', { label: 'Molded cuff polymer' });
const aluminiumFrame = param('aluminiumFrame', '#aeb7bb', { label: 'Frame aluminium' });
const urethaneWheel = param('urethaneWheel', '#e9e4d2', { label: 'Urethane wheels' });
const strapAccent = param('strapAccent', '#e4572e', { label: 'Laces, strap and hubs' });
presets({
  clubColors: { syntheticBoot: '#c04d40', strapAccent: '#f2f0e8' },
  aggressive: { syntheticBoot: '#1d1f22', moldedCuff: '#1d1f22', aluminiumFrame: '#4b5257', urethaneWheel: '#86c540', strapAccent: '#86c540' },
  weathered: { syntheticBoot: '#5b6670', moldedCuff: '#3c3f41', aluminiumFrame: '#8a9094', urethaneWheel: '#c2b48f', strapAccent: '#9a6a4a' },
});

const p = assembly('inline-skate');
const add = (name, shape) => p.part(name, shape.scale(scale));

// Side outline [[x, z], ...] extruded across Y, centred on y0.
const side = (pts, t, y0 = 0) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2 + y0, 0);
// Plan outline [[x, y], ...] extruded up from z0.
const plan = (pts, z0, h) => extrudePolygon(pts, h).translate(0, 0, z0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Foot-shaped plan: rounded toe, narrower waist and a round heel.
const footPlan = (grow = 0) => {
  const pts = [];
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    // x from -150 (toe) to +125 (heel); wider at the ball of the foot.
    const x = c < 0 ? 150 * c : 125 * c;
    const hw = (c < 0 ? 52 : 42) + grow;
    pts.push([x + grow * Math.sign(c), hw * s]);
  }
  return pts;
};

const WHEEL_R = 40;
const SOLE_Z = 118;      // underside of the boot sole

// Frame: two side rails with lightening windows joined by a top plate.
const framePts = [[-130, SOLE_Z], [118, SOLE_Z], [114, 72], [100, 46], [-118, 46], [-132, 72]];
for (const sy of [-1, 1]) {
  let rail = side(framePts, 5, sy * 14 - 2.5);
  for (const wx of [-72, 0, 72]) rail = rail.subtract(side([[wx - 26, 106], [wx + 26, 106], [wx + 14, 60], [wx - 14, 60]], 20, sy * 14 - 10));
  add(`frame-rail-${sy < 0 ? 'left' : 'right'}`, rail.color(aluminiumFrame));
}
add('frame-top-plate', plan(filletPolygon([[-132, -19], [118, -19], [118, 19], [-132, 19]], 12), SOLE_Z - 8, 8).color(aluminiumFrame));

// Four 80 mm wheels on the 243 mm frame, with hubs and axle bolt heads.
const wheelX = [-121, -40, 40, 121].map((x) => x * 0.88);
for (const [i, wx] of wheelX.entries()) {
  add(`wheel-${i + 1}`, turned([[18, -11], [WHEEL_R - 6, -12], [WHEEL_R, -5], [WHEEL_R, 5], [WHEEL_R - 6, 12], [18, 11]]).rotateX(90).translate(wx, 0, WHEEL_R).color(urethaneWheel));
  add(`hub-${i + 1}`, cylinder(22, 18, 6).translate(0, 0, -11).rotateX(90).translate(wx, 0, WHEEL_R).color(strapAccent));
  add(`axle-bolt-${i + 1}`, cylinder(36, 6, 6).translate(0, 0, -18).rotateX(90).translate(wx, 0, WHEEL_R).color(aluminiumFrame));
}

// Heel brake: an arm off the rear axle carrying an angled rubber pad.
add('brake-arm', side([[100, 62], [140, 78], [190, 64], [192, 44], [150, 46], [104, 40]], 34).color(moldedCuff));
add('brake-pad', side([[150, 46], [192, 44], [200, 10], [160, 8]], 30).color(urethaneWheel));

// Boot: a toe box and heel built from a side profile cut to the foot plan.
const bootSide = [[-152, SOLE_Z], [125, SOLE_Z], [132, 190], [118, 260], [60, 268], [30, 250], [-30, 205], [-90, 185], [-140, 168], [-160, 140]];
add('sole', plan(footPlan(4), SOLE_Z, 10).color(moldedCuff));
add('boot-upper', side(bootSide, 140).intersect(plan(footPlan(0), SOLE_Z + 8, 300)).color(syntheticBoot));
// Toe cap and heel counter in the cuff polymer.
add('toe-cap', side([[-155, SOLE_Z + 8], [-90, SOLE_Z + 8], [-100, 165], [-142, 160], [-160, 138]], 150).intersect(plan(footPlan(2), SOLE_Z + 8, 300)).color(moldedCuff));
add('heel-counter', side([[70, SOLE_Z + 8], [128, SOLE_Z + 8], [134, 200], [95, 195]], 150).intersect(plan(footPlan(2), SOLE_Z + 8, 300)).color(moldedCuff));
// Padded tongue rising out of the instep.
add('tongue', side([[-30, 200], [-5, 220], [30, 300], [48, 330], [28, 340], [5, 300], [-38, 212]], 64).color(syntheticBoot));
// Laces: rows across the instep, following its slope.
for (let i = 0; i < 5; i++) {
  const x = -95 + i * 18;
  const z = 186 + i * 7;
  add(`lace-${i + 1}`, box(6, 74, 5, true).rotateY(-20).translate(x, 0, z + 4).color(strapAccent));
}

// Hinged cuff: an open-front shell round the ankle, leaned forward.
const cuffBand = [];
const cuffInner = [];
for (let k = 0; k <= 14; k++) {
  const a = ((-150 + (300 * k) / 14) * Math.PI) / 180;
  cuffBand.push([62 * Math.cos(a), 56 * Math.sin(a)]);
  cuffInner.push([54 * Math.cos(a), 48 * Math.sin(a)]);
}
add('cuff', extrudePolygon([...cuffBand, ...cuffInner.reverse()], 110).rotateY(-10).translate(62, 0, 240).color(moldedCuff));
add('cuff-liner', extrudePolygon(footPlan(0).map(([x, y]) => [x * 0.36, y * 1.0]), 120).translate(58, 0, 236).color(syntheticBoot));
for (const sy of [-1, 1]) add(`cuff-pivot-${sy < 0 ? 'left' : 'right'}`, cylinder(8, 11, 12).translate(0, 0, -4).rotateX(90).translate(70, sy * 58, 250).color(aluminiumFrame));
// Power strap and buckle across the top of the cuff.
add('power-strap', box(14, 126, 6, true).rotateY(-10).translate(18, 0, 318).color(strapAccent));
add('buckle', box(26, 20, 10, true).rotateY(-10).translate(14, -44, 322).color(aluminiumFrame));

return p.model();
