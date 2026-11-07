// Three-roll plate bending machine, the machine that curls flat hull plate
// into shell strakes. What makes it one: three long polished rolls in a
// pyramid - a big top roll pressing down between two lower rolls - carried
// between two tall cast side housings; the lower rolls ride on angled
// hydraulic cylinders, the drop-end housing tips away on its own cylinder so
// a closed cylinder can be slid off, and a gearbox and finned motor drive the
// rolls from the fixed end. A plate is shown half-rolled, dipping under the
// top roll and curling up at both edges. Millimetres, Z up, ground origin,
// rolls along X.
meta({
  name: "plate-rolling-machine",
  license: 'CC0-1.0',
  title: "Plate rolling machine",
  description: "Three-roll plate bending machine at about real size: polished top roll and two lower rolls between fixed and drop-end cast side housings on a bed and plinth, angled hydraulic cylinders under the lower rolls, a tipping cylinder on the drop end, a gearbox with a finned drive motor, a hydraulic power pack with hoses, a pedestal control console and a half-rolled steel plate curling up around the top roll. Material controls: machine paint, roll steel, hydraulics, plate steel; fresh-coat, weathered-yard and machine-green presets.",
  tags: ["shipyard", "shipbuilding", "plate rolling", "plate bending", "three-roll", "metal forming", "hull fabrication", "CC0"],
  kit: 'shipyard',
  category: 'prop',
  origin: 'base',
  compat: ['shipyard', 'marine', 'drydock', 'ship-repair'],
  triangleBudget: 3000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const framePaint = param('framePaint', '#2f5f8f', { label: 'Machine paint' });
const rollSteel = param('rollSteel', '#c3c9cc', { label: 'Polished roll steel' });
const hydraulic = param('hydraulic', '#e2b02c', { label: 'Hydraulic cylinders and power pack' });
const plateSteel = param('plateSteel', '#5b6266', { label: 'Mill-scale plate' });

presets({
  'fresh-coat': { framePaint: '#3b72a8', rollSteel: '#d4d9db', hydraulic: '#f0c03a', plateSteel: '#646b6f' },
  'weathered-yard': { framePaint: '#40566a', rollSteel: '#9da3a5', hydraulic: '#b58e35', plateSteel: '#6e5446' },
  'machine-green': { framePaint: '#3f6e4f', hydraulic: '#d24a2c' },
});

const p = assembly("plate-rolling-machine");
const add = (name, shape) => p.part(name, shape.scale(scale));

const ngon = (r, n) => {
  let o = path().moveTo(r, 0);
  for (let i = 1; i < n; i++) o = o.lineTo(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n));
  return o.close();
};
// Faceted lathe about Z: [[radius, z], ...] with z strictly rising.
const lathe = (pts, n = 12) => ngon(pts[0][0], n).loft(pts.slice(1).map(([r]) => ngon(r, n)), {
  planes: pts.map(([, z]) => ({ plane: 'XY', origin: [0, 0, z] })),
  ruled: true,
});
const rod = (r, z0, z1, n = 12) => lathe([[r, z0], [r, z1]], n);
const blk = (x0, y0, z0, x1, y1, z1) => box(x1 - x0, y1 - y0, z1 - z0, true).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
// Round bar from point a to point b.
const tube = (a, b, r, n = 10) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return rod(r, 0, len, n)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};
// Lathe along X: [[radius, x], ...] with x rising, centred on (y, z).
const latheX = (pts, y, z, n = 12) => lathe(pts, n).rotateY(90).translate(0, y, z);
// Closed (y, z) side profile extruded along X from x0 to x1.
const side = (pts, x0, x1) => {
  let o = path().moveTo(pts[0][0], pts[0][1]);
  for (const [u, v] of pts.slice(1)) o = o.lineTo(u, v);
  return o.close().extrude(x1 - x0).rotateX(90).rotateZ(90).translate(x0, 0, 0);
};

const concrete = '#9b9890', dark = '#2a2e31', rubber = '#1e2224';
const L = 3000; // roll face length
const lowY = 380, lowZ = 900, lowR = 200;
const topZ = 1344, topR = 260;

// ---- Plinth and bed ----
add('plinth', blk(-2000, -900, 0, 2000, 900, 120).color(concrete));
add('bed', side([[-560, 120], [560, 120], [560, 380], [440, 460], [-440, 460], [-560, 380]], -1900, 1900).color(framePaint));
add('bed-rib-front', blk(-1500, -580, 140, 1500, -560, 360).color(framePaint));
add('bed-rib-rear', blk(-1500, 560, 140, 1500, 580, 360).color(framePaint));

