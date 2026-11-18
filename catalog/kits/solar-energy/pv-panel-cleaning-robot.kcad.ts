// PV panel cleaning robot: the autonomous, waterless brush robot that travels
// the length of a solar row each night and sweeps dust off the glass.
// What makes it a row cleaning robot rather than a tracked box: a long aluminium
// beam spanning the full module height, a bristle brush roll under a curved
// hood, drive carriages at the top and bottom edges whose wheels ride on the
// module frames, its own small PV charging panel and a control box with an
// antenna. Shown riding a short section of a tilted one-in-portrait row on its
// purlins, torque tube and posts, or parked flat on the ground off the row.
// Generic visualization geometry at real size (robot about 2.6 m long, row
// section 3.4 m), millimetres, Z up, posts or wheels on z = 0.
meta({
  name: 'pv-panel-cleaning-robot',
  license: 'CC0-1.0',
  title: 'PV panel cleaning robot',
  description: 'Autonomous waterless PV row cleaning robot: full-height aluminium beam, bristle brush roll under a curved hood, top and bottom drive carriages with wheels riding the module frames, PV charging panel and control box with antenna, shown on a tilted three-module row section with purlins, torque tube and posts or parked on the ground. Material controls: hood polymer, wheel and brush rubber, galvanized steel, aluminium and stainless, solar glass. Placement on-row or parked; fieldService and highVisibility presets.',
  tags: ['solar panel cleaning robot', 'PV cleaning', 'brush robot', 'O&M', 'photovoltaic', 'solar energy', 'low poly', 'scene prop', 'CC0'],
  kit: 'solar-energy',
  category: 'prop',
  origin: 'base',
  compat: ['solar', 'photovoltaic', 'energy', 'visualization', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const placement = param('placement', 'on-row', { choices: ['on-row', 'parked'], label: 'Placement' });
const polymer = param('polymer', '#f0b429', { label: 'Hood and carriage polymer' });
const rubber = param('rubber', '#262c2e', { label: 'Wheel and brush rubber' });
const galvanizedSteel = param('galvanizedSteel', '#748184', { label: 'Galvanized row posts, tube and purlins' });
const stainlessSteel = param('stainlessSteel', '#c3caca', { label: 'Aluminium beam, module frames and axles' });
const solarGlass = param('solarGlass', '#244a68', { label: 'Solar glass' });
presets({
  fieldService: { polymer: '#e7e9e4', rubber: '#282d2e', galvanizedSteel: '#68787b', stainlessSteel: '#abb5b7', solarGlass: '#1e4668' },
  highVisibility: { polymer: '#ef6c1f', rubber: '#232728', galvanizedSteel: '#536367', stainlessSteel: '#e0e5e4', solarGlass: '#183a5b' },
});

const p = assembly("pv-panel-cleaning-robot");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Round polygon of n points.
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Solid along +Y from y0 for length len, with an XZ-plane cross-section given as [x, z] points.
const alongY = (pts, y0, len) => extrudePolygon(pts, len).rotateX(90).translate(0, y0 + len, 0);
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 8) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

// Row coordinates: x along the row, y up the module slope, z off the glass (z = 0).
// On the row they tilt 25 degrees about X with the module centre 1.5 m up;
// parked, the robot sits flat with its wheels on the ground.
const onRow = placement.value === 'on-row';
const TILT = 25;
const place = (shape) => (onRow ? shape.rotateX(TILT).translate(0, 0, 1500) : shape);
const robot = (name, shape) => add(name, place(shape));

// Robot: beam, brush roll under its hood, two drive carriages, panel and control box.
const L = 2600;
robot('robot-beam', alongY([[-230, 150], [-110, 150], [-110, 270], [-230, 270]], -L / 2, L).color(stainlessSteel));
robot('beam-top-rib', alongY([[-190, 270], [-150, 270], [-150, 290], [-190, 290]], -L / 2 + 80, L - 160).color(stainlessSteel));
const BRISTLE = Array.from({ length: 24 }, (_, i) => {
  const t = (i / 24) * Math.PI * 2;
  const r = i % 2 === 0 ? 90 : 72;
  return [r * Math.sin(t), 95 + r * Math.cos(t)];
});
robot('brush-roll', alongY(BRISTLE, -1150, 2300).translate(60, 0, 0).color(rubber));
robot('brush-axle', rod([60, -L / 2 + 60, 95], [60, L / 2 - 60, 95], 14, 6).color(stainlessSteel));
const HOOD = [...Array.from({ length: 7 }, (_, i) => {
  const t = Math.PI * (0.05 + (i / 6) * 0.95);
  return [60 + 128 * Math.cos(t), 95 + 128 * Math.sin(t)];
}), ...Array.from({ length: 7 }, (_, i) => {
  const t = Math.PI * (1 - (i / 6) * 0.95);
  return [60 + 112 * Math.cos(t), 95 + 112 * Math.sin(t)];
})];
robot('brush-hood', alongY(HOOD, -1160, 2320).color(polymer));
for (const [k, y] of [['lower', -L / 2 + 170], ['upper', L / 2 - 170]]) {
  robot(`${k}-carriage`, box(480, 240, 190, true).translate(-20, y, 170).color(polymer));
  robot(`${k}-carriage-cover`, box(440, 200, 20, true).translate(-20, y, 275).color(polymer));
  for (const x of [-190, 150]) {
    robot(`${k}-wheel-${x < 0 ? 'rear' : 'front'}`, rod([x - 30, y, 45], [x + 30, y, 45], 45, 12).color(rubber));
    robot(`${k}-wheel-${x < 0 ? 'rear' : 'front'}-hub`, rod([x + 30, y, 45], [x + 36, y, 45], 22, 8).color(stainlessSteel));
  }
}
robot('charging-panel-frame', box(300, 640, 20, true).translate(-170, -200, 310).color(stainlessSteel));
robot('charging-panel-glass', box(270, 610, 4, true).translate(-170, -200, 321).color(solarGlass));
robot('control-box', box(240, 300, 150, true).translate(-170, L / 2 - 470, 345).color(polymer));
robot('status-led', box(60, 8, 24, true).translate(-170, L / 2 - 624, 370).color(solarGlass));
robot('antenna', rod([-100, L / 2 - 420, 420], [-100, L / 2 - 420, 640], 8, 6).color(rubber));

// Row section the robot rides: three portrait modules on purlins, a torque tube and two posts.
if (onRow) {
  const row = (name, shape) => add(name, place(shape));
  for (let i = 0; i < 3; i += 1) {
    const x = (i - 1) * 1154;
    row(`module-${i}-frame`, box(1134, 2278, 35, true).translate(x, 0, -17.5).color(stainlessSteel));
    row(`module-${i}-glass`, box(1100, 2244, 4, true).translate(x, 0, 1).color(solarGlass));
    row(`module-${i}-seam`, box(1100, 10, 2, true).translate(x, 0, 3).color(stainlessSteel));
  }
  for (const y of [-700, 700]) {
    row(`purlin-${y < 0 ? 'lower' : 'upper'}`, alongX([[-40, -35], [40, -35], [40, -135], [-40, -135]], -1730, 3460).translate(0, y, 0).color(galvanizedSteel));
  }
  row('torque-tube', rod([-1740, 0, -200], [1740, 0, -200], 65, 10).color(galvanizedSteel));
  // Tube centre in world coordinates: (0, 200 sin 25, 1500 - 200 cos 25).
  const TY = 200 * Math.sin((TILT * Math.PI) / 180);
  const TZ = 1500 - 200 * Math.cos((TILT * Math.PI) / 180);
  for (const x of [-1250, 1250]) {
    const k = x < 0 ? 'left' : 'right';
    add(`post-${k}`, extrudePolygon([[-75, -50], [75, -50], [75, -42], [5, -42], [5, 42], [75, 42], [75, 50], [-75, 50], [-75, 42], [-5, 42], [-5, -42], [-75, -42]], TZ - 60).translate(x, TY, 0).color(galvanizedSteel));
    add(`bearing-${k}`, box(180, 170, 150, true).translate(x, TY, TZ - 20).color(galvanizedSteel));
  }
}

return p.model();
