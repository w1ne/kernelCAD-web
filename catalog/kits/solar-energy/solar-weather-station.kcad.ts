// Solar weather station: the meteorological mast a PV plant uses to measure the
// sunlight and weather its yield is judged against.
// What makes it a solar met station rather than a pole with boxes: a guyed-free
// tripod mast, two glass-domed pyranometers on a levelled arm (one flat for
// global irradiance, one tilted in the plane of the array), a stacked-plate
// radiation shield for air temperature, a tipping-bucket rain gauge, a logger
// enclosure charged by its own small PV panel, a lightning rod, and either a
// cup anemometer with a wind vane or a two-axis ultrasonic wind sensor.
// Generic visualization geometry at real size (about 3.2 m tall), millimetres,
// Z up, tripod feet on z = 0.
meta({
  name: 'solar-weather-station',
  license: 'CC0-1.0',
  title: 'Solar weather station',
  description: 'PV plant meteorological station on a tripod mast: two glass-domed pyranometers (global horizontal and plane-of-array), stacked-plate temperature radiation shield, rain gauge, logger enclosure with its own PV charging panel, crossarm with cup anemometer and wind vane or ultrasonic wind sensor, lightning rod. Material controls: galvanized steel, aluminum, white polymer, dome glass. Wind sensor cups-vane or ultrasonic; fieldService and highVisibility presets.',
  tags: ['weather station', 'pyranometer', 'irradiance', 'anemometer', 'meteorological mast', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const wind = param('wind', 'cups-vane', { choices: ['cups-vane', 'ultrasonic'], label: 'Wind sensor' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized mast and tripod steel' });
const aluminum = param('aluminum', '#b7c1c4', { label: 'Aluminum arms and crossarm' });
const polymer = param('polymer', '#e9ebe6', { label: 'White sensor and enclosure polymer' });
const domeGlass = param('domeGlass', '#2b5878', { label: 'Pyranometer dome and PV glass' });
presets({
  fieldService: { galvanizedSteel: '#68787b', aluminum: '#a9b5b9', polymer: '#cdd2cb', domeGlass: '#244e6e' },
  highVisibility: { galvanizedSteel: '#536367', aluminum: '#d4dcdf', polymer: '#f2ece0', domeGlass: '#1c6c94' },
});

const p = assembly("solar-weather-station");
const add = (name, shape) => p.part(name, shape.scale(scale));

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
  const ring = Array.from({ length: n }, (_, i) => [r * Math.cos(((i + 0.5) / n) * Math.PI * 2), r * Math.sin(((i + 0.5) / n) * Math.PI * 2)]);
  return extrudePolygon(ring, len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Tripod: three splayed legs from a collar, with foot pads, round a centre mast.
const MAST = 3000;
const HUB = 1150;
add('mast', rod([0, 0, 120], [0, 0, MAST], 30, 10).color(galvanizedSteel));
add('tripod-collar', rod([0, 0, HUB - 60], [0, 0, HUB + 60], 48, 10).color(galvanizedSteel));
for (let i = 0; i < 3; i += 1) {
  const a = (i * 2 * Math.PI) / 3 + Math.PI / 2;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  add(`tripod-leg-${i}`, rod([48 * c, 48 * s, HUB], [950 * c, 950 * s, 30], 22, 8).color(galvanizedSteel));
  add(`tripod-foot-${i}`, box(160, 160, 30, true).rotateZ((a * 180) / Math.PI).translate(950 * c, 950 * s, 15).color(galvanizedSteel));
  add(`tripod-strut-${i}`, rod([0, 0, 140], [520 * c, 520 * s, 560], 13, 6).color(galvanizedSteel));
}
add('mast-foot', rod([0, 0, 0], [0, 0, 140], 60, 10).color(galvanizedSteel));

// Logger enclosure on the mast, charged by a small tilted PV panel above it.
add('logger-enclosure', box(380, 180, 460, true).translate(0, -125, 1550).color(polymer));
add('logger-door-seam', box(360, 4, 6, true).translate(0, -217, 1700).color(aluminum));
add('logger-latch', box(26, 16, 60, true).translate(150, -222, 1550).color(aluminum));
add('logger-glands', rod([-80, -125, 1320], [-80, -125, 1290], 24, 8).color(galvanizedSteel));
add('charging-panel-frame', box(540, 420, 30, true).rotateX(35).translate(0, -330, 2050).color(aluminum));
add('charging-panel-glass', box(500, 380, 4, true).translate(0, 0, 17).rotateX(35).translate(0, -330, 2050).color(domeGlass));
add('charging-panel-arm', rod([0, 0, 2000], [0, -260, 2000], 18, 6).color(aluminum));

// Temperature and humidity radiation shield: a stack of white plates.
add('shield-arm', rod([0, 0, 2280], [520, 0, 2280], 16, 6).color(aluminum));
for (let i = 0; i < 7; i += 1) {
  const z = 2160 + i * 34;
  add(`shield-plate-${i}`, turned([[0, 0], [78, 0], [66, 18], [0, 18]]).translate(560, 0, z).color(polymer));
}
add('shield-cap', turned([[0, 0], [80, 0], [40, 26], [0, 30]]).translate(560, 0, 2400).color(polymer));

// Irradiance arm on the sun side: one flat pyranometer, one tilted with the array.
const PZ = 2560;
add('pyranometer-arm', box(900, 60, 24, true).translate(-120, -380, PZ).color(aluminum));
add('pyranometer-arm-stub', rod([0, 0, PZ], [0, -380, PZ], 18, 6).color(aluminum));
const pyranometer = (key, tilt, x) => {
  const at = (s) => s.rotateX(tilt).translate(x, -380, PZ + 14);
  add(`${key}-sunshade`, at(turned([[0, 0], [82, 0], [82, 10], [44, 20], [0, 20]])).color(polymer));
  add(`${key}-body`, at(turned([[0, 18], [40, 18], [40, 52], [0, 52]])).color(polymer));
  add(`${key}-dome`, at(turned([[0, 52], [30, 52], [26, 70], [15, 80], [0, 83]])).color(domeGlass));
};
pyranometer('ghi-pyranometer', 0, -400);
pyranometer('poa-pyranometer', 25, 160);

// Rain gauge on a low arm: funnel-topped cylinder.
add('rain-gauge-arm', rod([0, 0, 1000], [0, 520, 1000], 16, 6).color(aluminum));
add('rain-gauge', turned([[0, 0], [95, 0], [95, 220], [102, 228], [102, 250], [92, 250], [30, 190], [0, 190]]).translate(0, 560, 1015).color(polymer));

// Crossarm with wind sensors, and the lightning rod on top.
const CZ = MAST - 40;
add('crossarm', box(1300, 40, 40, true).translate(0, 0, CZ).color(aluminum));
add('lightning-rod', rod([0, 0, MAST], [0, 0, MAST + 200], 8, 6).color(galvanizedSteel));
if (wind.value === 'ultrasonic') {
  // Two-axis ultrasonic sensor: body, three arms rising to the transducer plate.
  const U = [560, 0, CZ + 20];
  add('ultrasonic-body', turned([[0, 0], [42, 0], [42, 160], [30, 180], [0, 180]]).translate(...U).color(polymer));
  for (let i = 0; i < 3; i += 1) {
    const a = (i * 2 * Math.PI) / 3;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    add(`ultrasonic-arm-${i}-low`, rod([U[0] + 30 * c, U[1] + 30 * s, U[2] + 170], [U[0] + 110 * c, U[1] + 110 * s, U[2] + 230], 9, 6).color(polymer));
    add(`ultrasonic-arm-${i}-high`, rod([U[0] + 110 * c, U[1] + 110 * s, U[2] + 230], [U[0] + 80 * c, U[1] + 80 * s, U[2] + 330], 9, 6).color(polymer));
  }
  add('ultrasonic-top-plate', turned([[0, 0], [95, 0], [70, 18], [0, 18]]).translate(U[0], U[1], U[2] + 330).color(polymer));
} else {
  // Cup anemometer: hub with three conical cups on arms.
  const A = [560, 0, CZ + 20];
  add('anemometer-housing', turned([[0, 0], [32, 0], [32, 120], [20, 140], [0, 140]]).translate(...A).color(polymer));
  for (let i = 0; i < 3; i += 1) {
    const a = (i * 2 * Math.PI) / 3;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const cup = [A[0] + 150 * c, A[1] + 150 * s, A[2] + 150];
    add(`anemometer-arm-${i}`, rod([A[0], A[1], A[2] + 150], cup, 5, 5).color(aluminum));
    add(`anemometer-cup-${i}`, turned([[0, 0], [46, 0], [10, 50], [0, 50]]).rotateY(90).rotateZ(((a + Math.PI / 2) * 180) / Math.PI).translate(...cup).color(polymer));
  }
  // Wind vane: counterweighted nose and a tail fin on a pivot.
  const V = [-560, 0, CZ + 20];
  add('vane-pivot', turned([[0, 0], [28, 0], [28, 110], [0, 110]]).translate(...V).color(polymer));
  add('vane-boom', rod([V[0] - 260, 0, V[2] + 130], [V[0] + 240, 0, V[2] + 130], 9, 6).color(aluminum));
  add('vane-counterweight', rod([V[0] + 200, 0, V[2] + 130], [V[0] + 280, 0, V[2] + 130], 22, 8).color(polymer));
  add('vane-tail-fin', extrudePolygon([[-300, 60], [-170, 105], [-170, 155], [-300, 210]], 6).rotateX(90).translate(V[0], 3, V[2]).color(polymer));
}

return p.model();
