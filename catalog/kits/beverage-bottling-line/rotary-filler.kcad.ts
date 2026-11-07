// SPDX-License-Identifier: CC0-1.0
// Rotary bottle filler: the carousel at the heart of a bottling line. Bottles
// arrive single-file on a belt, an infeed star wheel indexes them into pockets
// on the rotating filler table, and each rides under its own filling valve
// hanging off a ring-shaped product bowl at the top of the central column.
// Filled bottles leave through an outfeed star wheel on the opposite belt.
// What makes it read as a filler rather than a turntable: the revolved ring
// bowl on its column, the circle of valves directly over real bottle-shaped
// PET bottles, the two star wheels and the guard frame around the carousel.
// Generic visualization geometry at real size, millimetres, Z up, plinth on
// z = 0, bottles travel infeed -X -> outfeed +X along the -Y side.
meta({
  name: "rotary-filler",
  license: 'CC0-1.0',
  title: "Rotary bottle filler",
  description: "Rotary bottle filling carousel: revolved stainless plinth and filler table, ring product bowl on a central column with a circle of filling valves over PET bottles in star-wheel pockets, infeed and outfeed belts with star wheels, guard frame and operator HMI. Material controls: stainless steel, powder-coated steel, food-grade polymer, safety paint. Head-count choice; sanitaryLine and legacyPlant presets.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'filler', 'carousel', 'bottle', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 6800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const heads = param('heads', '12', { choices: ['10', '12', '16'], label: 'Filling heads' });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Powder-coated steel' });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade polymer and PET bottles' });
const safetyPaint = param('safetyPaint', '#e3a331', { label: 'Safety paint' });

presets({
  sanitaryLine: { stainlessSteel: '#d2dfe1', powderCoat: '#4b95a4', foodPolymer: '#2c828c', safetyPaint: '#f0b336' },
  legacyPlant: { stainlessSteel: '#858f91', powderCoat: '#315b70', foodPolymer: '#286c75', safetyPaint: '#bd7b24' },
});

const p = assembly("rotary-filler");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 12) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Revolve an (r, z) profile about Z.
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Star wheel: a disc of radius r with n half-round bottle pockets round its rim.
const starWheel = (r, n, pocket, t) => {
  const pts = [];
  const sector = 2 * Math.PI / n;
  for (let i = 0; i < n; i += 1) {
    const a0 = i * sector + sector * 0.2;
    for (let k = 0; k <= 4; k += 1) {
      const a = a0 + sector * 0.15 * k;
      const dip = Math.sin(k * Math.PI * 0.25) * pocket;
      pts.push([(r - dip) * Math.cos(a), (r - dip) * Math.sin(a)]);
    }
  }
  return extrudePolygon(pts, t);
};
// PET bottle standing on z = 0: straight body, tapered shoulder, neck finish.
const bottleProfile = [[0, 0], [31, 0], [31, 170], [14, 228], [14, 262], [0, 262]];

// Plinth cabinet and rotating filler table.
const zTable = 700;
add('base-plinth', turned([[0, 0], [600, 0], [600, 40], [570, 70], [570, 640], [600, 660], [0, 660]]).color(powderCoat));
add('kick-band', turned([[574, 0], [610, 0], [610, 70], [574, 70]]).color(stainlessSteel));
add('filler-table', turned([[0, 660], [500, 660], [520, 676], [520, zTable], [0, zTable]]).color(stainlessSteel));

// Carousel: star-wheel bottle carrier on the table, central column, ring bowl.
const n = Number(heads.value);
const rPitch = 420;
add('bottle-carrier-wheel', starWheel(rPitch + 30, n, 40, 24).rotateZ(-36 * 5 / n).translate(0, 0, zTable + 70).color(foodPolymer));
add('carrier-hub', cylinder(70, 220, 24).translate(0, 0, zTable).color(stainlessSteel));
add('central-column', cylinder(520, 95, 20).translate(0, 0, zTable + 70).color(stainlessSteel));
const zBowl = 1180;
add('product-bowl', turned([[180, zBowl], [400, zBowl], [430, zBowl + 30], [430, zBowl + 130], [400, zBowl + 160], [260, zBowl + 190], [180, zBowl + 194]]).color(stainlessSteel));
add('bowl-hub', turned([[0, zBowl - 10], [190, zBowl - 10], [190, zBowl + 200], [90, zBowl + 220], [0, zBowl + 220]]).color(stainlessSteel));
add('rotary-distributor', cylinder(140, 60, 16).translate(0, 0, zBowl + 220).color(stainlessSteel));
add('product-inlet-riser', rod([0, 0, zBowl + 360], [0, 0, zBowl + 520], 34, 12).color(stainlessSteel));
add('product-inlet-elbow', rod([0, 0, zBowl + 520], [0, 360, zBowl + 520], 34, 12).color(stainlessSteel));
add('bowl-sight-glass', box(30, 12, 100, true).translate(0, -432, zBowl + 80).color(foodPolymer));

// One filling valve over every pocket: radial arm, valve body, actuator, nozzle; bottle below.
for (let i = 0; i < n; i += 1) {
  const a = i * 360 / n;
  const rad = a * Math.PI / 180;
  const [x, y] = [rPitch * Math.cos(rad), rPitch * Math.sin(rad)];
  add(`valve-arm-${i}`, box(70, 34, 30, true).translate(400, 0, zBowl + 70).rotateZ(a).color(stainlessSteel));
  add(`fill-valve-${i}`, cylinder(150, 28, 8).translate(x, y, zBowl - 70).color(stainlessSteel));
  add(`valve-actuator-${i}`, cylinder(46, 22, 8).translate(x, y, zBowl + 80).color(foodPolymer));
  add(`fill-nozzle-${i}`, cylinder(70, 10, 6).translate(x, y, zBowl - 140).color(stainlessSteel));
  add(`bottle-${i}`, turned(bottleProfile).translate(x, y, zTable + 24).color(foodPolymer));
}

// Infeed and outfeed: belts tangent to the carousel on -Y, each with a star wheel.
const yLine = -rPitch - 300;
for (const [s, side] of [[-1, 'infeed'], [1, 'outfeed']]) {
  const xc = s * 1050;
  add(`${side}-belt`, box(900, 110, 20, true).translate(xc, yLine, zTable + 60).color(foodPolymer));
  add(`${side}-belt-frame`, box(900, 150, 60, true).translate(xc, yLine, zTable + 20).color(stainlessSteel));
  add(`${side}-guide-front`, box(900, 10, 40, true).translate(xc, yLine - 50, zTable + 170).color(stainlessSteel));
  add(`${side}-guide-back`, box(900, 10, 40, true).translate(xc, yLine + 50, zTable + 170).color(stainlessSteel));
  add(`${side}-leg-a`, box(50, 50, zTable - 10, true).translate(xc - 380, yLine, zTable * 0.5 - 5).color(powderCoat));
  add(`${side}-leg-b`, box(50, 50, zTable - 10, true).translate(xc + 380, yLine, zTable * 0.5 - 5).color(powderCoat));
  add(`${side}-star-wheel`, starWheel(230, 8, 40, 22).translate(s * 380, yLine + 140, zTable + 90).color(foodPolymer));
  add(`${side}-star-shaft`, cylinder(130, 26, 12).translate(s * 380, yLine + 140, zTable - 20).color(stainlessSteel));
  for (let k = 0; k < 2; k += 1) add(`${side}-bottle-${k}`, turned(bottleProfile).translate(xc + s * (k * 200 - 50), yLine, zTable + 70).color(foodPolymer));
}

// Guard frame round the back of the carousel and an operator HMI on a swing arm.
for (let i = 0; i < 6; i += 1) {
  const a = (i + 0.5) * Math.PI / 3;
  if (Math.sin(a) < -0.6) continue;
  add(`guard-post-${i}`, rod([640 * Math.cos(a), 640 * Math.sin(a), 660], [640 * Math.cos(a), 640 * Math.sin(a), 1720], 22, 8).color(powderCoat));
}
add('guard-top-ring', extrudePolygon(circle(660, 18), 40).subtract(extrudePolygon(circle(620, 18), 50).translate(0, 0, -5)).translate(0, 0, 1720).color(powderCoat));
add('guard-door-handle', rod([620, -150, 1050], [620, 150, 1050], 14).color(safetyPaint));
add('hmi-arm', rod([660, 300, 1720], [900, 520, 1600], 22).color(powderCoat));
add('hmi-panel', box(60, 340, 240, true).rotateZ(-40).translate(930, 540, 1480).color(powderCoat));
add('hmi-screen', box(8, 250, 160, true).rotateZ(-40).translate(905, 515, 1490).color(foodPolymer));
add('emergency-stop', cylinder(24, 26, 12).rotateY(90).rotateZ(-40).translate(905, 515, 1390).color(safetyPaint));
add('status-beacon', cylinder(160, 30, 12).translate(0, 360, zBowl + 500).color(safetyPaint));

return p.model();
