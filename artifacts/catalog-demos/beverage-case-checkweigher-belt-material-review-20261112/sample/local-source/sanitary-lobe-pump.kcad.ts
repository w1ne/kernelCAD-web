// SPDX-License-Identifier: CC0-1.0
// Sanitary rotary-lobe pump: a positive-displacement pump that moves syrup and
// product gently without shearing it. What makes it this thing rather than a
// generic motor-on-a-base: the oblong polished pump head (two lobe rotors
// side by side inside), a removable front cover held by domed cap nuts, two
// opposed sanitary ports ending in tri-clamp ferrules, a gearbox carrying the
// rotor shafts, a yellow coupling guard, and a finned TEFC motor with a fan
// cowl and terminal box, all on a stainless baseplate with levelling feet.
// Generic visualization geometry at real size, millimetres, Z up, feet on
// z = 0, pump head at -X, motor at +X.
meta({
  name: "sanitary-lobe-pump",
  license: 'CC0-1.0',
  title: "Sanitary rotary-lobe pump",
  description: "Sanitary rotary-lobe pump set: oblong polished pump head with front cover and domed cap nuts, opposed tri-clamp ports, gearbox, coupling guard and finned TEFC motor with fan cowl and terminal box on a stainless baseplate with levelling feet. Material controls: stainless steel, painted drive, safety-yellow guard, food-grade gaskets. Port-orientation choice; sanitaryLine and legacyPlant presets.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'pump', 'lobe pump', 'sanitary', 'motor', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'prop',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2000,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const ports = param('ports', 'horizontal', { choices: ['horizontal', 'vertical'], label: 'Port orientation' });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Painted motor and gearbox' });
const safetyPaint = param('safetyPaint', '#e3a331', { label: 'Safety-yellow coupling guard' });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade gaskets and seals' });

presets({
  sanitaryLine: { stainlessSteel: '#d2dfe1', powderCoat: '#4b95a4', safetyPaint: '#f0b336', foodPolymer: '#2c828c' },
  legacyPlant: { stainlessSteel: '#858f91', powderCoat: '#315b70', safetyPaint: '#bd7b24', foodPolymer: '#286c75' },
});

const p = assembly("sanitary-lobe-pump");
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
// Stadium (two half-circles of radius r joined by straights of length l along local y).
const stadium = (r, l, n = 6) => {
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const a = Math.PI * i / n;
    pts.push([r * Math.cos(a), l * 0.5 + r * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i += 1) {
    const a = Math.PI + Math.PI * i / n;
    pts.push([r * Math.cos(a), -l * 0.5 + r * Math.sin(a)]);
  }
  return pts;
};
// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Tri-clamp ferrule end on a port pointing along d from p0.
const port = (name, p0, p1) => {
  add(`${name}-pipe`, rod(p0, p1, 32, 12).color(stainlessSteel));
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const q = [p1[0] + d[0] / len * 18, p1[1] + d[1] / len * 18, p1[2] + d[2] / len * 18];
  add(`${name}-ferrule`, rod(p1, q, 50, 12).color(stainlessSteel));
  add(`${name}-gasket`, rod(q, [q[0] + d[0] / len * 6, q[1] + d[1] / len * 6, q[2] + d[2] / len * 6], 44, 12).color(foodPolymer));
};

// Baseplate on four levelling feet.
add('baseplate', box(980, 380, 20, true).translate(60, 0, 100).color(stainlessSteel));
for (const [i, [x, y]] of [[-400, -150], [-400, 150], [520, -150], [520, 150]].entries()) {
  add(`levelling-foot-${i}`, turned([[0, 0], [55, 0], [55, 12], [18, 30], [14, 90], [0, 90]]).translate(x, y, 0).color(stainlessSteel));
}

// Pump head: oblong casing, front cover and four domed cap nuts. Rotor pair stacked
// along the stadium's long axis: vertical for horizontal ports, horizontal for vertical ports.
const vertical = ports.value === 'vertical';
const zc = vertical ? 400 : 360;
const oval = (r, l) => stadium(r, l).map(([u, v]) => (vertical ? [v, u + zc] : [u, v + zc]));
add('pump-pedestal', box(150, 200, zc - 210, true).translate(-200, 0, 110 + (zc - 210) * 0.5).color(stainlessSteel));
add('pump-casing', alongX(oval(120, 150), -330, 150).color(stainlessSteel));
add('front-cover', alongX(oval(110, 150), -365, 35).color(stainlessSteel));
add('cover-seal', alongX(oval(122, 150), -335, 6).color(foodPolymer));
// Four separate front-cover fasteners. The pattern turns with the oval casing
// so both port orientations keep the nuts on the removable cover face.
const coverFasteners = [[-65, -110], [65, -110], [-65, 110], [65, 110]];
for (const [i, [shortAxis, longAxis]] of coverFasteners.entries()) {
  const [y, z] = vertical ? [longAxis, zc + shortAxis] : [shortAxis, zc + longAxis];
  add(`cap-nut-${i}`, turned([[0, 0], [30, 0], [30, 20], [18, 40], [0, 44]]).rotateY(-90).translate(-365, y, z).color(stainlessSteel));
}
// Ports either side (horizontal) or top and bottom with the outlet turned out to -Y (vertical).
if (vertical) {
  port('inlet', [-255, 0, zc + 180], [-255, 0, zc + 260]);
  port('outlet-drop', [-255, 0, zc - 180], [-255, 0, 200]);
  port('outlet', [-255, 0, 200], [-255, -240, 200]);
} else {
  port('inlet', [-255, 120, zc], [-255, 270, zc]);
  port('outlet', [-255, -120, zc], [-255, -270, zc]);
}

// Gearbox with bearing cover and the drive shaft into the coupling guard.
add('gearbox', box(220, 220, 250, true).translate(-70, 0, 235).color(powderCoat));
add('gearbox-bearing-cover', rod([40, 0, zc], [70, 0, zc], 70, 12).color(powderCoat));
add('gearbox-breather', rod([-70, 0, 360], [-70, 0, 400], 14).color(stainlessSteel));
add('drive-shaft', rod([70, 0, 330], [220, 0, 330], 22).color(stainlessSteel));
const arch = [[-110, 220]];
for (let i = 0; i <= 8; i += 1) arch.push([-110 * Math.cos(Math.PI * i / 8), 330 + 110 * Math.sin(Math.PI * i / 8)]);
arch.push([110, 220]);
add('coupling-guard', alongX(arch, 80, 160).color(safetyPaint));

// Finned TEFC motor: finned body, end shields, fan cowl, terminal box and feet.
const fins = [];
for (let i = 0; i < 32; i += 1) {
  const a = (i / 32) * Math.PI * 2;
  const r = i % 2 === 0 ? 140 : 124;
  fins.push([r * Math.cos(a), 330 + r * Math.sin(a)]);
}
add('motor-body', alongX(fins, 260, 330).color(powderCoat));
add('motor-end-shield-drive', rod([240, 0, 330], [260, 0, 330], 118, 16).color(powderCoat));
add('motor-fan-cowl', rod([590, 0, 330], [680, 0, 330], 132, 16).color(powderCoat));
add('motor-cowl-grille', rod([680, 0, 330], [686, 0, 330], 112, 16).color(stainlessSteel));
add('motor-terminal-box', box(130, 120, 80, true).translate(420, 0, 500).color(powderCoat));
add('motor-cable-gland', rod([420, -60, 495], [420, -95, 495], 14).color(foodPolymer));
add('motor-feet', box(260, 300, 30, true).translate(425, 0, 125).color(powderCoat));
add('motor-foot-web', box(200, 120, 90, true).translate(425, 0, 180).color(powderCoat));

return p.model();
