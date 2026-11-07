// Cinema camera: a modular box-style digital film camera built up for a shoot.
// What makes it this thing rather than a camcorder: a square sensor body with a
// chamfered top and side cooling fins, a PL-mount cine prime with geared focus
// and iris rings, 15 mm rods on a baseplate carrying a lofted matte box with a
// top flag and side wings, a top handle with front grip, an offset electronic
// viewfinder with eyecup, a side operator screen and a V-mount battery at the back.
// Generic visualization geometry at real size, millimetres, Z up, baseplate on
// z = 0, lens pointing to -Y, operator side at +X.
meta({
  name: "cinema-camera",
  license: 'CC0-1.0',
  title: "Cinema camera",
  description: "Box-style cinema camera rig: chamfered sensor body with cooling fins, PL-mount cine prime with geared focus and iris rings, baseplate with 15 mm rods, lofted matte box with top flag and side wings, top handle with grip, offset EVF with eyecup, side operator screen and rear V-mount battery. Material controls: body polymer, grip rubber, optical glass, metal. Matte box fitted or bare lens; studioBlack and fieldRental presets.",
  tags: ["cinema camera", "film camera", "matte box", "camera rig", "photography", "video", "studio", "low poly", "CC0"],
  kit: 'photo-video-studio',
  category: 'prop',
  origin: 'base',
  compat: ['photography', 'video', 'studio', 'film-set', 'indoor'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const matteBox = param('matteBox', 'fitted', { choices: ['fitted', 'none'], label: 'Matte box' });
const polymer = param('polymer', '#343c43', { label: 'Body, lens and matte box polymer' });
const rubber = param('rubber', '#1b2024', { label: 'Grip, eyecup and fin rubber' });
const glass = param('glass', '#45a6c0', { label: 'Lens, screen and filter glass' });
const metal = param('metal', '#a9b5ba', { label: 'Rods, gears, handle and plate metal' });

presets({
  studioBlack: { polymer: '#343c43', rubber: '#1b2024', glass: '#45a6c0', metal: '#a9b5ba' },
  fieldRental: { polymer: '#c75a2e', rubber: '#292b2d', glass: '#79d4e3', metal: '#657780' },
});

const p = assembly("cinema-camera");
const add = (name, s) => p.part(name, s.scale(scale));

// Round polygon of n points.
const circle = (r, n = 10) => Array.from({ length: n }, (_, i) => {
  const t = ((i + 0.5) / n) * Math.PI * 2;
  return [r * Math.cos(t), r * Math.sin(t)];
});
// Closed path through [x, y] points.
const outline = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) pb = pb.lineTo(x, y);
  return pb.close();
};
// Revolve an (r, z) profile about Z.
const turned = (pts) => outline(pts).revolve();
// Rod from p0 to p1 with an n-sided section.
const rod = (p0, p1, r, n = 10) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  return extrudePolygon(circle(r, n), len)
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};
// Solid along +X from x0 for length len, with a YZ-plane cross-section given as [y, z] points.
const alongX = (pts, x0, len) => extrudePolygon(pts.map(([y, z]) => [-z, y]), len).rotateY(90).translate(x0, 0, 0);
// Lens gear: n teeth alternating between r and r - depth, from a0 to a1 along the axis.
const gear = (r, depth, a0, a1, n = 32) => extrudePolygon(
  Array.from({ length: n * 2 }, (_, i) => {
    const t = (i / (n * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r - depth;
    return [rr * Math.cos(t), rr * Math.sin(t)];
  }),
  a1 - a0,
).translate(0, 0, a0);
const rect = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];

// Lens axis height and mount face position.
const AXIS = 92;
const MOUNT = -80;
// Lens-axis part: revolved or extruded about Z, then pointed at -Y from the mount face.
const onAxis = (s) => s.rotateX(90).translate(0, MOUNT, AXIS);

// Baseplate, rod clamp and twin 15 mm rods running forward under the lens.
add('baseplate', box(120, 210, 16, true).translate(0, 10, 8).color(metal));
add('body-riser', box(100, 170, 14, true).translate(0, 10, 23).color(metal));
add('rod-clamp', box(96, 30, 26, true).translate(0, -80, 29).color(metal));
for (const x of [-30, 30]) add(`rod-${x < 0 ? 'left' : 'right'}`, rod([x, 30, 30], [x, -300, 30], 7.5, 8).color(metal));

// Sensor body with a chamfered rear top, cooling fins on the -X side and a side screen on +X.
add('body', alongX([[-80, 30], [100, 30], [100, 122], [84, 142], [-80, 142]], -56, 112).color(polymer));
for (let i = 0; i < 7; i += 1) add(`cooling-fin-${i}`, box(4, 120, 3, true).translate(-58, 15, 50 + i * 11).color(rubber));
add('side-screen-bezel', box(3, 96, 64, true).translate(57.5, 18, 86).color(rubber));
add('side-screen', box(1, 86, 54, true).translate(59.5, 18, 86).color(glass));
for (const [i, y] of [-50, -30].entries()) add(`menu-button-${i}`, box(3, 12, 8, true).translate(57.5, y, 66).color(metal));

// PL mount and cine prime with geared focus and iris rings.
add('pl-mount', onAxis(turned([[30, -6], [44, -6], [44, 0], [30, 0]]).translate(0, 0, 6)).color(metal));
add('lens-barrel', onAxis(turned([[0, 0], [36, 0], [36, 8], [42, 12], [42, 104], [48, 110], [48, 134], [41, 134], [41, 128], [0, 128]])).color(polymer));
add('focus-gear', onAxis(gear(46, 2.5, 24, 44)).color(metal));
add('iris-gear', onAxis(gear(45, 2, 74, 84, 28)).color(metal));
add('focus-scale-ring', onAxis(turned([[42, 48], [43.5, 48], [43.5, 66], [42, 66]])).color(glass));
add('front-element', onAxis(turned([[0, 124], [40, 124], [40, 129], [0, 131]])).color(glass));

if (matteBox.value === 'fitted') {
  // Lofted matte box clamped on the rods, with filter tray, top flag and side wings.
  const MB = MOUNT - 128;
  const shell = outline(rect(110, 92)).loft(outline(rect(180, 140)), { spacing: 92, ruled: true });
  add('matte-box', shell.rotateX(90).translate(0, MB, AXIS).color(polymer));
  add('matte-box-filter', extrudePolygon(rect(166, 128), 3).rotateX(90).translate(0, MB - 92, AXIS).color(glass));
  add('filter-tray', box(170, 14, 8, true).translate(0, MB - 30, AXIS + 74).color(metal));
  add('top-flag', box(184, 120, 3, true).rotateX(-14).translate(0, MB - 140, AXIS + 82).color(polymer));
  for (const sx of [-1, 1]) {
    add(`side-wing-${sx < 0 ? 'left' : 'right'}`, box(3, 96, 136, true).rotateZ(sx * 16).translate(sx * 104, MB - 136, AXIS).color(polymer));
  }
  add('matte-box-rod-bracket', box(90, 40, 30, true).translate(0, MB - 40, 36).color(metal));
} else {
  add('lens-support', box(40, 30, 36, true).translate(0, MOUNT - 60, 44).color(metal));
}

// Top handle with front rubber grip, and the offset electronic viewfinder on the -X side.
add('handle-post-front', rod([0, -50, 142], [0, -50, 182], 9).color(metal));
add('handle-post-rear', rod([0, 60, 142], [0, 60, 182], 9).color(metal));
add('handle-bar', rod([0, -110, 186], [0, 80, 186], 12).color(metal));
add('handle-grip', rod([0, -112, 186], [0, -60, 186], 16).color(rubber));
add('evf-arm', rod([-20, -10, 186], [-78, 70, 170], 7, 8).color(metal));
add('evf-body', box(40, 86, 44, true).translate(-82, 100, 168).color(polymer));
add('evf-eyecup', box(46, 22, 48, true).translate(-82, 152, 168).color(rubber));
add('evf-glass', box(26, 1, 18, true).translate(-82, 163.5, 168).color(glass));

// Rear V-mount battery plate and battery.
add('battery-plate', box(90, 12, 100, true).translate(0, 106, 82).color(metal));
add('battery', box(80, 40, 110, true).translate(0, 132, 82).color(rubber));
add('battery-gauge', box(30, 1, 6, true).translate(0, 152.5, 118).color(glass));

return p.model();