// ---- Side housings: fixed (drive) end and drop end ----
const housing = [[-720, 120], [720, 120], [720, 980], [470, 1820], [-470, 1820], [-720, 980]];
add('fixed-housing', side(housing, -1960, -1560).color(framePaint));
add('fixed-housing-window', side([[-300, 1180], [300, 1180], [220, 1560], [-220, 1560]], -1975, -1545).color(dark));
add('drop-housing', side([[-720, 120], [720, 120], [720, 980], [420, 1520], [-420, 1520], [-720, 980]], 1560, 1920).color(framePaint));
add('drop-bearing-block', side([[-330, 1180], [330, 1180], [300, 1640], [-300, 1640]], 1580, 1900).color(framePaint));
add('drop-tip-cylinder', tube([2250, 0, 260], [1890, 0, 1420], 70).color(hydraulic));
add('drop-tip-rod', tube([1890, 0, 1420], [1800, 0, 1610], 35).color(rollSteel));
add('drop-tip-clevis', blk(2160, -140, 120, 2360, 140, 300).color(framePaint));
for (const x of [-1760, 1740]) add(`top-bearing-cap-${x}`, blk(x - 190, -320, topZ + 200, x + 190, 320, topZ + 300).color(framePaint));

// ---- Rolls with necks through the housings ----
add('top-roll', latheX([[topR - 20, -L / 2], [topR, -L / 2 + 40], [topR, L / 2 - 40], [topR - 20, L / 2]], 0, topZ, 16).color(rollSteel));
add('top-roll-necks', latheX([[150, -2050], [150, 1960]], 0, topZ, 12).color(rollSteel));
for (const s of [-1, 1]) {
  const y = s * lowY;
  add(`lower-roll-${s}`, latheX([[lowR - 15, -L / 2], [lowR, -L / 2 + 30], [lowR, L / 2 - 30], [lowR - 15, L / 2]], y, lowZ, 14).color(rollSteel));
  add(`lower-roll-necks-${s}`, latheX([[120, -2050], [120, 1960]], y, lowZ, 10).color(rollSteel));
  // Angled lift cylinders on the inner face of each housing.
  for (const x of [-1530, 1530]) {
    add(`lift-cylinder-${s}-${x}`, tube([x, s * 650, 300], [x, s * 470, 700], 75).color(hydraulic));
    add(`lift-rod-${s}-${x}`, tube([x, s * 470, 700], [x, s * 410, 860], 38).color(rollSteel));
  }
}

// ---- Half-rolled plate: dips under the top roll, curls up both edges ----
{
  const R = 1600, t = 30, zc = lowZ + lowR + R - (R - Math.sqrt(R * R - lowY * lowY));
  const pts = [];
  const a0 = -66, a1 = 66, n = 22;
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([R * Math.sin(a), zc - R * Math.cos(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([(R - t) * Math.sin(a), zc - (R - t) * Math.cos(a)]);
  }
  add('rolled-plate', side(pts, -1300, 1300).color(plateSteel));
}

// ---- Drive train at the fixed end ----
add('gearbox', blk(-2650, -560, 440, -1960, 560, 1500).color(framePaint));
add('gearbox-cover', blk(-2700, -480, 520, -2650, 480, 1420).color(framePaint));
add('gearbox-feet', blk(-2700, -640, 120, -1960, 640, 440).color(framePaint));
add('coupling-guard', latheX([[150, -2950], [150, -2700]], 0, 900, 10).color(hydraulic));
add('drive-motor', latheX([[230, -3700], [260, -3640], [260, -3000], [200, -2950]], 0, 900, 14).color(framePaint));
for (let x = -3580; x < -3020; x += 80) add(`motor-fin-${x}`, latheX([[285, x], [285, x + 22]], 0, 900, 14).color(framePaint));
add('motor-fan-cowl', latheX([[220, -3820], [250, -3700]], 0, 900, 14).color(dark));
add('motor-terminal-box', blk(-3400, -180, 1150, -3150, 180, 1290).color(framePaint));
add('motor-stand', blk(-3760, -380, 120, -2900, 380, 640).color(framePaint));

// ---- Hydraulic power pack and hoses ----
add('power-pack-tank', blk(-1300, 1000, 120, -300, 1600, 780).color(hydraulic));
add('power-pack-motor', rod(170, 780, 1260, 12).translate(-950, 1300, 0).color(framePaint));
add('power-pack-filter', rod(70, 780, 1000, 8).translate(-550, 1450, 0).color(dark));
add('power-pack-gauge', rod(60, 0, 20, 10).rotateX(90).translate(-550, 1000, 650).color('#ece8dc'));
for (const [i, x] of [-1600, 1600].entries()) {
  add(`hose-${i}-a`, tube([-700, 1000, 700], [x * 0.5, 820, 820], 22, 6).color(rubber));
  add(`hose-${i}-b`, tube([x * 0.5, 820, 820], [x, 720, 600], 22, 6).color(rubber));
}

// ---- Pedestal control console with pendant buttons ----
add('console-pedestal', rod(70, 120, 1050, 8).translate(-2300, -1300, 0).color(dark));
add('console-base', blk(-2450, -1450, 120, -2150, -1150, 160).color(dark));
add('console-box', blk(-220, -110, -180, 220, 110, 180).rotateX(-12).translate(-2300, -1300, 1230).color(framePaint));
const btn = [['#d43a2a', -2420], ['#3fa34d', -2300], ['#e7e2d4', -2180]];
for (const [col, x] of btn) add(`console-button-${x}`, rod(28, 0, 30, 8).rotateX(90).translate(x, -1395, 1270).color(col));

return p.model();
